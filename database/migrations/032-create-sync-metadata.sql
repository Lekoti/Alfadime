CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_key TEXT NOT NULL UNIQUE,
    last_sync_at TEXT NOT NULL,
    last_sync_by TEXT NOT NULL DEFAULT '',
    last_sync_source TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_metadata_module
ON sync_metadata(module_key);