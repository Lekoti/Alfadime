-- Migration: Add Performance Indexes
-- Executed: 2026-09-21

-- product_catalog
CREATE INDEX IF NOT EXISTS idx_product_catalog_branch_code ON product_catalog(branch, code);
CREATE INDEX IF NOT EXISTS idx_product_catalog_brand ON product_catalog(brand);
CREATE INDEX IF NOT EXISTS idx_product_catalog_manufacturer_code ON product_catalog(manufacturer_code);

-- purchase_curve_products (movido para migration 015)
-- CREATE INDEX IF NOT EXISTS idx_purchase_curve_company_code ON purchase_curve_products(company, product_code);
-- CREATE INDEX IF NOT EXISTS idx_purchase_curve_laboratory_name ON purchase_curve_products(laboratory_name);

-- product_purchase_curve (movido para migration 025)
-- CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_empresa_cod_prod ON product_purchase_curve(empresa, cod_prod);
-- CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_cod_fabr_global ON product_purchase_curve(cod_fabr_global);
-- CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_product_id ON product_purchase_curve(product_id);