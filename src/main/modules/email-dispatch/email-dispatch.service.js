const crypto = require('node:crypto');
const repository = require('./email-dispatch.repository');
const {
    sendEmailViaSmtp
} = require('./email-dispatch-smtp.service');
const {
    processIncomingEmails
} = require('./email-dispatch-imap.service');
const {
    getCampaignAttachmentsForSmtp,
    getCampaignAttachmentValidation
} = require('./email-dispatch-attachments.service');
const {
    EMAIL_STATUS,
    DEFAULT_SEND_INTERVAL_MS
} = require('./email-dispatch.constants');
const {
    isValidEmail,
    toSafeNumber
} = require('../../utils/validation.utils');


/**
 * Gera código único de campanha (formato: ALF-8F29C1)
 * @returns {string} Código no formato ALF-XXXXXX
 */
function generateCampaignCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randomBytes = crypto.randomBytes(6);
    let code = 'ALF-';
    
    for (let i = 0; i < 6; i++) {
        code += chars[randomBytes[i] % chars.length];
    }
    
    return code;
}


/**
 * Insere o código da campanha no assunto do e-mail
 * @param {string} subject - Assunto original
 * @param {string} campaignCode - Código da campanha (ALF-XXXXXX)
 * @returns {string} Assunto com código inserido
 */
function insertCampaignCodeInSubject(subject, campaignCode) {
    const cleanedSubject = subject.replace(/\s*\[ALF-[A-Z0-9]{6}\]\s*/gi, '').trim();
    return cleanedSubject + ' [' + campaignCode + ']';
}


/**
 * Salva registro de e-mail enviado na tabela sent_emails
 */
function saveSentEmail(campaignId, campaignCode, recipientId, recipientEmail, sentMessageId, subject, status, errorMessage) {
    const database = require('../../database/connection').getDatabase();
    const now = new Date().toISOString();
    
    const record = {
        id: crypto.randomUUID(),
        campaign_id: campaignId,
        campaign_code: campaignCode,
        recipient_id: recipientId,
        recipient_email: recipientEmail,
        sent_message_id: sentMessageId,
        subject: subject,
        sent_at: now,
        status: status || 'sent',
        error_message: errorMessage || null,
        created_at: now,
        updated_at: now
    };
    
    database.prepare(`
        INSERT INTO sent_emails (
            id, campaign_id, campaign_code, recipient_id, recipient_email,
            sent_message_id, subject, sent_at, status, error_message,
            created_at, updated_at
        ) VALUES (
            @id, @campaign_id, @campaign_code, @recipient_id, @recipient_email,
            @sent_message_id, @subject, @sent_at, @status, @error_message,
            @created_at, @updated_at
        )
    `).run(record);
    
    return record;
}


function getValue(data, names, fallback = '') {
    for (const name of names) {
        if (
            data &&
            data[name] !== undefined &&
            data[name] !== null
        ) {
            return data[name];
        }
    }

    return fallback;
}


function getText(data, names, fallback = '') {
    return String(getValue(data, names, fallback) || '').trim();
}


function getPort(data, names, fallback = 0) {
    const value = getValue(data, names, fallback);
    return toSafeNumber(value, fallback);
}


function normalizeConfigData(data = {}, existing = null) {
    const smtpPasswordInput = getText(data, [
        'smtp_password_encrypted',
        'smtp_password_encrypted'
    ]);

    const imapPasswordInput = getText(data, [
        'imap_password_encrypted',
        'imap_password_encrypted'
    ]);

    const existingSmtpPassword = getText(existing, [
        'smtp_password_encrypted',
        'smtp_password_encrypted'
    ]);

    const existingImapPassword = getText(existing, [
        'imap_password_encrypted',
        'imap_password_encrypted'
    ]);

    return {
        name: getText(data, ['name']),

        smtp_host: getText(data, ['smtp_host', 'smtp_host']),
        smtp_port: getPort(data, ['smtp_port', 'smtp_port']),
        smtp_secure: getText(
            data,
            ['smtp_secure', 'smtp_secure'],
            'starttls'
        ) || 'starttls',
        smtp_user: getText(data, ['smtp_user', 'smtp_user']),
        smtp_password_encrypted: smtpPasswordInput || existingSmtpPassword,

        imap_host: getText(data, ['imap_host', 'imap_host']),
        imap_port: getPort(data, ['imap_port', 'imap_port']),
        imap_secure: getText(
            data,
            ['imap_secure', 'imap_secure'],
            'tls'
        ) || 'tls',
        imap_user: getText(data, ['imap_user', 'imap_user']),
        imap_password_encrypted: imapPasswordInput || existingImapPassword,

        from_name: getText(data, ['from_name', 'from_name']),
        from_email: getText(data, ['from_email', 'from_email']),
        reply_to_email: getText(
            data,
            ['reply_to_email', 'reply_to_email']
        ) || null
    };
}


function listConfigs() {
    return repository.listEmailConfigs();
}


function getConfigById(id) {
    return repository.getEmailConfigById(id);
}


function createConfig(data = {}) {
    const normalized = normalizeConfigData(data);

    validateConfigData(normalized, {
        partial: false,
        requirePasswords: true
    });

    return repository.createEmailConfig(normalized);
}


function updateConfig(id, data = {}) {
    const existing = repository.getEmailConfigById(id);

    if (!existing) {
        throw new Error('Configuração não encontrada.');
    }

    const normalized = normalizeConfigData(data, existing);

    validateConfigData(normalized, {
        partial: false,
        requirePasswords: true
    });

    return repository.updateEmailConfig(id, normalized);
}


function validateConfigData(
    data,
    {
        partial = false,
        requirePasswords = false
    } = {}
) {
    const requiredFields = [
        ['name', 'Informe o nome da configuração.'],
        ['smtp_host', 'Informe o host SMTP.'],
        ['smtp_port', 'Informe a porta SMTP.'],
        ['smtp_user', 'Informe o usuário SMTP.'],
        ['imap_host', 'Informe o host IMAP.'],
        ['imap_port', 'Informe a porta IMAP.'],
        ['imap_user', 'Informe o usuário IMAP.'],
        ['from_name', 'Informe o nome do remetente.'],
        ['from_email', 'Informe o e-mail do remetente.']
    ];

    if (requirePasswords) {
        requiredFields.push(
            ['smtp_password_encrypted', 'Informe a senha SMTP.'],
            ['imap_password_encrypted', 'Informe a senha IMAP.']
        );
    }

    for (const [field, errorMessage] of requiredFields) {
        const value = data[field];

        if (!partial && !String(value || '').trim()) {
            throw new Error(errorMessage);
        }
    }

    if (!isValidEmail(data.from_email)) {
        throw new Error(
            'Informe um e-mail válido para o remetente.'
        );
    }

    if (
        data.reply_to_email &&
        !isValidEmail(data.reply_to_email)
    ) {
        throw new Error(
            'Informe um e-mail válido para resposta.'
        );
    }

    validatePort(data.smtp_port, 'SMTP');
    validatePort(data.imap_port, 'IMAP');
}


function validatePort(value, label) {
    const port = toSafeNumber(value, 0);

    if (
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535
    ) {
        throw new Error(
            'Informe uma porta ' + label + ' válida entre 1 e 65535.'
        );
    }
}


function listCampaigns() {
    return repository.listEmailCampaigns();
}


function listProcessableCampaigns() {
    return listCampaigns().filter(isCampaignProcessable);
}


function isCampaignProcessable(campaign) {
    if (!campaign) {
        return false;
    }

    if (
        campaign.active !== undefined &&
        !toSafeNumber(campaign.active, 0)
    ) {
        return false;
    }

    if (
        campaign.enabled !== undefined &&
        !toSafeNumber(campaign.enabled, 0)
    ) {
        return false;
    }

    if (
        campaign.is_active !== undefined &&
        !toSafeNumber(campaign.is_active, 0)
    ) {
        return false;
    }

    const status = String(campaign.status || '')
        .trim()
        .toLowerCase();

    return ![
        'inactive',
        'inativa',
        'paused',
        'pausada',
        'archived',
        'arquivada',
        'cancelled',
        'cancelada'
    ].includes(status);
}


function getCampaignById(id) {
    return repository.getEmailCampaignById(id);
}


function createCampaign(data = {}) {
    validateCampaignData(data);

    if (!repository.getEmailConfigById(data.config_id)) {
        throw new Error('Configuração de e-mail não encontrada.');
    }

    return repository.createEmailCampaign(data);
}


function updateCampaign(id, data = {}) {
    if (!repository.getEmailCampaignById(id)) {
        throw new Error('Campanha não encontrada.');
    }

    validateCampaignData(data, {
        partial: true
    });

    if (
        data.config_id !== undefined &&
        !repository.getEmailConfigById(data.config_id)
    ) {
        throw new Error('Configuração de e-mail não encontrada.');
    }

    return repository.updateEmailCampaign(id, data);
}


function validateCampaignData(data, { partial = false } = {}) {
    const requiredFields = [
        ['config_id', 'Selecione uma configuração de e-mail.'],
        ['subject', 'Informe o assunto da campanha.'],
        ['body_template', 'Informe o corpo da mensagem.']
    ];

    for (const [field, errorMessage] of requiredFields) {
        if (
            !partial &&
            !String(data[field] || '').trim()
        ) {
            throw new Error(errorMessage);
        }
    }

    if (
        data.subject !== undefined &&
        !String(data.subject || '').trim()
    ) {
        throw new Error('Informe o assunto da campanha.');
    }

    if (
        data.body_template !== undefined &&
        !String(data.body_template || '').trim()
    ) {
        throw new Error('Informe o corpo da mensagem.');
    }

    // Validar CC se informado
    if (data.cc !== undefined && data.cc !== null && data.cc !== "") {
        const ccEmails = String(data.cc)
            .replace(/[,;]/g, '\n')
            .split('\n')
            .map((e) => e.trim())
            .filter(Boolean);

        for (const email of ccEmails) {
            if (!isValidEmail(email)) {
                throw new Error(
                    `E-mail inválido em CC: ${email}. Use apenas e-mails válidos, separados por vírgula ou ponto e vírgula.`
                );
            }
        }
    }

    // Validar BCC se informado
    if (data.bcc !== undefined && data.bcc !== null && data.bcc !== "") {
        const bccEmails = String(data.bcc)
            .replace(/[,;]/g, '\n')
            .split('\n')
            .map((e) => e.trim())
            .filter(Boolean);

        for (const email of bccEmails) {
            if (!isValidEmail(email)) {
                throw new Error(
                    `E-mail inválido em CCO: ${email}. Use apenas e-mails válidos, separados por vírgula ou ponto e vírgula.`
                );
            }
        }
    }
}


function deleteCampaign(id) {
    return repository.deleteEmailCampaign(id);
}


function listRecipients(campaignId) {
    return repository.listEmailRecipients(campaignId);
}


function getRecipientById(id) {
    return repository.getEmailRecipientById(id);
}


function createRecipient(data = {}) {
    validateRecipientData(data);

    if (!repository.getEmailCampaignById(data.campaign_id)) {
        throw new Error('Campanha não encontrada.');
    }

    return repository.createEmailRecipient(
        normalizeRecipientData(data)
    );
}


function createRecipientsBatch(campaignId, recipientsData) {
    if (
        !Array.isArray(recipientsData) ||
        recipientsData.length === 0
    ) {
        throw new Error('Informe ao menos um destinatário.');
    }

    if (!repository.getEmailCampaignById(campaignId)) {
        throw new Error('Campanha não encontrada.');
    }

    const created = [];
    const errors = [];

    for (
        let index = 0;
        index < recipientsData.length;
        index += 1
    ) {
        const item = recipientsData[index] || {};

        try {
            const recipient = createRecipient({
                campaign_id: campaignId,
                email: item.email,
                name: item.name,
                company: item.company,
                extra_data: item.extra_data
            });

            created.push(recipient);
        } catch (error) {
            errors.push({
                index,
                email: String(item.email || ''),
                error: error.message
            });
        }
    }

    return {
        created,
        errors,
        total: recipientsData.length
    };
}


function validateRecipientData(data) {
    if (!data.campaign_id) {
        throw new Error('Informe o ID da campanha.');
    }

    if (!isValidEmail(data.email)) {
        throw new Error(
            'Informe um e-mail de destinatário válido.'
        );
    }
}


function normalizeRecipientData(data) {
    return {
        ...data,
        email: String(data.email).trim().toLowerCase(),
        name: data.name
            ? String(data.name).trim()
            : null,
        company: data.company
            ? String(data.company).trim()
            : null
    };
}


function deleteRecipient(id) {
    return repository.deleteEmailRecipient(id);
}


function listCampaignAttachments(campaignId) {
    return repository.listEmailCampaignAttachments(campaignId);
}


function listCampaignSendLogs(campaignId) {
    return repository.listEmailSendLogs(campaignId);
}


function listCampaignHistory(campaignId) {
    return repository.listEmailCampaignHistory(campaignId);
}


function getCampaignDashboard(campaignId) {
    return repository.getEmailCampaignDashboard(campaignId);
}


async function sendCampaign(campaignId, options = {}) {
    const campaign = repository.getEmailCampaignById(campaignId);

    if (!campaign) {
        throw new Error('Campanha não encontrada.');
    }

    if (!isCampaignProcessable(campaign)) {
        throw new Error(
            'A campanha está inativa, pausada ou arquivada.'
        );
    }

    // Gera código de campanha se não existir
    let campaignCode = campaign.campaign_code;
    if (!campaignCode) {
        campaignCode = generateCampaignCode();
        repository.updateEmailCampaign(campaignId, { campaign_code: campaignCode });
    }

    const config = repository.getEmailConfigById(
        campaign.config_id
    );

    if (!config) {
        throw new Error(
            'Configuração de e-mail não encontrada.'
        );
    }

    const recipients = repository.listEmailRecipients(
        campaignId
    );

    if (recipients.length === 0) {
        throw new Error(
            'Nenhum destinatário cadastrado na campanha.'
        );
    }

    const attachmentValidation =
        getCampaignAttachmentValidation(campaignId);

    if (attachmentValidation.missing.length > 0) {
        const names = attachmentValidation.missing
            .map((attachment) => {
                return (
                    attachment.filename ||
                    attachment.file_name ||
                    'anexo sem nome'
                );
            })
            .join(', ');

        throw new Error(
            'Não foi possível localizar ' + attachmentValidation.missing.length + ' anexo(s): ' + names + '. ' +
            'Remova e adicione os arquivos novamente antes de enviar.'
        );
    }

    const attachments = getCampaignAttachmentsForSmtp(
        campaignId
    );

    const sendInterval = normalizeSendInterval(
        options.sendInterval
    );

    const results = [];

    // Insere código no assunto
    const subjectWithCode = insertCampaignCodeInSubject(campaign.subject, campaignCode);

    for (let index = 0; index < recipients.length; index += 1) {
        const recipient = recipients[index];

        if (
            recipient.status === EMAIL_STATUS.SENT ||
            recipient.status === EMAIL_STATUS.REPLIED
        ) {
            results.push({
                recipient_id: recipient.id,
                email: recipient.email,
                status: 'skipped',
                reason: 'Já enviado ou respondido'
            });

            continue;
        }

        const data = {
            nome: recipient.name || '',
            empresa: recipient.company || '',
            email: recipient.email
        };

        const body = replacePlaceholders(
            campaign.body_template,
            data
        );

        try {
            const sendResult = await sendEmailViaSmtp(
                config,
                {
                    to: recipient.email,
                    toName: recipient.name,
                    cc: campaign.cc || null,
                    bcc: campaign.bcc || null,
                    subject: subjectWithCode,
                    html: body
                },
                attachments
            );

            // Salva em sent_emails
            saveSentEmail(
                campaignId,
                campaignCode,
                recipient.id,
                recipient.email,
                sendResult?.messageId || null,
                subjectWithCode,
                'sent',
                null
            );

            repository.updateEmailRecipientStatus(
                recipient.id,
                EMAIL_STATUS.SENT,
                {
                    error_message: null
                }
            );

            repository.createEmailSendLog({
                campaign_id: campaignId,
                recipient_id: recipient.id,
                recipient_email: recipient.email,
                subject: subjectWithCode,
                status: 'sent',
                message_id: sendResult?.messageId || null,
                sent_at: new Date().toISOString()
            });

            results.push({
                recipient_id: recipient.id,
                email: recipient.email,
                status: 'sent',
                message_id: sendResult?.messageId || null,
                attachment_count: attachments.length
            });
        } catch (error) {
            const errorMessage = error?.message ||
                'Falha desconhecida ao enviar e-mail.';

            // Salva erro em sent_emails
            saveSentEmail(
                campaignId,
                campaignCode,
                recipient.id,
                recipient.email,
                null,
                subjectWithCode,
                'error',
                errorMessage
            );

            repository.updateEmailRecipientStatus(
                recipient.id,
                EMAIL_STATUS.ERROR,
                {
                    error_message: errorMessage
                }
            );

            repository.createEmailSendLog({
                campaign_id: campaignId,
                recipient_id: recipient.id,
                recipient_email: recipient.email,
                subject: subjectWithCode,
                status: 'failed',
                error_message: errorMessage
            });

            results.push({
                recipient_id: recipient.id,
                email: recipient.email,
                status: 'error',
                error: errorMessage
            });
        }

        const hasNextRecipient = index < recipients.length - 1;

        if (sendInterval > 0 && hasNextRecipient) {
            await sleep(sendInterval);
        }
    }

    return {
        campaign_id: campaignId,
        campaign_code: campaignCode,
        total: recipients.length,
        attachment_count: attachments.length,
        results
    };
}


function normalizeSendInterval(value) {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return DEFAULT_SEND_INTERVAL_MS;
    }

    const interval = Number(value);

    if (!Number.isFinite(interval) || interval < 0) {
        throw new Error(
            'O intervalo entre envios deve ser maior ou igual a zero.'
        );
    }

    return interval;
}


function replacePlaceholders(template, data) {
    let result = String(template || '');

    for (const [key, value] of Object.entries(data)) {
        const pattern = new RegExp('{{' + key + '}}', 'g');

        result = result.replace(
            pattern,
            value === undefined || value === null
                ? ''
                : String(value)
        );
    }

    return result;
}


function sleep(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}


async function processIncoming(campaignId) {
    const campaign = repository.getEmailCampaignById(campaignId);

    if (!campaign) {
        throw new Error('Campanha não encontrada.');
    }

    if (!isCampaignProcessable(campaign)) {
        return {
            campaign_id: campaignId,
            processed: 0,
            details: [],
            skipped: true,
            reason: 'Campanha inativa, pausada ou arquivada.'
        };
    }

    const config = repository.getEmailConfigById(
        campaign.config_id
    );

    if (!config) {
        throw new Error(
            'Configuração de e-mail não encontrada.'
        );
    }

    const result = await processIncomingEmails(
        config,
        campaign
    );

    return {
        campaign_id: campaignId,
        processed: result.processed,
        details: result.details
    };
}


module.exports = {
    listConfigs,
    getConfigById,
    createConfig,
    updateConfig,
    deleteConfig: (id) => {
        if (!repository.getEmailConfigById(id)) {
            throw new Error('Configuração não encontrada.');
        }

        return repository.deleteEmailConfig(id);
    },

    listCampaigns,
    listProcessableCampaigns,
    getCampaignById,
    createCampaign,
    updateCampaign,
    deleteCampaign,

    listRecipients,
    getRecipientById,
    createRecipient,
    createRecipientsBatch,
    deleteRecipient,

    listCampaignAttachments,
    listCampaignSendLogs,
    listCampaignHistory,
    getCampaignDashboard,

    generateCampaignCode,
    insertCampaignCodeInSubject,
    saveSentEmail,
    sendCampaign,
    processIncoming
};