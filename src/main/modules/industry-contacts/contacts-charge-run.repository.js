const crypto = require("node:crypto");
const { getDatabase } = require("./industry-contacts.database");

function now() {
    return new Date().toISOString();
}

function ensureSchema(database) {
    database.exec(`
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

        CREATE INDEX IF NOT EXISTS idx_contact_charge_runs_favorite
        ON contact_charge_runs(favorite_id);

        CREATE INDEX IF NOT EXISTS idx_contact_charge_runs_status
        ON contact_charge_runs(status);

        CREATE INDEX IF NOT EXISTS idx_contact_charge_run_items_run
        ON contact_charge_run_items(run_id);

        CREATE INDEX IF NOT EXISTS idx_contact_charge_run_items_status
        ON contact_charge_run_items(status);
    `);
}

function mapRun(row) {
    return {
        id: row.id,
        favorite_id: row.favorite_id,
        favorite_name: row.favorite_name,
        charge_type: row.charge_type,
        status: row.status,
        total: row.total,
        sent: row.sent,
        failed: row.failed,
        ignored: row.ignored,
        cancelled: row.cancelled,
        started_at: row.started_at,
        finished_at: row.finished_at,
        error_message: row.error_message,
        created_at: row.created_at,
        items: []
    };
}

function mapRunItem(row) {
    return {
        id: row.id,
        run_id: row.run_id,
        contact_id: row.contact_id,
        laboratory_name: row.laboratory_name,
        laboratory_key: row.laboratory_key,
        branch: row.branch,
        email: row.email,
        status: row.status,
        error_message: row.error_message,
        sent_at: row.sent_at,
        created_at: row.created_at
    };
}

function createRun(data = {}) {
    const database = getDatabase();
    ensureSchema(database);

    const id = crypto.randomUUID();
    const run = {
        id,
        favorite_id: data.favorite_id || null,
        favorite_name: data.favorite_name || null,
        charge_type: data.charge_type || "custom",
        status: "pending",
        total: Number(data.total || 0),
        sent: 0,
        failed: 0,
        ignored: 0,
        cancelled: 0,
        started_at: null,
        finished_at: null,
        error_message: null,
        created_at: now()
    };

    database.prepare(`
        INSERT INTO contact_charge_runs (
            id, favorite_id, favorite_name, charge_type, status,
            total, sent, failed, ignored, cancelled,
            started_at, finished_at, error_message, created_at
        ) VALUES (
            @id, @favorite_id, @favorite_name, @charge_type, @status,
            @total, @sent, @failed, @ignored, @cancelled,
            @started_at, @finished_at, @error_message, @created_at
        )
    `).run(run);

    const insertItem = database.prepare(`
        INSERT INTO contact_charge_run_items (
            id, run_id, contact_id, laboratory_name, laboratory_key,
            branch, email, status, error_message, sent_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const contacts = Array.isArray(data.contacts) ? data.contacts : [];

    for (const contact of contacts) {
        const hasEmail = Boolean(String(contact.email || "").trim());

        insertItem.run(
            crypto.randomUUID(),
            id,
            contact.contact_id || contact.id || null,
            contact.laboratory_name || null,
            contact.laboratory_key || null,
            contact.branch || null,
            contact.email || null,
            hasEmail ? "pending" : "ignored",
            hasEmail ? null : "Contato sem e-mail válido.",
            null,
            now()
        );
    }

    return getRun(id);
}

function getRun(id) {
    const database = getDatabase();
    ensureSchema(database);

    const row = database
        .prepare("SELECT * FROM contact_charge_runs WHERE id = ?")
        .get(id);

    if (!row) return null;

    const run = mapRun(row);

    run.items = database
        .prepare(`
            SELECT * FROM contact_charge_run_items
            WHERE run_id = ?
            ORDER BY laboratory_name COLLATE NOCASE ASC, created_at ASC
        `)
        .all(id)
        .map(mapRunItem);

    return run;
}

function listRuns(limit = 50) {
    const database = getDatabase();
    ensureSchema(database);

    const rows = database
        .prepare(`
            SELECT * FROM contact_charge_runs
            ORDER BY created_at DESC
            LIMIT ?
        `)
        .all(Number(limit) || 50);

    return rows.map(mapRun);
}

function startRun(id) {
    const database = getDatabase();
    ensureSchema(database);

    database.prepare(`
        UPDATE contact_charge_runs
        SET status = 'running',
            started_at = ?
        WHERE id = ?
    `).run(now(), id);

    return getRun(id);
}

function updateItemStatus(runId, itemId, status, errorMessage = null) {
    const database = getDatabase();
    ensureSchema(database);

    const sentAt = status === "sent" ? now() : null;

    database.prepare(`
        UPDATE contact_charge_run_items
        SET status = ?,
            error_message = ?,
            sent_at = ?
        WHERE id = ? AND run_id = ?
    `).run(status, errorMessage, sentAt, itemId, runId);

    refreshRunCounters(runId);
    return getRun(runId);
}

function refreshRunCounters(runId) {
    const database = getDatabase();
    ensureSchema(database);

    const counters = database
        .prepare(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
                SUM(CASE WHEN status = 'ignored' THEN 1 ELSE 0 END) AS ignored,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
            FROM contact_charge_run_items
            WHERE run_id = ?
        `)
        .get(runId);

    database.prepare(`
        UPDATE contact_charge_runs
        SET total = ?,
            sent = ?,
            failed = ?,
            ignored = ?,
            cancelled = ?
        WHERE id = ?
    `).run(
        counters.total || 0,
        counters.sent || 0,
        counters.failed || 0,
        counters.ignored || 0,
        counters.cancelled || 0,
        runId
    );
}

function cancelRun(id) {
    const database = getDatabase();
    ensureSchema(database);

    database.prepare(`
        UPDATE contact_charge_run_items
        SET status = 'cancelled'
        WHERE run_id = ? AND status = 'pending'
    `).run(id);

    refreshRunCounters(id);

    database.prepare(`
        UPDATE contact_charge_runs
        SET status = 'cancelled',
            finished_at = ?
        WHERE id = ?
    `).run(now(), id);

    return getRun(id);
}

function finishRun(id, errorMessage = null) {
    const database = getDatabase();
    ensureSchema(database);

    refreshRunCounters(id);

    const run = getRun(id);
    if (!run) return null;

    const hasFailures = run.failed > 0;
    const status = run.cancelled > 0 && run.sent < run.total
        ? "cancelled"
        : hasFailures
            ? "completed_with_errors"
            : "completed";

    database.prepare(`
        UPDATE contact_charge_runs
        SET status = ?,
            finished_at = ?,
            error_message = ?
        WHERE id = ?
    `).run(status, now(), errorMessage, id);

    return getRun(id);
}

function getFailedItems(runId) {
    const database = getDatabase();
    ensureSchema(database);

    return database
        .prepare(`
            SELECT * FROM contact_charge_run_items
            WHERE run_id = ? AND status = 'failed'
            ORDER BY laboratory_name COLLATE NOCASE ASC
        `)
        .all(runId)
        .map(mapRunItem);
}

function resetFailedItems(runId) {
    const database = getDatabase();
    ensureSchema(database);

    database.prepare(`
        UPDATE contact_charge_run_items
        SET status = 'pending',
            error_message = NULL,
            sent_at = NULL
        WHERE run_id = ? AND status = 'failed'
    `).run(runId);

    refreshRunCounters(runId);

    database.prepare(`
        UPDATE contact_charge_runs
        SET status = 'pending',
            finished_at = NULL,
            error_message = NULL
        WHERE id = ?
    `).run(runId);

    return getRun(runId);
}

module.exports = {
    createRun,
    getRun,
    listRuns,
    startRun,
    updateItemStatus,
    refreshRunCounters,
    cancelRun,
    finishRun,
    getFailedItems,
    resetFailedItems
};
