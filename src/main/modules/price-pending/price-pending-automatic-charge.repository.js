const crypto = require("node:crypto");
const { getPricePendingDatabase } = require("./price-pending.database");

const DEFAULT_INTERVAL_HOURS = 48;
const LEASE_MS = 5 * 60 * 1000;
const ensuredDatabases = new WeakSet();
const KEY = "automatic-charge-v3";

function iso() { return new Date().toISOString(); }
function db() {
    const database = getPricePendingDatabase();
    if (ensuredDatabases.has(database)) return database;
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
    ensuredDatabases.add(database);
    return database;
}
function event(kind, actor, detail = "") {
    db().prepare("INSERT INTO price_pending_auto_events_v3 VALUES (?, ?, ?, ?, ?)")
        .run(crypto.randomUUID(), kind, String(actor || "Sistema"), String(detail), iso());
}
function getIntervalHours() {
    const row = db().prepare("SELECT interval_hours FROM price_pending_auto_settings WHERE id = ?").get(KEY);
    const hours = Number(row?.interval_hours);
    return Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_INTERVAL_HOURS;
}
function setIntervalHours(hours, actor) {
    const interval = Number(hours);
    if (!Number.isFinite(interval) || interval < 1 || interval > 8760) {
        throw new Error("Informe um intervalo entre 1 hora e 8.760 horas.");
    }
    db().transaction(() => {
        db().prepare(`
            INSERT INTO price_pending_auto_settings (id, interval_hours, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET interval_hours = excluded.interval_hours, updated_at = excluded.updated_at
        `).run(KEY, Math.floor(interval), iso());
        event("intervalo-alterado", actor, `${Math.floor(interval)} horas`);
    }).immediate();
    return getStatus();
}
function getStatus() {
    const row = db().prepare("SELECT * FROM price_pending_auto_v3 WHERE id = ?").get(KEY);
    const intervalHours = getIntervalHours();
    const intervalMs = intervalHours * 60 * 60 * 1000;
    const lastAttempt = Number(row.last_attempt_ms || 0);
    const nextMs = lastAttempt ? lastAttempt + intervalMs : 0;
    return {
        enabled: Boolean(row.enabled),
        running: Boolean(row.owner),
        recovery_required: Boolean(row.owner && Number(row.lease_until || 0) <= Date.now()),
        last_success_at: row.last_success_at || "",
        last_error: row.last_error || "",
        last_attempt_ms: lastAttempt,
        interval_hours: intervalHours,
        next_allowed_ms: nextMs,
        next_allowed_at: nextMs ? new Date(nextMs).toISOString() : "",
        updated_at: row.updated_at
    };
}
function setEnabled(enabled, actor) {
    if (!enabled) {
        const database = db();
        database.transaction(() => {
            database.prepare("UPDATE price_pending_auto_v3 SET enabled = 0, updated_at = ? WHERE id = ?").run(iso(), KEY);
            event("desativada", actor);
        }).immediate();
        return getStatus();
    }
    const status = getStatus();
    if (status.running) throw new Error("Existe execução ou bloqueio pendente. Consulte o histórico antes de reativar.");
    db().transaction(() => {
        db().prepare("UPDATE price_pending_auto_v3 SET enabled = 1, updated_at = ? WHERE id = ?").run(iso(), KEY);
        event("ativada", actor);
    }).immediate();
    return getStatus();
}
function tryLock(manual = false) {
    const database = db();
    return database.transaction(() => {
        const status = getStatus();
        if (!status.enabled || status.running) return null;
        if (!manual && Date.now() < status.next_allowed_ms) return null;
        const owner = crypto.randomUUID();
        const now = Date.now();
        const result = database.prepare(`
            UPDATE price_pending_auto_v3
            SET owner = ?, lease_until = ?, last_attempt_ms = ?, updated_at = ?
            WHERE id = ? AND enabled = 1 AND owner IS NULL
        `).run(owner, now + LEASE_MS, now, iso(), KEY);
        if (!result.changes) return null;
        event(manual ? "execucao-manual" : "iniciada", "Sistema", owner);
        return owner;
    }).immediate();
}
function heartbeat(owner) {
    return db().prepare("UPDATE price_pending_auto_v3 SET lease_until = ?, updated_at = ? WHERE id = ? AND owner = ?")
        .run(Date.now() + LEASE_MS, iso(), KEY, owner).changes === 1;
}
function finish(owner, result = {}, error = null) {
    const message = error ? String(error.message || error) : result.success ? "" : "Cobrança concluída com falhas. Consulte o histórico.";
    db().transaction(() => {
        const update = db().prepare(`
            UPDATE price_pending_auto_v3
            SET owner = NULL, lease_until = NULL,
                last_success_at = CASE WHEN ? = 1 THEN ? ELSE last_success_at END,
                last_error = ?, updated_at = ?
            WHERE id = ? AND owner = ?
        `).run(result.success ? 1 : 0, iso(), message || null, iso(), KEY, owner);
        if (update.changes) {
            event(error || !result.success ? "falha" : "sucesso", "Sistema", JSON.stringify({
                run_id: result.run_id || null, sent: result.sent || 0, error: message
            }));
        }
    }).immediate();
}
module.exports = { getStatus, setEnabled, setIntervalHours, tryLock, heartbeat, finish, event, DEFAULT_INTERVAL_HOURS };
