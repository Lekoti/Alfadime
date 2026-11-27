const XLSX = require("xlsx");
const { PRODUCTS_EXCEL_PATH } = require("./src/main/modules/products/constants/products.config");

const workbook = XLSX.readFile(PRODUCTS_EXCEL_PATH, { cellDates: false, raw: false });
const sheetName = workbook.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: false });

function normalize(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

const headers = Object.keys(rows[0] || {});

const branchCodeKeys = new Set();
const branchEanKeys = new Set();
const codes = new Set();
const eans = new Set();
const eanComCodigosDiferentes = new Map();

for (const row of rows) {
    const branch = normalize(row["Filial"]);
    const code = normalize(row["Cod"]);
    const ean = normalize(row["EAN"]);

    if (code) codes.add(code);
    if (ean) eans.add(ean);

    if (branch && code) {
        branchCodeKeys.add(branch + "|" + code);
    }

    if (branch && ean) {
        branchEanKeys.add(branch + "|" + ean);
    }

    if (ean) {
        if (!eanComCodigosDiferentes.has(ean)) {
            eanComCodigosDiferentes.set(ean, new Set());
        }

        if (code) {
            eanComCodigosDiferentes.get(ean).add(code);
        }
    }
}

const codigosPorEanDiferentes = Array.from(eanComCodigosDiferentes.entries())
    .filter(([ean, codigos]) => codigos.size > 1)
    .map(([ean, codigos]) => ({
        ean,
        quantidadeCodigos: codigos.size,
        codigos: Array.from(codigos).slice(0, 10).join(", ")
    }));

console.log("=== ESTRUTURA DA PLANILHA ===");
console.log("Colunas encontradas:");
console.table(headers.map((header, index) => ({ indice: index + 1, coluna: header })));

console.log("\n=== CONTAGENS ===");
console.log("Total de linhas:", rows.length);
console.log("Codigos diferentes:", codes.size);
console.log("EANs diferentes:", eans.size);
console.log("Chaves unicas Filial + Cod:", branchCodeKeys.size);
console.log("Chaves unicas Filial + EAN:", branchEanKeys.size);
console.log("Linhas repetidas por Filial + Cod:", rows.length - branchCodeKeys.size);
console.log("Linhas repetidas por Filial + EAN:", rows.length - branchEanKeys.size);

console.log("\n=== EANs COM MAIS DE UM CODIGO ===");
console.log("Total:", codigosPorEanDiferentes.length);
console.table(codigosPorEanDiferentes.slice(0, 30));

console.log("\n=== PRIMEIRAS 10 LINHAS ===");
console.table(rows.slice(0, 10));
