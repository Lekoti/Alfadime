const repository = require("./purchases.repository");
const { calculatePurchaseSuggestion } = require("./purchases-calculation.service");

function buildCleanObservation(row, status) {
    const quantity = Number(row.suggestedquantity || 0);
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

function listPurchaseSuggestions(filters = {}) {
    const result = repository.listCurveProducts(filters);

    const status = filters.status || "";

    const rows = result.rows.map((row) => {
        const calculated = calculatePurchaseSuggestion(
            row,
            {
                quantityoverride: row.quantity_override
            },
            filters.curveDays || {}
        );

        return {
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
            observation: buildCleanObservation(
                {
                    ...row,
                    ...calculated
                },
                status
            )
        };
    });

    const filteredRows = rows.filter((row) => {
        const coverageDays = row.coverageDays;
        const targetDays = Number(row.targetDays || 0);
        const suggestedQuantity = Number(row.suggestedquantity || 0);
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
    });

    const summary = filteredRows.reduce((total, row) => ({
        products: total.products + 1,
        suggestedQuantity: total.suggestedQuantity + Number(row.suggestedquantity || 0),
        suggestedValue: total.suggestedValue + Number(row.totalsuggestionvalue || 0),
        criticalProducts: total.criticalProducts + (row.isCritical ? 1 : 0)
    }), { products: 0, suggestedQuantity: 0, suggestedValue: 0, criticalProducts: 0 });

    return {
        rows: filteredRows,
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