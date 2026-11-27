const Database = require("better-sqlite3");

const db = new Database(
  "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\alfadime.db",
  { readonly: true }
);

console.log("QUARENTENA POR STATUS");
console.table(
  db.prepare("SELECT status, COUNT(*) AS total FROM product_quarantine GROUP BY status").all()
);

console.log("DUPLICADOS POR FILIAL + EAN");
console.table(
  db.prepare(`
    SELECT branch, ean, COUNT(*) AS total
    FROM product_catalog
    WHERE ean IS NOT NULL AND TRIM(ean) <> ''
    GROUP BY branch, ean
    HAVING COUNT(*) > 1
    ORDER BY total DESC
    LIMIT 20
  `).all()
);

db.close();
