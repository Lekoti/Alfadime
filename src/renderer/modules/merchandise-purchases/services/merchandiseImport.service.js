import * as XLSX from "xlsx";

import {
    FIELD_HEADERS,
    MONTH_LABELS,
    REQUIRED_FIELDS
} from "../constants/merchandise-purchases.constants";

let cachedImport = null;

export function getCachedImport() {
    return cachedImport;
}

export function setCachedImport(value) {
    cachedImport = value;
}

function normalize(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function toNumber(value) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    if (value === null || value === undefined || value === "") {
        return 0;
    }

    let text = String(value).trim();

    if (text.includes(",")) {
        text = text.replace(/\./g, "").replace(",", ".");
    }

    const parsed = Number(text);

    return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toCode(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(Math.trunc(value));
    }

    const text = toText(value);

    if (/^\d+(\.\d+)?e\+?\d+$/i.test(text)) {
        return String(Math.trunc(Number(text)));
    }

    return text;
}

function toBox(value) {
    if (typeof value === "number") {
        return value;
    }

    const text = toText(value);

    return text === "" ? 0 : Number(text.replace(",", "."));
}

export async function importMerchandiseFile(file) {
    if (!file) {
        throw new Error("Nenhum arquivo selecionado.");
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetName =
        workbook.SheetNames.find((name) => normalize(name) === "planilha1") ||
        workbook.SheetNames[0];

    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        raw: true,
        defval: null,
        blankrows: false
    });

    if (matrix.length < 2) {
        throw new Error("A planilha está vazia ou sem linhas de dados.");
    }

    const headers = matrix[0].map((header) => toText(header));
    const indexByHeader = new Map();

    headers.forEach((header, index) => {
        const key = normalize(header);

        if (key && !indexByHeader.has(key)) {
            indexByHeader.set(key, index);
        }
    });

    const fieldIndex = {};

    Object.entries(FIELD_HEADERS).forEach(([field, header]) => {
        const index = indexByHeader.get(normalize(header));

        if (index !== undefined) {
            fieldIndex[field] = index;
        }
    });

    const monthIndex = MONTH_LABELS.map((label) =>
        indexByHeader.get(normalize(`${label} Qtde`))
    );

    const missing = [
        ...REQUIRED_FIELDS
            .filter((field) => fieldIndex[field] === undefined)
            .map((field) => FIELD_HEADERS[field]),
        ...MONTH_LABELS
            .filter((label, index) => monthIndex[index] === undefined)
            .map((label) => `${label} Qtde`)
    ];

    if (missing.length > 0) {
        throw new Error(
            `Cabeçalhos obrigatórios não encontrados: ${missing.join(", ")}.`
        );
    }

    const get = (row, field) =>
        fieldIndex[field] === undefined ? null : row[fieldIndex[field]];

    const rows = [];

    for (let i = 1; i < matrix.length; i += 1) {
        const source = matrix[i];
        const company = toText(get(source, "company"));
        const productCode = toCode(get(source, "productCode"));

        if (!company && !productCode) {
            continue;
        }

        rows.push({
            sourceRow: i + 1,
            raw: source,
            company,
            productCode,
            supplierCode: toCode(get(source, "supplierCode")),
            barcode: toCode(get(source, "barcode")),
            description: toText(get(source, "description")),
            boxSize: toBox(get(source, "boxSize")),
            labCode: toCode(get(source, "labCode")),
            lab: toText(get(source, "lab")),
            group: toText(get(source, "group")),
            stock: toNumber(get(source, "stock")),
            blocked: toNumber(get(source, "blocked")),
            pf: toNumber(get(source, "pf")),
            pmc: toNumber(get(source, "pmc")),
            avgCost: toNumber(get(source, "avgCost")),
            lastPurchase: toNumber(get(source, "lastPurchase")),
            penultPurchase: toNumber(get(source, "penultPurchase")),
            antePenultPurchase: toNumber(get(source, "antePenultPurchase")),
            suggestedPrice: toNumber(get(source, "suggestedPrice")),
            avgPrice: toNumber(get(source, "avgPrice")),
            recompCost: toNumber(get(source, "recompCost")),
            dpcCost: toNumber(get(source, "dpcCost")),
            avgMonthSheet:
                fieldIndex.avgMonthSheet === undefined
                    ? null
                    : toNumber(get(source, "avgMonthSheet")),
            curve: toText(get(source, "curve")).toUpperCase(),
            months: monthIndex.map((index) => toNumber(source[index]))
        });
    }

    if (rows.length === 0) {
        throw new Error("Nenhum produto válido encontrado na planilha.");
    }

    return {
        fileName: file.name,
        sheetName,
        headers,
        rows,
        importedAt: new Date().toISOString()
    };
}
