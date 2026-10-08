-- Migration 012: tabela complementar da Curva de Compras
-- Vincula dados de compras ao produto existente por product_id

CREATE TABLE IF NOT EXISTS product_purchase_curve (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,

    empresa TEXT,
    cod_prod TEXT,
    cod_fornec TEXT,
    cod_barras TEXT,
    descricao TEXT,
    cx_padrao INTEGER,
    cod_lab TEXT,
    lab TEXT,
    grupo TEXT,
    estoque INTEGER,
    pf REAL,
    pmc REAL,
    custo_med_atual REAL,
    st REAL,
    ipi REAL,
    outros_custos REAL,
    ult_comp REAL,
    penult_comp REAL,
    antepenult_comp REAL,
    p_sug_atual REAL,
    p_medio REAL,

    jan_qtde INTEGER,
    jan_vlr REAL,
    fev_qtde INTEGER,
    fev_vlr REAL,
    mar_qtde INTEGER,
    mar_vlr REAL,
    abr_qtde INTEGER,
    abr_vlr REAL,
    mai_qtde INTEGER,
    mai_vlr REAL,
    jun_qtde INTEGER,
    jun_vlr REAL,
    jul_qtde INTEGER,
    jul_vlr REAL,
    ago_qtde INTEGER,
    ago_vlr REAL,
    set_qtde INTEGER,
    set_vlr REAL,
    out_qtde INTEGER,
    out_vlr REAL,
    nov_qtde INTEGER,
    nov_vlr REAL,
    dez_qtde INTEGER,
    dez_vlr REAL,

    total_qtde INTEGER,
    total_vlr REAL,

    ent_mes_atual INTEGER,
    curva_valor TEXT,
    p_simulado REAL,
    dias_em_falta INTEGER,
    curva_unidade TEXT,
    ult_ent TEXT,
    data_cad TEXT,
    media_mes REAL,
    estoque_mes REAL,
    exclusividade TEXT,
    c_r TEXT,
    custo_recomp REAL,
    custo_dpc REAL,
    qtde_limitada INTEGER,
    curva_fabr_valor TEXT,
    curva_fabr_unidade TEXT,
    estoque_bloq INTEGER,
    class_trib TEXT,
    cod_fabr_global TEXT,
    fabr_global TEXT,
    divisao TEXT,
    cod_prod_global TEXT,
    categoria TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES product_catalog(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_product_id
    ON product_purchase_curve(product_id);

CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_cod_prod
    ON product_purchase_curve(cod_prod);

CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_curva_valor
    ON product_purchase_curve(curva_valor);

CREATE INDEX IF NOT EXISTS idx_product_purchase_curve_curva_unidade
    ON product_purchase_curve(curva_unidade);
