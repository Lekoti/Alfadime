const Database = require("better-sqlite3");

const db = new Database(
  "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\alfadime.db",
  { readonly: true }
);

console.log("EANS COM FINAL ARREDONDADO (5+ zeros)");
console.table(
  db.prepare(`
    SELECT branch, COUNT(*) AS total
    FROM product_catalog
    WHERE ean GLOB '*00000' AND LENGTH(ean) >= 12
    GROUP BY branch
  `).all()
);

console.log("EXEMPLOS");
console.table(
  db.prepare(`
    SELECT branch, ean, sap_code, commercial_name, active
    FROM product_catalog
    WHERE ean GLOB '*00000' AND LENGTH(ean) >= 12
    LIMIT 15
  `).all()
);

db.close();
