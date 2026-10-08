const path = require("node:path");
const ExcelJS = require("exceljs");
const { dialog } = require("electron");
const repository = require("./purchases.repository");
const { toSafeNumber } = require("../../utils/validation.utils");


async function exportStandardExcel(selectedIds) {
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
        throw new Error("Nenhum produto selecionado para exportar.");
    }


    const rows = repository.getPurchaseSuggestionsByIds(selectedIds);


    if (rows.length === 0) {
        throw new Error("Nenhum produto encontrado para os IDs selecionados.");
    }


    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sugestões de Compras");


    const columns = [
        { header: "Empresa", key: "company", width: 25 },
        { header: "Cód Prod", key: "code", width: 15 },
        { header: "Cód Barras", key: "ean", width: 18 },
        { header: "Descrição", key: "description", width: 40 },
        { header: "Laboratório", key: "laboratoryname", width: 25 },
        { header: "Curva", key: "effectivecurve", width: 10 },
        { header: "Estoque Atual", key: "currentstock", width: 15 },
        { header: "Bloqueado", key: "blockedstock", width: 12 },
        { header: "Média Venda 12M", key: "averagesale12m", width: 18 },
        { header: "Média Venda 6M", key: "averagesale6m", width: 18 },
        { header: "Média Venda 3M", key: "averagesale3m", width: 18 },
        { header: "Cobertura (dias)", key: "coverageDays", width: 16 },
        { header: "Sugestão Qtde.", key: "suggestedquantity", width: 15 },
        { header: "Valor Unitário", key: "unitprice", width: 15 },
        { header: "Total Sugestão", key: "totalsuggestionvalue", width: 18 }
    ];


    worksheet.columns = columns;


    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE8EDF3" }
    };
    worksheet.getRow(1).border = {
        bottom: { style: "thin", color: { argb: "FFD5DBE3" } }
    };


    rows.forEach((row) => {
        worksheet.addRow({
            company: row.company || "",
            code: row.product_code || row.code || "",
            ean: row.barcode || row.ean || "",
            description: row.description || "",
            laboratoryname: row.laboratory_name || row.laboratoryname || "",
            effectivecurve: row.effective_curve || row.effectivecurve || "",
            currentstock: toSafeNumber(row.current_stock || row.currentstock, 0),
            blockedstock: toSafeNumber(row.blocked_stock || row.blockedstock, 0),
            averagesale12m: toSafeNumber(row.average_sale_12m || row.averagesale12m, 0),
            averagesale6m: toSafeNumber(row.average_sale_6m || row.averagesale6m, 0),
            averagesale3m: toSafeNumber(row.average_sale_3m || row.averagesale3m, 0),
            coverageDays: (row.coverage_days ?? row.coverageDays) !== null ? toSafeNumber(row.coverage_days || row.coverageDays, 0) : "",
            suggestedquantity: toSafeNumber(row.suggested_quantity || row.suggestedquantity, 0),
            unitprice: toSafeNumber(row.unit_price || row.unitprice, 0),
            totalsuggestionvalue: toSafeNumber(row.total_suggestion_value || row.totalsuggestionvalue, 0)
        });
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
        totalProducts: rows.length
    };
}


module.exports = {
    exportStandardExcel
};