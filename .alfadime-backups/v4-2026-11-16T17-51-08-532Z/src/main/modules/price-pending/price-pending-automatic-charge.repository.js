const crypto = require("node:crypto");
const { getPricePendingDatabase } = require("./price-pending.database");
const { getDatabase: getContactsDatabase } = require("../industry-contacts/industry-contacts.database");

const INTERVAL_MS = 48 * 60 * 60 * 1000;
const LEASE_MS = 5 * 60 * 1000;
const KEY = "automatic-charge-v3";
function iso() { return new Date().toISOString(); }
function db() {
    const database = getPricePendingDatabase();
    database.exec(`
        CREATE TABLE IF NOT EXISTS price_pending_auto_v3 (
            id TEXT PRIMARY KEY CHECK(id = 'automatic-charge-v3'),
            enabled INTEGER NOT NULL DEFAULT 0,
            owner TEXT, lease_until INTEGER,
            last_attempt_ms INTEGER NOT NULL DEFAULT 0,
            last_success_at TEXT, last_error TEXT,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS price_pending_auto_events_v3 (
            id TEXT PRIMARY KEY, kind TEXT NOT NULL, actor TEXT,
            detail TEXT, created_at TEXT NOT NULL
        );
    `);
    database.prepare("INSERT OR IGNORE INTO price_pending_auto_v3(id, updated_at) VALUES (?, ?)").run(KEY, iso());
    return database;
}
function event(kind, actor, detail = "") {
    db().prepare("INSERT INTO price_pending_auto_events_v3 VALUES (?, ?, ?, ?, ?)")
        .run(crypto.randomUUID(), kind, String(actor || "Sistema"), String(detail), iso());
}
function latestSentMs() {
    const database = getContactsDatabase();
    const exists = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contact_charge_run_items'").get();
    if (!exists) return 0;
    const rows = database.prepare("SELECT sent_at FROM contact_charge_run_items WHERE status='sent' AND sent_at IS NOT NULL").all();
    let latest = 0;
    for (const row of rows) {
        const parsed = Date.parse(row.sent_at);
        if (!Number.isFinite(parsed)) throw new Error("Histórico com data de envio inválida. Automação bloqueada para conferência.");
        latest = Math.max(latest, parsed);
    }
    return latest;
}
function getStatus() {
    const row = db().prepare("SELECT * FROM price_pending_auto_v3 WHERE id=?").get(KEY);
    const lastSent = latestSentMs();
    const lastAttempt = Number(row.last_attempt_ms || 0);
    const nextMs = Math.max(lastSent ? lastSent + INTERVAL_MS : 0, lastAttempt ? lastAttempt + INTERVAL_MS : 0);
    return {
        enabled: Boolean(row.enabled), running: Boolean(row.owner),
        recovery_required: Boolean(row.owner && Number(row.lease_until || 0) <= Date.now()),
        last_success_at: row.last_success_at || "", last_error: row.last_error || "",
        last_attempt_ms: lastAttempt, next_allowed_ms: nextMs,
        next_allowed_at: nextMs ? new Date(nextMs).toISOString() : "",
        updated_at: row.updated_at
    };
}
function setEnabled(enabled, actor) {
    const status = getStatus();
    if (enabled && status.running) throw new Error("Existe execução ou bloqueio pendente. Confira o histórico antes de reativar; não há desbloqueio automático de envio incerto.");
    db().transaction(() => {
        db().prepare("UPDATE price_pending_auto_v3 SET enabled=?, updated_at=? WHERE id=?").run(enabled ? 1 : 0, iso(), KEY);
        event(enabled ? "ativada" : "desativada", actor);
    }).immediate();
    return getStatus();
}
function tryLock() {
    const database = db();
    return database.transaction(() => {
        const status = getStatus();
        if (!status.enabled || status.running || Date.now() < status.next_allowed_ms) return null;
        const owner = crypto.randomUUID();
        const now = Date.now();
        const result = database.prepare("UPDATE price_pending_auto_v3 SET owner=?, lease_until=?, last_attempt_ms=?, updated_at=? WHERE id=? AND enabled=1 AND owner IS NULL")
            .run(owner, now + LEASE_MS, now, iso(), KEY);
        if (!result.changes) return null;
        event("iniciada", "Sistema", owner);
        return owner;
    }).immediate();
}
function heartbeat(owner) {
    return db().prepare("UPDATE price_pending_auto_v3 SET lease_until=?, updated_at=? WHERE id=? AND owner=?")
        .run(Date.now() + LEASE_MS, iso(), KEY, owner).changes === 1;
}
function finish(owner, result = {}, error = null) {
    const message = error ? String(error.message || error) : result.success ? "" : "Cobrança concluída com falhas. Consulte o histórico.";
    db().transaction(() => {
        const update = db().prepare("UPDATE price_pending_auto_v3 SET owner=NULL, lease_until=NULL, last_success_at=CASE WHEN ?=1 THEN ? ELSE last_success_at END, last_error=?, updated_at=? WHERE id=? AND owner=?")
            .run(result.success ? 1 : 0, iso(), message || null, iso(), KEY, owner);
        if (update.changes) event(error || !result.success ? "falha" : "sucesso", "Sistema", JSON.stringify({ run_id: result.run_id || null, sent: result.sent || 0, error: message }));
    }).immediate();
}
module.exports = { getStatus, setEnabled, tryLock, heartbeat, finish, event, INTERVAL_MS };
