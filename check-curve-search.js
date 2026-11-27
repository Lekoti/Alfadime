const XLSX = require("xlsx");
const path = "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\CURVA COMPRAS\\CURVA COMPRAS.xlsx";
const wb = XLSX.readFile(path, { sheetStubs: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
const targets = [
  "17891800933991",
  "17891800638872",
  "17896714274284",
  "17896714291465",
  "17896920301620",
  "3667",
  "1090087",
  "7896321035868",
  "7898593050679",
  "7898593050747"
];
console.log("BUSCA NA CURVA");
for (const t of targets) {
  const found = rows.some(r => r.some(c => String(c).trim() === t));
  console.log(t, found ? "ENCONTRADO" : "NAO ENCONTRADO");
}
