/**
 * Repository do módulo de e-mail.
 * Responsável por todas as operações no banco de dados.
 */


const crypto = require('node:crypto');
const { getDatabase } = require('../../database/connection');
const { isValidEmail, toSafeNumber } = require('../../utils/validation.utils');


// ==================== EMAIL CONFIGS ====================


function getConfigInputValue(data, names, fallback = '') {
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


function getConfigInputText(data, names, fallback = '') {
    return String(
        getConfigInputValue(data, names, fallback) || ''
    ).trim();
}


function getConfigInputNumber(data, names, fallback = 0) {
    const value = getConfigInputValue(data, names, fallback);
    return toSafeNumber(value, fallback);
}


function normalizeEmailConfigInput(data = {}, existing = null) {
    const smtpPassword = getConfigInputText(data, [
        'smtp_password_encrypted',
        'smtp_password_encrypted',
        'smtppassword',
        'smtp_password'
    ]);

    const imapPassword = getConfigInputText(data, [
        'imap_password_encrypted',
        'imap_password_encrypted',
        'imappassword',
        'imap_password'
    ]);

    return {
        name: getConfigInputText(data, ['name']),

        smtp_host: getConfigInputText(data, [
            'smtp_host',
            'smtp_host'
        ]),

        smtp_port: getConfigInputNumber(data, [
            'smtp_port',
            'smtp_port'
        ], 587),

        smtp_secure: getConfigInputText(data, [
            'smtp_secure',
            'smtp_secure'
        ], 'starttls') || 'starttls',

        smtp_user: getConfigInputText(data, [
            'smtp_user',
            'smtp_user'
        ]),

        smtp_password_encrypted:
            smtpPassword ||
            getConfigInputText(existing, [
                'smtp_password_encrypted',
                'smtp_password_encrypted'
            ]),

        imap_host: getConfigInputText(data, [
            'imap_host',
            'imap_host'
        ]),

        imap_port: getConfigInputNumber(data, [
            'imap_port',
            'imap_port'
        ], 993),

        imap_secure: getConfigInputText(data, [
            'imap_secure',
            'imap_secure'
        ], 'tls') || 'tls',

        imap_user: getConfigInputText(data, [
            'imap_user',
            'imap_user'
        ]),

        imap_password_encrypted:
            imapPassword ||
            getConfigInputText(existing, [
                'imap_password_encrypted',
                'imap_password_encrypted'
            ]),

        from_name: getConfigInputText(data, [
            'from_name',
            'from_name'
        ]),

        from_email: getConfigInputText(data, [
            'from_email',
            'from_email'
        ]),

        reply_to_email:
            getConfigInputText(data, [
                'reply_to_email',
                'reply_to_email'
            ]) || null
    };
}


function listEmailConfigs() {
    const database = getDatabase();

    return database.prepare(`
        SELECT
            id,
            name,
            smtp_host,
            smtp_port,
            smtp_secure,
            smtp_user,
            smtp_password_encrypted,
            imap_host,
            imap_port,
            imap_secure,
            imap_user,
            imap_password_encrypted,
            from_name,
            from_email,
            reply_to_email,
            created_at,
            updated_at
        FROM email_configs
        ORDER BY name ASC
    `).all();
}


function getEmailConfigById(id) {
    const database = getDatabase();

    return database.prepare(`
        SELECT *
        FROM email_configs
        WHERE id = ?
        LIMIT 1
    `).get(id);
}


function createEmailConfig(data = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();
    const normalized = normalizeEmailConfigInput(data);

    const config = {
        id: crypto.randomUUID(),
        ...normalized,
        created_at: now,
        updated_at: now
    };

    database.prepare(`
        INSERT INTO email_configs(
            id,
            name,
            smtp_host,
            smtp_port,
            smtp_secure,
            smtp_user,
            smtp_password_encrypted,
            imap_host,
            imap_port,
            imap_secure,
            imap_user,
            imap_password_encrypted,
            from_name,
            from_email,
            reply_to_email,
            created_at,
            updated_at
        ) VALUES (
            @id,
            @name,
            @smtp_host,
            @smtp_port,
            @smtp_secure,
            @smtp_user,
            @smtp_password_encrypted,
            @imap_host,
            @imap_port,
            @imap_secure,
            @imap_user,
            @imap_password_encrypted,
            @from_name,
            @from_email,
            @reply_to_email,
            @created_at,
            @updated_at
        )
    `).run(config);

    return getEmailConfigById(config.id);
}


function updateEmailConfig(id, data = {}) {
    const database = getDatabase();
    const existing = getEmailConfigById(id);

    if (!existing) {
        throw new Error('Configuração de e-mail não encontrada.');
    }

    const now = new Date().toISOString();
    const normalized = normalizeEmailConfigInput(data, existing);

    database.prepare(`
        UPDATE email_configs
        SET
            name = @name,
            smtp_host = @smtp_host,
            smtp_port = @smtp_port,
            smtp_secure = @smtp_secure,
            smtp_user = @smtp_user,
            smtp_password_encrypted = @smtp_password_encrypted,
            imap_host = @imap_host,
            imap_port = @imap_port,
            imap_secure = @imap_secure,
            imap_user = @imap_user,
            imap_password_encrypted = @imap_password_encrypted,
            from_name = @from_name,
            from_email = @from_email,
            reply_to_email = @reply_to_email,
            updated_at = @updated_at
        WHERE id = @id
    `).run({
        id,
        ...normalized,
        updated_at: now
    });

    return getEmailConfigById(id);
}


function deleteEmailConfig(id) {
    const database = getDatabase();

    const result = database.prepare(`
        DELETE FROM email_configs
        WHERE id = ?
    `).run(id);

    if (!result.changes) {
        throw new Error('Configuração de e-mail não encontrada.');
    }

    return {
        success: true,
        id
    };
}


function normalizeCampaignRequestType(value, required = false) {
    const normalized = String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    if (!normalized && !required) {
        return null;
    }

    if (
        normalized === 'preco' ||
        normalized === 'precos' ||
        normalized === 'prices'
    ) {
        return 'precos';
    }

    if (
        normalized === 'pendencia' ||
        normalized === 'pendencias' ||
        normalized === 'pending'
    ) {
        return 'pendencias';
    }

    return normalized || null;
}


function getCampaignInputValue(data, names, fallback = '') {
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


function getCampaignInputText(data, names, fallback = '') {
    return String(
        getCampaignInputValue(data, names, fallback) || ''
    ).trim();
}


function normalizeCampaignInput(data = {}, existing = null) {
    const config_id = getCampaignInputText(
        data,
        ['config_id', 'config_id'],
        existing?.config_id || existing?.config_id || ''
    );

    const subject = getCampaignInputText(
        data,
        ['subject'],
        existing?.subject || ''
    );

    const body_template = getCampaignInputText(
        data,
        ['body_template', 'body_template'],
        existing?.body_template || existing?.body_template || ''
    );

    const requestTypeValue = getCampaignInputValue(
        data,
        ['request_type', 'request_type'],
        existing?.request_type || existing?.request_type || null
    );

    const cc = data.cc !== undefined ? (data.cc ? normalizeEmailList(data.cc) : null) : (existing?.cc || null);
    const bcc = data.bcc !== undefined ? (data.bcc ? normalizeEmailList(data.bcc) : null) : (existing?.bcc || null);

    return {
        config_id: config_id,
        subject,
        body_template: body_template,
        request_type: normalizeCampaignRequestType(
            requestTypeValue,
            false
        ),
        cc,
        bcc
    };
}


function validateCampaignConfig(database, config_id) {
    if (!config_id) {
        throw new Error(
            'Selecione uma conta remetente antes de criar a solicitação.'
        );
    }

    const config = database.prepare(`
        SELECT id, name, from_email
        FROM email_configs
        WHERE id = ?
        LIMIT 1
    `).get(config_id);

    if (!config) {
        throw new Error(
            'A conta remetente selecionada não existe mais. Atualize a tela e selecione uma configuração válida.'
        );
    }

    return config;
}


function listEmailCampaigns() {
    const database = getDatabase();

    return database.prepare(`
        SELECT
            campaigns.id,
            campaigns.config_id,
            campaigns.subject,
            campaigns.body_template,
            campaigns.request_type,
            campaigns.cc,
            campaigns.bcc,
            campaigns.created_at,
            campaigns.updated_at,
            configs.name AS config_name,
            configs.from_email
        FROM email_campaigns campaigns
        LEFT JOIN email_configs configs ON configs.id = campaigns.config_id
        ORDER BY campaigns.created_at DESC
    `).all();
}


function getEmailCampaignById(id) {
    const database = getDatabase();

    return database.prepare(`
        SELECT
            campaigns.id,
            campaigns.config_id,
            campaigns.subject,
            campaigns.body_template,
            campaigns.request_type,
            campaigns.cc,
            campaigns.bcc,
            campaigns.created_at,
            campaigns.updated_at,
            configs.name AS config_name,
            configs.from_email
        FROM email_campaigns campaigns
        LEFT JOIN email_configs configs ON configs.id = campaigns.config_id
        WHERE campaigns.id = ?
        LIMIT 1
    `).get(id);
}


function normalizeEmailList(value) {
    if (!value) {
        return null;
    }

    const text = String(value)
        .replace(/[,;]/g, '\n')
        .split('\n')
        .map((email) => email.trim())
        .filter((email) => isValidEmail(email))
        .join(';');

    return text || null;
}


function createEmailCampaign(data = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();
    const campaign = normalizeCampaignInput(data);

    if (!campaign.subject) {
        throw new Error('Informe o assunto da solicitação.');
    }

    if (!campaign.body_template) {
        throw new Error('Informe a mensagem da solicitação.');
    }

    validateCampaignConfig(database, campaign.config_id);

    const entity = {
        id: crypto.randomUUID(),
        config_id: campaign.config_id,
        subject: campaign.subject,
        body_template: campaign.body_template,
        request_type: campaign.request_type,
        cc: campaign.cc,
        bcc: campaign.bcc,
        created_at: now,
        updated_at: now
    };

    database.prepare(`
        INSERT INTO email_campaigns (
            id,
            config_id,
            subject,
            body_template,
            request_type,
            cc,
            bcc,
            created_at,
            updated_at
        ) VALUES (
            @id,
            @config_id,
            @subject,
            @body_template,
            @request_type,
            @cc,
            @bcc,
            @created_at,
            @updated_at
        )
    `).run(entity);

    return getEmailCampaignById(entity.id);
}


function updateEmailCampaign(id, data = {}) {
    const database = getDatabase();
    const existing = getEmailCampaignById(id);

    if (!existing) {
        throw new Error('Campanha não encontrada.');
    }

    const campaign = normalizeCampaignInput(data, existing);

    if (!campaign.subject) {
        throw new Error('Informe o assunto da solicitação.');
    }

    if (!campaign.body_template) {
        throw new Error('Informe a mensagem da solicitação.');
    }

    validateCampaignConfig(database, campaign.config_id);

    database.prepare(`
        UPDATE email_campaigns
        SET
            config_id = @config_id,
            subject = @subject,
            body_template = @body_template,
            request_type = @request_type,
            cc = @cc,
            bcc = @bcc,
            updated_at = @updated_at
        WHERE id = @id
    `).run({
        id,
        config_id: campaign.config_id,
        subject: campaign.subject,
        body_template: campaign.body_template,
        request_type: campaign.request_type,
        cc: campaign.cc,
        bcc: campaign.bcc,
        updated_at: new Date().toISOString()
    });

    return getEmailCampaignById(id);
}


function deleteEmailCampaign(id) {
    const database = getDatabase();

    const result = database.prepare(`
        DELETE FROM email_campaigns
        WHERE id = ?
    `).run(id);

    if (!result.changes) {
        throw new Error('Campanha não encontrada.');
    }

    return {
        success: true,
        id
    };
}


function listEmailRecipients(campaignId) {
    const database = getDatabase();
    const normalizedCampaignId = String(campaignId || '').trim();

    if (!normalizedCampaignId) {
        throw new Error(
            'ID da campanha não informado para listar destinatários.'
        );
    }

    return database.prepare(`
        SELECT
            id,
            campaign_id,
            email,
            name,
            company,
            extra_data,
            status,
            sent_at,
            replied_at,
            error_message,
            created_at,
            updated_at
        FROM email_campaign_recipients
        WHERE campaign_id = ?
        ORDER BY created_at ASC
    `).all(normalizedCampaignId);
}


function getEmailRecipientById(id) {
    const database = getDatabase();
    const normalizedId = String(id || '').trim();

    if (!normalizedId) {
        return null;
    }

    return database.prepare(`
        SELECT
            id,
            campaign_id,
            email,
            name,
            company,
            extra_data,
            status,
            sent_at,
            replied_at,
            error_message,
            created_at,
            updated_at
        FROM email_campaign_recipients
        WHERE id = ?
        LIMIT 1
    `).get(normalizedId);
}


function createEmailRecipient(data = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const campaignId = String(
        data.campaignid ||
        data.campaign_id ||
        ''
    ).trim();

    const email = String(data.email || '')
        .trim()
        .toLowerCase();

    if (!campaignId) {
        throw new Error(
            'ID da campanha não informado para criar destinatário.'
        );
    }

    if (!email) {
        throw new Error(
            'E-mail do destinatário não informado.'
        );
    }

    const campaign = database.prepare(`
        SELECT id
        FROM email_campaigns
        WHERE id = ?
        LIMIT 1
    `).get(campaignId);

    if (!campaign) {
        throw new Error(
            `Campanha não encontrada para o destinatário: ${campaignId}`
        );
    }

    const duplicate = database.prepare(`
        SELECT id
        FROM email_campaign_recipients
        WHERE campaign_id = ?
          AND LOWER(TRIM(email)) = ?
        LIMIT 1
    `).get(campaignId, email);

    if (duplicate) {
        return getEmailRecipientById(duplicate.id);
    }

    const entity = {
        id: String(data.id || crypto.randomUUID()),
        campaign_id: campaignId,
        email,
        name: data.name
            ? String(data.name).trim()
            : null,
        company: data.company
            ? String(data.company).trim()
            : null,
        extra_data: data.extradata
            ? JSON.stringify(data.extradata)
            : data.extra_data
                ? JSON.stringify(data.extra_data)
                : null,
        status: String(data.status || 'pending'),
        sent_at: data.sentat || data.sent_at || null,
        replied_at: data.repliedat || data.replied_at || null,
        error_message:
            data.errormessage ||
            data.error_message ||
            null,
        created_at: data.created_at || data.created_at || now,
        updated_at: data.updated_at || data.updated_at || now
    };

    database.prepare(`
        INSERT INTO email_campaign_recipients (
            id,
            campaign_id,
            email,
            name,
            company,
            extra_data,
            status,
            sent_at,
            replied_at,
            error_message,
            created_at,
            updated_at
        ) VALUES (
            @id,
            @campaign_id,
            @email,
            @name,
            @company,
            @extra_data,
            @status,
            @sent_at,
            @replied_at,
            @error_message,
            @created_at,
            @updated_at
        )
    `).run(entity);

    return getEmailRecipientById(entity.id);
}


function updateEmailRecipientStatus(id, status, extra = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const updates = ['status = ?', 'updated_at = ?'];
    const params = [status, now];

    if (status === 'sent') {
        updates.push('sent_at = ?');
        params.push(now);
    }
    if (status === 'replied') {
        updates.push('replied_at = ?');
        params.push(now);
    }
    if (extra.error_message !== undefined) {
        updates.push('error_message = ?');
        params.push(extra.error_message ? String(extra.error_message) : null);
    }

    params.push(id);

    const query = `
        UPDATE email_campaign_recipients
        SET ${updates.join(', ')}
        WHERE id = ?
    `;

    database.prepare(query).run(...params);

    return getEmailRecipientById(id);
}


function deleteEmailRecipient(id) {
    const database = getDatabase();
    const result = database.prepare(`
        DELETE FROM email_campaign_recipients
        WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
        throw new Error('Destinatário não encontrado.');
    }

    return { success: true, id };
}


// ==================== EMAIL ATTACHMENTS ====================


function createEmailAttachment(data) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const attachment = {
        id: crypto.randomUUID(),
        recipient_id: String(data.recipient_id || ''),
        file_name: String(data.file_name || ''),
        file_path: String(data.file_path || ''),
        file_size: toSafeNumber(data.file_size, 0),
        created_at: now
    };

    database.prepare(`
        INSERT INTO email_attachments (
            id, recipient_id, file_name, file_path, file_size, created_at
        ) VALUES (
            @id, @recipient_id, @file_name, @file_path, @file_size, @created_at
        )
    `).run(attachment);

    return attachment;
}


// ==================== EMAIL PROCESSED RESPONSES ====================


function createProcessedResponse(data) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const response = {
        id: crypto.randomUUID(),
        campaign_id: String(data.campaign_id || ''),
        recipient_id: String(data.recipient_id || ''),
        email_from: String(data.email_from || ''),
        email_subject: String(data.email_subject || ''),
        received_at: String(data.received_at || now),
        file_name_original: String(data.file_name_original || ''),
        file_name_final: String(data.file_name_final || ''),
        file_type: String(data.file_type || ''),
        file_path_final: String(data.file_path_final || ''),
        processed_at: now
    };

    database.prepare(`
        INSERT INTO email_processed_responses (
            id, campaign_id, recipient_id,
            email_from, email_subject, received_at,
            file_name_original, file_name_final, file_type, file_path_final,
            processed_at
        ) VALUES (
            @id, @campaign_id, @recipient_id,
            @email_from, @email_subject, @received_at,
            @file_name_original, @file_name_final, @file_type, @file_path_final,
            @processed_at
        )
    `).run(response);

    return response;
}


function listProcessedResponses(campaignId) {
    const database = getDatabase();
    return database.prepare(`
        SELECT *
        FROM email_processed_responses
        WHERE campaign_id = ?
        ORDER BY processed_at DESC
    `).all(campaignId);
}


// ==================== CAMPAIGN ATTACHMENTS AND HISTORY ====================


function listEmailCampaignAttachments(campaignId) {
    const database = getDatabase();
    const normalizedCampaignId = String(campaignId || '').trim();

    if (!normalizedCampaignId) {
        throw new Error('ID da campanha não informado para listar anexos.');
    }

    return database.prepare(`
        SELECT
            id,
            campaign_id,
            file_name,
            stored_file_name,
            stored_file_path,
            mime_type,
            file_size,
            created_at
        FROM email_campaign_attachments
        WHERE campaign_id = ?
        ORDER BY created_at ASC
    `).all(normalizedCampaignId);
}


function createEmailCampaignAttachment(data = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const campaignId = String(
        data.campaignid ||
        data.campaign_id ||
        ''
    ).trim();

    if (!campaignId) {
        throw new Error('ID da campanha não informado para salvar anexo.');
    }

    const filename = String(
        data.filename ||
        data.file_name ||
        'anexo'
    ).trim();

    const storedFileName = String(
        data.storedfilename ||
        data.stored_file_name ||
        filename
    ).trim();

    const storedFilePath = String(
        data.storedfilepath ||
        data.stored_file_path ||
        ''
    ).trim();

    if (!storedFilePath) {
        throw new Error('Caminho do arquivo anexo não informado.');
    }

    const entity = {
        id: String(data.id || crypto.randomUUID()),
        campaign_id: campaignId,
        file_name: filename,
        stored_file_name: storedFileName,
        stored_file_path: storedFilePath,
        mime_type: data.mimetype
            ? String(data.mimetype)
            : null,
        file_size: toSafeNumber(
            data.filesize ?? data.file_size,
            0
        ),
        created_at: String(
            data.created_at ||
            data.created_at ||
            now
        )
    };

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
    `).run(entity);

    return entity;
}


function getEmailCampaignAttachmentById(id) {
    const database = getDatabase();

    return database.prepare(`
        SELECT
            id,
            campaign_id,
            file_name,
            stored_file_name,
            stored_file_path,
            mime_type,
            file_size,
            created_at
        FROM email_campaign_attachments
        WHERE id = ?
        LIMIT 1
    `).get(String(id || '').trim());
}


function deleteEmailCampaignAttachment(id) {
    const database = getDatabase();
    const normalizedId = String(id || '').trim();

    const attachment = getEmailCampaignAttachmentById(
        normalizedId
    );

    if (!attachment) {
        throw new Error('Anexo não encontrado.');
    }

    const result = database.prepare(`
        DELETE FROM email_campaign_attachments
        WHERE id = ?
    `).run(normalizedId);

    if (!result.changes) {
        throw new Error('Não foi possível excluir o anexo.');
    }

    return attachment;
}


function createEmailSendLog(data = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const campaignId = String(
        data.campaignid ||
        data.campaign_id ||
        ''
    ).trim();

    const requestedRecipientId = String(
        data.recipientid ||
        data.recipient_id ||
        ''
    ).trim();

    const recipientEmail = String(
        data.recipientemail ||
        data.recipient_email ||
        data.email ||
        ''
    ).trim().toLowerCase();

    if (!campaignId) {
        throw new Error(
            'ID da campanha não informado para registrar log de envio.'
        );
    }

    if (!recipientEmail) {
        throw new Error(
            'E-mail do destinatário não informado para registrar log.'
        );
    }

    const campaignExists = database.prepare(`
        SELECT id
        FROM email_campaigns
        WHERE id = ?
        LIMIT 1
    `).get(campaignId);

    if (!campaignExists) {
        throw new Error(
            `Campanha não encontrada para registrar log: ${campaignId}`
        );
    }

    let recipientId = null;

    if (requestedRecipientId) {
        const recipientExists = database.prepare(`
            SELECT id
            FROM email_campaign_recipients
            WHERE id = ?
              AND campaign_id = ?
            LIMIT 1
        `).get(
            requestedRecipientId,
            campaignId
        );

        if (recipientExists) {
            recipientId = recipientExists.id;
        }
    }

    if (!recipientId) {
        const recipientByEmail = database.prepare(`
            SELECT id
            FROM email_campaign_recipients
            WHERE campaign_id = ?
              AND LOWER(TRIM(email)) = ?
            LIMIT 1
        `).get(
            campaignId,
            recipientEmail
        );

        if (recipientByEmail) {
            recipientId = recipientByEmail.id;
        }
    }

    const entity = {
        id: String(data.id || crypto.randomUUID()),
        campaign_id: campaignId,
        recipient_id: recipientId,
        recipient_email: recipientEmail,
        subject: data.subject
            ? String(data.subject)
            : null,
        status: String(data.status || 'sent'),
        message_id: data.messageid || data.message_id
            ? String(data.messageid || data.message_id)
            : null,
        error_message: data.errormessage || data.error_message
            ? String(data.errormessage || data.error_message)
            : null,
        sent_at: data.sentat || data.sent_at
            ? String(data.sentat || data.sent_at)
            : now,
        created_at: data.created_at || data.created_at
            ? String(data.created_at || data.created_at)
            : now
    };

    database.prepare(`
        INSERT INTO email_send_logs (
            id,
            campaign_id,
            recipient_id,
            recipient_email,
            subject,
            status,
            message_id,
            error_message,
            sent_at,
            created_at
        ) VALUES (
            @id,
            @campaign_id,
            @recipient_id,
            @recipient_email,
            @subject,
            @status,
            @message_id,
            @error_message,
            @sent_at,
            @created_at
        )
    `).run(entity);

    return entity;
}


function listEmailSendLogs(campaignId) {
    const database = getDatabase();
    const normalizedCampaignId = String(campaignId || '').trim();

    if (!normalizedCampaignId) {
        throw new Error(
            'ID da campanha não informado para listar logs de envio.'
        );
    }

    return database.prepare(`
        SELECT
            id,
            campaign_id,
            recipient_id,
            recipient_email,
            subject,
            status,
            message_id,
            error_message,
            sent_at,
            created_at
        FROM email_send_logs
        WHERE campaign_id = ?
        ORDER BY
            COALESCE(sent_at, created_at) DESC,
            created_at DESC
    `).all(normalizedCampaignId);
}


function listEmailCampaignHistory(campaignId) {
    const database = getDatabase();
    const normalizedCampaignId = String(campaignId || '').trim();

    if (!normalizedCampaignId) {
        throw new Error(
            'ID da campanha não informado para listar histórico.'
        );
    }

    const sentEvents = database.prepare(`
        SELECT
            id,
            'sent' AS event_type,
            recipient_email AS email,
            subject,
            status,
            error_message,
            COALESCE(sent_at, created_at) AS event_at,
            created_at
        FROM email_send_logs
        WHERE campaign_id = ?
    `).all(normalizedCampaignId);

    let receivedEvents = [];

    const receivedTable = database.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'email_processed_responses'
        LIMIT 1
    `).get();

    if (receivedTable) {
        receivedEvents = database.prepare(`
            SELECT
                id,
                'received' AS event_type,
                email_from AS email,
                email_subject AS subject,
                file_type AS status,
                NULL AS error_message,
                COALESCE(received_at, processed_at) AS event_at,
                processed_at AS created_at
            FROM email_processed_responses
            WHERE campaign_id = ?
        `).all(normalizedCampaignId);
    }

    return [
        ...sentEvents,
        ...receivedEvents
    ].sort((first, second) => {
        const firstDate = new Date(
            first.event_at ||
            first.created_at ||
            0
        ).getTime();

        const secondDate = new Date(
            second.event_at ||
            second.created_at ||
            0
        ).getTime();

        return secondDate - firstDate;
    });
}


function getEmailCampaignDashboard(campaignId) {
    const database = getDatabase();

    const totals = database.prepare(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
            SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) AS replied,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
        FROM email_campaign_recipients
        WHERE campaign_id = ?
    `).get(campaignId);

    const failures = database.prepare(`
        SELECT
            id AS recipient_id,
            email,
            name,
            company,
            error_message,
            updated_at AS failed_at
        FROM email_campaign_recipients
        WHERE campaign_id = ?
          AND status = 'error'
        ORDER BY updated_at DESC
    `).all(campaignId);

    return {
        total: toSafeNumber(totals?.total, 0),
        pending: toSafeNumber(totals?.pending, 0),
        sent: toSafeNumber(totals?.sent, 0),
        replied: toSafeNumber(totals?.replied, 0),
        errors: toSafeNumber(totals?.errors, 0),
        failures
    };
}


module.exports = {
    normalizeCampaignRequestType,

    listEmailConfigs,
    getEmailConfigById,
    createEmailConfig,
    updateEmailConfig,
    deleteEmailConfig,

    listEmailCampaigns,
    getEmailCampaignById,
    createEmailCampaign,
    updateEmailCampaign,
    deleteEmailCampaign,

    listEmailRecipients,
    getEmailRecipientById,
    createEmailRecipient,
    updateEmailRecipientStatus,
    deleteEmailRecipient,

    createEmailAttachment,

    listEmailCampaignAttachments,
    createEmailSendLog,
    listEmailSendLogs,
    listEmailCampaignHistory,
    getEmailCampaignDashboard,

    createProcessedResponse,
    listProcessedResponses
};