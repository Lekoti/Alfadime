CREATE TABLE IF NOT EXISTS product_import_history (
    id TEXT PRIMARY KEY,

    source_file_name TEXT NOT NULL,
    source_file_path TEXT NOT NULL,

    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    inserted_rows INTEGER NOT NULL DEFAULT 0,
    updated_rows INTEGER NOT NULL DEFAULT 0,
    deactivated_rows INTEGER NOT NULL DEFAULT 0,
    ignored_rows INTEGER NOT NULL DEFAULT 0,

    status TEXT NOT NULL,
    error_message TEXT,

    started_at TEXT NOT NULL,
    finished_at TEXT,

    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_import_history_status
ON product_import_history (status);

CREATE INDEX IF NOT EXISTS idx_product_import_history_created_at
ON product_import_history (created_at);
