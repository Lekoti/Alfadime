const repository = require("./purchases.repository");
const { calculatePurchaseSuggestion } = require("./purchases-calculation.service");


function getSuggestedQuantity(row) {
    return Number(
        (row.suggestedQuantity ?? row.suggestedquantity) || 0
    );
}


function buildCleanObservation(row, status) {
    const quantity = getSuggestedQuantity(row);
    const coverage = row.coverageDays;
    const target = Number(row.targetDays || 0);
    const hasCoverage = coverage !== null && coverage !== undefined;
    const coverageText = hasCoverage ? `${Math.floor(coverage)} dias` : "indisponível";
    const targetText = target > 0 ? `${target} dias` : "não definida";


    if (status === "suggestion") {
        return quantity > 0
            ? `Comprar ${quantity} un. para atingir a meta de ${targetText}.`
            : "Sem necessidade de compra.";
    }


    if (status === "belowtarget") {
        return quantity > 0
            ? `Estoque abaixo da meta. Comprar ${quantity} un.`
            : "Estoque abaixo da meta, mas sem sugestão calculada.";
    }


    if (status === "critical") {
        return quantity > 0
            ? `Crítico: cobertura de ${coverageText}. Comprar ${quantity} un.`
            : `Crítico: cobertura de ${coverageText}.`;
    }


    if (status === "nobuy") {
        return "Estoque suficiente. Não comprar.";
    }


    if (status === "excessstock") {
        return "Estoque excedente. Não comprar.";
    }


    if (status === "promotion") {
        return "Estoque muito alto. Avaliar ação promocional.";
    }


    if (status === "nosales") {
        return "Sem média de venda suficiente para calcular.";
    }


    if (status === "noprice") {
        return quantity > 0
            ? `Comprar ${quantity} un. Preço não encontrado para calcular o total.`
            : "Sem necessidade de compra.";
    }


    if (quantity > 0) {
        return `Comprar ${quantity} un. para meta de ${targetText}.`;
    }


    if (hasCoverage) {
        return "Estoque suficiente. Não comprar.";
    }


    return "Sem média de venda suficiente para calcular.";
}


function decorateCalculatedRow(row, filters = {}) {
    const calculated = calculatePurchaseSuggestion(
        row,
        {
            quantityoverride: row.quantity_override
        },
        filters.curveDays || {}
    );


    const coverageDays = calculated.coverageDays;
    const hasCoverage =
        coverageDays !== null &&
        coverageDays !== undefined;


    const decorated = {
        ...calculated,
        lastPurchaseDPR: row.lastPurchaseDPR ?? null,
        lastPurchaseAMS: row.lastPurchaseAMS ?? null,
        lastPurchaseDMT: row.lastPurchaseDMT ?? null,
        lastPurchaseDMS: row.lastPurchaseDMS ?? null,
        lastPurchaseDSC: row.lastPurchaseDSC ?? null,
        averageCost: row.averageCost ?? calculated.averageCost ?? null,
        curveValue: row.curveValue ?? null,
        curveUnit: row.curveUnit ?? null,
        standardBox: row.standardBox ?? null,
        priceSource: calculated.priceSource || "-",
        isCritical:
            hasCoverage && coverageDays <= 15,
        observation: buildCleanObservation(
            {
                ...row,
                ...calculated
            },
            filters.status || ""
        )
    };


    return decorated;
}


function matchesStatusFilter(row, status) {
    const coverageDays = row.coverageDays;
    const targetDays = Number(row.targetDays || 0);
    const suggestedQuantity = getSuggestedQuantity(row);
    const hasCoverage = coverageDays !== null && coverageDays !== undefined;
    const hasPrice = row.unitprice !== null && row.unitprice !== undefined && Number(row.unitprice) > 0;


    if (status === "suggestion") {
        return suggestedQuantity > 0;
    }


    if (status === "belowtarget") {
        return hasCoverage && coverageDays < targetDays;
    }


    if (status === "critical") {
        return hasCoverage && coverageDays <= 15;
    }


    if (status === "nobuy") {
        return hasCoverage && coverageDays >= targetDays;
    }


    if (status === "excessstock") {
        return hasCoverage && targetDays > 0 && coverageDays >= targetDays * 2;
    }


    if (status === "promotion") {
        return hasCoverage && targetDays > 0 && coverageDays >= targetDays * 3;
    }


    if (status === "nosales") {
        return !hasCoverage;
    }


    if (status === "noprice") {
        return suggestedQuantity > 0 && !hasPrice;
    }


    return true;
}


function paginateRows(rows, filters = {}) {
    const pageSize = Math.min(
        Math.max(Number(filters.pageSize) || 50, 1),
        10000
    );
    const page = Math.max(Number(filters.page) || 1, 1);
    const total = rows.length;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * pageSize;


    return {
        rows: rows.slice(offset, offset + pageSize),
        pagination: {
            page: currentPage,
            pageSize,
            total,
            totalPages,
            offset
        }
    };
}


function listPurchaseSuggestions(filters = {}) {
    const status = filters.status || "";


    if (status) {
        const allRows = repository.listAllCurveProducts(filters);
        const calculatedRows = allRows.map((row) => decorateCalculatedRow(row, filters));
        const filteredRows = calculatedRows.filter((row) => matchesStatusFilter(row, status));
        const paginated = paginateRows(filteredRows, filters);


        const summary = filteredRows.reduce((total, row) => ({
            products: total.products + 1,
            suggestedQuantity: total.suggestedQuantity + getSuggestedQuantity(row),
            suggestedValue: total.suggestedValue + Number(row.totalsuggestionvalue || 0),
            criticalProducts: total.criticalProducts + (row.isCritical ? 1 : 0)
        }), { products: 0, suggestedQuantity: 0, suggestedValue: 0, criticalProducts: 0 });


        return {
            rows: paginated.rows,
            summary,
            pagination: paginated.pagination
        };
    }


    const result = repository.listCurveProducts(filters);
    const rows = result.rows.map((row) => decorateCalculatedRow(row, filters));


    const summary = rows.reduce((total, row) => ({
        products: total.products + 1,
        suggestedQuantity: total.suggestedQuantity + getSuggestedQuantity(row),
        suggestedValue: total.suggestedValue + Number(row.totalsuggestionvalue || 0),
        criticalProducts: total.criticalProducts + (row.isCritical ? 1 : 0)
    }), { products: 0, suggestedQuantity: 0, suggestedValue: 0, criticalProducts: 0 });


    return {
        rows,
        summary,
        pagination: result.pagination
    };
}


function getPurchaseFilterOptions(field) {
    return repository.getFilterOptions(field);
}


function getAllCurveProducts(filters = {}) {
    return repository.listAllCurveProducts(filters);
}


module.exports = {
    listPurchaseSuggestions,
    getPurchaseFilterOptions,
    getAllCurveProducts,
    setQuantityOverride: repository.setQuantityOverride,
    getQuantityOverridesCount: repository.getQuantityOverridesCount,
    clearQuantityOverrides: repository.clearQuantityOverrides
};