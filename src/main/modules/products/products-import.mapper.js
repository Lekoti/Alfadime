const {
    PRODUCT_CATALOG_BOOLEAN_FIELDS,
    PRODUCT_CATALOG_NUMERIC_FIELDS
} = require("./products.constants");


const EMPTY_VALUES = new Set([
    "",
    "#N/D",
    "#N/A",
    "N/D",
    "NA",
    "NULL",
    "UNDEFINED"
]);


function normalizeText(value) {
    if (value === null || value === undefined) {
        return null;
    }


    const text = String(value).trim();


    if (EMPTY_VALUES.has(text.toUpperCase())) {
        return null;
    }


    return text || null;
}


function normalizeBoolean(value) {
    const text = normalizeText(value);


    if (!text) {
        return 0;
    }


    const normalized = text.toUpperCase();


    if (["S", "SIM", "TRUE", "1", "YES"].includes(normalized)) {
        return 1;
    }


    return 0;
}


function normalizeNumber(value) {
    const text = normalizeText(value);


    if (!text) {
        return null;
    }


    const normalized = text
        .replace(/\./g, "")
        .replace(",", ".");


    const number = Number(normalized);


    return Number.isFinite(number)
        ? number
        : null;
}


function normalizeProductCatalogRow(row = {}) {
    const product = {};


    for (const [field, value] of Object.entries(row)) {
        if (PRODUCT_CATALOG_BOOLEAN_FIELDS.includes(field)) {
            product[field] = normalizeBoolean(value);
            continue;
        }


        if (PRODUCT_CATALOG_NUMERIC_FIELDS.includes(field)) {
            product[field] = normalizeNumber(value);
            continue;
        }


        product[field] = normalizeText(value);
    }


    // Removido o fallback que preenchia code com EAN.
    // O campo code deve vir diretamente da planilha de Produtos.
    // A exibição de Cod e Cod Sirius na tela vem da Curva Compras.


    return product;
}

function validateProductCatalogRow(product = {}) {
    const errors = [];


    if (!product.branch) {
        errors.push("Filial ausente.");
    }


    if (
        (product.code === null ||
            product.code === undefined ||
            String(product.code).trim() === "") &&
        (product.ean === null ||
            product.ean === undefined ||
            String(product.ean).trim() === "")
    ) {
        errors.push("Codigo ou EAN obrigatorio.");
    }


    return errors;
}


module.exports = {
    normalizeText,
    normalizeBoolean,
    normalizeNumber,
    normalizeProductCatalogRow,
    validateProductCatalogRow
};