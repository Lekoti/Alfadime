CREATE TABLE IF NOT EXISTS email_campaign_code_history (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    campaign_code TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_campaign_code_history_code
    ON email_campaign_code_history(campaign_code);
