-- Migration 036: índices para listagem, ordenação e códigos da curva

CREATE INDEX IF NOT EXISTS idx_product_catalog_branch_commercial_name
    ON product_catalog(branch, commercial_name);

CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_product_id_empresa_cod_prod
    ON product_purchase_curve(product_id, empresa, cod_prod);

CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_product_id_empresa_cod_prod_global
    ON product_purchase_curve(product_id, empresa, cod_prod_global);
