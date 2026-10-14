const path = require("node:path");
const ExcelJS = require("exceljs");
const { dialog } = require("electron");
const repository = require("./purchases.repository");
const { calculatePurchaseSuggestion } = require("./purchases-calculation.service");
const { toSafeNumber } = require("../../utils/validation.utils");




const EXPORT_COLUMN_DEFINITIONS = {
    company: { label: "Empresa", width: 25 },
    productcode: { label: "Cód. Prod.", width: 15 },
    barcode: { label: "Cód. Barras", width: 18 },
    description: { label: "Descrição", width: 40 },
    laboratoryname: { label: "Laboratório", width: 25 },
    availablestock: { label: "Estoque + Bloqueado", width: 22 },
    averagesale12m: { label: "Média Venda 12M", width: 18 },
    averagesale6m: { label: "Média Venda 6M", width: 18 },
    averagesale3m: { label: "Média Venda 3M", width: 18 },
    averagesale: { label: "Média Venda Mês", width: 18 },
    priceSource: { label: "Origem do Valor", width: 25 },
    effectivecurve: { label: "Curva", width: 10 },
    suggestedquantity: { label: "Sugestão Compra", width: 16 },
    unitprice: { label: "Valor Unitário", width: 16, type: "currency" },
    totalsuggestionvalue: { label: "Total Sugestão", width: 18, type: "currency" },
    observation: { label: "Observação", width: 60 },
    currentstock: { label: "Estoque", width: 14 },
    blockedstock: { label: "Bloqueado", width: 14 },
    lastPurchaseDPR: { label: "Últ. Compra DPR", width: 18, type: "currency" },
    lastPurchaseAMS: { label: "Últ. Compra AMS", width: 18, type: "currency" },
    lastPurchaseDMT: { label: "Últ. Compra DMT", width: 18, type: "currency" },
    lastPurchaseDMS: { label: "Últ. Compra DMS", width: 18, type: "currency" },
    lastPurchaseDSC: { label: "Últ. Compra DSC", width: 18, type: "currency" },
    penultimatepurchaseprice: { label: "Penúlt. Compra", width: 18, type: "currency" },
    antepenultimatepurchaseprice: { label: "Antepenúlt. Compra", width: 20, type: "currency" },
    averagecost: { label: "Preço Médio", width: 16, type: "currency" },
    coverageMonths: { label: "Cobertura (meses)", width: 18 },
    targetMonths: { label: "Meta (meses de estoque)", width: 22 },
    standardbox: { label: "Cx. Padrão", width: 14 },
    curvevalue: { label: "Curva (R$)", width: 14 },
    curveunit: { label: "Curva (Qtd)", width: 14 }
};




function formatCurrency(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "";
    }

    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(number);
}




function formatAvailableStock(row) {
    const current = toSafeNumber(row.current_stock ?? row.currentstock, 0);
    const blocked = toSafeNumber(row.blocked_stock ?? row.blockedstock, 0);
    const total = current + Math.abs(blocked);
    const blockedDisplay = blocked < 0 ? `(${Math.abs(blocked)})` : `+ ${blocked}`;

    return `${current} ${blockedDisplay} = ${total}`;
}




function getCellValue(row, columnKey) {
    if (columnKey === "availablestock") {
        return formatAvailableStock(row);
    }

    if (columnKey === "averagesale") {
        const value = row.averageSale;

        return value === null || value === undefined || value === ""
            ? ""
            : Number(value).toFixed(1);
    }

    if (columnKey === "coverageMonths") {
        const value = row.coverageMonths;

        return value === null || value === undefined || value === ""
            ? ""
            : Number(value).toFixed(1);
    }

    if (columnKey === "targetMonths") {
        const value = row.targetMonths;

        return value === null || value === undefined || value === ""
            ? ""
            : Number(value).toFixed(1);
    }

    if (columnKey === "priceSource") {
        return row.priceSource || "-";
    }

    const value = row[columnKey];

    if (value === null || value === undefined || value === "") {
        return "";
    }

    return value;
}




function buildExportColumns(visibleColumns = [], columnOrder = []) {
    const safeVisible = Array.isArray(visibleColumns) && visibleColumns.length
        ? visibleColumns
        : Object.keys(EXPORT_COLUMN_DEFINITIONS);

    const safeOrder = Array.isArray(columnOrder) && columnOrder.length
        ? columnOrder
        : safeVisible;

    const orderedKeys = safeOrder
        .filter((key) => safeVisible.includes(key))
        .concat(
            safeVisible.filter((key) => !safeOrder.includes(key))
        );

    return orderedKeys
        .filter((key) => EXPORT_COLUMN_DEFINITIONS[key])
        .map((key) => ({
            key,
            header: EXPORT_COLUMN_DEFINITIONS[key].label,
            width: EXPORT_COLUMN_DEFINITIONS[key].width,
            type: EXPORT_COLUMN_DEFINITIONS[key].type || "text"
        }));
}




async function exportStandardExcel(selectedIds, options = {}) {
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
        throw new Error("Nenhum produto selecionado para exportar.");
    }


    const rows = repository.getPurchaseSuggestionsByIds(selectedIds);


    if (rows.length === 0) {
        throw new Error("Nenhum produto encontrado para os IDs selecionados.");
    }


    const calculatedRows = rows.map((row) =>
        calculatePurchaseSuggestion(
            row,
            {
                quantityoverride: row.quantity_override
            },
            options.curveDays || {}
        )
    );


    const exportColumns = buildExportColumns(
        options.visibleColumns,
        options.columnOrder
    );


    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sugestões de Compras");


    worksheet.columns = exportColumns.map((column) => ({
        header: column.header,
        key: column.key,
        width: column.width
    }));


    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE8EDF3" }
    };
    worksheet.getRow(1).border = {
        bottom: { style: "thin", color: { argb: "FFD5DBE3" } }
    };


    calculatedRows.forEach((row) => {
        const exportRow = {};

        exportColumns.forEach((column) => {
            const value = getCellValue(row, column.key);

            exportRow[column.key] = column.type === "currency"
                ? formatCurrency(value)
                : value;
        });

        worksheet.addRow(exportRow);
    });


    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);


    const defaultPath = path.join(
        require("os").homedir(),
        "Downloads",
        "Alfadime_Compras_" + timestamp + ".xlsx"
    );


    const { filePath } = await dialog.showSaveDialog({
        title: "Exportar Compras",
        defaultPath,
        filters: [{ name: "Excel", extensions: ["xlsx"] }]
    });


    if (!filePath) {
        return { cancelled: true };
    }


    await workbook.xlsx.writeFile(filePath);


    return {
        cancelled: false,
        filePath,
        totalProducts: calculatedRows.length
    };
}




module.exports = {
    exportStandardExcel
};
