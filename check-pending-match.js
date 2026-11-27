const Database = require("better-sqlite3");
const XLSX = require("xlsx");

const db = new Database(
  "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\alfadime.db",
  { readonly: true }
);

const targets = ["3667", "7896321035868", "7898593050679", "7898593050747"];

console.log("PRODUTOS NO BANCO");
console.table(
  db.prepare(`
    SELECT id, branch, code, ean, sap_code, commercial_name, active
    FROM product_catalog
    WHERE ean IN (${targets.map(() => "?").join(",")})
       OR code IN (${targets.map(() => "?").join(",")})
       OR sap_code IN (${targets.map(() => "?").join(",")})
  `).all(...targets, ...targets, ...targets)
);

const path = "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\CURVA COMPRAS\\CURVA COMPRAS.xlsx";
const wb = XLSX.readFile(path, { sheetStubs: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

function findValue(row, names) {
  const found = Object.keys(row).find(key =>
    names.some(name => String(key).trim().toLowerCase() === name)
  );
  return found ? row[found] : null;
}

console.log("LINHAS DA CURVA");
const curveRows = rows
  .map(row => ({
    empresa: findValue(row, ["empresa", "filial"]),
    cod_prod: findValue(row, ["cod prod", "codigo produto", "cod. prod"]),
    cod_barras: findValue(row, ["cod barras", "codigo barras", "cod. barras", "ean"]),
    cod_fornec: findValue(row, ["cod fornec", "codigo fornecedor", "cod. fornec"])
  }))
  .filter(row =>
    targets.includes(String(row.cod_prod ?? "").trim()) ||
    targets.includes(String(row.cod_barras ?? "").trim()) ||
    targets.includes(String(row.cod_fornec ?? "").trim())
  );

console.table(curveRows);

db.close();
