CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
