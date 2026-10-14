const crypto = require("node:crypto");
const { getDatabase } = require("./industry-contacts.database");

function database() {
    const db = getDatabase();
    db.exec(`
        CREATE TABLE IF NOT EXISTS industry_contact_charge_history (
            id TEXT PRIMARY KEY,
            batch_id TEXT NOT NULL,
            contact_id TEXT NOT NULL,
            laboratory_name TEXT,
            branch TEXT,
            charge_type TEXT NOT NULL,
            recipient TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            attachments TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            sent_at TEXT,
            finished_at TEXT,
            message_id TEXT,
            error_message TEXT,
            sent_copy_error TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_contact_charge_success
        ON industry_contact_charge_history (contact_id, branch, charge_type, status, sent_at);
    `);
    return db;
}

function begin(preview, batchId) {
    const id = crypto.randomUUID();
    database().prepare(`
        INSERT INTO industry_contact_charge_history (
            id, batch_id, contact_id, laboratory_name, branch,
            charge_type, recipient, subject, body, attachments, status, started_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sending', ?)
    `).run(
        id, batchId, preview.contact.id, preview.contact.laboratory_name,
        preview.contact.branch, preview.charge_type, preview.to,
        preview.subject, preview.body, JSON.stringify(preview.attachments),
        new Date().toISOString()
    );
    return id;
}

function finish(id, result) {
    database().prepare(`
        UPDATE industry_contact_charge_history
        SET status = ?, sent_at = ?, finished_at = ?, message_id = ?,
            error_message = ?, sent_copy_error = ? WHERE id = ?
    `).run(
        result.success ? 'sent' : 'failed', result.sentAt || null,
        new Date().toISOString(), result.messageId || null,
        result.error || null, result.sentCopyError || null, id
    );
}

function getLastChargesMap() {
    const rows = database().prepare(`
        SELECT contact_id, branch,
            MAX(CASE WHEN charge_type = 'prices' THEN sent_at END) AS last_prices_charge_at,
            MAX(CASE WHEN charge_type = 'pending' THEN sent_at END) AS last_pending_charge_at
        FROM industry_contact_charge_history WHERE status = 'sent'
        GROUP BY contact_id, branch
    `).all();
    return new Map(rows.map((row) => [JSON.stringify([String(row.contact_id), row.branch || '']), row]));
}

module.exports = { begin, finish, getLastChargesMap };
