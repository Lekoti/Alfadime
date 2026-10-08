-- Configurações de e-mail (SMTP/IMAP)
CREATE TABLE IF NOT EXISTS email_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,

    -- SMTP
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL,
    smtp_secure TEXT NOT NULL,
    smtp_user TEXT NOT NULL,
    smtp_password_encrypted TEXT NOT NULL,

    -- IMAP
    imap_host TEXT NOT NULL,
    imap_port INTEGER NOT NULL,
    imap_secure TEXT NOT NULL,
    imap_user TEXT NOT NULL,
    imap_password_encrypted TEXT NOT NULL,

    -- Remetente
    from_name TEXT NOT NULL,
    from_email TEXT NOT NULL,
    reply_to_email TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Campanhas de e-mail
CREATE TABLE IF NOT EXISTS email_campaigns (
    id TEXT PRIMARY KEY,
    config_id TEXT NOT NULL REFERENCES email_configs(id),

    subject TEXT NOT NULL,
    body_template TEXT NOT NULL,
    
    -- Colunas CC e BCC
    cc TEXT,
    bcc TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Destinatários das campanhas
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES email_campaigns(id),

    email TEXT NOT NULL,
    name TEXT,
    company TEXT,
    extra_data TEXT,

    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TEXT,
    replied_at TEXT,
    error_message TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Histórico de respostas processadas
CREATE TABLE IF NOT EXISTS email_processed_responses (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES email_campaigns(id),
    recipient_id TEXT NOT NULL REFERENCES email_campaign_recipients(id),

    email_from TEXT NOT NULL,
    email_subject TEXT NOT NULL,
    received_at TEXT NOT NULL,

    file_name_original TEXT NOT NULL,
    file_name_final TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_path_final TEXT NOT NULL,

    processed_at TEXT NOT NULL
);

-- Anexos enviados por destinatário (opcional, mas recomendado)
CREATE TABLE IF NOT EXISTS email_attachments (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES email_campaign_recipients(id),

    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,

    created_at TEXT NOT NULL
);

-- Índices para melhorar consultas
CREATE INDEX IF NOT EXISTS idx_email_campaigns_config_id
    ON email_campaigns(config_id);

CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign_id
    ON email_campaign_recipients(campaign_id);

CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_status
    ON email_campaign_recipients(status);

CREATE INDEX IF NOT EXISTS idx_email_processed_responses_campaign_id
    ON email_processed_responses(campaign_id);

CREATE INDEX IF NOT EXISTS idx_email_processed_responses_recipient_id
    ON email_processed_responses(recipient_id);

CREATE INDEX IF NOT EXISTS idx_email_attachments_recipient_id
    ON email_attachments(recipient_id);
