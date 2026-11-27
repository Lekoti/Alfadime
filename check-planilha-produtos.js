const Database = require("better-sqlite3");
const XLSX = require("xlsx");
const { PRODUCTS_EXCEL_PATH } = require("./src/main/modules/products/constants/products.config");

const db = new Database(String.raw`\\10.0.0.20\Compras\1.COMPRAS\SAULO\ALFADIME\BANCO DE DADOS\alfadime.db`, { readonly: true });

const workbook = XLSX.readFile(PRODUCTS_EXCEL_PATH, { cellDates: false, raw: false });
const sheetName = workbook.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: false });

function normalize(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

const branchValues = new Map();
const eanValues = new Set();
const branchEanKeys = new Set();
const duplicates = new Map();

for (const row of rows) {
    const branch = normalize(row["Filial"]);
    const ean = normalize(row["EAN"]);
    const code = normalize(row["Cod"]);

    if (branch) {
        branchValues.set(branch, (branchValues.get(branch) || 0) + 1);
    }

    if (ean) {
        eanValues.add(ean);
    }

    if (branch && ean) {
        const key = branch + "|" + ean;

        if (branchEanKeys.has(key)) {
            duplicates.set(key, (duplicates.get(key) || 0) + 1);
        } else {
            branchEanKeys.add(key);
        }
    }
}

const dbProducts = db.prepare("SELECT branch, ean FROM product_catalog").all();
const dbByBranchEan = new Set();
const dbByEan = new Set();

for (const product of dbProducts) {
    const branch = normalize(product.branch);
    const ean = normalize(product.ean);

    if (branch && ean) {
        dbByBranchEan.add(branch + "|" + ean);
    }

    if (ean) {
        dbByEan.add(ean);
    }
}

let matchedBranchEan = 0;
let matchedEanAnyBranch = 0;
let notMatched = 0;

for (const key of branchEanKeys) {
    if (dbByBranchEan.has(key)) {
        matchedBranchEan++;
    } else if (dbByEan.has(key.split("|")[1])) {
        matchedEanAnyBranch++;
    } else {
        notMatched++;
    }
}

console.log("=== PLANILHA DE PRODUTOS ===");
console.log("Arquivo:", PRODUCTS_EXCEL_PATH);
console.log("Aba:", sheetName);
console.log("Total de linhas:", rows.length);
console.log("EANs diferentes:", eanValues.size);
console.log("Chaves unicas Filial + EAN:", branchEanKeys.size);
console.log("Chaves duplicadas Filial + EAN:", duplicates.size);

console.log("\n=== FILIAIS DA PLANILHA ===");
console.table(Array.from(branchValues.entries()).map(([branch, total]) => ({ branch, total })));

console.log("\n=== COMPARACAO COM O BANCO ===");
console.log("Produtos encontrados por Filial + EAN:", matchedBranchEan);
console.log("EAN encontrado no banco, mas em outra Filial:", matchedEanAnyBranch);
console.log("EAN nao encontrado no banco:", notMatched);

console.log("\n=== FILIAIS DO BANCO ===");
const dbBranches = db.prepare("SELECT branch, COUNT(*) AS total FROM product_catalog GROUP BY branch ORDER BY total DESC").all();
console.table(dbBranches);

console.log("\n=== EXEMPLOS DE DUPLICIDADE NA PLANILHA ===");
console.table(Array.from(duplicates.entries()).slice(0, 20).map(([key, total]) => ({ filialEan: key, repeticoes: total })));

db.close();
