CREATE TABLE IF NOT EXISTS email_campaign_attachments (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,

    file_name TEXT NOT NULL,
    stored_file_name TEXT NOT NULL,
    stored_file_path TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_send_logs (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES email_campaign_recipients(id) ON DELETE CASCADE,

    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    message_id TEXT,
    error_message TEXT,

    sent_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_campaign_attachments_campaign_id
    ON email_campaign_attachments(campaign_id);

CREATE INDEX IF NOT EXISTS idx_email_send_logs_campaign_id
    ON email_send_logs(campaign_id);

CREATE INDEX IF NOT EXISTS idx_email_send_logs_recipient_id
    ON email_send_logs(recipient_id);

CREATE INDEX IF NOT EXISTS idx_email_send_logs_status
    ON email_send_logs(status);
