const path = require("node:path");
const XLSX = require("xlsx");
const repository = require("./purchases.repository");
const { getEffectiveCurve } = require("./purchases-calculation.service");


function normalizeHeader(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .trim();
}


function normalizeText(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text || ["ND", "N/A", "NA", "NULL", "-"].includes(text.toUpperCase())) return null;
    return text;
}


function normalizeNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const normalized = String(value).trim().replace(/\./g, "").replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
}


function normalizeNullableNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const number = normalizeNumber(value);
    return number > 0 ? number : null;
}


function findColumn(row, candidates) {
    const lookup = {};
    for (const key of Object.keys(row)) lookup[normalizeHeader(key)] = key;
    for (const candidate of candidates) {
        const key = lookup[normalizeHeader(candidate)];
        if (key !== undefined) return row[key];
    }
    return null;
}


function getMonthlyQuantity(row, shortMonth) {
    return normalizeNumber(findColumn(row, [
        `${shortMonth} Qtde`, `${shortMonth} Quantidade`, `${shortMonth} Qtd`
    ]));
}


function mapCurveRow(row) {
    const company = normalizeText(findColumn(row, ["Empresa", "Filial", "Company"]));
    
    let product_code = normalizeText(findColumn(row, [
        "Cod Prod", "Cód. Prod.", "Cód Prod", "Cod. Prod.",
        "Cod Produto", "Cód. Produto", "Código Produto",
        "Codigo Produto", "Cod", "Cód", "Código",
        "Produto Cod", "Ref", "Referencia", "Referência",
        "Codigo", "Produto Código", "Cod.Prod."
    ]));
    
    if (!product_code) {
        product_code = normalizeText(findColumn(row, [
            "Cód. Barras", "Cod Barras", "Cód Barras",
            "Codigo Barras", "Código Barras", "EAN",
            "Cod. Barras", "Barcode"
        ]));
    }
    
    if (!company || !product_code) return null;


    const jan = getMonthlyQuantity(row, "Jan");
    const feb = getMonthlyQuantity(row, "Fev");
    const mar = getMonthlyQuantity(row, "Mar");
    const apr = getMonthlyQuantity(row, "Abr");
    const may = getMonthlyQuantity(row, "Mai");
    const jun = getMonthlyQuantity(row, "Jun");
    const jul = getMonthlyQuantity(row, "Jul");
    const aug = getMonthlyQuantity(row, "Ago");
    const sep = getMonthlyQuantity(row, "Set");
    const oct = getMonthlyQuantity(row, "Out");
    const nov = getMonthlyQuantity(row, "Nov");
    const dec = getMonthlyQuantity(row, "Dez");
    const sales12 = (jan + feb + mar + apr + may + jun + jul + aug + sep + oct + nov + dec) / 12;


    const curve_value = normalizeText(findColumn(row, ["Curva Valor", "Curva de Valor"]));
    const curve_unit = normalizeText(findColumn(row, ["Curva Unidade", "Curva Unid", "Curva Venda Produto"]));


    return {
        company,
        product_code,
        cod_fabr_global: normalizeText(findColumn(row, [
            "Cod Fabr Global", "Codigo Fabr Global", "Cod_Fabr_Global",
            "Cód. Fabr. Global", "Fabr Global", "Fabricante Global",
            "Manufacturer Global", "Global Manufacturer Code",
            "CodFabrGlobal", "ManufacturerGlobalCode"
        ])),
        barcode: normalizeText(findColumn(row, ["Cod Barras", "Codigo Barras", "EAN", "Cod. Barras"])),
        description: normalizeText(findColumn(row, ["Descricao", "Descrição", "Produto"])),
        laboratory_name: normalizeText(findColumn(row, ["Lab.", "Laboratorio", "Laboratório", "Nome Laboratorio"])),
        current_stock: normalizeNumber(findColumn(row, ["Estoque", "Saldo Estoque"])),
        blocked_stock: normalizeNumber(findColumn(row, ["Estoque Bloq.", "Estoque Bloq", "Saldo Bloqueado", "Bloqueado"])),
        average_sale_12m: normalizeNumber(findColumn(row, ["Media Mes", "Média Mes", "Media Venda", "Media Venda 12 Meses"])) || sales12,
        average_sale_6m: 0,
        average_sale_3m: 0,
        last_purchase_price: normalizeNullableNumber(findColumn(row, ["Ult.Comp.", "Ult Comp", "Ultima Compra", "Última Compra"])),
        penultimate_purchase_price: normalizeNullableNumber(findColumn(row, ["Penult.Comp.", "Penult Comp", "Penultima Compra", "Penúltima Compra"])),
        antepenultimate_purchase_price: normalizeNullableNumber(findColumn(row, ["Antepenult.Comp.", "Antepenult Comp", "Antepenultima Compra", "Antepenúltima Compra"])),
        average_cost: normalizeNullableNumber(findColumn(row, ["Custo Medio", "Custo Médio", "P Medio", "P Médio", "Custo Med Atual"])),
        last_purchase_pricedpr: normalizeNullableNumber(findColumn(row, ["VALOR ULT COMPRA DIMEBRAS PR", "DPR"])),
        last_purchase_priceams: normalizeNullableNumber(findColumn(row, ["VALOR ULT COMPRA ALFAMED MS", "AMS"])),
        last_purchase_pricedms: normalizeNullableNumber(findColumn(row, ["VALOR ULT COMPRA DIMEBRAS MS", "DMS"])),
        last_purchase_pricedmt: normalizeNullableNumber(findColumn(row, ["VALOR ULT COMPRA DIMEBRAS MT", "DMT"])),
        last_purchase_pricedsc: normalizeNullableNumber(findColumn(row, ["VALOR ULT COMPRA DIMEBRAS SC", "DSC"])),
        curve_value,
        curve_unit,
        effective_curve: getEffectiveCurve(curve_value, curve_unit),
        standard_box: normalizeNumber(findColumn(row, ["Cx Padrao", "Caixa Padrao", "Cx. Padrao"])),
        janquantity: jan, febquantity: feb, marquantity: mar, aprquantity: apr,
        mayquantity: may, junquantity: jun, julquantity: jul, augquantity: aug,
        sepquantity: sep, octquantity: oct, novquantity: nov, decquantity: dec
    };
}


function calculateRecentAverages(product) {
    const quantities = [product.janquantity, product.febquantity, product.marquantity, product.aprquantity, product.mayquantity, product.junquantity, product.julquantity, product.augquantity, product.sepquantity, product.octquantity, product.novquantity, product.decquantity];
    const currentMonth = new Date().getMonth();
    const average = months => {
        let total = 0;
        for (let offset = 0; offset < months; offset += 1) total += quantities[(currentMonth - offset + 12) % 12];
        return total / months;
    };
    return { ...product, average_sale_12m: product.average_sale_12m || average(12), average_sale_6m: average(6), average_sale_3m: average(3) };
}


function synchronizePurchasesCurveExcel(filePath) {
    const workbook = XLSX.readFile(filePath, { cellDates: false, raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("Nenhuma planilha encontrada na Curva Compras.");


    const sourceRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: false });
    const importHistory = repository.createImportHistory({
        sourcefilename: path.basename(filePath), sourcefilepath: filePath, totalrows: sourceRows.length, validrows: 0, ignoredrows: 0
    });


    try {
        let ignoredRows = 0;
        const products = sourceRows.map(mapCurveRow).filter(item => {
            if (!item) { ignoredRows += 1; return false; }
            return true;
        }).map(calculateRecentAverages);


        if (!products.length) throw new Error("Nenhuma linha válida encontrada. Verifique Empresa e Cod Prod.");


        const result = repository.upsertCurveProducts(products, { fileName: path.basename(filePath), filePath });
        repository.finishImportHistory(importHistory.id, {
            insertedrows: result.inserted, updatedrows: result.updated, ignoredrows: ignoredRows, status: "completed"
        });


        return { success: true, fileName: path.basename(filePath), sheetName, totalRows: sourceRows.length, validRows: products.length, ignoredRows, insertedRows: result.inserted, updatedRows: result.updated };
    } catch (error) {
        repository.finishImportHistory(importHistory.id, { status: "error", errormessage: error.message });
        throw error;
    }
}


module.exports = { synchronizePurchasesCurveExcel };