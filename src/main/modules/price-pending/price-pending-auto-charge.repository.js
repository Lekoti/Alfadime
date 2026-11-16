const crypto = require("node:crypto");
const { getDatabase } = require("../industry-contacts/industry-contacts.database");
const { FIXED_FAVORITE_ID } = require("../industry-contacts/contacts-charge-favorites.repository");


function createRepository({ getDatabase: getDb = getDatabase } = {}) {
    function ensureSchema(database) {
        database.exec(`
            CREATE TABLE IF NOT EXISTS price_pending_auto_charge_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                enabled INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            );

            INSERT OR IGNORE INTO price_pending_auto_charge_settings (
                id, enabled, updated_at
            ) VALUES (1, 0, '${new Date(0).toISOString()}');

            CREATE TABLE IF NOT EXISTS price_pending_auto_charge_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                status TEXT NOT NULL,
                recipients TEXT NOT NULL DEFAULT '[]',
                run_id TEXT,
                actor TEXT,
                error_message TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_price_pending_auto_charge_events_created
            ON price_pending_auto_charge_events(created_at);

            CREATE TABLE IF NOT EXISTS price_pending_auto_charge_lock (
                lock_key TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );
        `);
    }

    function getLastSuccessfulSend(database) {
        const tables = database.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name IN ('contact_charge_runs', 'contact_charge_run_items')
        `).all();

        if (tables.length !== 2) return null;

        return database.prepare(`
            SELECT MAX(item.sent_at) AS sent_at
            FROM contact_charge_run_items AS item
            INNER JOIN contact_charge_runs AS run ON run.id = item.run_id
            WHERE run.favorite_id = ?
              AND item.status = 'sent'
        `).get(FIXED_FAVORITE_ID)?.sent_at || null;
    }

    function mapEvent(row) {
        let recipients = [];
        try {
            recipients = JSON.parse(row.recipients || "[]");
        } catch {
            recipients = [];
        }

        return { ...row, recipients };
    }

    function getConfiguration() {
        const database = getDb();
        ensureSchema(database);
        const row = database.prepare(`
            SELECT enabled, updated_at
            FROM price_pending_auto_charge_settings
            WHERE id = 1
        `).get();

        return {
            enabled: row.enabled === 1,
            updated_at: row.updated_at,
            last_successful_send_at: getLastSuccessfulSend(database)
        };
    }

    function setEnabled(enabled, actor = "") {
        const database = getDb();
        ensureSchema(database);
        const nextEnabled = enabled === true;
        const now = new Date().toISOString();

        database.transaction(() => {
            const current = database.prepare(`
                SELECT enabled
                FROM price_pending_auto_charge_settings
                WHERE id = 1
            `).get();

            if ((current.enabled === 1) === nextEnabled) return;

            database.prepare(`
                UPDATE price_pending_auto_charge_settings
                SET enabled = ?, updated_at = ?
                WHERE id = 1
            `).run(nextEnabled ? 1 : 0, now);

            database.prepare(`
                INSERT INTO price_pending_auto_charge_events (
                    id, event_type, status, recipients, actor, created_at
                ) VALUES (?, ?, ?, '[]', ?, ?)
            `).run(
                crypto.randomUUID(),
                nextEnabled ? "activation" : "deactivation",
                nextEnabled ? "enabled" : "disabled",
                actor || null,
                now
            );
        }).immediate();

        return getConfiguration();
    }

    function listEvents(limit = 50) {
        const database = getDb();
        ensureSchema(database);
        const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
        return database.prepare(`
            SELECT id, event_type, status, recipients, run_id, actor, error_message, created_at
            FROM price_pending_auto_charge_events
            ORDER BY created_at DESC
            LIMIT ?
        `).all(safeLimit).map(mapEvent);
    }

    function claimExecution(ownerId, intervalMs, leaseMs = 10 * 60 * 1000) {
        const database = getDb();
        ensureSchema(database);
        const nowMs = Date.now();
        const now = new Date(nowMs).toISOString();

        return database.transaction(() => {
            const settings = database.prepare(`
                SELECT enabled
                FROM price_pending_auto_charge_settings
                WHERE id = 1
            `).get();

            if (settings.enabled !== 1) return { claimed: false, reason: "disabled" };

            const lastSuccessfulSendAt = getLastSuccessfulSend(database);
            const lastSuccessfulMs = Date.parse(lastSuccessfulSendAt || "");
            const lastNoRecipients = database.prepare(`
                SELECT MAX(created_at) AS created_at
                FROM price_pending_auto_charge_events
                WHERE event_type = 'execution' AND status = 'no_recipients'
            `).get()?.created_at;
            const lastNoRecipientsMs = Date.parse(lastNoRecipients || "");
            const lastCheckMs = Math.max(
                Number.isFinite(lastSuccessfulMs) ? lastSuccessfulMs : 0,
                Number.isFinite(lastNoRecipientsMs) ? lastNoRecipientsMs : 0
            );

            if (lastCheckMs > 0 && nowMs - lastCheckMs < intervalMs) {
                return {
                    claimed: false,
                    reason: "not_due",
                    last_successful_send_at: lastSuccessfulSendAt
                };
            }

            const lock = database.prepare(`
                SELECT owner_id, expires_at
                FROM price_pending_auto_charge_lock
                WHERE lock_key = 'fixed-prices-pending-outdated'
            `).get();

            if (lock && lock.expires_at > now) {
                return { claimed: false, reason: "busy" };
            }

            database.prepare(`
                INSERT INTO price_pending_auto_charge_lock(lock_key, owner_id, expires_at)
                VALUES ('fixed-prices-pending-outdated', ?, ?)
                ON CONFLICT(lock_key) DO UPDATE SET
                    owner_id = excluded.owner_id,
                    expires_at = excluded.expires_at
            `).run(ownerId, new Date(nowMs + leaseMs).toISOString());

            const eventId = crypto.randomUUID();
            database.prepare(`
                INSERT INTO price_pending_auto_charge_events (
                    id, event_type, status, recipients, created_at
                ) VALUES (?, 'execution', 'running', '[]', ?)
            `).run(eventId, now);

            return { claimed: true, event_id: eventId };
        }).immediate();
    }

    function finishExecution(ownerId, eventId, result = {}) {
        const database = getDb();
        ensureSchema(database);
        const status = result.status === "success" || result.status === "no_recipients"
            ? result.status
            : "failure";

        database.transaction(() => {
            database.prepare(`
                UPDATE price_pending_auto_charge_events
                SET status = ?, recipients = ?, run_id = ?, error_message = ?
                WHERE id = ? AND event_type = 'execution'
            `).run(
                status,
                JSON.stringify(Array.isArray(result.recipients) ? result.recipients : []),
                result.run_id || null,
                result.error || null,
                eventId
            );

            database.prepare(`
                INSERT INTO price_pending_auto_charge_events (
                    id, event_type, status, recipients, run_id, error_message, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                crypto.randomUUID(),
                status === "failure" ? "failure" : "success",
                status,
                JSON.stringify(Array.isArray(result.recipients) ? result.recipients : []),
                result.run_id || null,
                result.error || null,
                new Date().toISOString()
            );

            database.prepare(`
                DELETE FROM price_pending_auto_charge_lock
                WHERE lock_key = 'fixed-prices-pending-outdated' AND owner_id = ?
            `).run(ownerId);
        }).immediate();
    }

    function releaseExecution(ownerId) {
        const database = getDb();
        ensureSchema(database);
        database.prepare(`
            DELETE FROM price_pending_auto_charge_lock
            WHERE lock_key = 'fixed-prices-pending-outdated' AND owner_id = ?
        `).run(ownerId);
    }

    function renewExecution(ownerId, leaseMs = 10 * 60 * 1000) {
        const database = getDb();
        ensureSchema(database);
        return database.prepare(`
            UPDATE price_pending_auto_charge_lock
            SET expires_at = ?
            WHERE lock_key = 'fixed-prices-pending-outdated' AND owner_id = ?
        `).run(new Date(Date.now() + leaseMs).toISOString(), ownerId).changes > 0;
    }

    return {
        getConfiguration,
        setEnabled,
        listEvents,
        claimExecution,
        finishExecution,
        releaseExecution,
        renewExecution
    };
}


module.exports = {
    ...createRepository(),
    createRepository
};
