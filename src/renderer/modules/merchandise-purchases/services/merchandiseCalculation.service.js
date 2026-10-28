import { MONTH_LABELS } from "../constants/merchandise-purchases.constants";

const EPSILON = 1e-9;

function roundUp(value) {
    return Math.ceil(value - EPSILON);
}

function curveKey(curve) {
    const key = String(curve || "").trim().toUpperCase();

    return ["A", "B", "C"].includes(key) ? key : "OTHER";
}

export function getBoxMultiple(box) {
    return Number.isInteger(box) && box > 0 ? box : 1;
}

export function suggestQuantity(monthly, days, balance, box) {
    const multiple = getBoxMultiple(box);
    const need = Math.max(roundUp((monthly / 30) * days) - balance, 0);

    return Math.ceil(need / multiple) * multiple;
}

function average(months, from, to) {
    const size = to - from + 1;
    let total = 0;

    for (let i = from; i <= to; i += 1) {
        total += months[i - 1];
    }

    return size > 0 ? total / size : 0;
}

function pickReference(kind, data) {
    switch (kind) {
        case "min":
            return data.minQty;
        case "avgMonth":
            return data.avgMonth;
        case "avg3":
            return data.avg3;
        case "avg6":
            return data.avg6;
        case "avgAll":
            return data.avgAll;
        default:
            return data.maxQty;
    }
}

export function computeRows(rows, premises) {
    const closed = Math.min(12, Math.max(1, Number(premises.closedMonth) || 12));
    const source = premises.priceSource;

    const groupKey = (row) => row.barcode || `cod:${row.productCode}`;

    const basePrices = rows.map((row) => {
        const price = Number(row[source]) || 0;

        if (price > 0) {
            return { price, viaLast: false };
        }

        const last = Number(row.lastPurchase) || 0;

        return last > 0
            ? { price: last, viaLast: true }
            : { price: 0, viaLast: false };
    });

    const cheapest = new Map();

    rows.forEach((row, index) => {
        const base = basePrices[index];

        if (base.price <= 0) {
            return;
        }

        const key = groupKey(row);
        const current = cheapest.get(key);

        if (!current || base.price < current.price) {
            cheapest.set(key, {
                price: base.price,
                company: row.company,
                viaLast: base.viaLast
            });
        }
    });

    return rows.map((row, index) => {
        const months = row.months;
        const base = basePrices[index];
        const low = cheapest.get(groupKey(row));

        const avgAll = average(months, 1, closed);
        const avg6 = average(months, Math.max(1, closed - 5), closed);
        const avg3 = average(months, Math.max(1, closed - 2), closed);
        const avgMonth =
            row.avgMonthSheet === null || row.avgMonthSheet === undefined
                ? avgAll
                : row.avgMonthSheet;

        let maxIndex = 0;
        let minIndex = 0;

        for (let i = 1; i < closed; i += 1) {
            if (months[i] > months[maxIndex]) {
                maxIndex = i;
            }

            if (months[i] < months[minIndex]) {
                minIndex = i;
            }
        }

        const hasHistory = months.slice(0, closed).some((value) => value > 0);
        const maxQty = hasHistory ? months[maxIndex] : 0;
        const minQty = hasHistory ? months[minIndex] : 0;

        const pending = 0;
        const transferred = 0;
        const consolidated = row.stock + row.blocked + transferred + pending;
        const targetDays = premises.curveDays[curveKey(row.curve)] ?? 0;

        const useLowest = premises.priceCriteria === "lowest";
        const selectedPrice = useLowest ? (low ? low.price : 0) : base.price;
        const viaLast = useLowest ? Boolean(low && low.viaLast) : base.viaLast;

        let priceOrigin = "Sem preço";

        if (selectedPrice > 0) {
            if (viaLast) {
                priceOrigin = "Última compra";
            } else {
                priceOrigin = useLowest && low ? low.company : row.company;
            }
        }

        let lowestCompany = "Sem preço";

        if (low) {
            lowestCompany = low.price === base.price ? "Igual" : low.company;
        }

        const data = {
            avgMonth,
            avgAll,
            avg6,
            avg3,
            maxQty,
            minQty
        };

        const refQty = pickReference(premises.periodReference, data);
        const boxValid = Number.isInteger(row.boxSize) && row.boxSize > 0;

        const suggestedQty = suggestQuantity(
            avgMonth,
            targetDays,
            consolidated,
            row.boxSize
        );

        const periodSuggestion = suggestQuantity(
            refQty,
            targetDays,
            consolidated,
            row.boxSize
        );

        return {
            ...row,
            id: index,
            avgMonth,
            avgAll,
            avg6,
            avg3,
            hasHistory,
            maxPeriod: hasHistory ? MONTH_LABELS[maxIndex] : "Sem histórico",
            maxQty,
            minPeriod: hasHistory ? MONTH_LABELS[minIndex] : "Sem histórico",
            minQty,
            pending,
            transferred,
            consolidated,
            targetDays,
            ownPrice: base.price,
            lowestPrice: low ? low.price : 0,
            lowestCompany,
            selectedPrice,
            priceOrigin,
            priceViaLast: selectedPrice > 0 ? (viaLast ? "Sim" : "Não") : "",
            boxValid,
            boxStatus: boxValid ? "OK" : "Caixa inválida",
            stockMonths: avgMonth > 0 ? consolidated / avgMonth : 0,
            refQty,
            suggestedQty,
            periodSuggestion,
            periodValue: periodSuggestion * selectedPrice
        };
    });
}

export function applyOverrides(rows, overrides) {
    return rows.map((row) => {
        const override = overrides[row.id];
        const manual = override !== undefined;
        const finalQty = manual ? override : row.suggestedQty;

        return {
            ...row,
            manual,
            finalQty,
            finalValue: finalQty * row.selectedPrice
        };
    });
}

function normalizeText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

export function filterRows(rows, filters) {
    const search = normalizeText(filters.search).trim();

    return rows.filter((row) => {
        if (filters.company && row.company !== filters.company) return false;
        if (filters.laboratory && row.lab !== filters.laboratory) return false;
        if (filters.group && row.group !== filters.group) return false;
        if (filters.curve && row.curve !== filters.curve) return false;

        switch (filters.status) {
            case "tobuy":
                if (!(row.finalQty > 0)) return false;
                break;
            case "nobuy":
                if (row.finalQty > 0) return false;
                break;
            case "noprice":
                if (row.selectedPrice > 0) return false;
                break;
            case "invalidbox":
                if (row.boxValid) return false;
                break;
            case "nohistory":
                if (row.hasHistory) return false;
                break;
            case "manual":
                if (!row.manual) return false;
                break;
            default:
                break;
        }

        if (search) {
            const haystack = normalizeText(
                `${row.company} ${row.productCode} ${row.barcode} ${row.description} ${row.lab}`
            );

            if (!haystack.includes(search)) return false;
        }

        return true;
    });
}

export function summarizeRows(rows) {
    return rows.reduce(
        (summary, row) => {
            summary.products += 1;

            if (row.finalQty > 0) {
                summary.itemsToBuy += 1;
                summary.totalQty += row.finalQty;
            }

            summary.totalValue += row.finalValue;
            summary.periodValue += row.periodValue;

            if (row.selectedPrice <= 0) summary.noPrice += 1;
            if (!row.boxValid) summary.invalidBox += 1;

            return summary;
        },
        {
            products: 0,
            itemsToBuy: 0,
            totalQty: 0,
            totalValue: 0,
            periodValue: 0,
            noPrice: 0,
            invalidBox: 0
        }
    );
}

function groupBy(rows, field) {
    const groups = new Map();

    rows.forEach((row) => {
        const key = String(row[field] || "Não informado");

        if (!groups.has(key)) {
            groups.set(key, { label: key, qty: 0, value: 0, count: 0 });
        }

        const group = groups.get(key);

        group.qty += row.finalQty;
        group.value += row.finalValue;
        group.count += 1;
    });

    return [...groups.values()]
        .map((group) => ({
            ...group,
            avgPrice: group.qty > 0 ? group.value / group.qty : 0
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function buildSummaryTables(rows) {
    const curveOrder = ["A", "B", "C", "D E F (Outros)"];
    const curves = new Map(
        curveOrder.map((label) => [
            label,
            { label, qty: 0, value: 0, count: 0 }
        ])
    );

    rows.forEach((row) => {
        const key = ["A", "B", "C"].includes(row.curve)
            ? row.curve
            : "D E F (Outros)";
        const group = curves.get(key);

        group.qty += row.finalQty;
        group.value += row.finalValue;
        group.count += 1;
    });

    const curveRows = [...curves.values()];
    const companyRows = groupBy(rows, "company");
    const labRows = groupBy(rows, "lab");

    const scenarioRows = [
        {
            label: "Menor preço",
            value: rows.reduce((sum, row) => sum + row.finalQty * row.lowestPrice, 0),
            extra: null
        },
        {
            label: "Própria empresa",
            value: rows.reduce((sum, row) => sum + row.finalQty * row.ownPrice, 0),
            extra: null
        },
        {
            label: "Preço selecionado",
            value: rows.reduce((sum, row) => sum + row.finalValue, 0),
            extra: null
        }
    ];

    const lowest = scenarioRows[0].value;

    scenarioRows.forEach((row) => {
        row.diff = row.value - lowest;
    });

    const originRows = groupBy(rows, "priceOrigin").map((row) => ({
        ...row,
        avgPrice: row.qty > 0 ? row.value / row.qty : 0
    }));

    const viaLastRows = rows.filter((row) => row.priceViaLast === "Sim");

    return {
        result: {
            itemsToBuy: rows.filter((row) => row.finalQty > 0).length,
            totalQty: rows.reduce((sum, row) => sum + row.finalQty, 0),
            totalValue: rows.reduce((sum, row) => sum + row.finalValue, 0)
        },
        curveRows,
        companyRows,
        labRows,
        scenarioRows,
        originRows,
        viaLast: {
            qty: viaLastRows.reduce((sum, row) => sum + row.finalQty, 0),
            value: viaLastRows.reduce((sum, row) => sum + row.finalValue, 0)
        },
        transferred: rows.reduce((sum, row) => sum + row.transferred, 0),
        invalidBox: rows.filter((row) => !row.boxValid).length,
        noPriceWithBuy: rows.filter(
            (row) => row.finalQty > 0 && row.selectedPrice <= 0
        ).length
    };
}

export function uniqueSorted(rows, field) {
    return [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort(
        (a, b) => String(a).localeCompare(String(b), "pt-BR")
    );
}
