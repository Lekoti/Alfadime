const crypto = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");
const { getDatabase } = require("./industry-contacts.database");
const access = require("../price-pending/price-pending-access");
const context = new AsyncLocalStorage();
const ensured = new WeakSet();
const WAIT = 48 * 60 * 60 * 1000;
function database() {
    const db = getDatabase();
    if (!ensured.has(db)) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS charge_coordination_v4 (
                id TEXT PRIMARY KEY, email TEXT NOT NULL, source TEXT NOT NULL,
                actor TEXT NOT NULL, run_id TEXT, covered TEXT NOT NULL,
                started_ms INTEGER NOT NULL, finished_ms INTEGER,
                status TEXT NOT NULL, error TEXT
            );
            CREATE UNIQUE INDEX IF NOT EXISTS charge_coordination_active_v4
                ON charge_coordination_v4(email) WHERE status='sending';
            CREATE INDEX IF NOT EXISTS charge_coordination_email_v4
                ON charge_coordination_v4(email, started_ms);
            CREATE TABLE IF NOT EXISTS charge_run_actor_v4 (
                run_id TEXT PRIMARY KEY, actor TEXT NOT NULL, source TEXT NOT NULL
            );
        `);
        ensured.add(db);
    }
    return db;
}
function withContext(source, work) {
    if (context.getStore()) return work();
    const user = source === "automatic" ? null : access.requireEditor();
    return context.run({ source, actor: user ? access.name(user) : "Sistema", runId: null }, work);
}
function automatic(work) { return withContext("automatic", work); }
function manual(work) { return withContext("manual", work); }
function recordRun(runId) {
    const store = context.getStore();
    const user = store ? null : access.requireEditor();
    const actor = store?.actor || access.name(user);
    const source = store?.source || "manual";
    database().prepare("INSERT OR IGNORE INTO charge_run_actor_v4 VALUES (?, ?, ?)").run(runId, actor, source);
    if (store) store.runId = runId;
}
function metadata(runId) {
    const row = database().prepare("SELECT actor,source FROM charge_run_actor_v4 WHERE run_id=?").get(runId);
    return row ? { triggered_by_name: row.actor, source: row.source } : {};
}
function latestLegacy(db, table, emailColumn, email) {
    if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)) return 0;
    const rows = db.prepare(`SELECT sent_at FROM ${table} WHERE lower(trim(${emailColumn}))=? AND status='sent'`).all(email);
    let last = 0;
    for (const row of rows) {
        const parsed = Date.parse(row.sent_at);
        if (!Number.isFinite(parsed)) throw new Error("Data de envio inválida no histórico deste destinatário. Confira antes de reenviar.");
        last = Math.max(last, parsed);
    }
    return last;
}
function reserve(message) {
    const db = database();
    const store = context.getStore();
    if (!store) throw new Error("Contexto de autorização da cobrança ausente.");
    const email = String(message.to || "").trim().toLowerCase();
    if (!email) throw new Error("Destinatário ausente.");
    return db.transaction(() => {
        if (db.prepare("SELECT id FROM charge_coordination_v4 WHERE email=? AND status='sending'").get(email)) {
            throw new Error("Há envio em andamento ou resultado incerto para este destinatário. Confira o histórico; não foi feito reenvio.");
        }
        const previous = db.prepare("SELECT MAX(started_ms) AS stamp FROM charge_coordination_v4 WHERE email=?").get(email);
        let last = Number(previous?.stamp || 0);
        if (store.source === "automatic") {
            last = Math.max(last, latestLegacy(db, "contact_charge_run_items", "email", email), latestLegacy(db, "industry_contact_charge_history", "recipient", email));
            if (last && Date.now() < last + WAIT) throw new Error("Envio automático adiado: ainda não passaram 48 horas para este destinatário.");
        }
        const id = crypto.randomUUID();
        const covered = message.covered?.length ? message.covered : [{
            contact_id: message.contact?.id, laboratory_name: message.contact?.laboratory_name,
            branch: message.contact?.branch
        }];
        db.prepare("INSERT INTO charge_coordination_v4(id,email,source,actor,run_id,covered,started_ms,status) VALUES (?,?,?,?,?,?,?,'sending')")
            .run(id,email,store.source,store.actor,store.runId,JSON.stringify(covered),Date.now());
        return id;
    }).immediate();
}
async function sendPlan(plan, token, execute) {
    if (!context.getStore()) return manual(() => sendPlan(plan, token, execute));
    if (!Array.isArray(plan.messages) || plan.messages.length !== 1) throw new Error("Envio deve ser coordenado por destinatário.");
    const message = plan.messages[0];
    const id = reserve(message);
    let result;
    try {
        result = await execute(plan, token);
    } catch (error) {
        // A falha pode ter ocorrido depois do SMTP. Mantém reserva incerta para revisão.
        database().prepare("UPDATE charge_coordination_v4 SET error=? WHERE id=?").run(String(error.message || error),id);
        throw error;
    }
    const warning = result.results?.some(item => item.historyWarning);
    if (warning) {
        database().prepare("UPDATE charge_coordination_v4 SET error=? WHERE id=?").run("Envio com histórico não confirmado. Conferência manual necessária.",id);
    } else {
        database().prepare("UPDATE charge_coordination_v4 SET status=?,finished_ms=?,error=? WHERE id=?")
            .run(result.success ? "sent" : "failed", Date.now(), result.success ? null : JSON.stringify(result.results || []), id);
    }
    return result;
}
function expandedItems(runId, fallback) {
    const rows = database().prepare("SELECT * FROM charge_coordination_v4 WHERE run_id=? ORDER BY started_ms").all(runId);
    if (!rows.length) return fallback;
    const items=[];
    for (const row of rows) {
        let covered=[];
        try { covered=JSON.parse(row.covered); } catch (_) { covered=[]; }
        for (let index=0; index<covered.length; index++) {
            const contact=covered[index];
            items.push({ id: row.id + ":" + index, laboratory_name:contact.laboratory_name,
                branch:contact.branch,email:row.email,status:row.status,
                sent_at:row.status==="sent" && row.finished_ms ? new Date(row.finished_ms).toISOString() : null,
                error_message:row.error || null });
        }
    }
    // Preserva também itens sem envio coordenado, por exemplo os adiados pelo prazo.
    const emails=new Set(rows.map(row=>row.email));
    return items.concat((fallback || []).filter(item=>!emails.has(String(item.email||"").trim().toLowerCase())));
}
module.exports={ automatic, manual, recordRun, metadata, sendPlan, expandedItems };
