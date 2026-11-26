const Database = require("better-sqlite3");

const db = new Database("\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\alfadime.db", {
  readonly: true
});

const total = db.prepare("SELECT COUNT(*) AS total FROM products").get().total;

const dupCodigo = db.prepare(`
  SELECT filial, codigo, COUNT(*) AS qtd
  FROM products
  GROUP BY filial, codigo
  HAVING COUNT(*) > 1
  ORDER BY filial, codigo
`).all();

const dupEan = db.prepare(`
  SELECT filial, ean, COUNT(*) AS qtd
  FROM products
  WHERE TRIM(COALESCE(ean, "")) <> ""
  GROUP BY filial, ean
  HAVING COUNT(*) > 1
  ORDER BY filial, ean
`).all();

const dupDescricao = db.prepare(`
  SELECT filial, descricao, COUNT(*) AS qtd
  FROM products
  GROUP BY filial, descricao
  HAVING COUNT(*) > 1
  ORDER BY filial, descricao
`).all();

console.log("Total de produtos:", total);
console.log("Duplicados por código:", dupCodigo.length);
console.log("Duplicados por EAN:", dupEan.length);
console.log("Duplicados por descrição:", dupDescricao.length);

db.close();
