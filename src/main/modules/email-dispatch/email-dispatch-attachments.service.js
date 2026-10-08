const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const {
    dialog,
    app
} = require('electron');

const repository = require('./email-dispatch.repository');

const {
    getEmailAttachmentsPath
} = require('./email-dispatch.config');
const {
    toSafeNumber
} = require('../../utils/validation.utils');

const ALLOWED_EXTENSIONS = new Set([
    '.xlsx',
    '.xls',
    '.xlsm',
    '.csv',
    '.pdf',
    '.doc',
    '.docx',
    '.txt'
]);

function ensureDirectory(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, {
            recursive: true
        });
    }
}

function cleanFileName(fileName) {
    return String(fileName || 'anexo')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .trim() || 'anexo';
}

function normalizeCampaignId(campaignId) {
    const value = String(campaignId || '').trim();

    if (!value) {
        throw new Error(
            'ID da campanha não informado ao selecionar anexos.'
        );
    }

    return value;
}

function getCampaignOrThrow(campaignId) {
    const normalizedId = normalizeCampaignId(campaignId);

    const campaign = repository.getEmailCampaignById(
        normalizedId
    );

    if (!campaign) {
        throw new Error(
            `Campanha não encontrada no banco ativo: ${normalizedId}`
        );
    }

    return campaign;
}

function getCampaignDirectory(campaignId) {
    const baseDirectory = getEmailAttachmentsPath();
    const directory = path.join(
        baseDirectory,
        String(campaignId)
    );

    ensureDirectory(directory);

    return directory;
}

function getSafeDestinationPath(
    campaignId,
    originalFileName
) {
    const directory = getCampaignDirectory(campaignId);
    const safeOriginalName = cleanFileName(originalFileName);
    const extension = path.extname(safeOriginalName);
    const baseName = path.basename(
        safeOriginalName,
        extension
    );

    const storedFileName =
        `${Date.now()}-${crypto.randomUUID()}-${baseName}${extension}`;

    return {
        storedFileName,
        storedFilePath: path.join(directory, storedFileName)
    };
}

function buildAttachmentRecord(
    campaignId,
    sourceFilePath,
    storedFileName,
    storedFilePath
) {
    const stat = fs.statSync(storedFilePath);

    return {
        id: crypto.randomUUID(),
        campaign_id: String(campaignId),
        file_name: path.basename(sourceFilePath),
        stored_file_name: storedFileName,
        stored_file_path: storedFilePath,
        mime_type: null,
        file_size: toSafeNumber(stat.size, 0),
        created_at: new Date().toISOString()
    };
}

function createAttachmentRecord(record) {
    const database = require('../../database/connection')
        .getDatabase();

    database.prepare(`
        INSERT INTO email_campaign_attachments (
            id,
            campaign_id,
            file_name,
            stored_file_name,
            stored_file_path,
            mime_type,
            file_size,
            created_at
        ) VALUES (
            @id,
            @campaign_id,
            @file_name,
            @stored_file_name,
            @stored_file_path,
            @mime_type,
            @file_size,
            @created_at
        )
    `).run(record);

    return record;
}

function listCampaignAttachments(campaignId) {
    const normalizedId = normalizeCampaignId(campaignId);

    getCampaignOrThrow(normalizedId);

    return repository.listEmailCampaignAttachments(
        normalizedId
    );
}

async function selectAndSaveCampaignAttachments(campaignId) {
    const normalizedId = normalizeCampaignId(campaignId);

    getCampaignOrThrow(normalizedId);

    const result = await dialog.showOpenDialog({
        title: 'Selecionar arquivos para anexar',
        properties: [
            'openFile',
            'multiSelections'
        ],
        filters: [
            {
                name: 'Arquivos permitidos',
                extensions: [
                    'xlsx',
                    'xls',
                    'xlsm',
                    'csv',
                    'pdf',
                    'doc',
                    'docx',
                    'txt'
                ]
            },
            {
                name: 'Todos os arquivos',
                extensions: ['*']
            }
        ]
    });

    if (result.canceled || !result.filePaths?.length) {
        return {
            cancelled: true,
            added_count: 0,
            attachments: listCampaignAttachments(
                normalizedId
            )
        };
    }

    const added = [];
    const ignored = [];

    for (const sourceFilePath of result.filePaths) {
        try {
            if (!fs.existsSync(sourceFilePath)) {
                ignored.push({
                    path: sourceFilePath,
                    reason: 'Arquivo não encontrado.'
                });

                continue;
            }

            const extension = path.extname(
                sourceFilePath
            ).toLowerCase();

            if (!ALLOWED_EXTENSIONS.has(extension)) {
                ignored.push({
                    path: sourceFilePath,
                    reason: `Extensão não permitida: ${extension || 'sem extensão'}`
                });

                continue;
            }

            const {
                storedFileName,
                storedFilePath
            } = getSafeDestinationPath(
                normalizedId,
                path.basename(sourceFilePath)
            );

            fs.copyFileSync(
                sourceFilePath,
                storedFilePath
            );

            const record = buildAttachmentRecord(
                normalizedId,
                sourceFilePath,
                storedFileName,
                storedFilePath
            );

            createAttachmentRecord(record);
            added.push(record);
        } catch (error) {
            ignored.push({
                path: sourceFilePath,
                reason: error?.message || 'Erro ao salvar arquivo.'
            });
        }
    }

    const attachments = listCampaignAttachments(
        normalizedId
    );

    return {
        cancelled: false,
        added_count: added.length,
        ignored_count: ignored.length,
        ignored,
        attachments,
        message: added.length
            ? `${added.length} anexo(s) adicionado(s) com sucesso.`
            : 'Nenhum arquivo foi anexado.'
    };
}

function removeCampaignAttachment(attachmentId) {
    const id = String(attachmentId || '').trim();

    if (!id) {
        throw new Error('ID do anexo não informado.');
    }

    const database = require('../../database/connection')
        .getDatabase();

    const attachment = database.prepare(`
        SELECT *
        FROM email_campaign_attachments
        WHERE id = ?
        LIMIT 1
    `).get(id);

    if (!attachment) {
        throw new Error('Anexo não encontrado.');
    }

    const result = database.prepare(`
        DELETE FROM email_campaign_attachments
        WHERE id = ?
    `).run(id);

    if (!result.changes) {
        throw new Error('Não foi possível remover o anexo.');
    }

    if (
        attachment.stored_file_path &&
        fs.existsSync(attachment.stored_file_path)
    ) {
        try {
            fs.unlinkSync(attachment.stored_file_path);
        } catch (error) {
            console.warn(
                'Não foi possível apagar o arquivo físico do anexo:',
                error.message
            );
        }
    }

    return {
        success: true,
        id
    };
}

function getCampaignAttachmentsForSmtp(campaignId) {
    const attachments = listCampaignAttachments(campaignId);

    return attachments
        .filter((attachment) => {
            return (
                attachment.stored_file_path &&
                fs.existsSync(attachment.stored_file_path)
            );
        })
        .map((attachment) => ({
            filename: attachment.file_name,
            path: attachment.stored_file_path,
            contentType: attachment.mime_type || undefined
        }));
}

function getCampaignAttachmentValidation(campaignId) {
    const attachments = listCampaignAttachments(campaignId);

    const missing = attachments.filter((attachment) => {
        return (
            !attachment.stored_file_path ||
            !fs.existsSync(attachment.stored_file_path)
        );
    });

    return {
        attachments,
        missing
    };
}

function getDatabaseInfo() {
    const {
        getDatabasePath
    } = require('../../database/connection');

    return {
        databasePath: getDatabasePath(),
        attachmentsPath: getEmailAttachmentsPath()
    };
}

module.exports = {
    listCampaignAttachments,
    selectAndSaveCampaignAttachments,
    removeCampaignAttachment,
    getCampaignAttachmentsForSmtp,
    getCampaignAttachmentValidation,
    getDatabaseInfo
};