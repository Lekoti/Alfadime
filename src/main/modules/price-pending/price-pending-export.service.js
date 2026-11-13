const {
    listRows
} = require("./price-pending.repository");


const {
    getPricePendingDatabase
} = require("./price-pending.database");


const XLSX = require("xlsx");
const fs = require("node:fs");
const path = require("node:path");


const COLUMN_LABELS = {
    industry_global_code: "Código Global da Indústria",
    laboratory: "Laboratório",
    observation: "Observação",


    env_precos_dpr: "Preços DPR",
    env_precos_ams: "Preços AMS",
    env_precos_dmt: "Preços DMT",
    env_precos_dms: "Preços DMS",
    env_precos_dsc: "Preços DSC",


    env_pend_dpr: "Pendências DPR",
    env_pend_ams: "Pendências AMS",
    env_pend_dmt: "Pendências DMT",
    env_pend_dms: "Pendências DMS",
    env_pend_dsc: "Pendências DSC",


    precos_ok_dpr: "OK Preços DPR",
    precos_ok_ams: "OK Preços AMS",
    precos_ok_dmt: "OK Preços DMT",
    precos_ok_dms: "OK Preços DMS",
    precos_ok_dsc: "OK Preços DSC",


    pendencias_ok_dpr: "OK Pendências DPR",
    pendencias_ok_ams: "OK Pendências AMS",
    pendencias_ok_dmt: "OK Pendências DMT",
    pendencias_ok_dms: "OK Pendências DMS",
    pendencias_ok_dsc: "OK Pendências DSC"
};


function normalizeLaboratory(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();
}


function createExportItem(row, columns) {
    const item = {};

    for (const column of columns) {
        const label = COLUMN_LABELS[column];

        if (!label) {
            continue;
        }

        if (column === "industry_global_code") {
            item[label] = row.industry_global_code || "";
            continue;
        }

        if (column === "laboratory") {
            item[label] = row.laboratory || "";
            continue;
        }

        if (column === "observation") {
            item[label] = row.observation || "";
            continue;
        }

        item[label] = row[column] || "";
    }

    return item;
}


function getWorksheetColumns(data, columns) {
    return columns
        .map((column) => {
            const header = COLUMN_LABELS[column];

            if (!header) {
                return null;
            }

            const values = data.map((item) => String(item[header] ?? ""));

            const maxLength = values.reduce((largest, value) => {
                return value.length > largest ? value.length : largest;
            }, header.length);

            return {
                header,
                width: Math.min(Math.max(maxLength + 3, 12), 45)
            };
        })
        .filter(Boolean);
}


function writeWorkbook(filePath, data, columns) {
    const worksheet = XLSX.utils.json_to_sheet(data);

    const worksheetColumns = getWorksheetColumns(data, columns);

    if (worksheetColumns.length) {
        worksheet["!cols"] = worksheetColumns.map((column) => ({
            wch: column.width
        }));
    }

    if (data.length) {
        worksheet["!autofilter"] = {
            ref: XLSX.utils.encode_range({
                s: { c: 0, r: 0 },
                e: {
                    c: worksheetColumns.length - 1,
                    r: data.length
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

    const selectedColumns = Array.isArray(includeColumns)
        ? includeColumns
        : [];

    if (!selectedColumns.length) {
        throw new Error(
            "Selecione ao menos uma coluna para exportação."
        );
    }

    const invalidColumns = selectedColumns.filter((column) => {
        return !COLUMN_LABELS[column];
    });

    if (invalidColumns.length) {
        throw new Error(
            `Colunas inválidas para exportação: ${invalidColumns.join(", ")}.`
        );
    }

    const columns = selectedColumns;

    const data = rows.map((row) => {
        return createExportItem(
            row,
            columns
        );
    });

    writeWorkbook(
        filePath,
        data,
        columns
    );

    return {
        success: true,
        filePath,
        rows: rows.length,
        columns: columns.length
    };
}


function exportToExcelByLaboratory({
    filePath,
    laboratory
}) {
    const database = getPricePendingDatabase();

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

    const columns = Object.keys(COLUMN_LABELS);

    const data = filteredRows.map((row) => {
        return createExportItem(
            row,
            columns
        );
    });

    writeWorkbook(
        filePath,
        data,
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
