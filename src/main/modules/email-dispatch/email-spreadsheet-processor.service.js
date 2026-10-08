const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");
const {
    BRANCH_TO_COMPANY,
    PRICE_DESTINATION
} = require("../../config/email.config");

const PRICE_OUTPUT_COLUMNS = Object.freeze([
    "Codigo de barra",
    "PF",
    "Desconto",
    "Preco Sem Repasse",
    "Repasse",
    "Preco Final",
    "empresa",
    "Cod Global Lab",
    "Qtd Minima Promo",
    "Preco Qnt Minima",
    "Observação do Item",
    "Data validade"
]);

const MONTHS = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO"
];

const HEADER_ALIASES = Object.freeze({
    ean: [
        "CODIGO DE BARRAS (EAN 13)",
        "CODIGO DE BARRAS",
        "CODIGO BARRAS",
        "EAN 13",
        "EAN",
        "CODIGO"
    ],
    price: [
        "PRECO (COMPRA DIMEBRAS E ALFAMED)",
        "PRECO COMPRA DIMEBRAS E ALFAMED",
        "PRECO",
        "PREÇO",
        "VALOR",
        "VALOR DE COMPRA",
        "PRECO DE COMPRA"
    ],
    pendingQuantity: [
        "QUANTIDADE PENDENTE PRA FATURAR",
        "QUANTIDADE PENDENTE PARA FATURAR",
        "QUANTIDADE PENDENTE",
        "QTD PENDENTE",
        "QUANTIDADE",
        "QTD"
    ],
    branch: [
        "FILIAL (DPR, DMT, DSC, DMS, AMS)",
        "FILIAL",
        "EMPRESA",
        "UNIDADE"
    ],
    industry: [
        "NOME LABORATORIO",
        "NOME DO LABORATORIO",
        "LABORATORIO",
        "INDUSTRIA",
        "FORNECEDOR",
        "LAB"
    ],
    validity: [
        "DATA DE VALIDADE DOS PRECOS",
        "DATA DE VALIDADE",
        "VALIDADE",
        "VIGENCIA"
    ],
    supplierGlobalId: [
        "ID FORNECEDOR GLOBAL",
        "ID GLOBAL",
        "COD GLOBAL LAB",
        "CODIGO GLOBAL LABORATORIO"
    ]
});

function normalizeText(value) {
    return String(value ?? "")
        .replace(/\u00A0/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

function normalizeHeader(value) {
    return normalizeText(value)
        .replace(/[():]/g, " ")
        .replace(/[^A-Z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanFilePart(value, fallback = "DESCONHECIDO") {
    const result = normalizeText(value)
        .replace(/[<>:"/\\|?*]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return result || fallback;
}

function parseNumber(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    const original = String(value)
        .replace(/\u00A0/g, " ")
        .trim();

    if (!original) {
        return null;
    }

    const text = original
        .replace(/\s/g, "")
        .replace(/^R\$/i, "")
        .replace(/^\$\s*/i, "");

    const normalized = text
        .replace(/\.(?=\d{3}(?:[,.]|$))/g, "")
        .replace(",", ".");

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
}

function formatCsvValue(value) {
    if (value === null || value === undefined) {
        return "";
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toLocaleDateString("pt-BR");
    }

    const text = String(value)
        .replace(/\r?\n/g, " ")
        .trim();

    if (
        text.includes(";") ||
        text.includes('"') ||
        text.includes(",")
    ) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}

function formatExcelText(value) {
    const digits = String(value ?? "")
        .replace(/\D/g, "");

    if (!digits) {
        return "";
    }

    return `="${digits}"`;
}

function csvLine(values) {
    return values.map(formatCsvValue).join(";");
}
function getCellText(cell) {
    if (cell === null || cell === undefined) {
        return "";
    }

    if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
        return cell.toLocaleDateString("pt-BR");
    }

    return String(cell)
        .replace(/\u00A0/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim();
}

function rowContainsKnownHeader(row) {
    const headers = row
        .map(normalizeHeader)
        .filter(Boolean);

    const hasEan = HEADER_ALIASES.ean.some((alias) => {
        return headers.includes(normalizeHeader(alias));
    });

    const hasBranch = HEADER_ALIASES.branch.some((alias) => {
        return headers.includes(normalizeHeader(alias));
    });

    const hasPrice = HEADER_ALIASES.price.some((alias) => {
        return headers.includes(normalizeHeader(alias));
    });

    const hasPending = HEADER_ALIASES.pendingQuantity.some((alias) => {
        return headers.includes(normalizeHeader(alias));
    });

    return hasEan && hasBranch && (hasPrice || hasPending);
}

function findHeaderRow(matrix) {
    const limit = Math.min(matrix.length, 25);

    for (let index = 0; index < limit; index += 1) {
        const row = Array.isArray(matrix[index])
            ? matrix[index]
            : [];

        if (rowContainsKnownHeader(row)) {
            return index;
        }
    }

    return -1;
}

function makeUniqueHeaders(headerRow) {
    const used = new Map();

    return headerRow.map((value, index) => {
        const base = getCellText(value) || `COLUNA_${index + 1}`;
        const count = used.get(base) || 0;

        used.set(base, count + 1);

        return count ? `${base} ${count + 1}` : base;
    });
}

function readWorkbook(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath, {
        cellDates: true,
        cellNF: false,
        cellText: true,
        raw: false
    });

    if (!workbook.SheetNames.length) {
        throw new Error("A planilha não possui abas.");
    }

    const rows = [];
    const ignoredSheets = [];

    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];

        const matrix = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
            raw: false,
            blankrows: false
        });

        if (!matrix.length) {
            ignoredSheets.push(`${sheetName}: aba vazia`);
            continue;
        }

        const headerIndex = findHeaderRow(matrix);

        if (headerIndex < 0) {
            ignoredSheets.push(
                `${sheetName}: cabeçalho não identificado`
            );
            continue;
        }

        const headers = makeUniqueHeaders(matrix[headerIndex]);

        for (
            let rowIndex = headerIndex + 1;
            rowIndex < matrix.length;
            rowIndex += 1
        ) {
            const sourceRow = Array.isArray(matrix[rowIndex])
                ? matrix[rowIndex]
                : [];

            const row = {
                __sheetName: sheetName,
                __rowNumber: rowIndex + 1
            };

            let hasValue = false;

            headers.forEach((header, columnIndex) => {
                const value = sourceRow[columnIndex] ?? "";

                row[header] = value;

                if (getCellText(value) !== "") {
                    hasValue = true;
                }
            });

            if (hasValue) {
                rows.push(row);
            }
        }
    }

    if (!rows.length) {
        const details = ignoredSheets.length
            ? ` Detalhes: ${ignoredSheets.join("; ")}.`
            : "";

        throw new Error(
            "Nenhuma linha foi encontrada após o cabeçalho da planilha." +
            details
        );
    }

    return rows;
}

function buildHeaderIndex(row) {
    const index = new Map();

    for (const key of Object.keys(row)) {
        if (!key.startsWith("__")) {
            index.set(normalizeHeader(key), key);
        }
    }

    return index;
}

function getValue(row, aliases) {
    const index = buildHeaderIndex(row);

    for (const alias of aliases) {
        const key = index.get(normalizeHeader(alias));

        if (key !== undefined) {
            return row[key];
        }
    }

    return "";
}

function expandScientificNotation(value) {
    let text = String(value ?? "")
        .replace(/\u00A0/g, " ")
        .trim()
        .replace(/\s/g, "")
        .replace(",", ".");

    if (!text) {
        return "";
    }

    const match = text.match(
        /^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/
    );

    if (!match) {
        return text;
    }

    const sign = match[1] || "";
    const integerPart = match[2] || "";
    const decimalPart = match[3] || "";
    const exponent = Number(match[4]);

    if (!Number.isInteger(exponent)) {
        return text;
    }

    const digits = integerPart + decimalPart;
    const decimalPosition = integerPart.length + exponent;

    if (decimalPosition <= 0) {
        return (
            sign +
            "0." +
            "0".repeat(Math.abs(decimalPosition)) +
            digits
        );
    }

    if (decimalPosition >= digits.length) {
        return sign + digits +
            "0".repeat(decimalPosition - digits.length);
    }

    return sign +
        digits.slice(0, decimalPosition) +
        "." +
        digits.slice(decimalPosition);
}

function normalizeEan(value) {
    if (value === null || value === undefined) {
        return "";
    }

    let text = String(value)
        .replace(/\u00A0/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim();

    if (!text) {
        return "";
    }

    text = expandScientificNotation(text);

    text = text.replace(",", ".");

    if (/^\d+\.\d+$/.test(text)) {
        const parts = text.split(".");
        const decimalPart = parts[1] || "";

        if (/^0+$/.test(decimalPart)) {
            text = parts[0];
        }
    }

    const digits = text.replace(/\D/g, "");

    if (!digits) {
        return "";
    }

    return digits;
}
function getEan(row) {
    return normalizeEan(getValue(row, HEADER_ALIASES.ean));
}

function getIndustry(row, fallback) {
    return cleanFilePart(
        getValue(row, HEADER_ALIASES.industry) || fallback
    );
}

function normalizeBranch(value) {
    const text = normalizeText(value);

    if (!text) {
        return null;
    }

    if (
        text === "DPR" ||
        text === "PR" ||
        text === "001" ||
        text.includes("DIMEBRAS PR")
    ) {
        return "DPR";
    }

    if (
        text === "AMS" ||
        text === "002" ||
        text === "MS ALFAMED" ||
        text.includes("ALFAMED MS")
    ) {
        return "AMS";
    }

    if (
        text === "DMT" ||
        text === "MT" ||
        text === "003" ||
        text.includes("DIMEBRAS MT")
    ) {
        return "DMT";
    }

    if (
        text === "DMS" ||
        text === "MS" ||
        text === "005" ||
        text.includes("DIMEBRAS MS")
    ) {
        return "DMS";
    }

    if (
        text === "DSC" ||
        text === "SC" ||
        text === "006" ||
        text.includes("DIMEBRAS SC")
    ) {
        return "DSC";
    }

    return null;
}

function getBranch(row) {
    return normalizeBranch(
        getValue(row, HEADER_ALIASES.branch)
    );
}

function getPrice(row) {
    return parseNumber(
        getValue(row, HEADER_ALIASES.price)
    );
}

function getPendingQuantity(row) {
    return parseNumber(
        getValue(row, HEADER_ALIASES.pendingQuantity)
    );
}

function formatValidityDate(value) {
    if (value === null || value === undefined || value === "") {
        return "";
    }

    if (
        value instanceof Date &&
        !Number.isNaN(value.getTime())
    ) {
        return [
            String(value.getDate()).padStart(2, "0"),
            String(value.getMonth() + 1).padStart(2, "0"),
            String(value.getFullYear()).padStart(4, "0")
        ].join("/");
    }

    const text = String(value)
        .replace(/\u00A0/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim();

    if (!text) {
        return "";
    }

    const parts = text.match(
        /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/
    );

    if (parts) {
        let first = Number(parts[1]);
        let second = Number(parts[2]);
        let year = String(parts[3]);

        if (year.length === 2) {
            year = `20${year}`;
        }

        if (first > 12 && second <= 12) {
            return [
                String(first).padStart(2, "0"),
                String(second).padStart(2, "0"),
                year
            ].join("/");
        }

        if (second > 12 && first <= 12) {
            return [
                String(second).padStart(2, "0"),
                String(first).padStart(2, "0"),
                year
            ].join("/");
        }

        return [
            String(first).padStart(2, "0"),
            String(second).padStart(2, "0"),
            year
        ].join("/");
    }

    const isoMatch = text.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})/
    );

    if (isoMatch) {
        return [
            String(isoMatch[3]).padStart(2, "0"),
            String(isoMatch[2]).padStart(2, "0"),
            isoMatch[1]
        ].join("/");
    }

    return text;
}
function getValidity(row) {
    return formatValidityDate(
        getValue(row, HEADER_ALIASES.validity)
    );
}

function getSupplierGlobalId(row, supplierResolver) {
    const directValue = getValue(
        row,
        HEADER_ALIASES.supplierGlobalId
    );

    if (directValue !== "") {
        return directValue;
    }

    if (typeof supplierResolver === "function") {
        const value = supplierResolver(getIndustry(row, ""));

        if (value !== null && value !== undefined && value !== "") {
            return value;
        }
    }

    return "0";
}

function getProcessingMonth(date) {
    return MONTHS[date.getMonth()];
}

function getProcessingYear(date) {
    return String(date.getFullYear());
}

function uniqueSorted(values) {
    const branchOrder = [
        "DPR",
        "AMS",
        "DMT",
        "DMS",
        "DSC"
    ];

    const unique = [...new Set(values.filter(Boolean))];

    return unique.sort((first, second) => {
        const firstIndex = branchOrder.indexOf(first);
        const secondIndex = branchOrder.indexOf(second);

        if (firstIndex >= 0 && secondIndex >= 0) {
            return firstIndex - secondIndex;
        }

        if (firstIndex >= 0) {
            return -1;
        }

        if (secondIndex >= 0) {
            return 1;
        }

        return String(first).localeCompare(String(second));
    });
}

function groupRows(rows, keyBuilder) {
    const groups = new Map();

    for (const row of rows) {
        const key = keyBuilder(row);

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key).push(row);
    }

    return groups;
}

function getInvalidReason(row, type) {
    if (!getEan(row)) {
        return "EAN ausente ou inválido";
    }

    if (!getBranch(row)) {
        return "filial ausente ou não reconhecida";
    }

    if (type === "precos" && getPrice(row) === null) {
        return "preço ausente ou inválido";
    }

    if (
        type === "pendencias" &&
        getPendingQuantity(row) === null
    ) {
        return "quantidade pendente ausente ou inválida";
    }

    return null;
}

function buildDiagnostics(rows, type) {
    const invalid = [];

    for (const row of rows) {
        const reason = getInvalidReason(row, type);

        if (reason) {
            invalid.push({
                sheet: row.__sheetName || "Aba",
                row: row.__rowNumber || "?",
                reason
            });
        }
    }

    const counts = invalid.reduce((result, item) => {
        result[item.reason] = (result[item.reason] || 0) + 1;
        return result;
    }, {});

    return {
        totalRows: rows.length,
        validRows: rows.length - invalid.length,
        invalidRows: invalid.length,
        reasons: counts,
        examples: invalid.slice(0, 5)
    };
}

function deduplicatePrices(rows) {
    const values = new Map();

    for (const row of rows) {
        const ean = getEan(row);
        const industry = getIndustry(row, "DESCONHECIDO");
        const branch = getBranch(row);
        const price = getPrice(row);

        if (!ean || !branch || price === null) {
            continue;
        }

        const key = `${ean}|${industry}|${branch}`;
        const current = values.get(key);

        if (!current || price < getPrice(current)) {
            values.set(key, row);
        }
    }

    return [...values.values()];
}

function formatBrazilianNumber(value) {
    const number = parseNumber(value);

    if (number === null) {
        return "";
    }

    return number.toFixed(2).replace(".", ",");
}

function formatExcelDateText(value) {
    const formatted = formatValidityDate(value);

    if (!formatted) {
        return "";
    }

    return `="${formatted}"`;
}
function createPriceRows(rows, supplierResolver) {
    return rows.map((row) => {
        const branch = getBranch(row);

        return [
            formatExcelText(getEan(row)),
            formatBrazilianNumber(getPrice(row)),
            getValue(row, ["DESCONTO"]),
            getValue(row, [
                "PRECO SEM REPASSE",
                "PREÇO SEM REPASSE"
            ]),
            getValue(row, ["REPASSE"]),
            getValue(row, [
                "PRECO FINAL",
                "PREÇO FINAL"
            ]),
            branch ? BRANCH_TO_COMPANY[branch] : "",
            getSupplierGlobalId(row, supplierResolver),
            getValue(row, [
                "QTD MINIMA PROMO",
                "QUANTIDADE MINIMA PROMO"
            ]),
            getValue(row, [
                "PRECO QTD MINIMA",
                "PREÇO QTD MINIMA"
            ]),
            getValue(row, [
                "OBSERVACAO DO ITEM",
                "OBSERVAÇÃO DO ITEM"
            ]),
            formatExcelDateText(
                getValue(row, HEADER_ALIASES.validity)
            )
        ];
    });
}

function createPendingRows(rows, supplierResolver) {
    return rows
        .map((row) => [
            getEan(row),
            getPendingQuantity(row),
            "",
            getSupplierGlobalId(row, supplierResolver)
        ])
        .filter((row) => row[0] && row[1] !== null);
}

function writeCsv(filePath, header, rows) {
    fs.mkdirSync(path.dirname(filePath), {
        recursive: true
    });

    const extension = path.extname(filePath).toLowerCase();

    if (extension === ".xlsx") {
        const worksheetRows = [
            header,
            ...rows
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(
            worksheetRows
        );

        const headerRange = XLSX.utils.decode_range(
            worksheet["!ref"] || "A1:A1"
        );

        for (
            let column = headerRange.s.c;
            column <= headerRange.e.c;
            column += 1
        ) {
            const cellAddress = XLSX.utils.encode_cell({
                r: 0,
                c: column
            });

            if (worksheet[cellAddress]) {
                worksheet[cellAddress].s = {
                    font: {
                        bold: true
                    }
                };
            }
        }

        for (let row = 1; row < worksheetRows.length; row += 1) {
            const eanAddress = XLSX.utils.encode_cell({
                r: row,
                c: 0
            });

            if (worksheet[eanAddress]) {
                const ean = String(
                    worksheet[eanAddress].v ?? ""
                )
                    .replace(/^="/, "")
                    .replace(/"$/, "")
                    .replace(/\D/g, "");

                if (ean) {
                    worksheet[eanAddress].t = "n";
                    worksheet[eanAddress].v = Number(ean);
                    worksheet[eanAddress].z = "0";
                }
            }

            const pfAddress = XLSX.utils.encode_cell({
                r: row,
                c: 1
            });

            if (worksheet[pfAddress]) {
                const pfValue = parseNumber(
                    worksheet[pfAddress].v
                );

                if (pfValue !== null && pfValue > 0) {
                    const finalPriceAddress = XLSX.utils.encode_cell({
                        r: row,
                        c: 5
                    });

                    worksheet[pfAddress].t = "s";
                    worksheet[pfAddress].v = "";
                    worksheet[pfAddress].z = "General";

                    if (!worksheet[finalPriceAddress] || worksheet[finalPriceAddress].v === "" || worksheet[finalPriceAddress].v === null) {
                        worksheet[finalPriceAddress].t = "n";
                        worksheet[finalPriceAddress].v = pfValue;
                        worksheet[finalPriceAddress].z =
                            '_-[$R$-pt-BR]* #,##0.00_-;\\-[$R$-pt-BR]* #,##0.00_-;_-[$R$-pt-BR]* "-"??_-;_-@_-';
                    }
                } else {
                    worksheet[pfAddress].t = "s";
                    worksheet[pfAddress].v = "";
                    worksheet[pfAddress].z = "General";
                }
            }

            const finalPriceAddress = XLSX.utils.encode_cell({
                r: row,
                c: 5
            });

            if (worksheet[finalPriceAddress]) {
                const price = parseNumber(
                    worksheet[finalPriceAddress].v
                );

                if (price !== null && price > 0) {
                    worksheet[finalPriceAddress].t = "n";
                    worksheet[finalPriceAddress].v = price;
                    worksheet[finalPriceAddress].z =
                        '_-[$R$-pt-BR]* #,##0.00_-;\\-[$R$-pt-BR]* #,##0.00_-;_-[$R$-pt-BR]* "-"??_-;_-@_-';
                }
            }

            const validityAddress = XLSX.utils.encode_cell({
                r: row,
                c: 11
            });

            if (worksheet[validityAddress]) {
                const dateText = String(
                    worksheet[validityAddress].v ?? ""
                )
                    .replace(/^="/, "")
                    .replace(/"$/, "")
                    .trim();

                const match = dateText.match(
                    /^(\d{2})\/(\d{2})\/(\d{4})$/
                );

                if (match) {
                    const day = Number(match[1]);
                    const month = Number(match[2]);
                    const year = Number(match[3]);

                    const localDate = new Date(year, month - 1, day);

                    worksheet[validityAddress].t = "d";
                    worksheet[validityAddress].v = localDate;
                    worksheet[validityAddress].z = "dd/mm/yyyy";
                } else {
                    worksheet[validityAddress].t = "s";
                    worksheet[validityAddress].v = dateText;
                    worksheet[validityAddress].z = "@";
                }
            }
        }

        worksheet["!cols"] = [
            { wch: 20 },
            { wch: 14 },
            { wch: 12 },
            { wch: 22 },
            { wch: 14 },
            { wch: 16 },
            { wch: 10 },
            { wch: 18 },
            { wch: 20 },
            { wch: 20 },
            { wch: 30 },
            { wch: 16 }
        ];

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Planilha1"
        );

        XLSX.writeFile(workbook, filePath, {
            bookType: "xlsx",
            cellDates: true,
            compression: true
        });

        if (!fs.existsSync(filePath)) {
            throw new Error(
                `Falha ao gerar XLSX: ${filePath}`
            );
        }

        return filePath;
    }

    const csvRows = header && header.length
        ? [header, ...rows]
        : rows;

    const content = csvRows
        .map(csvLine)
        .join("\r\n");

    fs.writeFileSync(
        filePath,
        "\uFEFF" + `${content}\r\n`,
        "utf8"
    );

    if (!fs.existsSync(filePath)) {
        throw new Error(`Falha ao gerar CSV: ${filePath}`);
    }

    return filePath;
}

function buildPriceFileName(industry, branches, date) {
    return `PRECOS ${cleanFilePart(industry)} ${uniqueSorted(branches).join(" ")} ${getProcessingMonth(date)}.xlsx`;
}

function buildPendingFileName(industry, branch, date) {
    return `PENDENCIAS ${cleanFilePart(industry)} ${branch} ${getProcessingMonth(date)}.csv`;
}

function processPrices({
    rows,
    processingDate = new Date(),
    destinationFolder = PRICE_DESTINATION,
    supplierResolver
}) {
    const diagnostics = buildDiagnostics(rows, "precos");

    const validRows = rows.filter((row) => {
        return !getInvalidReason(row, "precos");
    });

    const deduplicatedRows = deduplicatePrices(validRows);

    const groups = groupRows(
        deduplicatedRows,
        (row) => getIndustry(row, "DESCONHECIDO")
    );

    const generatedFiles = [];
    const updates = [];

    for (const [industry, groupRowsValue] of groups.entries()) {
        const branches = uniqueSorted(groupRowsValue.map(getBranch));

        if (!branches.length) {
            continue;
        }

        const fileName = buildPriceFileName(
            industry,
            branches,
            processingDate
        );

        const filePath = path.join(destinationFolder, fileName);

        writeCsv(
            filePath,
            PRICE_OUTPUT_COLUMNS,
            createPriceRows(
                groupRowsValue,
                supplierResolver
            )
        );

        generatedFiles.push({
            type: "precos",
            industry,
            branches,
            fileName,
            filePath,
            rows: groupRowsValue.length
        });

        for (const branch of branches) {
            updates.push({
                industry,
                branch,
                column: "env_precos",
                month: getProcessingMonth(processingDate),
                year: getProcessingYear(processingDate)
            });
        }
    }

    return {
        type: "precos",
        generatedFiles,
        updates,
        ignoredRows: diagnostics.invalidRows,
        diagnostics: {
            ...diagnostics,
            rowsAfterDeduplication: deduplicatedRows.length
        }
    };
}

function processPending({
    rows,
    processingDate = new Date(),
    destinationFolder,
    supplierResolver
}) {
    if (!destinationFolder) {
        throw new Error(
            "Informe uma pasta de processamento para gerar os CSVs de pendências."
        );
    }

    const diagnostics = buildDiagnostics(rows, "pendencias");

    const validRows = rows.filter((row) => {
        return !getInvalidReason(row, "pendencias");
    });

    const groups = groupRows(
        validRows,
        (row) => {
            return `${getIndustry(row, "DESCONHECIDO")}|${getBranch(row)}`;
        }
    );

    const generatedFiles = [];
    const updates = [];

    for (const [groupKey, groupRowsValue] of groups.entries()) {
        const [industry, branch] = groupKey.split("|");

        const fileName = buildPendingFileName(
            industry,
            branch,
            processingDate
        );

        const filePath = path.join(destinationFolder, fileName);

        writeCsv(
            filePath,
            [
                "EAN",
                "Qtde",
                "",
                "Id Fornecedor Global"
            ],
            createPendingRows(groupRowsValue, supplierResolver)
        );

        generatedFiles.push({
            type: "pendencias",
            industry,
            branch,
            fileName,
            filePath,
            rows: groupRowsValue.length
        });

        updates.push({
            industry,
            branch,
            column: "env_pend",
            month: getProcessingMonth(processingDate),
            year: getProcessingYear(processingDate)
        });
    }

    return {
        type: "pendencias",
        generatedFiles,
        updates,
        ignoredRows: diagnostics.invalidRows,
        diagnostics
    };
}

function detectSpreadsheetType(rows, fallbackType) {
    const firstRow = rows[0] || {};

    const hasPrice = getValue(
        firstRow,
        HEADER_ALIASES.price
    ) !== "";

    const hasPendingQuantity = getValue(
        firstRow,
        HEADER_ALIASES.pendingQuantity
    ) !== "";

    if (hasPrice && !hasPendingQuantity) {
        return "precos";
    }

    if (hasPendingQuantity && !hasPrice) {
        return "pendencias";
    }

    const normalizedFallback = normalizeText(fallbackType);

    if (
        normalizedFallback === "PENDENCIA" ||
        normalizedFallback === "PENDENCIAS"
    ) {
        return "pendencias";
    }

    return "precos";
}

function processSpreadsheet({
    filePath,
    type,
    processingDate = new Date(),
    destinationFolder,
    supplierResolver
}) {
    const rows = readWorkbook(filePath);

    const detectedType = detectSpreadsheetType(rows, type);

    if (detectedType === "precos") {
        return processPrices({
            rows,
            processingDate,
            destinationFolder: destinationFolder || PRICE_DESTINATION,
            supplierResolver
        });
    }

    if (detectedType === "pendencias") {
        return processPending({
            rows,
            processingDate,
            destinationFolder,
            supplierResolver
        });
    }

    throw new Error(
        "Tipo de planilha inválido. Use precos ou pendencias."
    );
}

module.exports = {
    BRANCH_TO_COMPANY,
    PRICE_OUTPUT_COLUMNS,
    PRICE_DESTINATION,
    HEADER_ALIASES,
    readWorkbook,
    normalizeBranch,
    processPrices,
    processPending,
    processSpreadsheet
};

















