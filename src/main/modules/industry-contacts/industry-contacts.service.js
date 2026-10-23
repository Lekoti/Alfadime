const repository = require("./industry-contacts.repository");
const pricePendingRepository = require("../price-pending/price-pending.repository");
const notificationsService = require("../notifications/notifications.service");

const ALLOWED_BRANCHES = ["DPR", "AMS", "DMT", "DMS", "DSC"];
const NOTIFICATION_SOURCE_MODULE = "industry-contacts";
const INCOMPLETE_CONTACT_NOTIFICATION_TYPE = "INCOMPLETE_CONTACT";
const PRICE_PENDING_NOTIFICATION_TYPE = "PRICE_PENDING_STATUS";

function normalizeText(value) {
    return String(value ?? "").trim();
}

function normalizeBranch(value) {
    return normalizeText(value).toUpperCase();
}

function getContactStatus(row = {}) {
    const problems = [];
    if (row.has_contact !== 1 && row.has_contact !== true) {
        return "Sem contato";
    }
    if (!normalizeText(row.contact_name)) problems.push("Falta nome");
    if (!normalizeText(row.phone)) problems.push("Falta telefone");
    if (!normalizeText(row.email)) problems.push("Falta e-mail");
    if (!ALLOWED_BRANCHES.includes(normalizeBranch(row.branch))) {
        problems.push("Falta filial");
    }
    return problems.length ? problems.join("; ") : "Contato completo";
}

function getPricePendingStatus(laboratory, branch) {
    return pricePendingRepository.getPricePendingStatus(laboratory, branch);
}

function getAutomaticObservation(row = {}, pricePendingStatus = "") {
    return normalizeText(row.notes) || pricePendingStatus;
}

function getNotificationEvents(row = {}, pricePendingStatus = "") {
    return [{
        type: PRICE_PENDING_NOTIFICATION_TYPE,
        laboratoryKey: row.laboratory_key || null,
        laboratoryName: row.laboratory_name || null,
        branch: row.branch || null,
        statusLabel: pricePendingStatus,
        automaticObservation: getAutomaticObservation(row, pricePendingStatus)
    }];
}

function getIndustryGlobalCode(row = {}) {
    return pricePendingRepository.getIndustryGlobalCodeByLaboratory(
        row.laboratory_name || row.laboratory || ""
    );
}

function enrichRow(row = {}, context = {}) {
    const statusMapKey = `${normalizeText(row.laboratory_name).toUpperCase()}:${normalizeBranch(row.branch)}`;
    const pricePendingStatus = context.pricePendingStatusMap?.get(statusMapKey) ||
        getPricePendingStatus(row.laboratory_name, row.branch);
    const industryGlobalCode = context.industryGlobalCodeMap?.get(
        normalizeText(row.laboratory_name).toUpperCase()
    ) || getIndustryGlobalCode(row);
    const enriched = {
        ...row,
        laboratory_key: row.laboratory_key ||
            repository.normalizeLaboratoryKey(row.laboratory_name),
        industry_global_code: industryGlobalCode,
        status_label: getContactStatus(row),
        price_pending_status: pricePendingStatus,
        automatic_observation: getAutomaticObservation(row, pricePendingStatus)
    };
    return {
        ...enriched,
        notification_events: getNotificationEvents(enriched, pricePendingStatus)
    };
}

function getContactNotificationSourceId(contact = {}) {
    const id = normalizeText(contact.id || contact.contact_id);
    return id ? `contact:${id}` : null;
}

function removeIncompleteContactNotification(sourceId) {
    if (!sourceId) return null;
    return notificationsService.deleteBySource(
        NOTIFICATION_SOURCE_MODULE, sourceId, INCOMPLETE_CONTACT_NOTIFICATION_TYPE
    );
}

function removePricePendingNotification(sourceId) {
    if (!sourceId) return null;
    return notificationsService.deleteBySource(
        NOTIFICATION_SOURCE_MODULE, sourceId, PRICE_PENDING_NOTIFICATION_TYPE
    );
}

function syncIncompleteContactNotification(contact) {
    const sourceId = getContactNotificationSourceId(contact);
    if (!sourceId) return null;
    const contactStatus = contact.status_label || getContactStatus(contact);
    if (contactStatus === "Contato completo") {
        return removeIncompleteContactNotification(sourceId);
    }
    const existing = notificationsService.findBySource(
        NOTIFICATION_SOURCE_MODULE, sourceId, INCOMPLETE_CONTACT_NOTIFICATION_TYPE
    );
    const data = {
        type: INCOMPLETE_CONTACT_NOTIFICATION_TYPE,
        title: "Contato incompleto",
        message: `${contact.laboratory_name} possui pendências no cadastro: ${contactStatus}.`,
        source_module: NOTIFICATION_SOURCE_MODULE,
        source_id: sourceId,
        laboratory_name: contact.laboratory_name,
        laboratory_key: contact.laboratory_key,
        industry_global_code: contact.industry_global_code,
        branch: contact.branch,
        recipient_email: contact.email,
        priority: "normal",
        metadata: {
            contact_id: contact.id || contact.contact_id,
            contact_status: contactStatus
        }
    };
    return existing
        ? notificationsService.update(existing.id, data)
        : notificationsService.createNotification(data);
}

function syncPricePendingNotification(contact) {
    // A origem price-pending passou a ser responsável por estes avisos.
    return null;
}

function buildPricePendingStatusMap() {
    return typeof pricePendingRepository.getPricePendingStatusMap === "function"
        ? pricePendingRepository.getPricePendingStatusMap()
        : new Map();
}

function buildIndustryGlobalCodeMap() {
    if (typeof pricePendingRepository.getIndustryGlobalCodeMap !== "function") {
        return new Map();
    }
    return new Map(
        [...pricePendingRepository.getIndustryGlobalCodeMap().entries()].map(
            ([key, value]) => [normalizeText(key).toUpperCase(), value]
        )
    );
}

function syncContactNotifications(contact) {
    try {
        syncIncompleteContactNotification(contact);
    } catch (error) {
        console.error("Erro ao sincronizar notificação de contato incompleto:", error);
    }
    try {
        syncPricePendingNotification(contact);
    } catch (error) {
        console.error("Erro ao sincronizar notificação de preços e pendências:", error);
    }
}

function reconcileIncompleteContactNotifications() {
    const contacts = repository.listLaboratories();
    const pending = contacts.filter(
        (contact) => getContactStatus(contact) !== "Contato completo"
    );
    const active = new Set(pending.map(getContactNotificationSourceId));
    const { getDatabase } = require("../../database/connection");
    const database = getDatabase();
    return database.transaction(() => {
        for (const contact of pending) {
            syncIncompleteContactNotification({
                ...contact,
                status_label: getContactStatus(contact)
            });
        }
        const rows = database.prepare(`
            SELECT id, source_id FROM notifications
            WHERE source_module = ? AND type = ?
            ORDER BY created_at DESC, id DESC
        `).all(NOTIFICATION_SOURCE_MODULE, INCOMPLETE_CONTACT_NOTIFICATION_TYPE);
        const seen = new Set();
        const remove = database.prepare("DELETE FROM notifications WHERE id = ?");
        let removed = 0;
        for (const row of rows) {
            if (!active.has(row.source_id) || seen.has(row.source_id)) {
                removed += remove.run(row.id).changes;
            } else {
                seen.add(row.source_id);
            }
        }
        return { success: true, removed, pending: pending.length };
    })();
}

function syncNotificationsInBackground() {
    return reconcileIncompleteContactNotifications();
}

function listLaboratories() {
    const contacts = repository.listLaboratories();
    const context = {
        pricePendingStatusMap: buildPricePendingStatusMap(),
        industryGlobalCodeMap: buildIndustryGlobalCodeMap()
    };
    const rows = contacts.map((contact) => enrichRow(contact, context));
    const withContact = rows.filter((row) => row.has_contact === 1).length;
    reconcileIncompleteContactNotifications();
    for (const contact of rows) {
        syncPricePendingNotification(contact);
    }
    return {
        rows,
        summary: {
            total: rows.length,
            withContact,
            withoutContact: rows.length - withContact
        }
    };
}

function saveContact(data = {}) {
    const savedContact = repository.saveContact(data);
    const contact = enrichRow({ ...savedContact, has_contact: 1, source_contact: 1 }, {
        pricePendingStatusMap: buildPricePendingStatusMap(),
        industryGlobalCodeMap: buildIndustryGlobalCodeMap()
    });
    reconcileIncompleteContactNotifications();
    syncPricePendingNotification(contact);
    return {
        contact,
        save_summary: savedContact.save_summary || null,
        spreadsheet: {
            success: true,
            disabled: true,
            message: "Contato salvo somente no banco de dados."
        }
    };
}

function deleteContact(id) {
    const result = repository.deleteContact(id);
    reconcileIncompleteContactNotifications();
    return result;
}

function getLaboratoriesWithoutContacts() {
    return repository.getLaboratoriesWithoutContacts();
}

module.exports = {
    listLaboratories,
    saveContact,
    deleteContact,
    getLaboratoriesWithoutContacts,
    getContactStatus,
    getPricePendingStatus,
    getAutomaticObservation,
    getNotificationEvents,
    getIndustryGlobalCode,
    enrichRow,
    syncIncompleteContactNotification,
    syncPricePendingNotification,
    getContactNotificationSourceId,
    removeIncompleteContactNotification,
    removePricePendingNotification,
    syncContactNotifications,
    syncNotificationsInBackground,
    reconcileIncompleteContactNotifications
};
