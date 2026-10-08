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
    const item = {
        "Código Global da Indústria":
            row.industry_global_code || "",
        "Laboratório":
            row.laboratory || "",
        "Observação":
            row.observation || "",
        "Ordem":
            row.sort_order
    };

    for (const column of columns) {
        if (COLUMN_LABELS[column]) {
            item[COLUMN_LABELS[column]] =
                row[column] || "";
        }
    }

    return item;
}


function writeWorkbook(filePath, data) {
    const worksheet = XLSX.utils.json_to_sheet(data);

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


function exportToExcel({
    filePath,
    includeColumns = []
} = {}) {
    const rows = listRows();

    if (!rows.length) {
        throw new Error(
            "Nenhuma linha encontrada para exportação."
        );
    }

    const columns = includeColumns.length
        ? includeColumns.filter((column) => {
            return Boolean(COLUMN_LABELS[column]);
        })
        : Object.keys(COLUMN_LABELS);

    const data = rows.map((row) => {
        return createExportItem(
            row,
            columns
        );
    });

    writeWorkbook(
        filePath,
        data
    );

    return {
        success: true,
        filePath,
        rows: rows.length
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

    const data = filteredRows.map((row) => {
        return createExportItem(
            row,
            Object.keys(COLUMN_LABELS)
        );
    });

    writeWorkbook(
        filePath,
        data
    );

    return {
        success: true,
        filePath,
        rows: filteredRows.length
    };
}


module.exports = {
    exportToExcel,
    exportToExcelByLaboratory
};