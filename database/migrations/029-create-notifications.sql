CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    source_module TEXT NOT NULL,
    source_id TEXT,
    laboratory_name TEXT,
    laboratory_key TEXT,
    industry_global_code TEXT,
    branch TEXT,
    recipient_email TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'normal',
    read_at TEXT,
    sent_at TEXT,
    error_message TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_status
ON notifications(status);

CREATE INDEX IF NOT EXISTS idx_notifications_type
ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_notifications_source_module
ON notifications(source_module);

CREATE INDEX IF NOT EXISTS idx_notifications_branch
ON notifications(branch);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON notifications(created_at);