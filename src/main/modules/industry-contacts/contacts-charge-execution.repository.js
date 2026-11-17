const crypto = require("node:crypto");
const { getDatabase } = require("./industry-contacts.database");
const runs = require("./contacts-charge-run.repository");

const ensured = new WeakSet();
const TERMINAL_ITEMS = new Set(["sent", "failed", "ignored", "cancelled"]);

function database() {
    const db = getDatabase();
    if (!ensured.has(db)) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS contact_charge_cancel_requests_v1 (
                run_id TEXT PRIMARY KEY,
                requested_by TEXT NOT NULL,
                requested_at TEXT NOT NULL,
                request_id TEXT NOT NULL
            );
        `);
        ensured.add(db);
    }
    return db;
}

function createRun(data) {
    const db = database();
    return db.transaction(() => runs.createRun(data)).immediate();
}

function requestCancel(runId, actor) {
    const db = database();
    return db.transaction(() => {
        const run = runs.getRun(runId);
        if (!run) throw new Error("Execução de cobrança não encontrada.");
        if (!["pending", "running"].includes(run.status)) {
            throw new Error("Esta execução não está ativa. Confira o histórico antes de recuperar ou reenviar.");
        }
        db.prepare(`
            INSERT OR IGNORE INTO contact_charge_cancel_requests_v1
                (run_id, requested_by, requested_at, request_id)
            VALUES (?, ?, ?, ?)
        `).run(runId, String(actor || "Sistema"), new Date().toISOString(), crypto.randomUUID());
        return { ...run, cancelRequested: true };
    }).immediate();
}

function isCancellationRequested(runId) {
    return Boolean(database().prepare(
        "SELECT run_id FROM contact_charge_cancel_requests_v1 WHERE run_id = ?"
    ).get(runId));
}

function interruptRun(runId, error) {
    const db = database();
    return db.transaction(() => {
        runs.refreshRunCounters(runId);
        db.prepare(`
            UPDATE contact_charge_runs
            SET status = 'interrupted', finished_at = ?, error_message = ?
            WHERE id = ?
        `).run(new Date().toISOString(), String(error || "Execução interrompida. Confira o histórico antes de reenviar."), runId);
        return runs.getRun(runId);
    }).immediate();
}

function finishRun(runId, cancelled) {
    const db = database();
    return db.transaction(() => {
        let run = runs.getRun(runId);
        if (!run) throw new Error("Execução de cobrança não encontrada.");
        if (run.items.some(item => item.status === "sending")) {
            throw new Error("Existe resultado de envio incerto. A execução requer revisão.");
        }
        if (cancelled) runs.cancelRun(runId);
        run = runs.getRun(runId);
        if (run.items.some(item => !TERMINAL_ITEMS.has(item.status))) {
            throw new Error("Não é possível concluir uma execução com itens pendentes.");
        }
        return cancelled ? run : runs.finishRun(runId);
    }).immediate();
}

module.exports = { createRun, requestCancel, isCancellationRequested, interruptRun, finishRun };
