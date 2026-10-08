ALTER TABLE email_campaigns
ADD COLUMN campaign_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_campaigns_campaign_code
ON email_campaigns(campaign_code)
WHERE campaign_code IS NOT NULL;
