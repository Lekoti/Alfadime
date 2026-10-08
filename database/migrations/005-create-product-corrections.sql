CREATE TABLE IF NOT EXISTS product_corrections (
    id TEXT PRIMARY KEY,

    product_id TEXT NOT NULL,
    branch TEXT NOT NULL,
    code TEXT NOT NULL,
    ean TEXT,

    field_name TEXT NOT NULL,

    old_value TEXT,
    new_value TEXT NOT NULL,

    correction_reason TEXT NOT NULL,
    corrected_by TEXT,

    status TEXT NOT NULL DEFAULT 'pending_excel',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    confirmed_in_excel_at TEXT,
    cancelled_at TEXT,

    FOREIGN KEY (product_id)
        REFERENCES product_catalog(id)
);

CREATE INDEX IF NOT EXISTS idx_product_corrections_product
ON product_corrections (product_id);

CREATE INDEX IF NOT EXISTS idx_product_corrections_status
ON product_corrections (status);

CREATE INDEX IF NOT EXISTS idx_product_corrections_ean
ON product_corrections (ean);

CREATE INDEX IF NOT EXISTS idx_product_corrections_field
ON product_corrections (field_name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_corrections_active_field
ON product_corrections (
    product_id,
    field_name
)
WHERE status = 'pending_excel';

CREATE TABLE IF NOT EXISTS product_change_history (
    id TEXT PRIMARY KEY,

    correction_id TEXT,
    product_id TEXT NOT NULL,

    action_type TEXT NOT NULL,
    source TEXT NOT NULL,

    field_name TEXT NOT NULL,

    old_value TEXT,
    new_value TEXT,

    reason TEXT,
    changed_by TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY (correction_id)
        REFERENCES product_corrections(id),

    FOREIGN KEY (product_id)
        REFERENCES product_catalog(id)
);

CREATE INDEX IF NOT EXISTS idx_product_change_history_product
ON product_change_history (product_id);

CREATE INDEX IF NOT EXISTS idx_product_change_history_correction
ON product_change_history (correction_id);

CREATE INDEX IF NOT EXISTS idx_product_change_history_created_at
ON product_change_history (created_at);
