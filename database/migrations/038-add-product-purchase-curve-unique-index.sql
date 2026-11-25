-- Migration 038: impede novas duplicatas na curva de compras

CREATE UNIQUE INDEX IF NOT EXISTS ux_product_purchase_curve_product_empresa_cod
    ON product_purchase_curve(product_id, empresa, cod_prod);
