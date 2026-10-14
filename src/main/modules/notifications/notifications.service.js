const repository = require("./notifications.repository");
const {
    NOTIFICATION_STATUSES,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_TYPES,
    NOTIFICATION_SOURCE_MODULES
} = require("./notifications.constants");

function normalizeText(value) {
    return String(value ?? "").trim();
}

function normalizeStatus(value) {
    const status = normalizeText(value).toLowerCase();
    if (!status) return "";
    if (!Object.values(NOTIFICATION_STATUSES).includes(status)) {
        throw new Error("Status de notificação inválido.");
    }
    return status;
}

function normalizePriority(value) {
    const priority = normalizeText(value).toLowerCase();
    if (!priority) return "";
    if (!Object.values(NOTIFICATION_PRIORITIES).includes(priority)) {
        throw new Error("Prioridade de notificação inválida.");
    }
    return priority;
}

function normalizeType(value) {
    const type = normalizeText(value);
    if (!type) throw new Error("Tipo de notificação não informado.");
    if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
        throw new Error("Tipo de notificação inválido.");
    }
    return type;
}

function normalizeSourceModule(value) {
    const sourceModule = normalizeText(value);
    if (!sourceModule) throw new Error("Módulo de origem não informado.");
    if (!Object.values(NOTIFICATION_SOURCE_MODULES).includes(sourceModule)) {
        throw new Error("Módulo de origem inválido.");
    }
    return sourceModule;
}

function normalizeFilters(filters = {}) {
    const normalized = { ...filters };
    if (normalized.status) normalized.status = normalizeStatus(normalized.status);
    if (normalized.priority) normalized.priority = normalizePriority(normalized.priority);
    if (normalized.type) normalized.type = normalizeType(normalized.type);
    if (normalized.source_module) {
        normalized.source_module = normalizeSourceModule(normalized.source_module);
    }
    return normalized;
}

function reconcileContactNotifications() {
    const contactsService = require("../industry-contacts/industry-contacts.service");
    return contactsService.reconcileIncompleteContactNotifications();
}

function reconcileNotifications() {
    reconcileContactNotifications();
    require("./price-pending-notifications.service").reconcilePricePendingNotifications();
}

function positiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    return Number.isFinite(number)
        ? Math.min(Math.max(Math.floor(number), 1), maximum)
        : fallback;
}

function listNotifications(filters = {}) {
    const normalizedFilters = normalizeFilters(filters);

    if (filters.paginate !== true) {
        return repository.listNotifications(normalizedFilters);
    }
    const pageSize = positiveInteger(filters.pageSize ?? 50, 50, 200);
    const requestedPage = positiveInteger(filters.page ?? 1, 1);
    const { getDatabase } = require("../../database/connection");
    return getDatabase().transaction(() => {
        const total = repository.countNotifications(normalizedFilters);
        const totalPages = Math.max(Math.ceil(total / pageSize), 1);
        const page = Math.min(requestedPage, totalPages);
        const rows = repository.listNotifications({
            ...normalizedFilters, paginate: true, page, pageSize
        });
        const offset = (page - 1) * pageSize;
        return {
            rows,
            pagination: {
                page, pageSize, total, totalPages, offset,
                from: total === 0 ? 0 : offset + 1,
                to: Math.min(offset + rows.length, total)
            }
        };
    })();
}

function getNotificationById(id) {
    const normalizedId = normalizeText(id);
    if (!normalizedId) throw new Error("ID da notificação não informado.");
    const notification = repository.getNotificationById(normalizedId);
    if (!notification) throw new Error("Notificação não encontrada.");
    return notification;
}

function createNotification(data = {}) {
    return repository.createNotification({
        ...data,
        type: normalizeType(data.type),
        source_module: normalizeSourceModule(data.source_module),
        status: data.status ? normalizeStatus(data.status) : undefined,
        priority: data.priority ? normalizePriority(data.priority) : undefined
    });
}

function findBySource(sourceModule, sourceId, type) {
    const normalizedSourceModule = normalizeSourceModule(sourceModule);
    const normalizedSourceId = normalizeText(sourceId);
    const normalizedType = normalizeType(type);
    if (!normalizedSourceId) return null;
    return repository.getNotificationBySource(
        normalizedSourceModule, normalizedSourceId, normalizedType
    );
}

function deleteBySource(sourceModule, sourceId, type) {
    const normalizedSourceModule = normalizeSourceModule(sourceModule);
    const normalizedSourceId = normalizeText(sourceId);
    const normalizedType = type ? normalizeType(type) : null;
    if (!normalizedSourceId) return { success: true, changes: 0 };
    return repository.deleteNotificationsBySource(
        normalizedSourceModule, normalizedSourceId, normalizedType
    );
}

function update(id, data = {}) {
    const normalizedId = normalizeText(id);
    if (!normalizedId) throw new Error("ID da notificação não informado.");
    const normalizedData = { ...data };
    if (normalizedData.type !== undefined) {
        normalizedData.type = normalizeType(normalizedData.type);
    }
    if (normalizedData.source_module !== undefined) {
        normalizedData.source_module = normalizeSourceModule(normalizedData.source_module);
    }
    if (normalizedData.priority !== undefined) {
        normalizedData.priority = normalizePriority(normalizedData.priority);
    }
    if (normalizedData.status !== undefined) {
        normalizedData.status = normalizeStatus(normalizedData.status);
    }
    return repository.updateNotification(normalizedId, normalizedData);
}

function markAsRead(id) {
    getNotificationById(id);
    return repository.markNotificationAsRead(id);
}

function dismiss(id) {
    getNotificationById(id);
    return repository.dismissNotification(id);
}

function updateStatus(id, status, extra = {}) {
    getNotificationById(id);
    return repository.updateNotificationStatus(id, normalizeStatus(status), extra);
}

function remove(id) {
    getNotificationById(id);
    return repository.deleteNotification(id);
}

function getSummary(filters = {}) {
    const normalizedFilters = normalizeFilters(filters);

    const total = repository.countNotifications(normalizedFilters);
    const pending = repository.countNotifications({
        ...normalizedFilters, status: NOTIFICATION_STATUSES.PENDING
    });
    const read = repository.countNotifications({
        ...normalizedFilters, status: NOTIFICATION_STATUSES.READ
    });
    const sent = repository.countNotifications({
        ...normalizedFilters, status: NOTIFICATION_STATUSES.SENT
    });
    const errors = repository.countNotifications({
        ...normalizedFilters, status: NOTIFICATION_STATUSES.ERROR
    });
    return { total, pending, read, sent, errors };
}

module.exports = {
    listNotifications,
    getNotificationById,
    createNotification,
    findBySource,
    deleteBySource,
    update,
    markAsRead,
    dismiss,
    updateStatus,
    remove,
    getSummary,
    normalizeFilters
};
