const crypto = require("node:crypto");
const { getPricePendingDatabase } = require("./price-pending.database");

function now() { return new Date().toISOString(); }

function ensureSchema(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS price_pending_automatic_charge (
            id TEXT PRIMARY KEY,
            enabled INTEGER NOT NULL DEFAULT 0,
            running INTEGER NOT NULL DEFAULT 0,
            last_success_at TEXT,
            last_error TEXT,
            updated_at TEXT NOT NULL
        );
    `);
    const row = database.prepare("SELECT id FROM price_pending_automatic_charge LIMIT 1").get();
    if (!row) {
        database.prepare(`INSERT INTO price_pending_automatic_charge (id, enabled, running, updated_at) VALUES (?, 0, 0, ?)`).run(crypto.randomUUID(), now());
    }
}

function getStatus() {
    const database = getPricePendingDatabase();
    ensureSchema(database);
    const row = database.prepare("SELECT * FROM price_pending_automatic_charge LIMIT 1").get();
    return {
        enabled: Boolean(row?.enabled),
        running: Boolean(row?.running),
        last_success_at: row?.last_success_at || "",
        last_error: row?.last_error || "",
        updated_at: row?.updated_at || ""
    };
}

function setEnabled(enabled) {
    const database = getPricePendingDatabase();
    ensureSchema(database);
    database.prepare(`UPDATE price_pending_automatic_charge SET enabled = ?, last_error = NULL, updated_at = ?`).run(enabled ? 1 : 0, now());
    return getStatus();
}

function tryLock() {
    const database = getPricePendingDatabase();
    ensureSchema(database);
    const result = database.prepare("UPDATE price_pending_automatic_charge SET running = 1, updated_at = ? WHERE running = 0").run(now());
    return result.changes > 0;
}

function unlock(error = null) {
    const database = getPricePendingDatabase();
    ensureSchema(database);
    database.prepare("UPDATE price_pending_automatic_charge SET running = 0, last_error = ?, updated_at = ?").run(error ? String(error.message || error) : null, now());
}

function markSuccess() {
    const database = getPricePendingDatabase();
    ensureSchema(database);
    database.prepare("UPDATE price_pending_automatic_charge SET last_success_at = ?, last_error = NULL, updated_at = ?").run(now(), now());
}

module.exports = { getStatus, setEnabled, tryLock, unlock, markSuccess };
