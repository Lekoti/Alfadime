CREATE TABLE IF NOT EXISTS sent_emails (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    campaign_code TEXT,
    recipient_id TEXT REFERENCES email_campaign_recipients(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    sent_message_id TEXT,
    subject TEXT,
    sent_at TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sent_emails_campaign_id
    ON sent_emails(campaign_id);

CREATE INDEX IF NOT EXISTS idx_sent_emails_message_id
    ON sent_emails(sent_message_id);
