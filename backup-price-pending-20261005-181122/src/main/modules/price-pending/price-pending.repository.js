const {
    getPricePendingDatabase
} = require("./price-pending.database");
const crypto = require("node:crypto");
const { toSafeNumber } = require("../../utils/validation.utils");

const EDITABLE_COLUMNS = [
    "laboratory",

    "env_precos_dpr",
    "env_precos_ams",
    "env_precos_dmt",
    "env_precos_dms",
    "env_precos_dsc",

    "env_pend_dpr",
    "env_pend_ams",
    "env_pend_dmt",
    "env_pend_dms",
    "env_pend_dsc",

    "precos_ok_dpr",
    "precos_ok_ams",
    "precos_ok_dmt",
    "precos_ok_dms",
    "precos_ok_dsc",

    "pendencias_ok_dpr",
    "pendencias_ok_ams",
    "pendencias_ok_dmt",
    "pendencias_ok_dms",
    "pendencias_ok_dsc"
];

function listRows() {
    const database = getPricePendingDatabase();

    return database
        .prepare(`
            SELECT *
            FROM price_pending_rows
            WHERE active = 1
            ORDER BY sort_order ASC, laboratory ASC
        `)
        .all();
}

function getRowById(id) {
    const database = getPricePendingDatabase();

    return database
        .prepare(`
            SELECT *
            FROM price_pending_rows
            WHERE id = ?
            LIMIT 1
        `)
        .get(id);
}

function createRow(data = {}) {
    const database = getPricePendingDatabase();
    const now = new Date().toISOString();

    const row = {
        id: crypto.randomUUID(),
        laboratory: String(data.laboratory || ""),
        sort_order: toSafeNumber(data.sort_order, 999999),
        created_at: now,
        updated_at: now
    };

    for (const column of EDITABLE_COLUMNS) {
        if (column !== "laboratory") {
            row[column] = String(data[column] || "");
        }
    }

    database
        .prepare(`
            INSERT INTO price_pending_rows (
                id,
                laboratory,

                env_precos_dpr,
                env_precos_ams,
                env_precos_dmt,
                env_precos_dms,
                env_precos_dsc,

                env_pend_dpr,
                env_pend_ams,
                env_pend_dmt,
                env_pend_dms,
                env_pend_dsc,

                precos_ok_dpr,
                precos_ok_ams,
                precos_ok_dmt,
                precos_ok_dms,
                precos_ok_dsc,

                pendencias_ok_dpr,
                pendencias_ok_ams,
                pendencias_ok_dmt,
                pendencias_ok_dms,
                pendencias_ok_dsc,

                sort_order,
                active,
                created_at,
                updated_at
            ) VALUES (
                @id,
                @laboratory,

                @env_precos_dpr,
                @env_precos_ams,
                @env_precos_dmt,
                @env_precos_dms,
                @env_precos_dsc,

                @env_pend_dpr,
                @env_pend_ams,
                @env_pend_dmt,
                @env_pend_dms,
                @env_pend_dsc,

                @precos_ok_dpr,
                @precos_ok_ams,
                @precos_ok_dmt,
                @precos_ok_dms,
                @precos_ok_dsc,

                @pendencias_ok_dpr,
                @pendencias_ok_ams,
                @pendencias_ok_dmt,
                @pendencias_ok_dms,
                @pendencias_ok_dsc,

                @sort_order,
                1,
                @created_at,
                @updated_at
            )
        `)
        .run(row);

    return getRowById(row.id);
}

function updateCell(id, column, value) {
    if (!EDITABLE_COLUMNS.includes(column)) {
        throw new Error(
            `Coluna não permitida para edição: ${column}`
        );
    }

    const database = getPricePendingDatabase();
    const now = new Date().toISOString();

    const query = `
        UPDATE price_pending_rows
        SET "${column}" = ?,
            updated_at = ?
        WHERE id = ?
          AND active = 1
    `;

    const result = database
        .prepare(query)
        .run(
            String(value ?? ""),
            now,
            id
        );

    if (result.changes === 0) {
        throw new Error(
            "Registro não encontrado para atualização."
        );
    }

    return getRowById(id);
}

function removeRow(id) {
    const database = getPricePendingDatabase();

    const result = database
        .prepare(`
            UPDATE price_pending_rows
            SET active = 0,
                updated_at = ?
            WHERE id = ?
              AND active = 1
        `)
        .run(
            new Date().toISOString(),
            id
        );

    if (result.changes === 0) {
        throw new Error(
            "Registro não encontrado para remoção."
        );
    }

    return {
        success: true,
        id
    };
}


function normalizeLaboratoryName(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

function getEmailReceiptColumn(type, branch) {
    const normalizedType = String(type || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    const normalizedBranch = String(branch || "")
        .trim()
        .toLowerCase();

    const validBranches = new Set([
        "dpr",
        "ams",
        "dmt",
        "dms",
        "dsc"
    ]);

    if (!validBranches.has(normalizedBranch)) {
        throw new Error(`Filial inválida para atualização: ${branch}`);
    }

    if (
        normalizedType === "precos" ||
        normalizedType === "preco" ||
        normalizedType === "env_precos"
    ) {
        return `env_precos_${normalizedBranch}`;
    }

    if (
        normalizedType === "pendencias" ||
        normalizedType === "pendencia" ||
        normalizedType === "env_pend"
    ) {
        return `env_pend_${normalizedBranch}`;
    }

    throw new Error(`Tipo inválido para atualização: ${type}`);
}

function formatEmailReceiptDate(dateValue = new Date()) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        throw new Error("Data inválida para atualização.");
    }

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());

    return `${month}/${year}`;
}

function updateEmailReceiptStatus({
    laboratory,
    branch,
    type,
    processedAt = new Date()
}) {
    const normalizedLaboratory = normalizeLaboratoryName(laboratory);

    if (!normalizedLaboratory) {
        throw new Error(
            "Laboratório obrigatório para atualizar o status do recebimento."
        );
    }

    const column = getEmailReceiptColumn(type, branch);
    const value = formatEmailReceiptDate(processedAt);

    const database = getPricePendingDatabase();

    const rows = database.prepare(`
        SELECT id, laboratory
        FROM price_pending_rows
        WHERE active = 1
    `).all();

    const row = rows.find((item) => (
        normalizeLaboratoryName(item.laboratory) === normalizedLaboratory
    ));

    if (!row) {
        return {
            success: false,
            updated: false,
            reason: "laboratory_not_found",
            laboratory,
            branch,
            type,
            column,
            value
        };
    }

    const result = database.prepare(`
        UPDATE price_pending_rows
        SET "${column}" = ?,
            updated_at = ?
        WHERE id = ?
          AND active = 1
    `).run(
        value,
        new Date().toISOString(),
        row.id
    );

    return {
        success: result.changes > 0,
        updated: result.changes > 0,
        rowId: row.id,
        laboratory: row.laboratory,
        branch: String(branch).toUpperCase(),
        type,
        column,
        value
    };
}

module.exports = {
    listRows,
    createRow,
    updateCell,
    removeRow,
    getRowById,
    EDITABLE_COLUMNS,
    updateEmailReceiptStatus,
    normalizeLaboratoryName
};


