const crypto = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");
const { getDatabase } = require("./industry-contacts.database");
const contacts = require("./industry-contacts.repository");
const access = require("../price-pending/price-pending-access");
const policy = require("./contacts-charge-policy");
const context = new AsyncLocalStorage();
const ensured = new WeakSet();
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
            CREATE TABLE IF NOT EXISTS charge_identity_locks_v5 (
                identity_key TEXT PRIMARY KEY, reservation_id TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS charge_identity_reservation_v5
                ON charge_identity_locks_v5(reservation_id);
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
    database().prepare("INSERT OR IGNORE INTO charge_run_actor_v4 VALUES (?, ?, ?)")
        .run(runId, store?.actor || access.name(user), store?.source || "manual");
    if (store) store.runId = runId;
}
function metadata(runId) {
    const row = database().prepare("SELECT actor,source FROM charge_run_actor_v4 WHERE run_id=?").get(runId);
    return row ? { triggered_by_name: row.actor, source: row.source } : {};
}
function normalizeCovered(message) {
    const entries = message.covered?.length ? message.covered : [{
        contact_id: message.contact?.id, laboratory_name: message.contact?.laboratory_name,
        laboratory_key: message.contact?.laboratory_key, branch: message.contact?.branch
    }];
    return entries.map(item => {
        const current = item.contact_id ? contacts.getContactById(item.contact_id) : null;
        const entry = { ...item,
            laboratory_key: current?.laboratory_key || item.laboratory_key || item.laboratory_name,
            branch: item.branch || current?.branch
        };
        return { ...entry, identity_key: policy.identity(entry) };
    });
}
function storedIdentities(row) {
    let entries;
    try { entries = JSON.parse(row.covered); }
    catch (_) { throw new Error("Reserva com identificação inválida. Confira o histórico antes de enviar."); }
    if (!Array.isArray(entries) || !entries.length) throw new Error("Reserva sem identificação de indústria. Revisão necessária.");
    return entries.map(item => {
        if (item.identity_key) return item.identity_key;
        const current = item.contact_id ? contacts.getContactById(item.contact_id) : null;
        return policy.identity({ ...item, laboratory_key: current?.laboratory_key || item.laboratory_key || item.laboratory_name });
    });
}
function legacyLast(db, table, emailColumn, email, keys) {
    if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)) return 0;
    const rows = db.prepare(`SELECT * FROM ${table} WHERE status='sent'`).all();
    let last = 0;
    for (const row of rows) {
        let matches = String(row[emailColumn] || "").trim().toLowerCase() === email;
        if (!matches && row.contact_id) {
            const current = contacts.getContactById(row.contact_id);
            if (current) matches = keys.has(policy.identity({ ...current, branch: row.branch || current.branch }));
        }
        if (!matches) continue;
        const stamp = Date.parse(row.sent_at);
        if (!Number.isFinite(stamp)) throw new Error("Data inválida no histórico deste destinatário/indústria. Revisão necessária.");
        last = Math.max(last, stamp);
    }
    return last;
}
function reserve(message) {
    const db = database();
    const store = context.getStore();
    if (!store) throw new Error("Contexto de autorização ausente.");
    const email = String(message.to || "").trim().toLowerCase();
    if (!email) throw new Error("Destinatário ausente.");
    const covered = normalizeCovered(message);
    const keys = new Set(covered.map(item => item.identity_key));
    return db.transaction(() => {
        const rows = db.prepare("SELECT * FROM charge_coordination_v4").all();
        let last = 0;
        for (const row of rows) {
            if (row.status === "preflight_failed") continue;
            const related = row.email === email || storedIdentities(row).some(key => keys.has(key));
            if (!related) continue;
            if (row.status === "sending") throw new Error("Envio em andamento ou resultado incerto para esta indústria/filial ou e-mail. Confira o histórico antes de reenviar.");
            last = Math.max(last, policy.reference(row));
        }
        if (store.source === "automatic") {
            last = Math.max(last, legacyLast(db,"contact_charge_run_items","email",email,keys), legacyLast(db,"industry_contact_charge_history","recipient",email,keys));
            if (last && Date.now() < last + policy.WAIT_MS) throw new Error("Cobrança automática adiada: ainda não passaram 48 horas para esta indústria/filial ou e-mail.");
        }
        const id = crypto.randomUUID();
        db.prepare("INSERT INTO charge_coordination_v4(id,email,source,actor,run_id,covered,started_ms,status) VALUES (?,?,?,?,?,?,?,'sending')")
            .run(id,email,store.source,store.actor,store.runId,JSON.stringify(covered),Date.now());
        const insert = db.prepare("INSERT INTO charge_identity_locks_v5(identity_key,reservation_id) VALUES (?,?)");
        for (const key of keys) insert.run(key,id);
        return id;
    }).immediate();
}
function complete(id, status, error) {
    const db = database();
    db.transaction(() => {
        db.prepare("UPDATE charge_coordination_v4 SET status=?,finished_ms=?,error=? WHERE id=?")
            .run(status, status === "sending" ? null : Date.now(), error || null, id);
        if (status !== "sending") db.prepare("DELETE FROM charge_identity_locks_v5 WHERE reservation_id=?").run(id);
    }).immediate();
}
async function sendPlan(plan, token, execute) {
    if (!context.getStore()) return manual(() => sendPlan(plan, token, execute));
    if (!Array.isArray(plan.messages) || plan.messages.length !== 1) throw new Error("Envio deve ser coordenado por destinatário.");
    const id = reserve(plan.messages[0]);
    const phase = { smtpStarted: false };
    let result;
    try {
        result = await execute(plan, token, phase);
    } catch (error) {
        complete(id, phase.smtpStarted ? "sending" : "preflight_failed", String(error.message || error));
        throw error;
    }
    const status = policy.classify(phase.smtpStarted, result);
    complete(id,status,status === "sent" ? null : status === "sending"
        ? "Resultado de envio incerto. Confira SMTP e histórico antes de reenviar."
        : JSON.stringify(result?.results || []));
    return result;
}
function expandedItems(runId, fallback) {
    const rows = database().prepare("SELECT * FROM charge_coordination_v4 WHERE run_id=? ORDER BY started_ms").all(runId);
    if (!rows.length) return fallback;
    const items=[];
    for (const row of rows) {
        let covered=[];
        try { covered=JSON.parse(row.covered); } catch (_) { covered=[]; }
        covered.forEach((contact,index) => items.push({
            id:row.id+":"+index,laboratory_name:contact.laboratory_name,branch:contact.branch,email:row.email,
            status:row.status === "preflight_failed" ? "failed" : row.status,
            sent_at:row.status === "sent" && row.finished_ms ? new Date(row.finished_ms).toISOString() : null,
            error_message:row.error || null
        }));
    }
    const emails=new Set(rows.map(row=>row.email));
    return items.concat((fallback||[]).filter(item=>!emails.has(String(item.email||"").trim().toLowerCase())));
}
module.exports={automatic,manual,recordRun,metadata,sendPlan,expandedItems};
