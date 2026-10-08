-- Tabela de templates de exportacao
CREATE TABLE IF NOT EXISTS exporttemplates (
    id TEXT PRIMARY KEY,
    modulekey TEXT NOT NULL,
    name TEXT NOT NULL,
    filters_json TEXT NOT NULL,
    columns_json TEXT NOT NULL,
    createdat TEXT NOT NULL,
    UNIQUE(modulekey, name)
);


-- Indice para busca rapida por modulekey
CREATE INDEX IF NOT EXISTS idx_exporttemplates_modulekey
ON exporttemplates(modulekey);


-- Indice para busca por nome
CREATE INDEX IF NOT EXISTS idx_exporttemplates_name
ON exporttemplates(name);