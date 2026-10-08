-- 018-allow-null-code-in-product-catalog.sql
-- Ajusta tabela product_catalog para garantir code opcional (sem NOT NULL)
-- e manter todas as 26 colunas originais.

PRAGMA foreign_keys = OFF;

-- Criar tabela temporária com a definição completa (26 colunas)
CREATE TABLE IF NOT EXISTS product_catalog_new (
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

-- Copiar dados existentes
INSERT INTO product_catalog_new
SELECT * FROM product_catalog;

-- Remover tabela antiga e renomear a nova
DROP TABLE product_catalog;
ALTER TABLE product_catalog_new RENAME TO product_catalog;

-- Recriar índices
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

PRAGMA foreign_keys = ON;
