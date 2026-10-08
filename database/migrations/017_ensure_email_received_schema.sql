-- Migration corretiva: garante que o schema de e-mail recebido
-- esteja alinhado com as migrations oficiais.
-- Esta migration NÃO recria tabelas existentes.

CREATE INDEX IF NOT EXISTS idx_email_received_messages_status
    ON email_received_messages(status);

CREATE INDEX IF NOT EXISTS idx_email_received_messages_config_uid
    ON email_received_messages(config_id, message_uid);

CREATE INDEX IF NOT EXISTS idx_email_received_attachments_message
    ON email_received_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_email_received_attachments_status
    ON email_received_attachments(status);

CREATE INDEX IF NOT EXISTS idx_email_received_patterns_enabled
    ON email_received_patterns(enabled, name);

CREATE INDEX IF NOT EXISTS idx_email_received_logs_status
    ON email_received_processing_logs(status);

CREATE INDEX IF NOT EXISTS idx_email_received_logs_attachment
    ON email_received_processing_logs(attachment_id);
