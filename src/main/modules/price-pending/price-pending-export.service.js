const {
    listRows
} = require("./price-pending.repository");


const XLSX = require("xlsx");
const fs = require("node:fs");
const path = require("node:path");


const FIXED_COLUMNS = [
    {
        key: "industry_global_code",
        label: "Código Global"
    },
    {
        key: "laboratory",
        label: "Laboratórios"
    },
    {
        key: "observation",
        label: "Observação"
    }
];


const COLUMN_GROUPS = {
    env_precos: "Preços Recebidos",
    env_pend: "Pendências Recebidas",
    precos_ok: "Preços Atualizados",
    pendencias_ok: "Pendências Atualizadas"
};


const BRANCH_LABELS = {
    dpr: "DPR",
    ams: "AMS",
    dmt: "DMT",
    dms: "DMS",
    dsc: "DSC"
};


function normalizeLaboratory(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();
}


function getColumnGroup(column) {
    const parts = column.split("_");

    if (parts.length < 3) {
        return null;
    }

    return parts.slice(0, -1).join("_");
}


function getColumnBranch(column) {
    const parts = column.split("_");

    if (parts.length < 3) {
        return null;
    }

    return BRANCH_LABELS[parts[parts.length - 1]] || null;
}


function validateColumns(columns) {
    if (!Array.isArray(columns) || !columns.length) {
        throw new Error(
            "Selecione ao menos uma coluna para exportação."
        );
    }

    const invalidColumns = columns.filter((column) => {
        if (FIXED_COLUMNS.some((fixedColumn) => fixedColumn.key === column)) {
            return false;
        }

        const group = getColumnGroup(column);
        const branch = getColumnBranch(column);

        return !group || !COLUMN_GROUPS[group] || !branch;
    });

    if (invalidColumns.length) {
        throw new Error(
            `Colunas inválidas para exportação: ${invalidColumns.join(", ")}.`
        );
    }
}


function getCellValue(row, column) {
    return row[column] || "";
}


function createExportRows(rows, columns) {
    return rows.map((row) => {
        const item = {};

        columns.forEach((column) => {
            item[column] = getCellValue(row, column);
        });

        return item;
    });
}


function writeWorkbook(filePath, rows, columns) {
    const fixedSelectedColumns = FIXED_COLUMNS.filter((fixedColumn) => {
        return columns.includes(fixedColumn.key);
    });

    const groupedColumns = columns.filter((column) => {
        return !FIXED_COLUMNS.some((fixedColumn) => fixedColumn.key === column);
    });

    const orderedColumns = [
        ...fixedSelectedColumns,
        ...groupedColumns
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([
        []
    ]);

    let currentColumn = 0;
    const merges = [];

    fixedSelectedColumns.forEach((fixedColumn) => {
        worksheet[XLSX.utils.encode_cell({
            c: currentColumn,
            r: 0
        })] = {
            t: "s",
            v: fixedColumn.label
        };

        merges.push({
            s: {
                c: currentColumn,
                r: 0
            },
            e: {
                c: currentColumn,
                r: 1
            }
        });

        currentColumn += 1;
    });

    let groupIndex = 0;

    while (groupIndex < groupedColumns.length) {
        const column = groupedColumns[groupIndex];
        const group = getColumnGroup(column);
        const groupColumns = [];

        while (
            groupIndex < groupedColumns.length &&
            getColumnGroup(groupedColumns[groupIndex]) === group
        ) {
            groupColumns.push(groupedColumns[groupIndex]);
            groupIndex += 1;
        }

        const startColumn = currentColumn;
        const endColumn = currentColumn + groupColumns.length - 1;

        worksheet[XLSX.utils.encode_cell({
            c: startColumn,
            r: 0
        })] = {
            t: "s",
            v: COLUMN_GROUPS[group]
        };

        merges.push({
            s: {
                c: startColumn,
                r: 0
            },
            e: {
                c: endColumn,
                r: 0
            }
        });

        groupColumns.forEach((groupColumn, index) => {
            worksheet[XLSX.utils.encode_cell({
                c: startColumn + index,
                r: 1
            })] = {
                t: "s",
                v: getColumnBranch(groupColumn)
            };
        });

        currentColumn = endColumn + 1;
    }

    const dataRows = createExportRows(
        rows,
        orderedColumns
    );

    dataRows.forEach((dataRow, rowIndex) => {
        orderedColumns.forEach((column, columnIndex) => {
            worksheet[XLSX.utils.encode_cell({
                c: columnIndex,
                r: rowIndex + 2
            })] = {
                t: "s",
                v: String(dataRow[column] ?? "")
            };
        });
    });

    worksheet["!merges"] = merges;
    worksheet["!cols"] = orderedColumns.map(() => ({
        wch: 18
    }));

    if (rows.length) {
        worksheet["!autofilter"] = {
            ref: XLSX.utils.encode_range({
                s: {
                    c: 0,
                    r: 1
                },
                e: {
                    c: orderedColumns.length - 1,
                    r: rows.length + 1
                }
            })
        };
    }

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Preços e Pendências"
    );

    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }

    const excelBuffer = XLSX.write(
        workbook,
        {
            bookType: "xlsx",
            type: "buffer"
        }
    );

    fs.writeFileSync(
        filePath,
        excelBuffer
    );
}


function filterRowsByIds(rows, rowIds) {
    if (!Array.isArray(rowIds) || rowIds.length === 0) {
        return rows;
    }

    const selectedIds = new Set(
        rowIds.map((id) => String(id))
    );

    return rows.filter((row) =>
        selectedIds.has(String(row.id))
    );
}


function exportToExcel({
    filePath,
    includeColumns = [],
    rowIds = []
} = {}) {
    const allRows = listRows();

    if (!allRows.length) {
        throw new Error(
            "Nenhuma linha encontrada para exportação."
        );
    }

    const rows = filterRowsByIds(
        allRows,
        rowIds
    );

    if (!rows.length) {
        throw new Error(
            "Nenhum registro filtrado para exportação."
        );
    }

    validateColumns(includeColumns);

    writeWorkbook(
        filePath,
        rows,
        includeColumns
    );

    return {
        success: true,
        filePath,
        rows: rows.length,
        columns: includeColumns.length
    };
}


function exportToExcelByLaboratory({
    filePath,
    laboratory
}) {
    const normalizedLaboratory =
        normalizeLaboratory(laboratory);

    if (!normalizedLaboratory) {
        throw new Error(
            "Laboratório obrigatório para exportação."
        );
    }

    const rows = listRows();

    const filteredRows = rows.filter((row) => {
        return normalizeLaboratory(
            row.laboratory
        ) === normalizedLaboratory;
    });

    if (!filteredRows.length) {
        throw new Error(
            `Nenhuma linha encontrada para o laboratório: ${laboratory}`
        );
    }

    const columns = [
        "industry_global_code",
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

    writeWorkbook(
        filePath,
        filteredRows,
        columns
    );

    return {
        success: true,
        filePath,
        rows: filteredRows.length,
        columns: columns.length
    };
}


module.exports = {
    exportToExcel,
    exportToExcelByLaboratory
};
