CREATE TABLE IF NOT EXISTS purchase_curve_products (
    id TEXT PRIMARY KEY,

    company TEXT NOT NULL,
    product_code TEXT NOT NULL,

    barcode TEXT,
    description TEXT,
    laboratory_name TEXT,

    current_stock NUMERIC NOT NULL DEFAULT 0,
    blocked_stock NUMERIC NOT NULL DEFAULT 0,

    average_sale_12m NUMERIC NOT NULL DEFAULT 0,
    average_sale_6m NUMERIC NOT NULL DEFAULT 0,
    average_sale_3m NUMERIC NOT NULL DEFAULT 0,

    last_purchase_price NUMERIC,
    penultimate_purchase_price NUMERIC,

    curve_value TEXT,
    curve_unit TEXT,
    effective_curve TEXT,

    standard_box NUMERIC,

    jan_quantity NUMERIC NOT NULL DEFAULT 0,
    feb_quantity NUMERIC NOT NULL DEFAULT 0,
    mar_quantity NUMERIC NOT NULL DEFAULT 0,
    apr_quantity NUMERIC NOT NULL DEFAULT 0,
    may_quantity NUMERIC NOT NULL DEFAULT 0,
    jun_quantity NUMERIC NOT NULL DEFAULT 0,
    jul_quantity NUMERIC NOT NULL DEFAULT 0,
    aug_quantity NUMERIC NOT NULL DEFAULT 0,
    sep_quantity NUMERIC NOT NULL DEFAULT 0,
    oct_quantity NUMERIC NOT NULL DEFAULT 0,
    nov_quantity NUMERIC NOT NULL DEFAULT 0,
    dec_quantity NUMERIC NOT NULL DEFAULT 0,

    source_file_name TEXT,
    imported_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    UNIQUE(company, product_code)
);

CREATE INDEX IF NOT EXISTS idx_purchase_curve_company
ON purchase_curve_products(company);

CREATE INDEX IF NOT EXISTS idx_purchase_curve_product_code
ON purchase_curve_products(product_code);

CREATE INDEX IF NOT EXISTS idx_purchase_curve_laboratory
ON purchase_curve_products(laboratory_name);

CREATE INDEX IF NOT EXISTS idx_purchase_curve_effective_curve
ON purchase_curve_products(effective_curve);

CREATE TABLE IF NOT EXISTS purchase_curve_import_history (
    id TEXT PRIMARY KEY,

    source_file_name TEXT NOT NULL,
    source_file_path TEXT NOT NULL,

    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    inserted_rows INTEGER NOT NULL DEFAULT 0,
    updated_rows INTEGER NOT NULL DEFAULT 0,
    ignored_rows INTEGER NOT NULL DEFAULT 0,

    status TEXT NOT NULL,
    error_message TEXT,

    started_at TEXT NOT NULL,
    finished_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_curve_import_history_created
ON purchase_curve_import_history(created_at);