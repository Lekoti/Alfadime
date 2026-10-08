const {
    getPricePendingDatabase
} = require(
    "./price-pending.database"
);

const {
    getDatabase: getLocalDatabase
} = require(
    "../../database/connection"
);

const crypto = require(
    "node:crypto"
);

const {
    toSafeNumber
} = require(
    "../../utils/validation.utils"
);

const EDITABLE_COLUMNS = [
    "laboratory",
    "observation",
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

const EXTERNAL_COLUMNS =
    EDITABLE_COLUMNS.filter(
        (column) =>
            column !== "laboratory" &&
            column !== "observation"
    );

const VALID_BRANCHES = [
    "DPR",
    "AMS",
    "DMT",
    "DMS",
    "DSC"
];

let industryGlobalCodeMapCache =
    null;

function parseJsonObject(
    value
) {
    if (
        !value
    ) {
        return {};
    }

    try {
        const parsed =
            JSON.parse(
                String(
                    value
                )
            );

        return parsed &&
            typeof parsed ===
                "object" &&
            !Array.isArray(
                parsed
            )
            ? parsed
            : {};
    } catch {
        return {};
    }
}

function stringifyJsonObject(
    value
) {
    return JSON.stringify(
        value &&
            typeof value ===
                "object" &&
            !Array.isArray(
                value
            )
            ? value
            : {}
    );
}

function normalizeLaboratoryName(
    value
) {
    return String(
        value ?? ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .toUpperCase();
}

function normalizeDatabaseText(
    value
) {
    return normalizeLaboratoryName(
        value
    )
        .replace(
            /^#\s*/,
            ""
        )
        .replace(
            /(?:\s*-\s*|\s+)\d+\s*$/,
            ""
        )
        .trim();
}

function normalizeGlobalLaboratoryName(
    value
) {
    return String(
        value ?? ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /#\s*/g,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .toUpperCase();
}

function normalizeBranch(
    value
) {
    const branch =
        String(
            value || ""
        )
            .trim()
            .toUpperCase();

    return VALID_BRANCHES.includes(
        branch
    )
        ? branch
        : "";
}

function hasTable(
    database,
    tableName
) {
    const result =
        database
            .prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                    AND name = ?
                LIMIT 1
            `)
            .get(
                tableName
            );

    return Boolean(
        result
    );
}

function getIndustryGlobalCodeMap(
    options = {}
) {
    const forceRefresh =
        options.forceRefresh ===
        true;

    if (
        industryGlobalCodeMapCache &&
        !forceRefresh
    ) {
        return industryGlobalCodeMapCache;
    }

    const codes =
        new Map();

    const database =
        getLocalDatabase();

    if (
        !hasTable(
            database,
            "product_purchase_curve"
        )
    ) {
        industryGlobalCodeMapCache =
            codes;

        return codes;
    }

    const columns =
        database
            .prepare(`
                PRAGMA table_info(
                    product_purchase_curve
                )
            `)
            .all()
            .map(
                (column) =>
                    String(
                        column.name ||
                            ""
                    ).toLowerCase()
            );

    const hasLab =
        columns.includes(
            "lab"
        );

    const hasLaboratoryName =
        columns.includes(
            "laboratory_name"
        );

    const hasGlobalCode =
        columns.includes(
            "cod_fabr_global"
        );

    if (
        !hasGlobalCode ||
        (
            !hasLab &&
            !hasLaboratoryName
        )
    ) {
        industryGlobalCodeMapCache =
            codes;

        return codes;
    }

    const nameColumns = [
        hasLab
            ? "lab"
            : null,
        hasLaboratoryName
            ? "laboratory_name"
            : null
    ].filter(
        Boolean
    );

    const selectColumns = [
        "cod_fabr_global",
        ...nameColumns
    ].join(
        ", "
    );

    const rows =
        database
            .prepare(`
                SELECT
                    ${selectColumns}
                FROM product_purchase_curve
                WHERE TRIM(
                    COALESCE(
                        cod_fabr_global,
                        ''
                    )
                ) <> ''
            `)
            .all();

    for (
        const item of rows
    ) {
        const code =
            String(
                item.cod_fabr_global ||
                    ""
            ).trim();

        if (
            !code
        ) {
            continue;
        }

        for (
            const column of nameColumns
        ) {
            const key =
                normalizeGlobalLaboratoryName(
                    item[column]
                );

            if (
                key &&
                !codes.has(
                    key
                )
            ) {
                codes.set(
                    key,
                    code
                );
            }
        }
    }

    industryGlobalCodeMapCache =
        codes;

    return codes;
}

function getIndustryGlobalCode(
    database,
    laboratory,
    codeMap =
        getIndustryGlobalCodeMap()
) {
    const normalizedLaboratory =
        normalizeDatabaseText(
            laboratory
        );

    if (
        !normalizedLaboratory
    ) {
        return "";
    }

    return codeMap.get(
        normalizedLaboratory
    ) || "";
}

function getIndustryGlobalCodeByLaboratory(
    laboratory
) {
    const codeMap =
        getIndustryGlobalCodeMap();

    const key =
        normalizeGlobalLaboratoryName(
            laboratory
        );

    return codeMap.get(
        key
    ) || "";
}

function decorateRow(
    database,
    row,
    codeMap
) {
    if (
        !row
    ) {
        return row;
    }

    return {
        ...row,
        industry_global_code:
            getIndustryGlobalCode(
                database,
                row.laboratory,
                codeMap
            )
    };
}

function getBranchColumn(
    prefix,
    branch
) {
    const normalizedBranch =
        normalizeBranch(
            branch
        );

    if (
        !normalizedBranch
    ) {
        throw new Error(
            `Filial inválida: ${branch}`
        );
    }

    return `${prefix}_${normalizedBranch.toLowerCase()}`;
}

function getPricePendingValues(
    laboratory,
    branch
) {
    const database =
        getPricePendingDatabase();

    const normalizedLaboratory =
        normalizeLaboratoryName(
            laboratory
        );

    const normalizedBranch =
        normalizeBranch(
            branch
        );

    if (
        !normalizedLaboratory ||
        !normalizedBranch
    ) {
        return {
            laboratory,
            branch:
                normalizedBranch,
            pricesValue: "",
            pendingValue: ""
        };
    }

    const priceColumn =
        getBranchColumn(
            "precos_ok",
            normalizedBranch
        );

    const pendingColumn =
        getBranchColumn(
            "pendencias_ok",
            normalizedBranch
        );

    const row =
        database
            .prepare(`
                SELECT
                    laboratory,
                    "${priceColumn}" AS prices_value,
                    "${pendingColumn}" AS pending_value
                FROM price_pending_rows
                WHERE active = 1
                    AND UPPER(
                        TRIM(
                            laboratory
                        )
                    ) = ?
                LIMIT 1
            `)
            .get(
                normalizedLaboratory
            );

    return {
        laboratory,
        branch:
            normalizedBranch,
        pricesValue:
            row?.prices_value ??
            "",
        pendingValue:
            row?.pending_value ??
            ""
    };
}

function getPricePendingStatus(
    laboratory,
    branch
) {
    const values =
        getPricePendingValues(
            laboratory,
            branch
        );

    const hasPrices =
        String(
            values.pricesValue ||
                ""
        ).trim() !== "";

    const hasPending =
        String(
            values.pendingValue ||
                ""
        ).trim() !== "";

    if (
        hasPrices &&
        hasPending
    ) {
        return "Preços e pendências atualizados";
    }

    if (
        !hasPrices &&
        hasPending
    ) {
        return "Precisa atualizar preços";
    }

    if (
        hasPrices &&
        !hasPending
    ) {
        return "Precisa atualizar pendências";
    }

    return "Precisa atualizar preços e pendências";
}

function getPricePendingStatusMap() {
    const database =
        getPricePendingDatabase();

    const rows =
        database
            .prepare(`
                SELECT
                    laboratory,
                    precos_ok_dpr,
                    precos_ok_ams,
                    precos_ok_dmt,
                    precos_ok_dms,
                    precos_ok_dsc,
                    pendencias_ok_dpr,
                    pendencias_ok_ams,
                    pendencias_ok_dmt,
                    pendencias_ok_dms,
                    pendencias_ok_dsc
                FROM price_pending_rows
                WHERE active = 1
            `)
            .all();

    const statusMap =
        new Map();

    rows.forEach(
        (row) => {
            const laboratory =
                normalizeLaboratoryName(
                    row.laboratory
                );

            if (
                !laboratory
            ) {
                return;
            }

            VALID_BRANCHES.forEach(
                (branch) => {
                    const suffix =
                        branch.toLowerCase();

                    const hasPrices =
                        String(
                            row[
                                `precos_ok_${suffix}`
                            ] || ""
                        ).trim() !== "";

                    const hasPending =
                        String(
                            row[
                                `pendencias_ok_${suffix}`
                            ] || ""
                        ).trim() !== "";

                    let status =
                        "Precisa atualizar preços e pendências";

                    if (
                        hasPrices &&
                        hasPending
                    ) {
                        status =
                            "Preços e pendências atualizados";
                    } else if (
                        !hasPrices &&
                        hasPending
                    ) {
                        status =
                            "Precisa atualizar preços";
                    } else if (
                        hasPrices &&
                        !hasPending
                    ) {
                        status =
                            "Precisa atualizar pendências";
                    }

                    statusMap.set(
                        `${laboratory}:${branch}`,
                        status
                    );
                }
            );
        }
    );

    return statusMap;
}

function listRows() {
    const database =
        getPricePendingDatabase();

    const rows =
        database
            .prepare(`
                SELECT *
                FROM price_pending_rows
                WHERE active = 1
                ORDER BY
                    sort_order ASC,
                    laboratory ASC
            `)
            .all();

    const codeMap =
        getIndustryGlobalCodeMap();

    return rows.map(
        (row) =>
            decorateRow(
                database,
                row,
                codeMap
            )
    );
}

function getRowById(
    id
) {
    const database =
        getPricePendingDatabase();

    const row =
        database
            .prepare(`
                SELECT *
                FROM price_pending_rows
                WHERE id = ?
                LIMIT 1
            `)
            .get(
                id
            );

    return decorateRow(
        database,
        row,
        getIndustryGlobalCodeMap()
    );
}

function createRow(
    data = {}
) {
    const database =
        getPricePendingDatabase();

    const now =
        new Date().toISOString();

    const row = {
        id:
            crypto.randomUUID(),
        laboratory:
            String(
                data.laboratory ||
                    ""
            ),
        observation:
            String(
                data.observation ||
                    ""
            ),
        manual_cells:
            "{}",
        pending_external_updates:
            "{}",
        external_updated_at:
            "",
        sort_order:
            toSafeNumber(
                data.sort_order,
                999999
            ),
        created_at:
            now,
        updated_at:
            now
    };

    for (
        const column of EXTERNAL_COLUMNS
    ) {
        row[column] =
            String(
                data[column] ||
                    ""
            );
    }

    database.prepare(`
        INSERT INTO price_pending_rows (
            id, laboratory, observation, manual_cells,
            pending_external_updates, external_updated_at,
            env_precos_dpr, env_precos_ams, env_precos_dmt,
            env_precos_dms, env_precos_dsc,
            env_pend_dpr, env_pend_ams, env_pend_dmt,
            env_pend_dms, env_pend_dsc,
            precos_ok_dpr, precos_ok_ams, precos_ok_dmt,
            precos_ok_dms, precos_ok_dsc,
            pendencias_ok_dpr, pendencias_ok_ams,
            pendencias_ok_dmt, pendencias_ok_dms, pendencias_ok_dsc,
            sort_order, active, created_at, updated_at
        ) VALUES (
            @id, @laboratory, @observation, @manual_cells,
            @pending_external_updates, @external_updated_at,
            @env_precos_dpr, @env_precos_ams, @env_precos_dmt,
            @env_precos_dms, @env_precos_dsc,
            @env_pend_dpr, @env_pend_ams, @env_pend_dmt,
            @env_pend_dms, @env_pend_dsc,
            @precos_ok_dpr, @precos_ok_ams, @precos_ok_dmt,
            @precos_ok_dms, @precos_ok_dsc,
            @pendencias_ok_dpr, @pendencias_ok_ams,
            @pendencias_ok_dmt, @pendencias_ok_dms, @pendencias_ok_dsc,
            @sort_order, 1, @created_at, @updated_at
        )
    `).run(
        row
    );

    return getRowById(
        row.id
    );
}

function updateCell(
    id,
    column,
    value
) {
    if (
        !EDITABLE_COLUMNS.includes(
            column
        )
    ) {
        throw new Error(
            `Coluna não permitida para edição: ${column}`
        );
    }

    const database =
        getPricePendingDatabase();

    const now =
        new Date().toISOString();

    const normalizedValue =
        String(
            value ?? ""
        );

    const currentRow =
        database
            .prepare(`
                SELECT
                    id,
                    manual_cells,
                    pending_external_updates
                FROM price_pending_rows
                WHERE id = ?
                    AND active = 1
                LIMIT 1
            `)
            .get(
                id
            );

    if (
        !currentRow
    ) {
        throw new Error(
            "Registro não encontrado para atualização."
        );
    }

    const manualCells =
        parseJsonObject(
            currentRow.manual_cells
        );

    const pendingUpdates =
        parseJsonObject(
            currentRow.pending_external_updates
        );

    manualCells[column] =
        true;

    if (
        normalizedValue.trim() ===
            "" &&
        pendingUpdates[column]
    ) {
        const pendingValue =
            pendingUpdates[column]
                .value ??
            "";

        delete pendingUpdates[
            column
        ];

        delete manualCells[
            column
        ];

        const result =
            database
                .prepare(`
                    UPDATE price_pending_rows
                    SET "${column}" = ?,
                        manual_cells = ?,
                        pending_external_updates = ?,
                        external_updated_at = ?,
                        updated_at = ?
                    WHERE id = ?
                        AND active = 1
                `)
                .run(
                    String(
                        pendingValue
                    ),
                    stringifyJsonObject(
                        manualCells
                    ),
                    stringifyJsonObject(
                        pendingUpdates
                    ),
                    now,
                    now,
                    id
                );

        if (
            result.changes ===
            0
        ) {
            throw new Error(
                "Registro não encontrado para atualização."
            );
        }

        return getRowById(
            id
        );
    }

    const result =
        database
            .prepare(`
                UPDATE price_pending_rows
                SET "${column}" = ?,
                    manual_cells = ?,
                    updated_at = ?
                WHERE id = ?
                    AND active = 1
            `)
            .run(
                normalizedValue,
                stringifyJsonObject(
                    manualCells
                ),
                now,
                id
            );

    if (
        result.changes ===
        0
    ) {
        throw new Error(
            "Registro não encontrado para atualização."
        );
    }

    return getRowById(
        id
    );
}

function applyExternalCellUpdate({
    id,
    column,
    value,
    fileName = "",
    fileMtimeMs = null
}) {
    if (
        !EXTERNAL_COLUMNS.includes(
            column
        )
    ) {
        throw new Error(
            `Coluna externa não permitida: ${column}`
        );
    }

    const database =
        getPricePendingDatabase();

    const now =
        new Date().toISOString();

    const row =
        database
            .prepare(`
                SELECT
                    id,
                    manual_cells,
                    pending_external_updates
                FROM price_pending_rows
                WHERE id = ?
                    AND active = 1
                LIMIT 1
            `)
            .get(
                id
            );

    if (
        !row
    ) {
        throw new Error(
            "Registro não encontrado para atualização externa."
        );
    }

    const manualCells =
        parseJsonObject(
            row.manual_cells
        );

    const pendingUpdates =
        parseJsonObject(
            row.pending_external_updates
        );

    const externalUpdate = {
        value:
            String(
                value ?? ""
            ),
        fileName:
            String(
                fileName ||
                    ""
            ),
        fileMtimeMs:
            Number.isFinite(
                Number(
                    fileMtimeMs
                )
            )
                ? Number(
                      fileMtimeMs
                  )
                : null,
        updatedAt:
            now
    };

    if (
        manualCells[column] &&
        String(
            row[column] ??
                ""
        ).trim() !==
            ""
    ) {
        pendingUpdates[
            column
        ] =
            externalUpdate;

        const result =
            database
                .prepare(`
                    UPDATE price_pending_rows
                    SET pending_external_updates = ?,
                        external_updated_at = ?,
                        updated_at = ?
                    WHERE id = ?
                        AND active = 1
                `)
                .run(
                    stringifyJsonObject(
                        pendingUpdates
                    ),
                    now,
                    now,
                    id
                );

        return {
            ...getRowById(
                id
            ),
            externalUpdatePending:
                true,
            column,
            update:
                externalUpdate,
            changes:
                result.changes
        };
    }

    delete pendingUpdates[
        column
    ];

    const result =
        database
            .prepare(`
                UPDATE price_pending_rows
                SET "${column}" = ?,
                    pending_external_updates = ?,
                    external_updated_at = ?,
                    updated_at = ?
                WHERE id = ?
                    AND active = 1
            `)
            .run(
                String(
                    value ?? ""
                ),
                stringifyJsonObject(
                    pendingUpdates
                ),
                now,
                now,
                id
            );

    return {
        ...getRowById(
            id
        ),
        externalUpdatePending:
            false,
        column,
        update:
            externalUpdate,
        changes:
            result.changes
    };
}

function removeRow(
    id
) {
    const database =
        getPricePendingDatabase();

    const result =
        database
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

    if (
        result.changes ===
        0
    ) {
        throw new Error(
            "Registro não encontrado para remoção."
        );
    }

    return {
        success: true,
        id
    };
}

function getEmailReceiptColumn(
    type,
    branch
) {
    const normalizedType =
        String(
            type || ""
        )
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim()
            .toLowerCase();

    const normalizedBranch =
        normalizeBranch(
            branch
        ).toLowerCase();

    if (
        !normalizedBranch
    ) {
        throw new Error(
            `Filial inválida para atualização: ${branch}`
        );
    }

    if (
        [
            "precos",
            "preco",
            "env_precos"
        ].includes(
            normalizedType
        )
    ) {
        return `env_precos_${normalizedBranch}`;
    }

    if (
        [
            "pendencias",
            "pendencia",
            "env_pend"
        ].includes(
            normalizedType
        )
    ) {
        return `env_pend_${normalizedBranch}`;
    }

    throw new Error(
        `Tipo inválido para atualização: ${type}`
    );
}

function formatEmailReceiptDate(
    dateValue = new Date()
) {
    const date =
        new Date(
            dateValue
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        throw new Error(
            "Data inválida para atualização."
        );
    }

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );

    const month =
        String(
            date.getMonth() +
                1
        ).padStart(
            2,
            "0"
        );

    const year =
        String(
            date.getFullYear()
        );

    return `${day}/${month}/${year}`;
}

function updateEmailReceiptStatus({
    laboratory,
    branch,
    type,
    processedAt = new Date()
}) {
    const normalizedLaboratory =
        normalizeLaboratoryName(
            laboratory
        );

    if (
        !normalizedLaboratory
    ) {
        throw new Error(
            "Laboratório obrigatório para atualizar o status do recebimento."
        );
    }

    const column =
        getEmailReceiptColumn(
            type,
            branch
        );

    const value =
        formatEmailReceiptDate(
            processedAt
        );

    const database =
        getPricePendingDatabase();

    const row =
        database
            .prepare(`
                SELECT
                    id,
                    laboratory,
                    manual_cells,
                    pending_external_updates,
                    "${column}" AS current_value
                FROM price_pending_rows
                WHERE active = 1
                    AND UPPER(
                        TRIM(
                            laboratory
                        )
                    ) = ?
                LIMIT 1
            `)
            .get(
                normalizedLaboratory
            );

    if (
        !row
    ) {
        return {
            success: false,
            updated: false,
            reason:
                "laboratory_not_found",
            laboratory,
            branch,
            type,
            column,
            value
        };
    }

    const manualCells =
        parseJsonObject(
            row.manual_cells
        );

    const pendingUpdates =
        parseJsonObject(
            row.pending_external_updates
        );

    if (
        manualCells[column] &&
        String(
            row.current_value ||
                ""
        ).trim() !==
            ""
    ) {
        pendingUpdates[
            column
        ] = {
            value,
            fileName:
                "e-mail",
            fileMtimeMs:
                null,
            updatedAt:
                new Date().toISOString()
        };

        const now =
            new Date().toISOString();

        database
            .prepare(`
                UPDATE price_pending_rows
                SET pending_external_updates = ?,
                    external_updated_at = ?,
                    updated_at = ?
                WHERE id = ?
                    AND active = 1
            `)
            .run(
                stringifyJsonObject(
                    pendingUpdates
                ),
                now,
                now,
                row.id
            );

        return {
            success: true,
            updated: false,
            pending: true,
            rowId:
                row.id,
            laboratory:
                row.laboratory,
            branch:
                String(
                    branch
                ).toUpperCase(),
            type,
            column,
            value
        };
    }

    delete pendingUpdates[
        column
    ];

    const now =
        new Date().toISOString();

    const result =
        database
            .prepare(`
                UPDATE price_pending_rows
                SET "${column}" = ?,
                    pending_external_updates = ?,
                    external_updated_at = ?,
                    updated_at = ?
                WHERE id = ?
                    AND active = 1
            `)
            .run(
                value,
                stringifyJsonObject(
                    pendingUpdates
                ),
                now,
                now,
                row.id
            );

    return {
        success:
            result.changes > 0,
        updated:
            result.changes > 0,
        rowId:
            row.id,
        laboratory:
            row.laboratory,
        branch:
            String(
                branch
            ).toUpperCase(),
        type,
        column,
        value
    };
}

module.exports = {
    listRows,
    createRow,
    updateCell,
    applyExternalCellUpdate,
    removeRow,
    getRowById,
    EDITABLE_COLUMNS,
    EXTERNAL_COLUMNS,
    updateEmailReceiptStatus,
    normalizeLaboratoryName,
    getIndustryGlobalCode,
    getIndustryGlobalCodeMap,
    getIndustryGlobalCodeByLaboratory,
    getPricePendingValues,
    getPricePendingStatus,
    getPricePendingStatusMap,
    VALID_BRANCHES
};