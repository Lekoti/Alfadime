-- Migration 033: Intervalo configuravel da cobranca automatica
CREATE TABLE IF NOT EXISTS price_pending_auto_settings (
    id TEXT PRIMARY KEY CHECK(id = 'automatic-charge-v3'),
    interval_hours INTEGER NOT NULL DEFAULT 48,
    updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO price_pending_auto_settings (id, interval_hours, updated_at)
VALUES ('automatic-charge-v3', 48, datetime('now'));
