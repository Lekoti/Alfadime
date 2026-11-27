const Database = require("better-sqlite3");

const db = new Database(String.raw`\\10.0.0.20\Compras\1.COMPRAS\SAULO\ALFADIME\BANCO DE DADOS\alfadime.db`, { readonly: true });

const total = db.prepare("SELECT COUNT(*) AS total FROM product_catalog").get().total;
const ativos = db.prepare("SELECT COUNT(*) AS total FROM product_catalog WHERE active = 1").get().total;
const inativos = db.prepare("SELECT COUNT(*) AS total FROM product_catalog WHERE active = 0").get().total;
const comCodigo = db.prepare("SELECT COUNT(*) AS total FROM product_catalog WHERE code IS NOT NULL AND TRIM(CAST(code AS TEXT)) <> ''").get().total;
const semCodigo = db.prepare("SELECT COUNT(*) AS total FROM product_catalog WHERE code IS NULL OR TRIM(CAST(code AS TEXT)) = ''").get().total;

const duplicadosCodigo = db.prepare(`
    SELECT branch, code, COUNT(*) AS quantidade
    FROM product_catalog
    WHERE TRIM(CAST(code AS TEXT)) <> ''
    GROUP BY branch, code
    HAVING COUNT(*) > 1
`).all();

const duplicadosEan = db.prepare(`
    SELECT branch, ean, COUNT(*) AS quantidade
    FROM product_catalog
    WHERE TRIM(CAST(ean AS TEXT)) <> ''
      AND TRIM(CAST(ean AS TEXT)) <> '0'
    GROUP BY branch, ean
    HAVING COUNT(*) > 1
`).all();

const quarentena = db.prepare("SELECT COUNT(*) AS total FROM product_quarantine WHERE status = 'pendente'").get().total;
const quarentenaRestaurada = db.prepare("SELECT COUNT(*) AS total FROM product_quarantine WHERE status = 'restaurado'").get().total;

const ultimaImportacao = db.prepare(`
    SELECT source_file_name, total_rows, valid_rows, inserted_rows, updated_rows,
           ignored_rows, status, error_message, started_at, finished_at
    FROM product_import_history
    ORDER BY started_at DESC
    LIMIT 1
`).get();

console.log("=== VERIFICACAO DA NOVA ATUALIZACAO ===");
console.log("Total de produtos:", total);
console.log("Ativos:", ativos);
console.log("Inativos:", inativos);
console.log("Produtos com codigo preenchido:", comCodigo);
console.log("Produtos sem codigo:", semCodigo);
console.log("Duplicados por Filial + Codigo:", duplicadosCodigo.length);
console.log("Duplicados por Filial + EAN:", duplicadosEan.length);
console.log("Quarentena pendente:", quarentena);
console.log("Quarentena restaurada:", quarentenaRestaurada);

console.log("\n=== ULTIMA IMPORTACAO ===");
console.log(ultimaImportacao);

if (duplicadosCodigo.length) {
    console.log("\n--- DUPLICADOS POR CODIGO ---");
    console.table(duplicadosCodigo.slice(0, 30));
}

if (duplicadosEan.length) {
    console.log("\n--- DUPLICADOS POR EAN ---");
    console.table(duplicadosEan.slice(0, 30));
}

db.close();
