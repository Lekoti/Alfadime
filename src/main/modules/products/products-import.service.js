const path = require("node:path");
const XLSX = require("xlsx");

const repository = require(
    "./products.repository"
);

const correctionsService = require(
    "./products-corrections.service"
);

const {
    PRODUCT_CATALOG_FIELDS,
    PRODUCT_CATALOG_IMPORT_COLUMNS,
    PRODUCT_CATALOG_REQUIRED_HEADERS
} = require("./products.constants");

const {
    normalizeProductCatalogRow,
    validateProductCatalogRow
} = require("./products-import.mapper");

function normalizeHeader(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ");
}

function createEmptyMappedRow() {
    return PRODUCT_CATALOG_FIELDS.reduce(
        (result, field) => {
            result[field] = null;

            return result;
        },
        {}
    );
}

function mapExcelRow(excelRow = {}) {
    const mapped = createEmptyMappedRow();

    for (const [
        excelColumn,
        field
    ] of Object.entries(
        PRODUCT_CATALOG_IMPORT_COLUMNS
    )) {
        mapped[field] = excelRow[excelColumn];
    }

    return mapped;
}

function validateHeaders(headers = []) {
    const normalizedHeaders = headers.map(
        normalizeHeader
    );

    const missingHeaders =
        PRODUCT_CATALOG_REQUIRED_HEADERS.filter(
            (requiredHeader) =>
                !normalizedHeaders.includes(
                    requiredHeader
                )
        );

    if (missingHeaders.length > 0) {
        throw new Error(
            "Colunas obrigatorias nao encontradas: " +
            missingHeaders.join(", ")
        );
    }

    const recognizedHeaders = normalizedHeaders.filter(
        (header) =>
            Object.prototype.hasOwnProperty.call(
                PRODUCT_CATALOG_IMPORT_COLUMNS,
                header
            )
    );

    if (recognizedHeaders.length === 0) {
        throw new Error(
            "Nenhuma coluna reconhecida foi encontrada no Excel."
        );
    }

    return {
        normalizedHeaders,
        recognizedHeaders,
        ignoredHeaders: normalizedHeaders.filter(
            (header) =>
                !Object.prototype.hasOwnProperty.call(
                    PRODUCT_CATALOG_IMPORT_COLUMNS,
                    header
                )
        )
    };
}

function readExcelProducts(filePath) {
    const workbook = XLSX.readFile(filePath, {
        cellDates: false,
        raw: false
    });

    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
        throw new Error(
            "Nenhuma planilha encontrada no arquivo."
        );
    }

    const worksheet = workbook.Sheets[firstSheetName];

    const matrix = XLSX.utils.sheet_to_json(
        worksheet,
        {
            header: 1,
            defval: null,
            raw: false
        }
    );

    if (!matrix.length) {
        throw new Error(
            "A planilha esta vazia."
        );
    }

    const rawHeaders = matrix[0].map(
        normalizeHeader
    );

    const headerResult = validateHeaders(rawHeaders);

    const rows = XLSX.utils.sheet_to_json(
        worksheet,
        {
            defval: null,
            raw: false
        }
    );

    return {
        sheetName: firstSheetName,
        rows,
        headers: headerResult.normalizedHeaders,
        recognizedHeaders:
            headerResult.recognizedHeaders,
        ignoredHeaders:
            headerResult.ignoredHeaders
    };
}

function synchronizeProductsExcel(filePath) {
    console.log('=== INICIANDO IMPORTACAO PRODUTOS ===');
    console.log('Caminho:', filePath);
    console.log('Arquivo existe:', require('fs').existsSync(filePath));
    
    const fileName = path.basename(filePath);
    const startedAt = new Date().toISOString();

    let importHistory;

    try {
        const readResult = readExcelProducts(filePath);

        console.log('Planilha lida:', readResult.sheetName);
        console.log('Total de linhas:', readResult.rows.length);
        console.log('Colunas reconhecidas:', readResult.recognizedHeaders);

        const validProducts = [];
        const errors = [];

        for (
            let index = 0;
            index < readResult.rows.length;
            index++
        ) {
            const excelRow = readResult.rows[index];

            const mappedRow = mapExcelRow(excelRow);

            const product = normalizeProductCatalogRow(
                mappedRow
            );

            const validationErrors =
                validateProductCatalogRow(product);

            if (validationErrors.length > 0) {
                errors.push({
                    row: index + 2,
                    errors: validationErrors
                });

                continue;
            }

            validProducts.push(product);
        }

        console.log('Produtos validos:', validProducts.length);
        console.log('Erros de validacao:', errors.length);

        if (validProducts.length === 0) {
            throw new Error(
                "Nenhum produto valido foi encontrado no Excel."
            );
        }

        importHistory =
            repository.createImportHistory({
                source_file_name: fileName,
                source_file_path: filePath,
                total_rows: readResult.rows.length,
                valid_rows: validProducts.length,
                ignored_rows: errors.length,
                status: "processing"
            });

        const result = repository.syncProducts(
            validProducts,
            {
                fileName,
                filePath
            }
        );

        console.log('Resultado sync:', result);

        const correctionResult =
            correctionsService.confirmCorrectionsFromExcel();

        repository.finishImportHistory(
            importHistory.id,
            {
                inserted_rows: result.inserted,
                updated_rows: result.updated,
                deactivated_rows: result.deactivated,
                ignored_rows: errors.length,
                status: "completed"
            }
        );

        return {
            success: true,
            importId: importHistory.id,
            fileName,
            sheetName: readResult.sheetName,

            totalRows: readResult.rows.length,
            validRows: validProducts.length,
            ignoredRows: errors.length,

            insertedRows: result.inserted,
            updatedRows: result.updated,
            deactivatedRows: result.deactivated,

            confirmedCorrections:
                correctionResult.confirmed,

            recognizedHeaders:
                readResult.recognizedHeaders,

            ignoredHeaders:
                readResult.ignoredHeaders,

            errors,

            startedAt,
            finishedAt: new Date().toISOString()
        };
    } catch (error) {
        console.log('ERRO na importacao:', error.message);
        
        if (importHistory) {
            repository.finishImportHistory(
                importHistory.id,
                {
                    status: "error",
                    error_message: error.message
                }
            );
        }

        throw error;
    }
}

module.exports = {
    readExcelProducts,
    synchronizeProductsExcel
};