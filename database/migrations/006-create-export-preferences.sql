CREATE TABLE IF NOT EXISTS export_preferences (
    id TEXT PRIMARY KEY,

    module_key TEXT NOT NULL UNIQUE,

    columns_json TEXT NOT NULL,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
