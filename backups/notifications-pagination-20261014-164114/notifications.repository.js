const crypto = require(
    "node:crypto"
);

const {
    getDatabase
} = require(
    "../../database/connection"
);

const {
    NOTIFICATION_DEFAULTS,
    NOTIFICATION_STATUSES
} = require(
    "./notifications.constants"
);

function normalizeText(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const text =
        String(
            value
        ).trim();

    return text || null;
}

function normalizeJson(
    value
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    if (
        typeof value ===
        "string"
    ) {
        return value;
    }

    return JSON.stringify(
        value
    );
}

function parseMetadata(
    value
) {
    if (!value) {
        return null;
    }

    if (
        typeof value ===
        "object"
    ) {
        return value;
    }

    try {
        return JSON.parse(
            value
        );
    } catch {
        return value;
    }
}

function mapNotificationRow(
    row
) {
    if (!row) {
        return null;
    }

    return {
        ...row,
        metadata:
            parseMetadata(
                row.metadata
            )
    };
}

function buildListWhere(
    filters = {}
) {
    const conditions = [];
    const params = {};

    if (
        filters.status
    ) {
        conditions.push(
            "status = @status"
        );

        params.status =
            String(
                filters.status
            ).trim();
    }

    if (
        filters.type
    ) {
        conditions.push(
            "type = @type"
        );

        params.type =
            String(
                filters.type
            ).trim();
    }

    if (
        filters.priority
    ) {
        conditions.push(
            "priority = @priority"
        );

        params.priority =
            String(
                filters.priority
            ).trim();
    }

    if (
        filters.source_module
    ) {
        conditions.push(
            "source_module = @source_module"
        );

        params.source_module =
            String(
                filters.source_module
            ).trim();
    }

    if (
        filters.branch
    ) {
        conditions.push(
            "branch = @branch"
        );

        params.branch =
            String(
                filters.branch
            ).trim();
    }

    if (
        filters.search
    ) {
        conditions.push(`
            (
                title LIKE @search
                OR message LIKE @search
                OR laboratory_name LIKE @search
                OR laboratory_key LIKE @search
                OR industry_global_code LIKE @search
                OR recipient_email LIKE @search
            )
        `);

        params.search =
            `%${String(
                filters.search
            ).trim()}%`;
    }

    return {
        whereClause:
            conditions.length
                ? `WHERE ${conditions.join(
                      " AND "
                  )}`
                : "",
        params
    };
}

function listNotifications(
    filters = {}
) {
    const database =
        getDatabase();

    const {
        whereClause,
        params
    } = buildListWhere(
        filters
    );

    const limit =
        Math.min(
            Math.max(
                Number(
                    filters.limit
                ) || 200,
                1
            ),
            1000
        );

    const rows =
        database.prepare(`
            SELECT
                id,
                type,
                title,
                message,
                source_module,
                source_id,
                laboratory_name,
                laboratory_key,
                industry_global_code,
                branch,
                recipient_email,
                status,
                priority,
                read_at,
                sent_at,
                error_message,
                metadata,
                created_at,
                updated_at
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
                datetime(created_at) DESC
            LIMIT @limit
        `)
        .all({
            ...params,
            limit
        });

    return rows.map(
        mapNotificationRow
    );
}

function getNotificationById(
    id
) {
    const database =
        getDatabase();

    const normalizedId =
        String(
            id || ""
        ).trim();

    if (!normalizedId) {
        return null;
    }

    const row =
        database.prepare(`
            SELECT
                id,
                type,
                title,
                message,
                source_module,
                source_id,
                laboratory_name,
                laboratory_key,
                industry_global_code,
                branch,
                recipient_email,
                status,
                priority,
                read_at,
                sent_at,
                error_message,
                metadata,
                created_at,
                updated_at
            FROM notifications
            WHERE id = ?
            LIMIT 1
        `)
        .get(
            normalizedId
        );

    return mapNotificationRow(
        row
    );
}

function getNotificationBySource(
    sourceModule,
    sourceId,
    type
) {
    const database =
        getDatabase();

    const normalizedSourceModule =
        String(
            sourceModule || ""
        ).trim();

    const normalizedSourceId =
        String(
            sourceId || ""
        ).trim();

    const normalizedType =
        String(
            type || ""
        ).trim();

    if (
        !normalizedSourceModule ||
        !normalizedSourceId ||
        !normalizedType
    ) {
        return null;
    }

    const row =
        database.prepare(`
            SELECT
                id,
                type,
                title,
                message,
                source_module,
                source_id,
                laboratory_name,
                laboratory_key,
                industry_global_code,
                branch,
                recipient_email,
                status,
                priority,
                read_at,
                sent_at,
                error_message,
                metadata,
                created_at,
                updated_at
            FROM notifications
            WHERE source_module = ?
                AND source_id = ?
                AND type = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 1
        `)
        .get(
            normalizedSourceModule,
            normalizedSourceId,
            normalizedType
        );

    return mapNotificationRow(
        row
    );
}

function deleteNotificationsBySource(
    sourceModule,
    sourceId,
    type
) {
    const database =
        getDatabase();

    const normalizedSourceModule =
        normalizeText(
            sourceModule
        );

    const normalizedSourceId =
        normalizeText(
            sourceId
        );

    const normalizedType =
        normalizeText(
            type
        );

    if (
        !normalizedSourceModule ||
        !normalizedSourceId
    ) {
        return {
            success: true,
            changes: 0
        };
    }

    const conditions = [
        "source_module = @source_module",
        "source_id = @source_id"
    ];

    const params = {
        source_module:
            normalizedSourceModule,
        source_id:
            normalizedSourceId
    };

    if (
        normalizedType
    ) {
        conditions.push(
            "type = @type"
        );

        params.type =
            normalizedType;
    }

    const result =
        database.prepare(`
            DELETE FROM notifications
            WHERE ${conditions.join(
                " AND "
            )}
        `)
        .run(
            params
        );

    return {
        success: true,
        changes:
            Number(
                result.changes || 0
            ),
        source_module:
            normalizedSourceModule,
        source_id:
            normalizedSourceId,
        type:
            normalizedType
    };
}

function createNotification(
    data = {}
) {
    const database =
        getDatabase();

    const now =
        new Date().toISOString();

    const entity = {
        id:
            String(
                data.id ||
                    crypto.randomUUID()
            ),

        type:
            String(
                data.type || ""
            ).trim(),

        title:
            String(
                data.title || ""
            ).trim(),

        message:
            String(
                data.message || ""
            ).trim(),

        source_module:
            String(
                data.source_module ||
                    ""
            ).trim(),

        source_id:
            normalizeText(
                data.source_id
            ),

        laboratory_name:
            normalizeText(
                data.laboratory_name
            ),

        laboratory_key:
            normalizeText(
                data.laboratory_key
            ),

        industry_global_code:
            normalizeText(
                data.industry_global_code
            ),

        branch:
            normalizeText(
                data.branch
            ),

        recipient_email:
            normalizeText(
                data.recipient_email
            ),

        status:
            String(
                data.status ||
                    NOTIFICATION_DEFAULTS.status
            ).trim(),

        priority:
            String(
                data.priority ||
                    NOTIFICATION_DEFAULTS.priority
            ).trim(),

        read_at:
            normalizeText(
                data.read_at
            ),

        sent_at:
            normalizeText(
                data.sent_at
            ),

        error_message:
            normalizeText(
                data.error_message
            ),

        metadata:
            normalizeJson(
                data.metadata
            ),

        created_at:
            data.created_at ||
            now,

        updated_at:
            now
    };

    if (
        !entity.type
    ) {
        throw new Error(
            "Tipo da notificação é obrigatório."
        );
    }

    if (
        !entity.title
    ) {
        throw new Error(
            "Título da notificação é obrigatório."
        );
    }

    if (
        !entity.message
    ) {
        throw new Error(
            "Mensagem da notificação é obrigatória."
        );
    }

    if (
        !entity.source_module
    ) {
        throw new Error(
            "Módulo de origem é obrigatório."
        );
    }

    database.prepare(`
        INSERT INTO notifications (
            id,
            type,
            title,
            message,
            source_module,
            source_id,
            laboratory_name,
            laboratory_key,
            industry_global_code,
            branch,
            recipient_email,
            status,
            priority,
            read_at,
            sent_at,
            error_message,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            @id,
            @type,
            @title,
            @message,
            @source_module,
            @source_id,
            @laboratory_name,
            @laboratory_key,
            @industry_global_code,
            @branch,
            @recipient_email,
            @status,
            @priority,
            @read_at,
            @sent_at,
            @error_message,
            @metadata,
            @created_at,
            @updated_at
        )
    `).run(
        entity
    );

    return getNotificationById(
        entity.id
    );
}

function updateNotification(
    id,
    data = {}
) {
    const database =
        getDatabase();

    const normalizedId =
        String(
            id || ""
        ).trim();

    if (
        !normalizedId
    ) {
        throw new Error(
            "ID da notificação não informado."
        );
    }

    const fields = [
        "type",
        "title",
        "message",
        "source_module",
        "source_id",
        "laboratory_name",
        "laboratory_key",
        "industry_global_code",
        "branch",
        "recipient_email",
        "priority",
        "metadata"
    ];

    const updates = [];
    const params = {
        id: normalizedId,
        updated_at:
            new Date().toISOString()
    };

    fields.forEach(
        (field) => {
            if (
                data[field] !==
                undefined
            ) {
                updates.push(
                    `${field} = @${field}`
                );

                params[field] =
                    field ===
                    "metadata"
                        ? normalizeJson(
                              data[field]
                          )
                        : normalizeText(
                              data[field]
                          );
            }
        }
    );

    if (
        !updates.length
    ) {
        return getNotificationById(
            normalizedId
        );
    }

    updates.push(
        "updated_at = @updated_at"
    );

    database.prepare(`
        UPDATE notifications
        SET ${updates.join(", ")}
        WHERE id = @id
    `).run(
        params
    );

    return getNotificationById(
        normalizedId
    );
}

function updateNotificationStatus(
    id,
    status,
    extra = {}
) {
    const database =
        getDatabase();

    const normalizedId =
        String(
            id || ""
        ).trim();

    if (
        !normalizedId
    ) {
        throw new Error(
            "ID da notificação não informado."
        );
    }

    if (
        !status
    ) {
        throw new Error(
            "Status da notificação não informado."
        );
    }

    const updates = [
        "status = @status",
        "updated_at = @updated_at"
    ];

    const params = {
        id: normalizedId,
        status:
            String(
                status
            ).trim(),
        updated_at:
            new Date().toISOString()
    };

    if (
        status ===
        NOTIFICATION_STATUSES.READ
    ) {
        updates.push(
            "read_at = @read_at"
        );

        params.read_at =
            new Date().toISOString();
    }

    if (
        status ===
        NOTIFICATION_STATUSES.SENT
    ) {
        updates.push(
            "sent_at = @sent_at"
        );

        params.sent_at =
            new Date().toISOString();
    }

    if (
        extra.error_message !==
        undefined
    ) {
        updates.push(
            "error_message = @error_message"
        );

        params.error_message =
            normalizeText(
                extra.error_message
            );
    }

    database.prepare(`
        UPDATE notifications
        SET ${updates.join(", ")}
        WHERE id = @id
    `).run(
        params
    );

    return getNotificationById(
        normalizedId
    );
}

function markNotificationAsRead(
    id
) {
    return updateNotificationStatus(
        id,
        NOTIFICATION_STATUSES.READ
    );
}

function dismissNotification(
    id
) {
    return updateNotificationStatus(
        id,
        NOTIFICATION_STATUSES.DISMISSED
    );
}

function deleteNotification(
    id
) {
    const database =
        getDatabase();

    const normalizedId =
        String(
            id || ""
        ).trim();

    if (
        !normalizedId
    ) {
        throw new Error(
            "ID da notificação não informado."
        );
    }

    const result =
        database.prepare(`
            DELETE FROM notifications
            WHERE id = ?
        `)
        .run(
            normalizedId
        );

    if (
        !result.changes
    ) {
        throw new Error(
            "Notificação não encontrada."
        );
    }

    return {
        success: true,
        id: normalizedId
    };
}

function countNotifications(
    filters = {}
) {
    const database =
        getDatabase();

    const {
        whereClause,
        params
    } = buildListWhere(
        filters
    );

    const result =
        database.prepare(`
            SELECT
                COUNT(*) AS total
            FROM notifications
            ${whereClause}
        `)
        .get(
            params
        );

    return Number(
        result?.total || 0
    );
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