-- Favoritos de cobrança genéricos
CREATE TABLE IF NOT EXISTS contact_charge_favorites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    charge_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    save_recipients INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_charge_favorites_name
ON contact_charge_favorites(name);

-- Contatos salvos no favorito
CREATE TABLE IF NOT EXISTS contact_charge_favorite_recipients (
    id TEXT PRIMARY KEY,
    favorite_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    laboratory_name TEXT,
    laboratory_key TEXT,
    branch TEXT,
    email TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(favorite_id, contact_id, branch),
    FOREIGN KEY (favorite_id) REFERENCES contact_charge_favorites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contact_charge_favorite_recipients_favorite
ON contact_charge_favorite_recipients(favorite_id);

-- Indústrias salvas no favorito
CREATE TABLE IF NOT EXISTS contact_charge_favorite_industries (
    id TEXT PRIMARY KEY,
    favorite_id TEXT NOT NULL,
    industry_global_code TEXT NOT NULL,
    industry_name TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(favorite_id, industry_global_code),
    FOREIGN KEY (favorite_id) REFERENCES contact_charge_favorites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contact_charge_favorite_industries_favorite
ON contact_charge_favorite_industries(favorite_id);

-- Anexos do favorito
CREATE TABLE IF NOT EXISTS contact_charge_favorite_attachments (
    id TEXT PRIMARY KEY,
    favorite_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (favorite_id) REFERENCES contact_charge_favorites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contact_charge_favorite_attachments_favorite
ON contact_charge_favorite_attachments(favorite_id);

-- Execuções de cobrança
CREATE TABLE IF NOT EXISTS contact_charge_runs (
    id TEXT PRIMARY KEY,
    favorite_id TEXT,
    favorite_name TEXT,
    charge_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total INTEGER NOT NULL DEFAULT 0,
    sent INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    ignored INTEGER NOT NULL DEFAULT 0,
    cancelled INTEGER NOT NULL DEFAULT 0,
    started_at TEXT,
    finished_at TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_charge_runs_favorite
ON contact_charge_runs(favorite_id);

CREATE INDEX IF NOT EXISTS idx_contact_charge_runs_status
ON contact_charge_runs(status);

-- Itens de cada execução
CREATE TABLE IF NOT EXISTS contact_charge_run_items (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    contact_id TEXT,
    laboratory_name TEXT,
    laboratory_key TEXT,
    branch TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES contact_charge_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contact_charge_run_items_run
ON contact_charge_run_items(run_id);

CREATE INDEX IF NOT EXISTS idx_contact_charge_run_items_status
ON contact_charge_run_items(status);
