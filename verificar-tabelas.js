const Database = require("better-sqlite3");

const db = new Database("\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\alfadime.db", {
  readonly: true
});

const tabelas = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
  ORDER BY name
`).all();

console.log("Tabelas encontradas:");
tabelas.forEach(t => console.log("-", t.name));

db.close();
