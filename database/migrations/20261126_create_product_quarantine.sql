CREATE TABLE IF NOT EXISTS product_quarantine (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    branch TEXT,
    code TEXT,
    ean TEXT,
    commercial_name TEXT,
    reason TEXT NOT NULL DEFAULT 'nao_encontrado_na_planilha',
    status TEXT NOT NULL DEFAULT 'pendente',
    detected_at TEXT NOT NULL,
    resolved_at TEXT,
    created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_quarantine_product_pending
ON product_quarantine (product_id)
WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_product_quarantine_status
ON product_quarantine (status);
