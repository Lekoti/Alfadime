const Database = require("better-sqlite3");

const db = new Database(
  "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\alfadime.db",
  { readonly: true }
);

const rows = db.prepare(`
  SELECT id, branch, code, ean, sap_code, commercial_name, active
  FROM product_catalog
  WHERE branch = 'ALFAMED MS'
    AND ean IN ('1260', '13598', '2003')
  ORDER BY ean, id
`).all();

console.table(rows);

db.close();
