CREATE TABLE IF NOT EXISTS product_catalog (
    id TEXT PRIMARY KEY,

    branch TEXT NOT NULL,
    code TEXT,

    sirius_code TEXT,
    ean TEXT,
    sap_code TEXT,
    group_code TEXT,

    active_ingredient TEXT,
    commercial_name TEXT,

    manufacturer_code TEXT,
    brand TEXT,
    unit TEXT,

    standard_box NUMERIC,

    controls_lot INTEGER NOT NULL DEFAULT 0,
    ms_registration TEXT,

    reference_code TEXT,
    therapeutic_class_code TEXT,

    height NUMERIC,
    width NUMERIC,
    length NUMERIC,

    category_code TEXT,

    active INTEGER NOT NULL DEFAULT 1,

    source_file_name TEXT,
    imported_at TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    UNIQUE(branch, code)
);

CREATE INDEX IF NOT EXISTS idx_product_catalog_branch
ON product_catalog (branch);

CREATE INDEX IF NOT EXISTS idx_product_catalog_code
ON product_catalog (code);

CREATE INDEX IF NOT EXISTS idx_product_catalog_ean
ON product_catalog (ean);

CREATE INDEX IF NOT EXISTS idx_product_catalog_sirius_code
ON product_catalog (sirius_code);

CREATE INDEX IF NOT EXISTS idx_product_catalog_sap_code
ON product_catalog (sap_code);

CREATE INDEX IF NOT EXISTS idx_product_catalog_commercial_name
ON product_catalog (commercial_name);

CREATE INDEX IF NOT EXISTS idx_product_catalog_active_ingredient
ON product_catalog (active_ingredient);

CREATE INDEX IF NOT EXISTS idx_product_catalog_brand
ON product_catalog (brand);

CREATE INDEX IF NOT EXISTS idx_product_catalog_group_code
ON product_catalog (group_code);

CREATE INDEX IF NOT EXISTS idx_product_catalog_category_code
ON product_catalog (category_code);

CREATE INDEX IF NOT EXISTS idx_product_catalog_active
ON product_catalog (active);

