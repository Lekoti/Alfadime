CREATE TABLE IF NOT EXISTS price_pending_processed_files (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_mtime_ms INTEGER NOT NULL,
    signature TEXT NOT NULL,
    processed_at TEXT NOT NULL,
    processed_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_pending_processed_files_signature
ON price_pending_processed_files (signature);

CREATE TABLE IF NOT EXISTS price_pending_refresh_locks (
    lock_key TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    owner_name TEXT,
    acquired_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_pending_refresh_locks_expires_at
ON price_pending_refresh_locks (expires_at);