const XLSX = require("xlsx");
const wb = XLSX.readFile(
  "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\PRODUTOS\\PRODUTOS.xlsx",
  { sheetStubs: true }
);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
console.log("CABECALHOS");
console.log(JSON.stringify(rows[0]));
console.log("PRIMEIRAS 5 LINHAS");
for (let i = 1; i <= 5; i++) {
  console.log(JSON.stringify(rows[i]));
}
