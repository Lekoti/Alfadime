-- Migration 035: índices de performance do módulo Produtos

CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_product_id_lab
    ON product_purchase_curve(product_id, lab);

CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_product_id_cod_prod
    ON product_purchase_curve(product_id, cod_prod);

CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_product_id_cod_prod_global
    ON product_purchase_curve(product_id, cod_prod_global);

CREATE INDEX IF NOT EXISTS idx_product_catalog_branch_active_name
    ON product_catalog(branch, active, commercial_name);

CREATE INDEX IF NOT EXISTS idx_product_catalog_branch_group_category
    ON product_catalog(branch, group_code, category_code);
