ALTER TABLE email_campaigns
ADD COLUMN request_type TEXT
CHECK (
    request_type IS NULL
    OR request_type IN ('precos', 'pendencias')
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_request_type
ON email_campaigns(request_type);
