const crypto = require("node:crypto");
const { getDatabase } = require("../../database/connection");
const { NOTIFICATION_DEFAULTS, NOTIFICATION_STATUSES } = require("./notifications.constants");

const SELECT_FIELDS = `
    id, type, title, message, source_module, source_id,
    laboratory_name, laboratory_key, industry_global_code, branch,
    recipient_email, status, priority, read_at, sent_at,
    error_message, metadata, created_at, updated_at
`;

function normalizeText(value) {
    if (value === null || value === undefined) return null;
    return String(value).trim() || null;
}

function normalizeJson(value) {
    if (value === null || value === undefined || value === "") return null;
    return typeof value === "string" ? value : JSON.stringify(value);
}

function parseMetadata(value) {
    if (!value) return null;
    if (typeof value === "object") return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function mapNotificationRow(row) {
    return row ? { ...row, metadata: parseMetadata(row.metadata) } : null;
}

function buildListWhere(filters = {}) {
    const conditions = [];
    const params = {};
    const siriusFilter = filters.type === "SIRS_ERROR";
    if (siriusFilter) {
        conditions.push(`(
            type = 'SIRS_ERROR'
            OR (
                type = 'PRODUCT_DIVERGENCE'
                AND CASE WHEN json_valid(metadata)
                    THEN json_extract(metadata, '$.field_name') ELSE NULL END = 'sirius_code'
            )
        )`);
    }
    for (const field of ["status", "type", "priority", "source_module", "branch"]) {
        if (field === "type" && siriusFilter) continue;
        if (filters[field]) {
            conditions.push(`${field} = @${field}`);
            params[field] = String(filters[field]).trim();
        }
    }
    if (filters.search) {
        conditions.push(`(
            title LIKE @search OR message LIKE @search
            OR laboratory_name LIKE @search OR laboratory_key LIKE @search
            OR industry_global_code LIKE @search OR recipient_email LIKE @search
        )`);
        params.search = `%${String(filters.search).trim()}%`;
    }
    return {
        whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
        params
    };
}

function boundedInteger(value, fallback, maximum) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
        ? Math.min(Math.max(Math.floor(parsed), 1), maximum)
        : fallback;
}

function listNotifications(filters = {}) {
    const database = getDatabase();
    const { whereClause, params } = buildListWhere(filters);
    const paginated = filters.paginate === true;
    const limit = paginated
        ? boundedInteger(filters.pageSize ?? 50, 50, 200)
        : boundedInteger(Number(filters.limit) || 200, 200, 1000);
    const page = boundedInteger(filters.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const offset = paginated ? (page - 1) * limit : 0;
    const rows = database.prepare(`
        SELECT ${SELECT_FIELDS}
        FROM notifications
        ${whereClause}
        ORDER BY
            CASE priority
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END,
            datetime(created_at) DESC,
            id DESC
        LIMIT @limit OFFSET @offset
    `).all({ ...params, limit, offset });
    return rows.map(mapNotificationRow);
}

function getNotificationById(id) {
    const normalizedId = String(id || "").trim();
    if (!normalizedId) return null;
    return mapNotificationRow(getDatabase().prepare(`
        SELECT ${SELECT_FIELDS} FROM notifications WHERE id = ? LIMIT 1
    `).get(normalizedId));
}

function getNotificationBySource(sourceModule, sourceId, type) {
    const moduleName = String(sourceModule || "").trim();
    const source = String(sourceId || "").trim();
    const notificationType = String(type || "").trim();
    if (!moduleName || !source || !notificationType) return null;
    return mapNotificationRow(getDatabase().prepare(`
        SELECT ${SELECT_FIELDS} FROM notifications
        WHERE source_module = ? AND source_id = ? AND type = ?
        ORDER BY datetime(created_at) DESC, id DESC LIMIT 1
    `).get(moduleName, source, notificationType));
}

function deleteNotificationsBySource(sourceModule, sourceId, type) {
    const moduleName = normalizeText(sourceModule);
    const source = normalizeText(sourceId);
    const notificationType = normalizeText(type);
    if (!moduleName || !source) return { success: true, changes: 0 };
    const conditions = ["source_module = @source_module", "source_id = @source_id"];
    const params = { source_module: moduleName, source_id: source };
    if (notificationType) {
        conditions.push("type = @type");
        params.type = notificationType;
    }
    const result = getDatabase().prepare(`
        DELETE FROM notifications WHERE ${conditions.join(" AND ")}
    `).run(params);
    return {
        success: true,
        changes: Number(result.changes || 0),
        source_module: moduleName,
        source_id: source,
        type: notificationType
    };
}

function createNotification(data = {}) {
    const now = new Date().toISOString();
    const entity = {
        id: String(data.id || crypto.randomUUID()),
        type: String(data.type || "").trim(),
        title: String(data.title || "").trim(),
        message: String(data.message || "").trim(),
        source_module: String(data.source_module || "").trim(),
        source_id: normalizeText(data.source_id),
        laboratory_name: normalizeText(data.laboratory_name),
        laboratory_key: normalizeText(data.laboratory_key),
        industry_global_code: normalizeText(data.industry_global_code),
        branch: normalizeText(data.branch),
        recipient_email: normalizeText(data.recipient_email),
        status: String(data.status || NOTIFICATION_DEFAULTS.status).trim(),
        priority: String(data.priority || NOTIFICATION_DEFAULTS.priority).trim(),
        read_at: normalizeText(data.read_at),
        sent_at: normalizeText(data.sent_at),
        error_message: normalizeText(data.error_message),
        metadata: normalizeJson(data.metadata),
        created_at: data.created_at || now,
        updated_at: now
    };
    if (!entity.type) throw new Error("Tipo da notificação é obrigatório.");
    if (!entity.title) throw new Error("Título da notificação é obrigatório.");
    if (!entity.message) throw new Error("Mensagem da notificação é obrigatória.");
    if (!entity.source_module) throw new Error("Módulo de origem é obrigatório.");
    const fields = Object.keys(entity);
    getDatabase().prepare(`
        INSERT INTO notifications (${fields.join(", ")})
        VALUES (${fields.map((field) => `@${field}`).join(", ")})
    `).run(entity);
    return getNotificationById(entity.id);
}

function updateNotification(id, data = {}) {
    const normalizedId = String(id || "").trim();
    if (!normalizedId) throw new Error("ID da notificação não informado.");
    const fields = [
        "type", "title", "message", "source_module", "source_id",
        "laboratory_name", "laboratory_key", "industry_global_code",
        "branch", "recipient_email", "priority", "metadata"
    ];
    const updates = [];
    const params = { id: normalizedId, updated_at: new Date().toISOString() };
    for (const field of fields) {
        if (data[field] !== undefined) {
            updates.push(`${field} = @${field}`);
            params[field] = field === "metadata"
                ? normalizeJson(data[field]) : normalizeText(data[field]);
        }
    }
    if (!updates.length) return getNotificationById(normalizedId);
    updates.push("updated_at = @updated_at");
    getDatabase().prepare(`
        UPDATE notifications SET ${updates.join(", ")} WHERE id = @id
    `).run(params);
    return getNotificationById(normalizedId);
}

function updateNotificationStatus(id, status, extra = {}) {
    const normalizedId = String(id || "").trim();
    if (!normalizedId) throw new Error("ID da notificação não informado.");
    if (!status) throw new Error("Status da notificação não informado.");
    const updates = ["status = @status", "updated_at = @updated_at"];
    const params = {
        id: normalizedId,
        status: String(status).trim(),
        updated_at: new Date().toISOString()
    };
    if (status === NOTIFICATION_STATUSES.READ) {
        updates.push("read_at = @read_at");
        params.read_at = new Date().toISOString();
    }
    if (status === NOTIFICATION_STATUSES.SENT) {
        updates.push("sent_at = @sent_at");
        params.sent_at = new Date().toISOString();
    }
    if (extra.error_message !== undefined) {
        updates.push("error_message = @error_message");
        params.error_message = normalizeText(extra.error_message);
    }
    getDatabase().prepare(`
        UPDATE notifications SET ${updates.join(", ")} WHERE id = @id
    `).run(params);
    return getNotificationById(normalizedId);
}

function markNotificationAsRead(id) {
    return updateNotificationStatus(id, NOTIFICATION_STATUSES.READ);
}

function dismissNotification(id) {
    return updateNotificationStatus(id, NOTIFICATION_STATUSES.DISMISSED);
}

function deleteNotification(id) {
    const normalizedId = String(id || "").trim();
    if (!normalizedId) throw new Error("ID da notificação não informado.");
    const result = getDatabase().prepare(
        "DELETE FROM notifications WHERE id = ?"
    ).run(normalizedId);
    if (!result.changes) throw new Error("Notificação não encontrada.");
    return { success: true, id: normalizedId };
}

function countNotifications(filters = {}) {
    const { whereClause, params } = buildListWhere(filters);
    const result = getDatabase().prepare(`
        SELECT COUNT(*) AS total FROM notifications ${whereClause}
    `).get(params);
    return Number(result?.total || 0);
}

module.exports = {
    listNotifications,
    getNotificationById,
    getNotificationBySource,
    createNotification,
    updateNotification,
    updateNotificationStatus,
    markNotificationAsRead,
    dismissNotification,
    deleteNotification,
    deleteNotificationsBySource,
    countNotifications,
    parseMetadata
};
