const MONTHS = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec"
];


const BRANCHES = {
    DPR: "DIMEBRAS PR",
    AMS: "ALFAMED MS",
    DMT: "DIMEBRAS MT",
    DMS: "DIMEBRAS MS",
    DSC: "DIMEBRAS SC"
};


const DEFAULT_CURVE_DAYS = {
    A: 90,
    B: 60,
    C: 30,
    D: 30,
    E: 30,
    F: 30,
    G: 30
};


function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}


function nullableNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}


function normalizeCurve(value) {
    const curve = String(value || "").trim().toUpperCase();
    return /^[A-Z]$/.test(curve) ? curve : null;
}


function getEffectiveCurve(curveValue, curveUnit) {
    const value = normalizeCurve(curveValue);
    const unit = normalizeCurve(curveUnit);
    const priorities = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 };


    if (!value) return unit;
    if (!unit) return value;


    return priorities[value] <= priorities[unit] ? value : unit;
}


function getCurveDays(curve, curveDays = {}) {
    const configured = numberValue(curveDays[curve]);


    if (configured > 0) {
        return Math.min(365, Math.round(configured));
    }


    return DEFAULT_CURVE_DAYS[curve] || DEFAULT_CURVE_DAYS.C;
}


function getAverageByWindow(product, monthsBack) {
    const currentMonth = new Date().getMonth();
    let total = 0;


    for (let offset = 0; offset < monthsBack; offset += 1) {
        const month = MONTHS[(currentMonth - offset + 12) % 12];
        total += numberValue(
            product[`${month}_quantity`] ??
            product[`${month}quantity`]
        );
    }


    return total / monthsBack;
}


function storedPriceToCurrency(value) {
    const price = nullableNumber(value);
    return price === null ? null : price / 100;
}


function resolveRowPrice(row) {
    if (!row) {
        return {
            price: null,
            source: "Produto não encontrado"
        };
    }


    const candidates = [
        ["Ult.Comp.", row.last_purchase_price ?? row.lastpurchaseprice],
        ["Penult.Comp.", row.penultimate_purchase_price ?? row.penultimatepurchaseprice],
        ["Antepenult.Comp.", row.antepenultimate_purchase_price ?? row.antepenultimatepurchaseprice],
        ["P Médio", row.average_cost ?? row.averagecost]
    ];


    for (const [source, value] of candidates) {
        const price = storedPriceToCurrency(value);


        if (price !== null) {
            return { price, source };
        }
    }


    return {
        price: null,
        source: "Sem valor"
    };
}


function getBranchCode(company) {
    return Object.entries(BRANCHES)
        .find(([, branchCompany]) => branchCompany === company)?.[0] || null;
}


function resolveBranchPrices(product) {
    const prices = {};


    for (const branch of Object.keys(BRANCHES)) {
        const result = resolveRowPrice(product.branchPrices?.[branch]);
        const suffix = branch.toLowerCase();


        prices[`lastpurchaseprice${suffix}`] = result.price;
        prices[`lastpurchasepricesource${suffix}`] = result.source;
    }


    const currentBranch = getBranchCode(product.company);
    const specificBranchRow = currentBranch
        ? product.branchPrices?.[currentBranch]
        : null;
    const currentResult = resolveRowPrice(specificBranchRow || product);


    return {
        ...prices,
        currentBranch,
        currentPrice: currentResult.price,
        currentPriceSource: currentBranch
            ? `${currentBranch} · ${currentResult.source}`
            : currentResult.source
    };
}


function formatAverage(value) {
    if (value === null || value === undefined) return null;
    return Math.round(value * 10) / 10;
}


function calculateSuggestedQuantity(product, curveDays = {}) {
    const effectiveCurve = getEffectiveCurve(
        product.curve_value ?? product.curvevalue,
        product.curve_unit ?? product.curveunit
    );


    const average12 = numberValue(
        product.average_sale_12m ?? product.averagesale12m
    ) || getAverageByWindow(product, 12);


    const average6 = numberValue(
        product.average_sale_6m ?? product.averagesale6m
    ) || getAverageByWindow(product, 6);


    const average3 = numberValue(
        product.average_sale_3m ?? product.averagesale3m
    ) || getAverageByWindow(product, 3);


    const averageSale = effectiveCurve === "A"
        ? average3
        : effectiveCurve === "B"
            ? average6
            : average12;


    const currentStock = numberValue(
        product.current_stock ?? product.currentstock
    );


    const blockedStock = numberValue(
        product.blocked_stock ?? product.blockedstock
    );


    const availableStock = currentStock + Math.abs(blockedStock);
    const targetDays = getCurveDays(effectiveCurve, curveDays);
    const averageDailySale = averageSale / 30;
    const targetQuantity = averageDailySale * targetDays;
    const rawSuggestion = Math.max(0, targetQuantity - availableStock);


    const standardBox = numberValue(
        product.standard_box ?? product.standardbox
    );


    const suggestedQuantity = standardBox > 0
        ? Math.ceil(rawSuggestion / standardBox) * standardBox
        : Math.ceil(rawSuggestion);


    const coverageDays = averageDailySale > 0
        ? availableStock / averageDailySale
        : null;


    const coverageMonths = coverageDays === null
        ? null
        : Math.round((coverageDays / 30) * 10) / 10;


    const branchPrices = resolveBranchPrices(product);
    const isCritical = Boolean(
        coverageDays !== null && coverageDays < targetDays
    );


    const observations = [];
    const curveLabel = effectiveCurve
        ? `Curva ${effectiveCurve}`
        : "Curva não definida";


    const stockLabel = new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 2
    }).format(availableStock);


    const averageLabel = new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 2
    }).format(averageSale);


    if (coverageDays === null) {
        observations.push(
            `${curveLabel}: não há média de venda suficiente para calcular a cobertura.`
        );
    } else {
        observations.push(
            `${curveLabel}: estoque + bloqueado = ${stockLabel} un.; cobertura aproximada de ${Math.floor(coverageDays)} dias.`
        );
    }


    observations.push(
        `Meta configurada: ${targetDays} dias; média usada no cálculo: ${averageLabel} un./mês.`
    );


    if (suggestedQuantity > 0) {
        observations.push(
            `Ação: comprar ${suggestedQuantity} un. para completar a meta de ${targetDays} dias.`
        );
    } else if (coverageDays !== null) {
        observations.push(
            "Ação: não comprar agora, pois o estoque já atende a meta."
        );
    }


    if (suggestedQuantity > 0 && branchPrices.currentPrice === null) {
        observations.push(
            "Atenção: não foi encontrado preço para calcular o valor da sugestão."
        );
    }


    return {
        effectiveCurve,
        targetDays,
        targetMonths: Math.round((targetDays / 30) * 10) / 10,
        averageSale: formatAverage(averageSale),
        averageDailySale: formatAverage(averageDailySale),
        availableStock,
        coverageDays,
        coverageMonths,
        suggestedQuantity,
        calculatedUnitPrice: branchPrices.currentPrice,
        calculatedTotalValue: branchPrices.currentPrice !== null
            ? suggestedQuantity * branchPrices.currentPrice
            : null,
        priceSource: branchPrices.currentPriceSource,
        isCritical,
        observation: observations.join(" "),
        ...branchPrices
    };
}


function calculatePurchaseSuggestion(product, overrides = {}, curveDays = {}) {
    const calculation = calculateSuggestedQuantity(product, curveDays);


    const quantity = overrides.quantityoverride !== undefined &&
        overrides.quantityoverride !== null &&
        overrides.quantityoverride !== ""
        ? numberValue(overrides.quantityoverride)
        : calculation.suggestedQuantity;


    const unitPrice = overrides.unitpriceoverride !== undefined &&
        overrides.unitpriceoverride !== null &&
        overrides.unitpriceoverride !== ""
        ? nullableNumber(overrides.unitpriceoverride)
        : calculation.calculatedUnitPrice;
    return {
        ...product,
        ...calculation,
        // Aliases para o frontend e exportação (snake_case -> camelCase/sem underscore)
        productcode: product.product_code ?? product.productcode ?? product.code ?? "",

        code: product.product_code ?? product.productcode ?? product.code ?? "", 
        laboratoryname: product.laboratory_name ?? product.laboratoryname ?? "",
        currentstock: product.current_stock ?? product.currentstock ?? 0,
        blockedstock: product.blocked_stock ?? product.blockedstock ?? 0,
        effectivecurve: product.effective_curve ?? product.effectivecurve ?? "",
        ean: product.barcode ?? product.ean ?? "",
        availablestock: (product.current_stock ?? product.currentstock ?? 0) + Math.abs(product.blocked_stock ?? product.blockedstock ?? 0),
        averagesale12m: formatAverage(product.average_sale_12m ?? product.averagesale12m ?? calculation.averageSale),
        averagesale6m: formatAverage(product.average_sale_6m ?? product.averagesale6m ?? calculation.averageSale),
        averagesale3m: formatAverage(product.average_sale_3m ?? product.averagesale3m ?? calculation.averageSale),
        quantityoverride: overrides.quantityoverride ?? null,
        unitpriceoverride: overrides.unitpriceoverride ?? null,
        suggestedquantity: quantity,
        unitprice: unitPrice,
        totalsuggestionvalue: unitPrice !== null
            ? quantity * unitPrice
            : null,
        curveValue: product.curve_value ?? product.curvevalue ?? null,
        curveUnit: product.curve_unit ?? product.curveunit ?? null,
        standardBox: product.standard_box ?? product.standardbox ?? null
    };
}


module.exports = {
    calculatePurchaseSuggestion,
    calculateSuggestedQuantity,
    getEffectiveCurve,
    resolveRowPrice,
    storedPriceToCurrency
};