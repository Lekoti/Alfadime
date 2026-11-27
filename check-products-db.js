const path = require("path");
const fs = require("fs");

const DEFAULT_DB_PATH =
  "\\\\\\\\10.0.0.20\\\\Compras\\\\1.COMPRAS\\\\SAULO\\\\ALFADIME\\\\BANCO DE DADOS\\\\alfadime.db";

const dbPath = process.argv[2] || DEFAULT_DB_PATH;

let Database;
try {
  Database = require("better-sqlite3");
} catch (error) {
  console.error("Instale a dependencia necessaria com: npm install better-sqlite3");
  process.exit(1);
}

if (!fs.existsSync(dbPath)) {
  console.error("Banco nao encontrado:");
  console.error(dbPath);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

function tableExists(name) {
  return Boolean(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name)
  );
}

function getColumns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

function hasColumn(columns, name) {
  return columns.some((column) => column.name.toLowerCase() === name.toLowerCase());
}

function count(query, params = []) {
  return db.prepare(query).get(...params)?.total || 0;
}

const productsTable = "product_catalog";
const quarantineTable = "product_quarantine";

if (!tableExists(productsTable)) {
  console.error(`Tabela ${productsTable} nao encontrada.`);
  process.exit(1);
}

const columns = getColumns(productsTable);
const columnNames = columns.map((column) => column.name);

console.log("========================================");
console.log("DIAGNOSTICO DOS PRODUTOS");
console.log("========================================");
console.log(`Banco: ${dbPath}`);
console.log(`Tabela: ${productsTable}`);
console.log(`Colunas: ${columnNames.join(", ")}`);
console.log("");

const total = count(`SELECT COUNT(*) AS total FROM ${productsTable}`);
console.log(`Total de registros: ${total}`);

["status", "active", "is_active"].forEach((columnName) => {
  if (!hasColumn(columns, columnName)) {
    return;
  }

  if (columnName === "status") {
    const rows = db
      .prepare(`SELECT status, COUNT(*) AS total FROM ${productsTable} GROUP BY status ORDER BY total DESC`)
      .all();

    console.log("Status:");
    rows.forEach((row) => {
      console.log(`- ${row.status === null ? "NULL" : row.status}: ${row.total}`);
    });
  } else {
    const active = count(`SELECT COUNT(*) AS total FROM ${productsTable} WHERE ${columnName} = 1`);
    const inactive = count(`SELECT COUNT(*) AS total FROM ${productsTable} WHERE ${columnName} = 0`);
    console.log(`Ativos (${columnName} = 1): ${active}`);
    console.log(`Inativos (${columnName} = 0): ${inactive}`);
  }
});

["code", "cod", "codigo", "codigo_sap", "sap_code"].forEach((columnName) => {
  if (!hasColumn(columns, columnName)) {
    return;
  }

  const filled = count(
    `SELECT COUNT(*) AS total FROM ${productsTable} WHERE ${columnName} IS NOT NULL AND TRIM(CAST(${columnName} AS TEXT)) <> ''`
  );

  console.log(`Com ${columnName} preenchido: ${filled}`);
});

["ean", "barcode", "codigo_barras"].forEach((columnName) => {
  if (!hasColumn(columns, columnName)) {
    return;
  }

  const filled = count(
    `SELECT COUNT(*) AS total FROM ${productsTable} WHERE ${columnName} IS NOT NULL AND TRIM(CAST(${columnName} AS TEXT)) <> ''`
  );

  console.log(`Com ${columnName} preenchido: ${filled}`);
});

console.log("");
console.log("DUPLICIDADES");

function duplicateCount(keySql) {
  return count(
    `SELECT COUNT(*) AS total FROM (
       SELECT ${keySql}
       FROM ${productsTable}
       GROUP BY ${keySql}
       HAVING COUNT(*) > 1
     )`
  );
}

function duplicateRows(keySql, label, limit = 10) {
  const rows = db
    .prepare(
      `SELECT ${keySql} AS chave, COUNT(*) AS quantidade
       FROM ${productsTable}
       GROUP BY ${keySql}
       HAVING COUNT(*) > 1
       ORDER BY quantidade DESC
       LIMIT ?`
    )
    .all(limit);

  rows.forEach((row) => {
    console.log(`- ${row.chave}: ${row.quantidade}`);
  });
}

if (hasColumn(columns, "code") && hasColumn(columns, "filial")) {
  const key = "TRIM(COALESCE(CAST(code AS TEXT), '')) || ' | ' || TRIM(COALESCE(filial, ''))";
  console.log(`Duplicados por code + filial: ${duplicateCount(key)}`);
  duplicateRows(key, "code + filial");
}

if (hasColumn(columns, "codigo_sap") && hasColumn(columns, "filial")) {
  const key = "TRIM(COALESCE(CAST(codigo_sap AS TEXT), '')) || ' | ' || TRIM(COALESCE(filial, ''))";
  console.log(`Duplicados por Codigo SAP + filial: ${duplicateCount(key)}`);
  duplicateRows(key, "Codigo SAP + filial");
}

if (hasColumn(columns, "ean")) {
  const key = "TRIM(COALESCE(CAST(ean AS TEXT), ''))";
  console.log(`Duplicados por EAN: ${duplicateCount(key)}`);
  duplicateRows(key, "EAN");
}

console.log("");
console.log("QUARENTENA");

if (tableExists(quarantineTable)) {
  const quarantineColumns = getColumns(quarantineTable);
  const quarantineColumnNames = quarantineColumns.map((column) => column.name);

  console.log(`Tabela: ${quarantineTable}`);
  console.log(`Colunas: ${quarantineColumnNames.join(", ")}`);

  const quarantineTotal = count(`SELECT COUNT(*) AS total FROM ${quarantineTable}`);
  console.log(`Total em quarentena: ${quarantineTotal}`);

  if (quarantineTotal > 0) {
    const sample = db
      .prepare(`SELECT * FROM ${quarantineTable} LIMIT 5`)
      .all();

    console.log("Amostra:");
    sample.forEach((row, index) => {
      console.log(`--- Registro ${index + 1} ---`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`${key}: ${value === null ? "" : String(value)}`);
      });
    });
  }
} else {
  console.log(`Tabela ${quarantineTable} nao encontrada.`);
}

db.close();
