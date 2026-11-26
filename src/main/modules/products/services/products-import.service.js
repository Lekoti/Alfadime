const path = require("node:path");
const XLSX = require("xlsx");

const repository = require("../repositories/products.repository");
const correctionsService = require("./products-corrections.service");
const purchasesImportService = require("../../purchases/purchases-import.service");

const { PRODUCT_CATALOG_FIELDS, PRODUCT_CATALOG_IMPORT_COLUMNS, PRODUCT_CATALOG_REQUIRED_HEADERS } = require("../constants/products.constants");
const { normalizeProductCatalogRow, validateProductCatalogRow } = require("../mappers/products-import.mapper");

let PURCHASES_CURVE_EXCEL_PATH;

try {
    ({ PURCHASES_CURVE_EXCEL_PATH } = require("../../purchases/purchases.config"));
} catch (error) {
    PURCHASES_CURVE_EXCEL_PATH = "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\CURVA COMPRAS\\CURVA COMPRAS.xlsx";
}

function normalizeHeader(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

function createEmptyMappedRow() {
    return PRODUCT_CATALOG_FIELDS.reduce((result, field) => {
        result[field] = null;
        return result;
    }, {});
}

function mapExcelRow(excelRow = {}) {
    const mapped = createEmptyMappedRow();

    for (const [excelColumn, field] of Object.entries(PRODUCT_CATALOG_IMPORT_COLUMNS)) {
        mapped[field] = excelRow[excelColumn];
    }

    return mapped;
}

function validateHeaders(headers = []) {
    const normalizedHeaders = headers.map(normalizeHeader);
    const missingHeaders = PRODUCT_CATALOG_REQUIRED_HEADERS.filter((requiredHeader) => !normalizedHeaders.includes(requiredHeader));

    if (missingHeaders.length > 0) {
        throw new Error("Colunas obrigatorias nao encontradas: " + missingHeaders.join(", "));
    }

    const recognizedHeaders = normalizedHeaders.filter((header) => Object.prototype.hasOwnProperty.call(PRODUCT_CATALOG_IMPORT_COLUMNS, header));

    if (recognizedHeaders.length === 0) {
        throw new Error("Nenhuma coluna reconhecida foi encontrada no Excel.");
    }

    return {
        normalizedHeaders,
        recognizedHeaders,
        ignoredHeaders: normalizedHeaders.filter((header) => !Object.prototype.hasOwnProperty.call(PRODUCT_CATALOG_IMPORT_COLUMNS, header))
    };
}

function readExcelProducts(filePath) {
    const workbook = XLSX.readFile(filePath, { cellDates: false, raw: false });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
        throw new Error("Nenhuma planilha encontrada no arquivo.");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });

    if (!matrix.length) {
        throw new Error("A planilha esta vazia.");
    }

    const rawHeaders = matrix[0].map(normalizeHeader);
    const headerResult = validateHeaders(rawHeaders);
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });

    return {
        sheetName: firstSheetName,
        rows,
        headers: headerResult.normalizedHeaders,
        recognizedHeaders: headerResult.recognizedHeaders,
        ignoredHeaders: headerResult.ignoredHeaders
    };
}

function yieldToEventLoop() {
    return new Promise((resolve) => {
        setImmediate(resolve);
    });
}

function normalizeEan(value) {
    if (value === null || value === undefined) {
        return "";
    }

    let text = String(value).trim();

    if (!text || text === "0") {
        return "";
    }

    if (/^\d+(\.\d+)?([eE][+-]?\d+)?$/.test(text)) {
        const number = Number(text);

        if (Number.isFinite(number)) {
            text = number.toFixed(0);
        }
    }

    return text;
}

function buildUnionKey(branch, ean) {
    const normalizedBranch = String(branch || "").trim();
    const normalizedEan = normalizeEan(ean);

    if (!normalizedBranch || !normalizedEan) {
        return null;
    }

    return `${normalizedBranch}|ean|${normalizedEan}`;
}

async function synchronizeProductsExcel(filePath) {
    console.log("=== INICIANDO IMPORTACAO PRODUTOS ===");
    console.log("Caminho:", filePath);
    console.log("Arquivo existe:", require("fs").existsSync(filePath));

    const fileName = path.basename(filePath);
    const startedAt = new Date().toISOString();
    let importHistory;

    try {
        const readResult = readExcelProducts(filePath);
        const validProducts = [];
        const errors = [];

        for (let index = 0; index < readResult.rows.length; index++) {
            const excelRow = readResult.rows[index];
            const mappedRow = mapExcelRow(excelRow);
            const product = normalizeProductCatalogRow(mappedRow);
            const validationErrors = validateProductCatalogRow(product);

            if (validationErrors.length > 0) {
                errors.push({ row: index + 2, errors: validationErrors });
                continue;
            }

            validProducts.push(product);

            if (validProducts.length % 500 === 0) {
                await yieldToEventLoop();
            }
        }

        if (validProducts.length === 0) {
            throw new Error("Nenhum produto valido foi encontrado no Excel.");
        }

        importHistory = repository.createImportHistory({
            source_file_name: fileName,
            source_file_path: filePath,
            total_rows: readResult.rows.length,
            valid_rows: validProducts.length,
            ignored_rows: errors.length,
            status: "processing"
        });

        const result = await repository.syncProducts(validProducts, { fileName, filePath });

        let correctionResult = { confirmed: 0 };
        let correctionsWarning = null;

        try {
            correctionResult = correctionsService.confirmCorrectionsFromExcel();
        } catch (correctionError) {
            correctionsWarning = "Produtos sincronizados, mas houve falha ao confirmar correcoes: " + correctionError.message;
        }

        repository.finishImportHistory(importHistory.id, {
            inserted_rows: result.inserted,
            updated_rows: result.updated,
            deactivated_rows: result.deactivated,
            ignored_rows: errors.length + (result.skipped || 0) + (result.duplicateRows || 0),
            status: correctionsWarning ? "completed_with_warnings" : "completed",
            error_message: correctionsWarning
        });

        return {
            success: true,
            importId: importHistory.id,
            fileName,
            sheetName: readResult.sheetName,
            totalRows: readResult.rows.length,
            validRows: validProducts.length,
            ignoredRows: errors.length + (result.skipped || 0) + (result.duplicateRows || 0),
            insertedRows: result.inserted,
            updatedRows: result.updated,
            unchangedRows: result.unchanged,
            duplicateRows: result.duplicateRows,
            confirmedCorrections: correctionResult.confirmed,
            warning: correctionsWarning,
            recognizedHeaders: readResult.recognizedHeaders,
            ignoredHeaders: readResult.ignoredHeaders,
            errors,
            startedAt,
            finishedAt: new Date().toISOString(),
            products: validProducts
        };
    } catch (error) {
        if (importHistory) {
            repository.finishImportHistory(importHistory.id, {
                status: "error",
                error_message: error.message
            });
        }

        throw error;
    }
}

async function synchronizeDatabaseExcel() {
    const { PRODUCTS_EXCEL_PATH } = require("../constants/products.config");
    const startedAt = new Date().toISOString();

    const productsResult = await synchronizeProductsExcel(PRODUCTS_EXCEL_PATH);
    const purchasesReadResult = purchasesImportService.readPurchasesCurveRows(PURCHASES_CURVE_EXCEL_PATH);

    const unifiedProducts = [];
    const unifiedProductsByKey = new Map();
    let fallbackIndex = 0;

    function addOrUpdateUnifiedProduct(product, purchaseProduct = null) {
        const key = buildUnionKey(product.branch, product.ean);
        const mapKey = key || `sem-chave|${fallbackIndex++}`;
        let existing = unifiedProductsByKey.get(mapKey);

        if (!existing) {
            existing = {
                ...createEmptyMappedRow(),
                ...product
            };
            unifiedProductsByKey.set(mapKey, existing);
            unifiedProducts.push(existing);
        }

        if (purchaseProduct) {
            if (!existing.code && purchaseProduct.product_code) {
                existing.code = purchaseProduct.product_code;
            }

            if (!existing.commercial_name && purchaseProduct.description) {
                existing.commercial_name = purchaseProduct.description;
            }

            if (existing.controls_lot === null || existing.controls_lot === undefined) {
                existing.controls_lot = 0;
            }

            if (existing.active === null || existing.active === undefined) {
                existing.active = 1;
            }
        }

        return existing;
    }

    for (const product of productsResult.products) {
        addOrUpdateUnifiedProduct(product);
    }

    for (const purchaseProduct of purchasesReadResult.products) {
        const branch = purchaseProduct.company;
        const ean = purchaseProduct.barcode;

        if (!branch || !ean) {
            continue;
        }

        addOrUpdateUnifiedProduct({
            branch,
            ean,
            code: purchaseProduct.product_code || null,
            commercial_name: purchaseProduct.description || null,
            controls_lot: 0,
            active: 1
        }, purchaseProduct);
    }

    const productKeys = new Set();
    const purchaseKeys = new Set();

    for (const product of productsResult.products) {
        const key = buildUnionKey(product.branch, product.ean);

        if (key) {
            productKeys.add(key);
        }
    }

    for (const product of purchasesReadResult.products) {
        const key = buildUnionKey(product.company, product.barcode);

        if (key) {
            purchaseKeys.add(key);
        }
    }

    const unionKeys = new Set([...productKeys, ...purchaseKeys]);

    console.log("[UNIAO] produtos validos PRODUTOS.xlsx:", productsResult.products.length);
    console.log("[UNIAO] chaves PRODUTOS.xlsx:", productKeys.size);
    console.log("[UNIAO] amostra PRODUTOS.xlsx:", Array.from(productKeys).slice(0, 10));
    console.log("[UNIAO] produtos validos CURVA COMPRAS.xlsx:", purchasesReadResult.products.length);
    console.log("[UNIAO] chaves CURVA COMPRAS.xlsx:", purchaseKeys.size);
    console.log("[UNIAO] amostra CURVA COMPRAS.xlsx:", Array.from(purchaseKeys).slice(0, 10));
    console.log("[UNIAO] total final da uniao:", unionKeys.size);
    console.log("[UNIAO] amostra final da uniao:", Array.from(unionKeys).slice(0, 10));

    const syncResult = await repository.syncProducts(unifiedProducts, {
        fileName: productsResult.fileName,
        filePath: PRODUCTS_EXCEL_PATH
    });

    const purchasesResult = await purchasesImportService.synchronizePurchasesCurveExcel(
        PURCHASES_CURVE_EXCEL_PATH
    );

    const quarantineResult = await repository.syncQuarantineFromKeys(Array.from(unionKeys));

    return {
        success: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        products: {
            fileName: productsResult.fileName,
            totalRows: productsResult.totalRows,
            validRows: productsResult.validRows,
            insertedRows: syncResult.inserted,
            updatedRows: syncResult.updated,
            unchangedRows: syncResult.unchanged,
            duplicateRows: syncResult.duplicateRows,
            ignoredRows: productsResult.ignoredRows
        },
        purchases: {
            fileName: purchasesResult.fileName,
            totalRows: purchasesResult.totalRows,
            validRows: purchasesResult.validRows,
            insertedRows: purchasesResult.insertedRows,
            updatedRows: purchasesResult.updatedRows,
            unchangedRows: purchasesResult.unchangedRows,
            linkedByCode: purchasesResult.linkedByCode,
            linkedByEan: purchasesResult.linkedByEan,
            notLinked: purchasesResult.notLinked,
            invalidRows: purchasesResult.invalidRows
        },
        quarantine: quarantineResult
    };
}

module.exports = {
    readExcelProducts,
    synchronizeProductsExcel,
    synchronizeDatabaseExcel
};