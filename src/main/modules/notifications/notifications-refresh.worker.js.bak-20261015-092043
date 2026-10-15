const { parentPort, workerData } = require("node:worker_threads");
const Database = require("better-sqlite3");
const Module = require("node:module");

const opened = [];
function open(file, readonly) {
    const database = new Database(file, { readonly, fileMustExist: true, timeout: 10000 });
    database.pragma("foreign_keys = ON");
    opened.push(database);
    return database;
}

function provide(modulePath, exports) {
    const filename = require.resolve(modulePath);
    const instance = new Module(filename, module);
    instance.filename = filename;
    instance.exports = exports;
    instance.loaded = true;
    require.cache[filename] = instance;
}

try {
    const local = open(workerData.localPath, false);
    const contacts = open(workerData.contactsPath, true);
    const prices = open(workerData.pricesPath, true);

    // Usa os caminhos resolvidos pelo processo Electron, sem abrir outro banco por engano.
    provide("../../database/connection", {
        getDatabase: () => local,
        getDatabasePath: () => workerData.localPath
    });
    provide("../industry-contacts/industry-contacts.database", {
        getDatabase: () => contacts,
        getDatabasePath: () => workerData.contactsPath
    });
    provide("../price-pending/price-pending.database", {
        getPricePendingDatabase: () => prices
    });

    const contactsRepository = require("../industry-contacts/industry-contacts.repository");
    const contactsService = require("../industry-contacts/industry-contacts.service");
    const priceRepository = require("../price-pending/price-pending.repository");
    const priceBuilder = require("./price-pending-notifications.service");
    const auditService = require("../product-audit/product-audit.service");
    const auditBuilder = require("./product-audit-notifications.service");
    const notificationRepository = require("./notifications.repository");

    // Todas as consultas e cálculos terminam antes de qualquer limpeza.
    const contactRows = contactsRepository.listLaboratories();
    if (!Array.isArray(contactRows)) throw new Error("Resultado inválido de Contatos.");
    const contactsEntries = [];
    for (const contact of contactRows) {
        const status = contactsService.getContactStatus(contact);
        if (status === "Contato completo") continue;
        const id = String(contact.id || contact.contact_id || "").trim();
        if (!id) throw new Error("Contato sem identificador.");
        contactsEntries.push({
            type: "INCOMPLETE_CONTACT",
            title: "Contato incompleto",
            message: `${contact.laboratory_name} possui pendências no cadastro: ${status}.`,
            source_module: "industry-contacts",
            source_id: `contact:${id}`,
            laboratory_name: contact.laboratory_name,
            laboratory_key: contact.laboratory_key,
            branch: contact.branch,
            recipient_email: contact.email,
            priority: "normal",
            metadata: { contact_id: id, contact_status: status }
        });
    }
    const priceEntries = priceBuilder.buildNotifications(priceRepository.listRows());
    const auditEntries = auditBuilder.buildNotifications(auditService.listAllAuditIssues({}));
    const scopes = [
        { source: "industry-contacts", type: "INCOMPLETE_CONTACT", entries: contactsEntries },
        { source: "price-pending", type: "PRICE_PENDING_STATUS", entries: priceEntries },
        { source: "product-audit", type: "PRODUCT_DIVERGENCE", entries: auditEntries }
    ];
    const completedAt = new Date().toISOString();
    const result = local.transaction(() => {
        let removed = 0;
        for (const scope of scopes) {
            const current = local.prepare(`
                SELECT * FROM notifications WHERE source_module = ? AND type = ?
                ORDER BY created_at DESC, id DESC
            `).all(scope.source, scope.type);
            const existing = new Map();
            for (const row of current) {
                if (!existing.has(row.source_id)) existing.set(row.source_id, row);
            }
            const keep = new Set();
            for (const entry of scope.entries) {
                const row = existing.get(entry.source_id);
                if (!row) {
                    const created = notificationRepository.createNotification(entry);
                    keep.add(created.id);
                } else {
                    keep.add(row.id);
                    const changed = Object.entries(entry).some(([key, value]) => {
                        if (key === "metadata") {
                            return JSON.stringify(notificationRepository.parseMetadata(row.metadata)) !==
                                JSON.stringify(value);
                        }
                        return String(row[key] ?? "") !== String(value ?? "");
                    });
                    if (changed) notificationRepository.updateNotification(row.id, entry);
                }
            }
            const remove = local.prepare("DELETE FROM notifications WHERE id = ?");
            for (const row of current) {
                if (!keep.has(row.id)) removed += remove.run(row.id).changes;
            }
        }
        removed += local.prepare(`
            DELETE FROM notifications
            WHERE source_module = 'industry-contacts' AND type = 'PRICE_PENDING_STATUS'
        `).run().changes;
        local.prepare(`
            INSERT INTO notifications_refresh_state (id, last_success_at)
            VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET last_success_at = excluded.last_success_at
        `).run(completedAt);
        return {
            success: true,
            lastSuccessAt: completedAt,
            removed,
            contacts: contactsEntries.length,
            prices: priceEntries.length,
            audit: auditEntries.length
        };
    })();
    parentPort.postMessage(result);
} catch (error) {
    parentPort.postMessage({ success: false, error: error?.message || String(error) });
} finally {
    for (const database of opened.reverse()) {
        try { database.close(); } catch {}
    }
}
