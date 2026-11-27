const XLSX = require("xlsx");
const path = "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\CURVA COMPRAS\\CURVA COMPRAS.xlsx";
const wb = XLSX.readFile(path, { sheetStubs: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
const targets = ["3667", "7896321035868", "7898593050679", "7898593050747"];

function pick(row, names) {
  const key = Object.keys(row).find(k =>
    names.includes(String(k).trim().toLowerCase())
  );
  return key ? row[key] : null;
}

const result = rows
  .map(row => ({
    empresa: pick(row, ["empresa", "filial"]),
    cod_prod: pick(row, ["cod prod", "codigo produto", "cod. prod"]),
    cod_barras: pick(row, ["cod barras", "codigo barras", "cod. barras", "ean"]),
    cod_fornec: pick(row, ["cod fornec", "codigo fornecedor", "cod. fornec"])
  }))
  .filter(row =>
    targets.includes(String(row.cod_prod ?? "").trim()) ||
    targets.includes(String(row.cod_barras ?? "").trim()) ||
    targets.includes(String(row.cod_fornec ?? "").trim())
  );

console.table(result);
