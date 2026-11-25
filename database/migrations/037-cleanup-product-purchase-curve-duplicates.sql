-- Migration 037: limpeza de duplicatas da curva de compras
-- Mantem a linha mais recente de cada product_id + empresa + cod_prod.
-- Em empate de updated_at, mantem o maior id.

CREATE TABLE IF NOT EXISTS product_purchase_curve_duplicates_backup_20261125 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    empresa TEXT,
    cod_prod TEXT,
    cod_prod_global TEXT,
    cod_fabr_global TEXT,
    cod_barras TEXT,
    descricao TEXT,
    lab TEXT,
    estoque INTEGER,
    estoque_bloq INTEGER,
    media_mes REAL,
    ult_comp REAL,
    penult_comp REAL,
    curva_valor TEXT,
    curva_unidade TEXT,
    curva_fabr_valor TEXT,
    cx_padrao INTEGER,
    created_at DATETIME,
    updated_at DATETIME,
    removed_at TEXT NOT NULL
);

INSERT INTO product_purchase_curve_duplicates_backup_20261125 (
    original_id,
    product_id,
    empresa,
    cod_prod,
    cod_prod_global,
    cod_fabr_global,
    cod_barras,
    descricao,
    lab,
    estoque,
    estoque_bloq,
    media_mes,
    ult_comp,
    penult_comp,
    curva_valor,
    curva_unidade,
    curva_fabr_valor,
    cx_padrao,
    created_at,
    updated_at,
    removed_at
)
SELECT
    curve.id,
    curve.product_id,
    curve.empresa,
    curve.cod_prod,
    curve.cod_prod_global,
    curve.cod_fabr_global,
    curve.cod_barras,
    curve.descricao,
    curve.lab,
    curve.estoque,
    curve.estoque_bloq,
    curve.media_mes,
    curve.ult_comp,
    curve.penult_comp,
    curve.curva_valor,
    curve.curva_unidade,
    curve.curva_fabr_valor,
    curve.cx_padrao,
    curve.created_at,
    curve.updated_at,
    datetime('now')
FROM product_purchase_curve AS curve
INNER JOIN (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY
                product_id,
                COALESCE(empresa, ''),
                COALESCE(cod_prod, '')
            ORDER BY
                updated_at DESC,
                id DESC
        ) AS duplicate_rank
    FROM product_purchase_curve
) AS ranked
    ON ranked.id = curve.id
WHERE ranked.duplicate_rank > 1;

DELETE FROM product_purchase_curve
WHERE id IN (
    SELECT original_id
    FROM product_purchase_curve_duplicates_backup_20261125
);
