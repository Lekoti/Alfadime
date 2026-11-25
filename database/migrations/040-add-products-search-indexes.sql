-- Migration 040: índices para busca por EAN, SAP e códigos da curva

CREATE INDEX IF NOT EXISTS idx_product_catalog_ean
    ON product_catalog(ean);

CREATE INDEX IF NOT EXISTS idx_product_catalog_sap_code
    ON product_catalog(sap_code);

CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_cod_prod
    ON product_purchase_curve(cod_prod);

CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_cod_prod_global
    ON product_purchase_curve(cod_prod_global);