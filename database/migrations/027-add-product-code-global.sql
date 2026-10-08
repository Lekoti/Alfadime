-- Migration 027: adicionar coluna product_code_global na tabela purchase_curve_products
ALTER TABLE purchase_curve_products ADD COLUMN product_code_global TEXT;

-- Atualizar com os dados da tabela product_purchase_curve
UPDATE purchase_curve_products
SET product_code_global = (
    SELECT ppc.cod_prod_global
    FROM product_purchase_curve ppc
    WHERE ppc.empresa = purchase_curve_products.company
      AND ppc.cod_prod = purchase_curve_products.product_code
    LIMIT 1
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_purchase_curve_products_code_global 
ON purchase_curve_products(product_code_global);