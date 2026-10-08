const crypto = require("node:crypto");

const {
    getDatabase
} = require("../../database/connection");

function getProductById(productId) {
    const database = getDatabase();

    return database
        .prepare(`
            SELECT *
            FROM product_catalog
            WHERE id = ?
            LIMIT 1
        `)
        .get(productId);
}

function createHistoryEntry(data) {
    const database = getDatabase();

    database
        .prepare(`
            INSERT INTO product_change_history (
                id,
                correction_id,
                product_id,
                action_type,
                source,
                field_name,
                old_value,
                new_value,
                reason,
                changed_by,
                created_at
            ) VALUES (
                @id,
                @correction_id,
                @product_id,
                @action_type,
                @source,
                @field_name,
                @old_value,
                @new_value,
                @reason,
                @changed_by,
                @created_at
            )
        `)
        .run({
            id: crypto.randomUUID(),
            correction_id:
                data.correction_id || null,
            product_id: data.product_id,
            action_type: data.action_type,
            source: data.source,
            field_name: data.field_name,
            old_value:
                data.old_value ?? null,
            new_value:
                data.new_value ?? null,
            reason: data.reason || null,
            changed_by:
                data.changed_by || null,
            created_at: new Date().toISOString()
        });
}

function getPendingCorrection(
    productId,
    fieldName
) {
    const database = getDatabase();

    return database
        .prepare(`
            SELECT *
            FROM product_corrections
            WHERE product_id = ?
              AND field_name = ?
              AND status IN (
                    'pending_excel',
                    'sent_internal'
              )
            ORDER BY updated_at DESC
            LIMIT 1
        `)
        .get(productId, fieldName);
}

function createCorrection(data) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const correction = {
        id: crypto.randomUUID(),
        product_id: data.product_id,
        branch: data.branch,
        code: data.code,
        ean: data.ean || null,
        field_name: data.field_name,
        old_value: data.old_value ?? null,
        new_value: data.new_value,
        correction_reason: data.correction_reason,
        corrected_by: data.corrected_by || null,
        status: "pending_excel",
        created_at: now,
        updated_at: now,
        confirmed_in_excel_at: null,
        cancelled_at: null
    };

    const transaction = database.transaction(() => {
        const existing = getPendingCorrection(
            correction.product_id,
            correction.field_name
        );

        if (existing) {
            database
                .prepare(`
                    UPDATE product_corrections
                    SET
                        old_value = ?,
                        new_value = ?,
                        correction_reason = ?,
                        corrected_by = ?,
                        status = 'pending_excel',
                        updated_at = ?,
                        confirmed_in_excel_at = NULL,
                        cancelled_at = NULL
                    WHERE id = ?
                `)
                .run(
                    correction.old_value,
                    correction.new_value,
                    correction.correction_reason,
                    correction.corrected_by,
                    now,
                    existing.id
                );

            createHistoryEntry({
                correction_id: existing.id,
                product_id: correction.product_id,
                action_type: "manual_correction_updated",
                source: "alfadime",
                field_name: correction.field_name,
                old_value: existing.new_value,
                new_value: correction.new_value,
                reason:
                    "Correcao atualizada no Alfadime.",
                changed_by: null
            });

            return {
                ...existing,
                ...correction,
                id: existing.id,
                status: "pending_excel"
            };
        }

        database
            .prepare(`
                INSERT INTO product_corrections (
                    id,
                    product_id,
                    branch,
                    code,
                    ean,
                    field_name,
                    old_value,
                    new_value,
                    correction_reason,
                    corrected_by,
                    status,
                    created_at,
                    updated_at,
                    confirmed_in_excel_at,
                    cancelled_at
                ) VALUES (
                    @id,
                    @product_id,
                    @branch,
                    @code,
                    @ean,
                    @field_name,
                    @old_value,
                    @new_value,
                    @correction_reason,
                    @corrected_by,
                    @status,
                    @created_at,
                    @updated_at,
                    @confirmed_in_excel_at,
                    @cancelled_at
                )
            `)
            .run(correction);

        createHistoryEntry({
            correction_id: correction.id,
            product_id: correction.product_id,
            action_type: "manual_correction_created",
            source: "alfadime",
            field_name: correction.field_name,
            old_value: correction.old_value,
            new_value: correction.new_value,
            reason:
                "Correcao registrada no Alfadime.",
            changed_by: null
        });

        return correction;
    });

    return transaction();
}

function buildCorrectionsQuery(filters = {}) {
    let query = `
        SELECT
            correction.*,
            product.commercial_name,
            product.active_ingredient,
            product.brand
        FROM product_corrections correction
        INNER JOIN product_catalog product
            ON product.id = correction.product_id
        WHERE 1 = 1
    `;

    const params = [];

    if (filters.status) {
        query += `
            AND correction.status = ?
        `;

        params.push(filters.status);
    }

    if (filters.branch) {
        query += `
            AND correction.branch = ?
        `;

        params.push(filters.branch);
    }

    if (filters.field_name) {
        query += `
            AND correction.field_name = ?
        `;

        params.push(filters.field_name);
    }

    if (filters.search) {
        const search = `%${String(
            filters.search
        ).trim()}%`;

        query += `
            AND (
                correction.ean LIKE ?
                OR correction.branch LIKE ?
                OR correction.code LIKE ?
                OR correction.field_name LIKE ?
                OR correction.old_value LIKE ?
                OR correction.new_value LIKE ?
                OR product.commercial_name LIKE ?
                OR product.active_ingredient LIKE ?
                OR product.brand LIKE ?
            )
        `;

        params.push(
            search,
            search,
            search,
            search,
            search,
            search,
            search,
            search,
            search
        );
    }

    query += `
        ORDER BY
            CASE correction.status
                WHEN 'pending_excel' THEN 1
                WHEN 'sent_internal' THEN 2
                WHEN 'confirmed_in_excel' THEN 3
                WHEN 'cancelled' THEN 4
                ELSE 5
            END,
            correction.updated_at DESC
    `;

    return {
        query,
        params
    };
}

function listCorrections(filters = {}) {
    const database = getDatabase();

    const {
        query,
        params
    } = buildCorrectionsQuery(filters);

    return database
        .prepare(query)
        .all(...params);
}

function getCorrectionFilterOptions() {
    const database = getDatabase();

    const branches = database
        .prepare(`
            SELECT DISTINCT branch
            FROM product_corrections
            WHERE branch IS NOT NULL
              AND TRIM(branch) <> ''
            ORDER BY branch ASC
        `)
        .all()
        .map((row) => row.branch);

    const fields = database
        .prepare(`
            SELECT DISTINCT field_name
            FROM product_corrections
            WHERE field_name IS NOT NULL
              AND TRIM(field_name) <> ''
            ORDER BY field_name ASC
        `)
        .all()
        .map((row) => row.field_name);

    return {
        branches,
        fields
    };
}

function listPendingCorrectionsByProductIds(
    productIds = []
) {
    if (!productIds.length) {
        return [];
    }

    const database = getDatabase();

    const placeholders = productIds
        .map(() => "?")
        .join(", ");

    return database
        .prepare(`
            SELECT *
            FROM product_corrections
            WHERE status IN (
                'pending_excel',
                'sent_internal'
            )
              AND product_id IN (${placeholders})
            ORDER BY updated_at DESC
        `)
        .all(...productIds);
}

function cancelCorrection(correctionId) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const correction = database
        .prepare(`
            SELECT *
            FROM product_corrections
            WHERE id = ?
            LIMIT 1
        `)
        .get(correctionId);

    if (!correction) {
        throw new Error(
            "Correcao nao encontrada."
        );
    }

    if (correction.status !== "pending_excel") {
        throw new Error(
            "Somente correcoes pendentes podem ser excluidas. Reverter a correcao feita antes de excluir."
        );
    }

    const transaction = database.transaction(() => {
        database
            .prepare(`
                UPDATE product_corrections
                SET
                    status = 'cancelled',
                    cancelled_at = ?,
                    updated_at = ?
                WHERE id = ?
            `)
            .run(
                now,
                now,
                correctionId
            );

        createHistoryEntry({
            correction_id: correction.id,
            product_id: correction.product_id,
            action_type: "manual_correction_cancelled",
            source: "alfadime",
            field_name: correction.field_name,
            old_value: correction.new_value,
            new_value: correction.old_value,
            reason:
                "Correcao excluida no Alfadime.",
            changed_by: null
        });
    });

    transaction();

    return {
        success: true,
        id: correctionId
    };
}
function cancelCorrections(correctionIds = []) {
    if (
        !Array.isArray(correctionIds) ||
        !correctionIds.length
    ) {
        throw new Error(
            "Selecione ao menos uma correcao."
        );
    }

    const database = getDatabase();

    const uniqueIds = [
        ...new Set(
            correctionIds
                .map((id) => String(id || "").trim())
                .filter(Boolean)
        )
    ];

    if (!uniqueIds.length) {
        throw new Error(
            "Nenhuma correcao valida foi selecionada."
        );
    }

    const placeholders = uniqueIds
        .map(() => "?")
        .join(", ");

    const transaction = database.transaction(() => {
        const corrections = database
            .prepare(`
                SELECT id
                FROM product_corrections
                WHERE id IN (${placeholders})
            `)
            .all(...uniqueIds);

        if (!corrections.length) {
            throw new Error(
                "Nenhuma correcao encontrada para exclusao."
            );
        }

        const existingIds = corrections.map(
            (correction) => correction.id
        );

        const existingPlaceholders = existingIds
            .map(() => "?")
            .join(", ");

        database
            .prepare(`
                DELETE FROM product_change_history
                WHERE correction_id IN (${existingPlaceholders})
            `)
            .run(...existingIds);

        database
            .prepare(`
                DELETE FROM product_corrections
                WHERE id IN (${existingPlaceholders})
            `)
            .run(...existingIds);

        return existingIds.length;
    });

    const deleted = transaction();

    return {
        success: true,
        deleted,
        updated: deleted
    };
}
function revertCorrection(correctionId) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const correction = database
        .prepare(`
            SELECT *
            FROM product_corrections
            WHERE id = ?
            LIMIT 1
        `)
        .get(correctionId);

    if (!correction) {
        throw new Error(
            "Correcao nao encontrada."
        );
    }

    if (correction.status !== "sent_internal") {
        throw new Error(
            "Somente correcoes marcadas como feito/atualizado podem ser revertidas."
        );
    }

    const product = getProductById(
        correction.product_id
    );

    if (!product) {
        throw new Error(
            "Produto da correcao nao encontrado."
        );
    }

    const transaction = database.transaction(() => {
        database
            .prepare(`
                UPDATE product_catalog
                SET
                    "${correction.field_name}" = ?,
                    updated_at = ?
                WHERE id = ?
            `)
            .run(
                correction.old_value,
                now,
                correction.product_id
            );

        database
            .prepare(`
                UPDATE product_corrections
                SET
                    status = 'pending_excel',
                    updated_at = ?,
                    confirmed_in_excel_at = NULL,
                    cancelled_at = NULL
                WHERE id = ?
            `)
            .run(
                now,
                correction.id
            );

        createHistoryEntry({
            correction_id: correction.id,
            product_id: correction.product_id,
            action_type: "manual_correction_reverted",
            source: "alfadime",
            field_name: correction.field_name,
            old_value: correction.new_value,
            new_value: correction.old_value,
            reason:
                "Correcao revertida para o valor anterior no Alfadime.",
            changed_by: null
        });
    });

    transaction();

    return {
        success: true,
        id: correctionId,
        status: "pending_excel",
        restoredValue: correction.old_value
    };
}

function revertCorrections(correctionIds = []) {
    if (
        !Array.isArray(correctionIds) ||
        !correctionIds.length
    ) {
        throw new Error(
            "Selecione ao menos uma correcao feita para reverter."
        );
    }

    const results = [];

    for (const correctionId of correctionIds) {
        try {
            results.push(
                revertCorrection(correctionId)
            );
        } catch (error) {
            console.error(
                "Erro ao reverter correcao:",
                correctionId,
                error.message
            );
        }
    }

    return {
        success: true,
        updated: results.length
    };
}
function markCorrectionsAsSent(correctionIds = []) {
    if (
        !Array.isArray(correctionIds) ||
        !correctionIds.length
    ) {
        throw new Error(
            "Selecione ao menos uma correcao."
        );
    }

    const database = getDatabase();
    const now = new Date().toISOString();

    const placeholders = correctionIds
        .map(() => "?")
        .join(", ");

    const corrections = database
        .prepare(`
            SELECT *
            FROM product_corrections
            WHERE id IN (${placeholders})
              AND status = 'pending_excel'
        `)
        .all(...correctionIds);

    const transaction = database.transaction(() => {
        for (const correction of corrections) {
            const product = database
                .prepare(`
                    SELECT *
                    FROM product_catalog
                    WHERE id = ?
                    LIMIT 1
                `)
                .get(correction.product_id);

            if (!product) {
                continue;
            }

            const oldValue = product[
                correction.field_name
            ] ?? correction.old_value ?? "";

            database
                .prepare(`
                    UPDATE product_catalog
                    SET
                        "${correction.field_name}" = ?,
                        updated_at = ?
                    WHERE id = ?
                `)
                .run(
                    correction.new_value,
                    now,
                    correction.product_id
                );

            database
                .prepare(`
                    UPDATE product_corrections
                    SET
                        status = 'sent_internal',
                        old_value = ?,
                        updated_at = ?
                    WHERE id = ?
                `)
                .run(
                    String(oldValue),
                    now,
                    correction.id
                );

            createHistoryEntry({
                correction_id: correction.id,
                product_id: correction.product_id,
                action_type: "correction_applied_to_app_database",
                source: "alfadime",
                field_name: correction.field_name,
                old_value: String(oldValue),
                new_value: correction.new_value,
                reason:
                    "Correcao aplicada ao banco local do Alfadime.",
                changed_by: null
            });

            createHistoryEntry({
                correction_id: correction.id,
                product_id: correction.product_id,
                action_type: "correction_sent_internal",
                source: "alfadime",
                field_name: correction.field_name,
                old_value: String(oldValue),
                new_value: correction.new_value,
                reason:
                    "Correcao marcada como feito/atualizado.",
                changed_by: null
            });
        }
    });

    transaction();

    return {
        success: true,
        updated: corrections.length
    };
}

function confirmCorrectionsFromExcel() {
    const database = getDatabase();
    const now = new Date().toISOString();

    const corrections = database
        .prepare(`
            SELECT *
            FROM product_corrections
            WHERE status IN (
                'pending_excel',
                'sent_internal'
            )
        `)
        .all();

    let confirmed = 0;

    const transaction = database.transaction(() => {
        for (const correction of corrections) {
            const product = getProductById(
                correction.product_id
            );

            if (!product) {
                continue;
            }

            const excelValue = String(
                product[
                    correction.field_name
                ] ?? ""
            ).trim();

            const correctedValue = String(
                correction.new_value ?? ""
            ).trim();

            if (excelValue === correctedValue) {
                database
                    .prepare(`
                        UPDATE product_corrections
                        SET
                            status = 'confirmed_in_excel',
                            confirmed_in_excel_at = ?,
                            updated_at = ?
                        WHERE id = ?
                    `)
                    .run(
                        now,
                        now,
                        correction.id
                    );

                createHistoryEntry({
                    correction_id: correction.id,
                    product_id: correction.product_id,
                    action_type: "excel_sync_confirmed",
                    source: "excel",
                    field_name: correction.field_name,
                    old_value: correction.old_value,
                    new_value: correction.new_value,
                    reason:
                        "Planilha confirmada com o valor corrigido.",
                    changed_by: null
                });

                confirmed++;
            }
        }
    });

    transaction();

    return {
        confirmed
    };
}

module.exports = {
    getProductById,
    createCorrection,
    listCorrections,
    getCorrectionFilterOptions,
    listPendingCorrectionsByProductIds,
    cancelCorrection,
    cancelCorrections,
    revertCorrection,
    revertCorrections,
    markCorrectionsAsSent,
    confirmCorrectionsFromExcel
};
function getProductsByEan(ean) {
    const database = getDatabase();
    const normalizedEan = String(ean ?? "").trim();

    if (!normalizedEan) {
        return [];
    }

    return database
        .prepare(`
            SELECT *
            FROM product_catalog
            WHERE active = 1
              AND ean = ?
            ORDER BY branch ASC, code ASC
        `)
        .all(normalizedEan);
}

function createCorrectionsBatch(items = []) {
    if (!Array.isArray(items) || !items.length) {
        throw new Error(
            "Nenhuma correcao foi informada."
        );
    }

    const database = getDatabase();

    const transaction = database.transaction(() => {
        return items.map((item) =>
            createCorrection(item)
        );
    });

    return transaction();
}

module.exports.getProductsByEan = getProductsByEan;
module.exports.createCorrectionsBatch = createCorrectionsBatch;
