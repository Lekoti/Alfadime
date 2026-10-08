const repository = require("./purchases.repository");
const { calculatePurchaseSuggestion } = require("./purchases-calculation.service");


function listPurchaseSuggestions(filters = {}) {
    const result = repository.listCurveProducts(filters);
    
    const rows = result.rows.map((row) => {
        const calculated = calculatePurchaseSuggestion(
            row,
            {},
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
            priceSource: calculated.priceSource || '-'
        };
    });
    
    const filteredRows = rows.filter((row) => {
        const status = filters.status || "";
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
    getAllCurveProducts
};