-- Tabela: email_received_messages
CREATE TABLE IF NOT EXISTS email_received_messages (
    id TEXT PRIMARY KEY,
    config_id TEXT,
    message_uid TEXT NOT NULL,
    message_id TEXT,
    sender_email TEXT,
    sender_name TEXT,
    subject TEXT,
    received_at TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(config_id, message_uid)
);

-- Tabela: email_received_attachments
CREATE TABLE IF NOT EXISTS email_received_attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    stored_file_name TEXT NOT NULL,
    stored_file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'downloaded',
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Tabela: email_received_patterns
CREATE TABLE IF NOT EXISTS email_received_patterns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    subject_contains TEXT,
    sender_contains TEXT,
    source_extension TEXT,
    target_extension TEXT,
    file_name_template TEXT NOT NULL DEFAULT '{{nome_original}}',
    destination_folder TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Tabela: email_received_processing_logs
CREATE TABLE IF NOT EXISTS email_received_processing_logs (
    id TEXT PRIMARY KEY,
    attachment_id TEXT NOT NULL,
    pattern_id TEXT,
    original_file_name TEXT,
    final_file_name TEXT,
    final_file_path TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    processed_at TEXT NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_email_received_messages_status
    ON email_received_messages(status);

CREATE INDEX IF NOT EXISTS idx_email_received_attachments_message
    ON email_received_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_email_received_logs_status
    ON email_received_processing_logs(status);
