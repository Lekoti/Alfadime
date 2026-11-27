const Database = require("better-sqlite3");

const db = new Database(
  "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\alfadime.db",
  { readonly: true }
);

const rows = db.prepare(`
  SELECT id, branch, code, ean, sap_code, commercial_name, active
  FROM product_catalog
  WHERE branch = 'DIMEBRAS MT'
    AND ean = '80110'
  ORDER BY id
`).all();

console.table(rows);

db.close();
