const Database = require("better-sqlite3");

const db = new Database(
  "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\alfadime.db",
  { readonly: true }
);

console.log("PENDENTES POR FILIAL");
console.table(
  db.prepare(`
    SELECT branch, COUNT(*) AS total
    FROM product_quarantine
    WHERE status = 'pendente'
    GROUP BY branch
    ORDER BY total DESC
  `).all()
);

console.log("AMOSTRA DE PENDENTES");
console.table(
  db.prepare(`
    SELECT q.branch, q.code, q.ean, p.sap_code, p.commercial_name, p.active
    FROM product_quarantine q
    JOIN product_catalog p ON p.id = q.product_id
    WHERE q.status = 'pendente'
    LIMIT 20
  `).all()
);

db.close();
