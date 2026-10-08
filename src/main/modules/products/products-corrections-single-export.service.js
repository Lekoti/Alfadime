const fs = require("node:fs");
const path = require("node:path");

const {
    app,
    dialog
} = require("electron");

const {
    getDatabase
} = require("../../database/connection");

const {
    toSafeNumber
} = require("../../utils/validation.utils");


const BRANCH_EXPORTS = {
    "DIMEBRAS PR": {
        fileName: "PRODUTOS_0001.csv",
        sheetName: "PRODUTOS_0001"
    },
    "ALFAMED MS": {
        fileName: "PRODUTOS_0002.csv",
        sheetName: "PRODUTOS_0002"
    },
    "DIMEBRAS MT": {
        fileName: "PRODUTOS_0003.csv",
        sheetName: "PRODUTOS_0003"
    },
    "DIMEBRAS MS": {
        fileName: "PRODUTOS_0005.csv",
        sheetName: "PRODUTOS_0005"
    },
    "DIMEBRAS SC": {
        fileName: "PRODUTOS_0006.csv",
        sheetName: "PRODUTOS_0006"
    }
};


const EXPORT_COLUMNS = [
    {
        header: "EAN",
        field: "ean"
    },
    {
        header: "Codigo SAP",
        field: "sap_code"
    },
    {
        header: "Grupo",
        field: "group_code"
    },
    {
        header: "Principio Ativo",
        field: "active_ingredient"
    },
    {
        header: "Nome Comercial",
        field: "commercial_name"
    },
    {
        header: "Codigo Fabricante",
        field: "manufacturer_code"
    },
    {
        header: "Marca",
        field: "brand"
    },
    {
        header: "Unidade",
        field: "unit"
    },
    {
        header: "Caixa Padrao",
        field: "standard_box"
    },
    {
        header: "Controla Lote",
        field: "controls_lot"
    },
    {
        header: "Registro MS",
        field: "ms_registration"
    },
    {
        header: "Codigo Referencia",
        field: "reference_code"
    },
    {
        header: "Codigo Classe Terapeutica",
        field: "therapeutic_class_code"
    },
    {
        header: "Altura",
        field: "height"
    },
    {
        header: "Largura",
        field: "width"
    },
    {
        header: "Comprimento",
        field: "length"
    },
    {
        header: "Categoria",
        field: "category_code"
    }
];


function normalizeString(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value).trim();
}


function normalizeDigits(value) {
    return normalizeString(value)
        .replace(/\D/g, "");
}


function normalizeEan(value) {
    const text = normalizeString(value);


    if (!text) {
        return "";
    }


    if (
        /^[0-9]+([,.][0-9]+)?e[+-]?[0-9]+$/i.test(
            text
        )
    ) {
        const number = Number(
            text.replace(",", ".")
        );


        if (Number.isFinite(number)) {
            return Math.trunc(number).toString();
        }
    }


    return normalizeDigits(text);
}


function formatGroupOrCategory(value) {
    const text = normalizeString(value);


    if (!text) {
        return "";
    }


    if (/^\d$/.test(text)) {
        return text.padStart(2, "0");
    }


    return text;
}


function formatNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }


    const number = Number(value);


    return Number.isFinite(number)
        ? String(number)
        : "";
}


function formatControlsLot(value) {
    return toSafeNumber(value, 0) === 1
        ? "S"
        : "N";
}


function escapeCsvValue(value) {
    const text = String(value ?? "");

    if (
        text.includes(";") ||
        text.includes('"') ||
        text.includes("\n") ||
        text.includes("\r")
    ) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}


function buildCsvContent(rows) {
    const headerLine = EXPORT_COLUMNS
        .map((column) =>
            escapeCsvValue(column.header)
        )
        .join(";");


    const dataLines = rows.map((row) =>
        EXPORT_COLUMNS
            .map((column) =>
                escapeCsvValue(
                    row[column.field]
                )
            )
            .join(";")
    );


    return "\ufeff" + [
        headerLine,
        ...dataLines
    ].join("\r\n");
}


function getSentCorrectionsForBranch(branch) {
    const database = getDatabase();


    return database
        .prepare(`
            SELECT
                correction.id AS correction_id,
                correction.product_id,
                correction.branch,
                correction.code,
                correction.field_name,
                correction.new_value,
                correction.updated_at,

                product.id AS catalog_product_id,
                product.branch AS product_branch,
                product.code AS product_code,
                product.ean,
                product.sap_code,
                product.group_code,
                product.active_ingredient,
                product.commercial_name,
                product.manufacturer_code,
                product.brand,
                product.unit,
                product.standard_box,
                product.controls_lot,
                product.ms_registration,
                product.reference_code,
                product.therapeutic_class_code,
                product.height,
                product.width,
                product.length,
                product.category_code
            FROM product_corrections AS correction
            INNER JOIN product_catalog AS product
                ON product.id = correction.product_id
            WHERE correction.status = 'sent_internal'
              AND correction.branch = ?
            ORDER BY
                correction.product_id ASC,
                correction.updated_at ASC,
                correction.id ASC
        `)
        .all(branch);
}


function groupCorrectionsByProduct(corrections) {
    const groups = new Map();


    for (const correction of corrections) {
        const productId = normalizeString(
            correction.product_id
        );


        if (!productId) {
            continue;
        }


        if (!groups.has(productId)) {
            groups.set(productId, {
                product: {
                    id: correction.catalog_product_id,
                    branch: correction.product_branch,
                    code: correction.product_code,
                    ean: correction.ean,
                    sap_code: correction.sap_code,
                    group_code: correction.group_code,
                    active_ingredient:
                        correction.active_ingredient,
                    commercial_name:
                        correction.commercial_name,
                    manufacturer_code:
                        correction.manufacturer_code,
                    brand: correction.brand,
                    unit: correction.unit,
                    standard_box:
                        correction.standard_box,
                    controls_lot:
                        correction.controls_lot,
                    ms_registration:
                        correction.ms_registration,
                    reference_code:
                        correction.reference_code,
                    therapeutic_class_code:
                        correction.therapeutic_class_code,
                    height: correction.height,
                    width: correction.width,
                    length: correction.length,
                    category_code:
                        correction.category_code
                },
                corrections: []
            });
        }


        groups
            .get(productId)
            .corrections
            .push(correction);
    }


    return Array.from(groups.values());
}


function applyCorrectionsToProduct(
    product,
    corrections
) {
    const correctedProduct = {
        ...product
    };


    for (const correction of corrections) {
        const fieldName = normalizeString(
            correction.field_name
        );


        if (!fieldName) {
            continue;
        }


        correctedProduct[fieldName] =
            correction.new_value;
    }


    return correctedProduct;
}


function mapProductToCsvRow(product) {
    return {
        ean: normalizeEan(product.ean),
        sap_code: normalizeDigits(product.sap_code),
        group_code: formatGroupOrCategory(
            product.group_code
        ),
        active_ingredient: normalizeString(
            product.active_ingredient
        ),
        commercial_name: normalizeString(
            product.commercial_name
        ),
        manufacturer_code: normalizeString(
            product.manufacturer_code
        ),
        brand: normalizeString(product.brand),
        unit: normalizeString(product.unit),
        standard_box: formatNumber(
            product.standard_box
        ),
        controls_lot: formatControlsLot(
            product.controls_lot
        ),
        ms_registration: normalizeString(
            product.ms_registration
        ),
        reference_code: normalizeString(
            product.reference_code
        ),
        therapeutic_class_code: normalizeString(
            product.therapeutic_class_code
        ),
        height: formatNumber(product.height),
        width: formatNumber(product.width),
        length: formatNumber(product.length),
        category_code: formatGroupOrCategory(
            product.category_code
        )
    };
}


function buildExportRows(branch) {
    const corrections =
        getSentCorrectionsForBranch(branch);


    const groupedProducts =
        groupCorrectionsByProduct(corrections);


    return groupedProducts
        .map((group) =>
            applyCorrectionsToProduct(
                group.product,
                group.corrections
            )
        )
        .map(mapProductToCsvRow)
        .sort((left, right) =>
            String(left.ean || "").localeCompare(
                String(right.ean || ""),
                "pt-BR",
                {
                    numeric: true
                }
            )
        );
}


function getAvailableBranchesForExport() {
    const database = getDatabase();


    const branches = database
        .prepare(`
            SELECT DISTINCT branch
            FROM product_corrections
            WHERE status = 'sent_internal'
              AND branch IS NOT NULL
              AND TRIM(branch) <> ''
            ORDER BY branch ASC
        `)
        .all()
        .map((row) => normalizeString(row.branch))
        .filter(Boolean);


    return Object.keys(BRANCH_EXPORTS)
        .filter((branch) =>
            branches.includes(branch)
        );
}


async function chooseDestinationDirectory() {
    const result = await dialog.showOpenDialog({
        title: "Selecione a pasta para salvar os CSVs",
        defaultPath: app.getPath("documents"),
        properties: [
            "openDirectory",
            "createDirectory"
        ]
    });


    if (
        result.canceled ||
        !Array.isArray(result.filePaths) ||
        !result.filePaths[0]
    ) {
        return null;
    }


    return result.filePaths[0];
}


function writeCsvFile(
    destinationDirectory,
    fileName,
    rows
) {
    const filePath = path.join(
        destinationDirectory,
        fileName
    );


    const csvContent = buildCsvContent(rows);

    fs.writeFileSync(
        filePath,
        csvContent,
        "utf8"
    );


    if (!fs.existsSync(filePath)) {
        throw new Error(
            `Não foi possível criar o arquivo ${fileName}.`
        );
    }


    return filePath;
}


async function exportCorrectionsCsv(branch) {
    const normalizedBranch = normalizeString(branch);


    if (
        !normalizedBranch ||
        !BRANCH_EXPORTS[normalizedBranch]
    ) {
        throw new Error(
            "Selecione uma filial válida para exportar."
        );
    }


    const destinationDirectory =
        await chooseDestinationDirectory();


    if (!destinationDirectory) {
        return {
            cancelled: true
        };
    }


    const rows = buildExportRows(
        normalizedBranch
    );


    if (!rows.length) {
        throw new Error(
            "Não existem correções Feito / Atualizado para a filial selecionada."
        );
    }


    const config = BRANCH_EXPORTS[
        normalizedBranch
    ];


    const filePath = writeCsvFile(
        destinationDirectory,
        config.fileName,
        rows
    );


    return {
        cancelled: false,
        destinationDirectory,
        files: [
            {
                branch: normalizedBranch,
                fileName: config.fileName,
                filePath,
                totalProducts: rows.length
            }
        ],
        totalProducts: rows.length
    };
}


async function exportAllCorrectionsCsv() {
    const destinationDirectory =
        await chooseDestinationDirectory();


    if (!destinationDirectory) {
        return {
            cancelled: true
        };
    }


    const files = [];
    let totalProducts = 0;


    for (
        const branch of Object.keys(
            BRANCH_EXPORTS
        )
    ) {
        const rows = buildExportRows(branch);


        if (!rows.length) {
            continue;
        }


        const config = BRANCH_EXPORTS[branch];


        const filePath = writeCsvFile(
            destinationDirectory,
            config.fileName,
            rows
        );


        files.push({
            branch,
            fileName: config.fileName,
            filePath,
            totalProducts: rows.length
        });


        totalProducts += rows.length;
    }


    if (!files.length) {
        throw new Error(
            "Não existem correções Feito / Atualizado para exportar."
        );
    }


    return {
        cancelled: false,
        destinationDirectory,
        files,
        totalProducts
    };
}


module.exports = {
    BRANCH_EXPORTS,
    EXPORT_COLUMNS,
    getAvailableBranchesForExport,
    exportCorrectionsCsv,
    exportAllCorrectionsCsv
};