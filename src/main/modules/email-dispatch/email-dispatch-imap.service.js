const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('node:fs');
const path = require('node:path');

const repository = require('./email-dispatch.repository');

const {
    EMAIL_FILE_TYPE,
    EMAIL_CONFIG,
    getEmailDownloadsPath
} = require('./email-dispatch.config');
const {
    toSafeNumber
} = require('../../utils/validation.utils');

function extractCampaignCodeFromSubject(subject) {
    if (!subject || typeof subject !== 'string') {
        return null;
    }

    const match = subject.match(/\[ALF-([A-Z0-9]{6})\]/i);

    return match
        ? 'ALF-' + String(match[1]).toUpperCase()
        : null;
}

function normalizeMessageId(value) {
    return String(value || '')
        .trim()
        .replace(/^<|>$/g, '')
        .toLowerCase();
}

function extractMessageIds(value) {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value
            .flatMap((item) => extractMessageIds(item))
            .filter(Boolean);
    }

    const text = String(value);
    const bracketed = text.match(/<[^>]+>/g) || [];

    if (bracketed.length > 0) {
        return bracketed
            .map(normalizeMessageId)
            .filter(Boolean);
    }

    return text
        .split(/\s+/)
        .map(normalizeMessageId)
        .filter(Boolean);
}

function findCampaignByCodeOrMessageId(
    campaignCode,
    inReplyTo,
    references
) {
    const database =
        require('../../database/connection').getDatabase();

    if (campaignCode) {
        const campaign = database.prepare(`
            SELECT *
            FROM email_campaigns
            WHERE UPPER(TRIM(campaign_code)) = ?
            LIMIT 1
        `).get(String(campaignCode).toUpperCase());

        if (campaign) {
            return campaign;
        }
    }

    const messageIds = [
        ...extractMessageIds(inReplyTo),
        ...extractMessageIds(references)
    ];

    if (messageIds.length === 0) {
        return null;
    }

    const sentEmails = database.prepare(`
        SELECT campaign_id, sent_message_id
        FROM sent_emails
        WHERE sent_message_id IS NOT NULL
    `).all();

    for (const messageId of messageIds) {
        const sentEmail = sentEmails.find((item) => {
            return normalizeMessageId(item.sent_message_id) === messageId;
        });

        if (!sentEmail?.campaign_id) {
            continue;
        }

        const campaign = database.prepare(`
            SELECT *
            FROM email_campaigns
            WHERE id = ?
            LIMIT 1
        `).get(sentEmail.campaign_id);

        if (campaign) {
            return campaign;
        }
    }

    return null;
}

function getConfigValue(config, names, fallback = '') {
    for (const name of names) {
        if (
            config &&
            config[name] !== undefined &&
            config[name] !== null &&
            String(config[name]).trim() !== ''
        ) {
            return config[name];
        }
    }

    return fallback;
}

function getText(config, names, fallback = '') {
    return String(
        getConfigValue(config, names, fallback) || ''
    ).trim();
}

function getNumber(config, names, fallback = 0) {
    const value = getConfigValue(config, names, fallback);
    return toSafeNumber(value, fallback);
}

function normalizeImapConfig(sourceConfig = {}) {
    return {
        user: getText(sourceConfig, [
            'imapuser',
            'imap_user'
        ]),

        password: getText(sourceConfig, [
            'imappasswordencrypted',
            'imap_password_encrypted',
            'imappassword',
            'imap_password'
        ]),

        host: getText(sourceConfig, [
            'imaphost',
            'imap_host'
        ]),

        port: getNumber(sourceConfig, [
            'imapport',
            'imap_port'
        ], 993),

        secureMode: getText(sourceConfig, [
            'imapsecure',
            'imap_secure'
        ], 'tls'),

        fromEmail: getText(sourceConfig, [
            'fromemail',
            'from_email'
        ])
    };
}

function validateImapConfig(config) {
    if (!config.host) {
        throw new Error('Informe o IMAP Host.');
    }

    if (!config.port) {
        throw new Error('Informe a IMAP Porta.');
    }

    if (!config.user) {
        throw new Error('Informe o IMAP Usuário.');
    }

    if (!config.password) {
        throw new Error(
            'Informe a IMAP Senha antes de testar ou consultar.'
        );
    }
}

function getImapConfig(sourceConfig) {
    const config = normalizeImapConfig(sourceConfig);

    validateImapConfig(config);

    return {
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
        tls: [
            'tls',
            'ssl',
            'tls/ssl'
        ].includes(String(config.secureMode).toLowerCase()),
        tlsOptions: {
            servername: config.host
        },
        connTimeout: EMAIL_CONFIG.CONNECTION_TIMEOUT_MS,
        authTimeout: EMAIL_CONFIG.CONNECTION_TIMEOUT_MS
    };
}

function searchCriteria(sourceConfig) {
    const config = normalizeImapConfig(sourceConfig);
    const criteria = [];

    if (config.fromEmail) {
        criteria.push(['TO', config.fromEmail]);
    }

    return criteria;
}

async function processIncomingEmails(config, campaign) {
    const imap = new Imap(getImapConfig(config));
    const processed = [];
    const details = [];
    const processingPromises = [];

    await new Promise((resolve, reject) => {
        let settled = false;

        function finish() {
            if (settled) {
                return;
            }

            settled = true;
            resolve();
        }

        function fail(error) {
            if (settled) {
                return;
            }

            settled = true;
            reject(error);
        }

        imap.once('ready', () => {
            imap.openBox('INBOX', false, (openError) => {
                if (openError) {
                    fail(openError);
                    return;
                }

                imap.search(
                    searchCriteria(config),
                    (searchError, results) => {
                        if (searchError) {
                            fail(searchError);
                            return;
                        }

                        if (!results || !results.length) {
                            imap.end();
                            finish();
                            return;
                        }

                        const fetch = imap.fetch(results, {
                            bodies: '',
                            markSeen: false
                        });

                        fetch.on('message', (message, sequenceNumber) => {
                            let messageBuffer = Buffer.alloc(0);

                            message.on('body', (stream) => {
                                stream.on('data', (chunk) => {
                                    messageBuffer = Buffer.concat([
                                        messageBuffer,
                                        Buffer.from(chunk)
                                    ]);
                                });
                            });

                            message.once('end', () => {
                                const task = (async () => {
                                    try {
                                        const parsed = await simpleParser(
                                            messageBuffer
                                        );

                                        const result =
                                            await processEmailMessage(
                                                parsed,
                                                config,
                                                campaign
                                            );

                                        if (result?.processed) {
                                            processed.push(result);
                                            details.push(result);
                                        }

                                        if (result?.handled) {
                                            imap.addFlags(
                                                sequenceNumber,
                                                '\\Seen',
                                                (flagError) => {
                                                    if (flagError) {
                                                        console.error(
                                                            'Erro ao marcar mensagem como lida:',
                                                            flagError.message
                                                        );
                                                    }
                                                }
                                            );
                                        }
                                    } catch (error) {
                                        console.error(
                                            'Erro ao processar e-mail:',
                                            error.message
                                        );
                                    }
                                })();

                                processingPromises.push(task);
                            });
                        });

                        fetch.once('error', fail);

                        fetch.once('end', async () => {
                            try {
                                await Promise.all(processingPromises);
                                finish();
                            } catch (error) {
                                fail(error);
                            } finally {
                                imap.end();
                            }
                        });
                    }
                );
            });
        });

        imap.once('error', fail);
        imap.connect();
    });

    return {
        processed: processed.length,
        details
    };
}

async function processEmailMessage(parsed, config, requestedCampaign) {
    const campaignCode = extractCampaignCodeFromSubject(
        parsed.subject
    );

    const inReplyTo = parsed.inReplyTo || null;
    const references = parsed.references || null;

    const linkedCampaign = findCampaignByCodeOrMessageId(
        campaignCode,
        inReplyTo,
        references
    );

    if (!linkedCampaign) {
        console.log(
            '[EMAIL][IGNORADO] Sem campanha vinculada:',
            parsed.subject || '(sem assunto)'
        );

        return {
            handled: true,
            processed: false,
            ignored: true,
            reason: 'Sem campanha vinculada'
        };
    }

    if (
        requestedCampaign?.id &&
        String(linkedCampaign.id) !== String(requestedCampaign.id)
    ) {
        console.log(
            '[EMAIL][IGNORADO] Resposta pertence a outra campanha:',
            linkedCampaign.id
        );

        return {
            handled: false,
            processed: false,
            ignored: true,
            reason: 'Pertence a outra campanha'
        };
    }

    if (!parsed.attachments || !parsed.attachments.length) {
        console.log(
            '[EMAIL][VINCULADO] Sem anexos:',
            parsed.subject || '(sem assunto)'
        );

        return {
            handled: true,
            processed: false,
            ignored: true,
            reason: 'Resposta vinculada sem anexos',
            campaign_id: linkedCampaign.id,
            campaign_code: campaignCode
        };
    }

    console.log(
        '[EMAIL][VINCULADO] Campanha:',
        linkedCampaign.id,
        '| Código:',
        campaignCode || '(via Message-ID)',
        '| Assunto:',
        parsed.subject || '(sem assunto)'
    );

    const attachment = parsed.attachments[0];
    const originalFileName = attachment.filename || 'anexo.xlsx';

    const fileType = detectFileType(
        originalFileName,
        parsed.subject
    );

    if (!fileType) {
        console.log(
            '[EMAIL][IGNORADO] Tipo não identificado:',
            originalFileName
        );

        return {
            handled: true,
            processed: false,
            ignored: true,
            reason: 'Tipo de arquivo não identificado',
            campaign_id: linkedCampaign.id,
            campaign_code: campaignCode
        };
    }

    const laboratory = extractLaboratory(
        originalFileName,
        parsed.subject
    );

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());

    const finalFileName = buildFinalFileName(
        fileType,
        laboratory,
        month,
        year
    );

    const downloadsPath = getEmailDownloadsPath();

    ensureDirectoryExists(downloadsPath);

    const temporaryPath = path.join(
        downloadsPath,
        finalFileName
    );

    await saveAttachment(attachment, temporaryPath);

    const destinationFolder = getDestinationFolder(fileType);

    ensureDirectoryExists(destinationFolder);

    const finalPath = path.join(
        destinationFolder,
        finalFileName
    );

    if (fs.existsSync(finalPath)) {
        fs.unlinkSync(finalPath);
    }

    fs.copyFileSync(temporaryPath, finalPath);

    const recipient = findRecipientByFrom(
        linkedCampaign,
        parsed.from
    );

    if (recipient) {
        repository.updateEmailRecipientStatus(
            recipient.id,
            'replied'
        );
    }

    const response = repository.createProcessedResponse({
        campaign_id: linkedCampaign.id,
        recipient_id: recipient ? recipient.id : null,
        email_from: getAddressText(parsed.from),
        email_subject: parsed.subject || '',
        received_at: parsed.date
            ? parsed.date.toISOString()
            : new Date().toISOString(),
        file_name_original: originalFileName,
        file_name_final: finalFileName,
        file_type: fileType,
        file_path_final: finalPath
    });

    console.log(
        '[EMAIL][PROCESSADO] ' +
        originalFileName +
        ' -> ' +
        finalPath +
        ' | Campanha: ' +
        linkedCampaign.id
    );

    return {
        handled: true,
        processed: true,
        ignored: false,
        campaign_id: linkedCampaign.id,
        campaign_code: campaignCode ||
            linkedCampaign.campaign_code ||
            null,
        response
    };
}

function detectFileType(fileName, subject) {
    const text = `${fileName || ''} ${subject || ''}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

    if (text.includes('PRECO') || text.includes('PRECOS')) {
        return EMAIL_FILE_TYPE.PRICES;
    }

    if (
        text.includes('PENDENCIA') ||
        text.includes('PENDENCIAS')
    ) {
        return EMAIL_FILE_TYPE.PENDING;
    }

    return null;
}

function extractLaboratory(fileName, subject) {
    const text = `${fileName || ''} ${subject || ''}`;

    const explicitMatch = text.match(
        /(?:LABORATORIO|LAB)[:\-\s]+([A-Z0-9][A-Z0-9_-]{2,20})/i
    );

    if (explicitMatch?.[1]) {
        return explicitMatch[1].trim().toUpperCase();
    }

    const validLaboratories = [
        'ACHE',
        'BALDACCI',
        'BIOLAB',
        'BIOSINTETICA',
        'EUROFARMA',
        'GEOLAB',
        'HERBARIUM',
        'HIPOLABOR',
        'LEGRAND',
        'MEDLEY',
        'MYRALIS',
        'PRATI',
        'QUIMIO',
        'SANDOZ',
        'TEUTO',
        'UNIAOQUIMICA',
        'VITALAB',
        'ZODIAC'
    ];

    const normalized = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

    for (const laboratory of validLaboratories) {
        if (normalized.includes(laboratory)) {
            return laboratory;
        }
    }

    return 'DESCONHECIDO';
}

function buildFinalFileName(fileType, laboratory, month, year) {
    const pattern = fileType === EMAIL_FILE_TYPE.PRICES
        ? EMAIL_CONFIG.FILE_NAME_PATTERNS.PRICES
        : EMAIL_CONFIG.FILE_NAME_PATTERNS.PENDING;

    return pattern
        .replace('{{laboratorio}}', laboratory)
        .replace('{{mes}}', month)
        .replace('{{ano}}', year);
}

function getDestinationFolder(fileType) {
    return fileType === EMAIL_FILE_TYPE.PRICES
        ? EMAIL_CONFIG.DESTINATION_FOLDERS.PRICES
        : EMAIL_CONFIG.DESTINATION_FOLDERS.PENDING;
}

function ensureDirectoryExists(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, {
            recursive: true
        });
    }
}

async function saveAttachment(attachment, filePath) {
    if (!attachment?.content) {
        throw new Error('Anexo de e-mail sem conteúdo.');
    }

    const content = Buffer.isBuffer(attachment.content)
        ? attachment.content
        : Buffer.from(attachment.content);

    await fs.promises.writeFile(filePath, content);
}

function getAddressText(from) {
    if (!from) {
        return '';
    }

    if (Array.isArray(from.value) && from.value[0]) {
        return from.value[0].address || '';
    }

    if (from.address) {
        return from.address;
    }

    if (typeof from.text === 'string') {
        const match = from.text.match(
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
        );

        return match?.[0] || from.text;
    }

    return '';
}

function findRecipientByFrom(campaign, from) {
    if (!campaign?.id || !from) {
        return null;
    }

    const sender = getAddressText(from).toLowerCase();

    if (!sender || !sender.includes('@')) {
        return null;
    }

    const recipients = repository.listEmailRecipients(
        campaign.id
    );

    return recipients.find((recipient) => {
        return String(recipient.email || '')
            .trim()
            .toLowerCase() === sender;
    }) || null;
}

async function testImapConnection(sourceConfig) {
    try {
        const normalized = normalizeImapConfig(sourceConfig);
        const imap = new Imap(getImapConfig(sourceConfig));

        return await new Promise((resolve) => {
            imap.once('ready', () => {
                imap.end();

                resolve({
                    success: true,
                    message:
                        'Conexão IMAP OK: ' +
                        normalized.host +
                        ':' +
                        normalized.port +
                        ' — ' +
                        normalized.user
                });
            });

            imap.once('error', (error) => {
                resolve({
                    success: false,
                    message:
                        error?.message ||
                        'Falha desconhecida no IMAP.'
                });
            });

            imap.connect();
        });
    } catch (error) {
        return {
            success: false,
            message:
                error?.message ||
                'Falha desconhecida na configuração IMAP.'
        };
    }
}

module.exports = {
    processIncomingEmails,
    testImapConnection,
    extractCampaignCodeFromSubject,
    findCampaignByCodeOrMessageId
};
