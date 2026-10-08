CREATE TABLE IF NOT EXISTS price_pending_rows (
    id TEXT PRIMARY KEY,

    laboratory TEXT NOT NULL DEFAULT '',

    env_precos_dpr TEXT NOT NULL DEFAULT '',
    env_precos_ams TEXT NOT NULL DEFAULT '',
    env_precos_dmt TEXT NOT NULL DEFAULT '',
    env_precos_dms TEXT NOT NULL DEFAULT '',
    env_precos_dsc TEXT NOT NULL DEFAULT '',

    env_pend_dpr TEXT NOT NULL DEFAULT '',
    env_pend_ams TEXT NOT NULL DEFAULT '',
    env_pend_dmt TEXT NOT NULL DEFAULT '',
    env_pend_dms TEXT NOT NULL DEFAULT '',
    env_pend_dsc TEXT NOT NULL DEFAULT '',

    precos_ok_dpr TEXT NOT NULL DEFAULT '',
    precos_ok_ams TEXT NOT NULL DEFAULT '',
    precos_ok_dmt TEXT NOT NULL DEFAULT '',
    precos_ok_dms TEXT NOT NULL DEFAULT '',
    precos_ok_dsc TEXT NOT NULL DEFAULT '',

    pendencias_ok_dpr TEXT NOT NULL DEFAULT '',
    pendencias_ok_ams TEXT NOT NULL DEFAULT '',
    pendencias_ok_dmt TEXT NOT NULL DEFAULT '',
    pendencias_ok_dms TEXT NOT NULL DEFAULT '',
    pendencias_ok_dsc TEXT NOT NULL DEFAULT '',

    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_pending_laboratory
ON price_pending_rows (laboratory);

CREATE INDEX IF NOT EXISTS idx_price_pending_active
ON price_pending_rows (active);
