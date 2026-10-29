const fs = require("node:fs/promises");
const path = require("node:path");
const XLSX = require("xlsx");
const { getFoldersConfig } = require("./price-pending-folders-config.repository");

const BRANCHES = { "1": "DPR", "2": "AMS", "3": "DMT", "5": "DMS", "6": "DSC" };

const REQUIRED_HEADERS = {
    ean: "CODIGOBARRAS",
    price: "PRECOFINAL",
    company: "EMPRESA",
    lab: "CODGLOBALLAB",
    validity: "DATAVALIDADE"
};

const cache = new Map();
let inFlight = null;

function normalize(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .toUpperCase();
}

function headerKey(value) {
    return normalize(value).replace(/ /g, "");
}

function code(value) {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 ? String(value) : "";
    }

    const text = String(value ?? "").trim();

    if (/^\d+$/.test(text)) {
        return text.replace(/^0+(?=\d)/, "");
    }

    if (/^\d+(\.\d+)?e\+?\d+$/i.test(text)) {
        const number = Number(text);
        return Number.isSafeInteger(number) && number >= 0 ? String(number) : "";
    }

    return "";
}

function number(value) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    let text = String(value ?? "")
        .replace(/R\$/gi, "")
        .replace(/\s/g, "");

    if (text.includes(",")) {
        text = text.replace(/\./g, "").replace(",", ".");
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
}

function validDate(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return "";
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateOnly(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return validDate(
            value.getFullYear(),
            value.getMonth() + 1,
            value.getDate()
        );
    }

    if (typeof value === "number") {
        const parts = XLSX.SSF.parse_date_code(value);

        if (!parts) {
            return "";
        }

        return validDate(parts.y, parts.m, parts.d);
    }

    const text = String(value ?? "").trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const brazilian = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (iso) {
        return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    }

    if (brazilian) {
        return validDate(
            Number(brazilian[3]),
            Number(brazilian[2]),
            Number(brazilian[1])
        );
    }

    return "";
}

function shown(value) {
    const text = String(value ?? "").trim();
    return text ? JSON.stringify(text) : "vazio";
}

function inspectHeader(row) {
    const keys = row.map(headerKey);
    const index = {};

    for (const [field, header] of Object.entries(REQUIRED_HEADERS)) {
        const found = keys.indexOf(header);
        index[field] = found;
    }

    const requiredFields = Object.keys(REQUIRED_HEADERS);
    return requiredFields.every((field) => index[field] >= 0) ? index : null;
}

function findHeaderRow(matrix) {
    const limit = Math.min(100, matrix.length);

    for (let index = 0; index < limit; index += 1) {
        const header = inspectHeader(matrix[index]);

        if (header) {
            return {
                row: index,
                index: header
            };
        }
    }

    return null;
}

function parseWorkbook(workbook, metadata) {
    const records = [];
    const warnings = [];
    const issues = [];
    let usableSheets = 0;

    for (const sheetName of workbook.SheetNames) {
        const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
            defval: null,
            raw: true,
            blankrows: true
        });

        const header = findHeaderRow(matrix);

        if (!header) {
            const firstRow =
                matrix.find((row) =>
                    row.some((value) => String(value ?? "").trim() !== "")
                ) || [];

            const found = firstRow
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
                .join(" | ") || "aba vazia";

            issues.push({
                fileName: metadata.fileName,
                sheetName,
                line: null,
                column: null,
                type: "CABECALHO",
                found: found,
                expected: Object.values(REQUIRED_HEADERS).join(" | "),
                message: `Aba "${sheetName}" não possui os cabeçalhos obrigatórios.`
            });

            continue;
        }

        usableSheets += 1;
        const { row: headerRow, index } = header;

        for (let line = headerRow + 1; line < matrix.length; line += 1) {
            const row = matrix[line];

            if (!row.some((value) => String(value ?? "").trim() !== "")) {
                continue;
            }

            if (inspectHeader(row)) {
                continue;
            }

            const ean = code(row[index.ean]);
            const companyCode = code(row[index.company]);
            const branch = BRANCHES[companyCode];
            const globalLabCode = code(row[index.lab]);
            const price = number(row[index.price]);
            const validity = dateOnly(row[index.validity]);
            const rowIssues = [];

            if (!ean || ean === "0") {
                rowIssues.push({
                    column: REQUIRED_HEADERS.ean,
                    found: shown(row[index.ean]),
                    expected: "Código de barras numérico válido",
                    message: "EAN inválido ou não informado."
                });
            }

            if (!branch) {
                rowIssues.push({
                    column: REQUIRED_HEADERS.company,
                    found: shown(row[index.company]),
                    expected: "001, 002, 003, 005 ou 006",
                    message: "Empresa fora do padrão."
                });
            }

            if (!globalLabCode || globalLabCode === "0") {
                rowIssues.push({
                    column: REQUIRED_HEADERS.lab,
                    found: shown(row[index.lab]),
                    expected: "Código global do fabricante numérico válido",
                    message: "Código global do fabricante inválido ou não informado."
                });
            }

            if (!(price > 0)) {
                rowIssues.push({
                    column: REQUIRED_HEADERS.price,
                    found: shown(row[index.price]),
                    expected: "Preço final maior que zero",
                    message: "Preço final inválido ou não informado."
                });
            }

            if (!validity) {
                rowIssues.push({
                    column: REQUIRED_HEADERS.validity,
                    found: shown(row[index.validity]),
                    expected: "Data válida no formato dd/mm/aaaa",
                    message: "Data de validade inválida ou não informada."
                });
            }

            rowIssues.forEach((issue) => {
                issues.push({
                    fileName: metadata.fileName,
                    sheetName,
                    line: line + 1,
                    column: issue.column,
                    type: "DADO",
                    found: issue.found,
                    expected: issue.expected,
                    message: issue.message
                });
            });

            if (rowIssues.length) {
                continue;
            }

            records.push({
                barcode: ean,
                branch,
                companyCode: companyCode.padStart(3, "0"),
                globalLabCode,
                price,
                validity,
                ...metadata,
                sheetName,
                line: line + 1
            });
        }
    }

    if (!usableSheets) {
        warnings.push(
            `${metadata.fileName}: nenhum cabeçalho padrão reconhecido. Política Comercial não aplicada.`
        );
    }

    return {
        records,
        warnings,
        issues,
        valid: usableSheets > 0 && issues.length === 0
    };
}

function samePrice(first, second) {
    return Math.abs(Number(first) - Number(second)) <= 1e-9;
}

function describeRecord(record) {
    const price = Number(record.price).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 10
    });

    return `${record.fileName} / ${record.sheetName} / linha ${record.line} / PREÇO FINAL R$ ${price} / modificação ${record.fileModifiedAt}`;
}

function selectLatestRecords(records) {
    const groups = new Map();
    const warnings = [];
    const chosen = [];

    for (const record of records) {
        const key = [
            record.branch,
            record.globalLabCode,
            record.barcode
        ].join("|");

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key).push(record);
    }

    for (const [key, candidates] of groups) {
        const latest = Math.max(
            ...candidates.map((record) => Number(record.mtimeMs) || 0)
        );

        const finalists = candidates
            .filter((record) => (Number(record.mtimeMs) || 0) === latest)
            .sort(
                (first, second) =>
                    first.fileName.localeCompare(second.fileName, "pt-BR") ||
                    first.sheetName.localeCompare(second.sheetName, "pt-BR") ||
                    first.line - second.line
            );

        const first = finalists[0];
        const hasConflict = finalists.some(
            (record) => !samePrice(record.price, first.price)
        );

        if (hasConflict) {
            chosen.push({
                ...first,
                price: 0,
                conflict: true
            });

            const details = [
                ...new Set(finalists.map(describeRecord))
            ];

            warnings.push(
                `Conflito de preços para ${key}. ${details.join(" <> ")}. Política não aplicada; utilizados os históricos disponíveis. Arquivos de origem não foram alterados.`
            );

            continue;
        }

        chosen.push(first);
    }

    return {
        records: chosen,
        warnings
    };
}

function groupIssuesByFile(issues) {
    const groups = new Map();

    for (const issue of issues) {
        const key = issue.fileName;

        if (!groups.has(key)) {
            groups.set(key, {
                fileName: issue.fileName,
                totalIssues: 0,
                issues: []
            });
        }

        const group = groups.get(key);
        group.totalIssues += 1;
        group.issues.push(issue);
    }

    return [...groups.values()].sort((first, second) =>
        first.fileName.localeCompare(second.fileName, "pt-BR")
    );
}

async function scan(force = false) {
    const folder = String(getFoldersConfig().prices || "").trim();

    if (!folder) {
        throw new Error(
            "Configure a pasta de preços nas configurações do app."
        );
    }

    const entries = await fs.readdir(folder, {
        withFileTypes: true
    });

    const files = entries.filter(
        (entry) =>
            entry.isFile() &&
            !entry.name.startsWith("~$") &&
            /\.(xlsx|xlsm|xls)$/i.test(entry.name) &&
            /\bPRECOS?\b/.test(normalize(entry.name))
    );

    const warnings = [];
    const issues = [];
    const records = [];
    const seen = new Set();
    let readFiles = 0;
    let reusedFiles = 0;

    for (const entry of files) {
        const filePath = path.join(folder, entry.name);
        seen.add(filePath);

        try {
            const stat = await fs.stat(filePath);
            const signature = `${stat.size}-${stat.mtimeMs}`;
            let saved = cache.get(filePath);

            if (force || !saved || saved.signature !== signature) {
                const buffer = await fs.readFile(filePath);
                const after = await fs.stat(filePath);

                if (
                    after.size !== stat.size ||
                    after.mtimeMs !== stat.mtimeMs
                ) {
                    throw new Error(
                        "Arquivo sendo alterado; tente novamente após concluir a gravação."
                    );
                }

                const workbook = XLSX.read(buffer, {
                    type: "buffer",
                    cellDates: true
                });

                const parsed = parseWorkbook(workbook, {
                    fileName: entry.name,
                    fileModifiedAt: stat.mtime.toISOString(),
                    readAt: new Date().toISOString(),
                    mtimeMs: stat.mtimeMs
                });

                saved = {
                    signature,
                    ...parsed
                };

                cache.set(filePath, saved);
                readFiles += 1;
            } else {
                reusedFiles += 1;
            }

            if (saved.valid) {
                records.push(...saved.records);
            }

            warnings.push(...saved.warnings);
            issues.push(...saved.issues);
        } catch (error) {
            warnings.push(`${entry.name}: ${error.message}`);
            issues.push({
                fileName: entry.name,
                sheetName: null,
                line: null,
                column: null,
                type: "LEITURA",
                found: error.message,
                expected: "Arquivo Excel válido e não em uso",
                message: "Não foi possível ler o arquivo."
            });

            const previous = cache.get(filePath);

            if (previous && previous.valid) {
                records.push(
                    ...previous.records.map((record) => ({
                        ...record,
                        stale: true
                    }))
                );
            }
        }
    }

    for (const cachedPath of cache.keys()) {
        if (
            path.dirname(cachedPath) === folder &&
            !seen.has(cachedPath)
        ) {
            cache.delete(cachedPath);
        }
    }

    const selected = selectLatestRecords(records);

    return {
        records: selected.records,
        folder,
        scannedAt: new Date().toISOString(),
        filesFound: files.length,
        readFiles,
        reusedFiles,
        warnings: [
            ...new Set([...warnings, ...selected.warnings])
        ],
        policyIssues: groupIssuesByFile(issues)
    };
}

function readCommercialPolicies(options = {}) {
    if (inFlight) {
        return inFlight;
    }

    inFlight = scan(Boolean(options?.force)).finally(() => {
        inFlight = null;
    });

    return inFlight;
}

module.exports = {
    readCommercialPolicies,
    parseWorkbook,
    dateOnly,
    selectLatestRecords
};
