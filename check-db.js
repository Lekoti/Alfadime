const Database = require("better-sqlite3");

const db = new Database(String.raw`\\10.0.0.20\Compras\1.COMPRAS\SAULO\ALFADIME\BANCO DE DADOS\alfadime.db`, { readonly: true });

const total = db.prepare("SELECT COUNT(*) AS total FROM product_catalog").get().total;
const ativos = db.prepare("SELECT COUNT(*) AS total FROM product_catalog WHERE active = 1").get().total;
const inativos = db.prepare("SELECT COUNT(*) AS total FROM product_catalog WHERE active = 0").get().total;

const duplicadosCodigo = db.prepare(`
    SELECT branch, code, COUNT(*) AS quantidade
    FROM product_catalog
    WHERE TRIM(CAST(code AS TEXT)) <> ''
    GROUP BY branch, code
    HAVING COUNT(*) > 1
    ORDER BY quantidade DESC, branch, code
`).all();

const duplicadosEan = db.prepare(`
    SELECT branch, ean, COUNT(*) AS quantidade
    FROM product_catalog
    WHERE TRIM(CAST(ean AS TEXT)) <> ''
      AND TRIM(CAST(ean AS TEXT)) <> '0'
    GROUP BY branch, ean
    HAVING COUNT(*) > 1
    ORDER BY quantidade DESC, branch, ean
`).all();

const semCodigo = db.prepare("SELECT COUNT(*) AS total FROM product_catalog WHERE code IS NULL OR TRIM(CAST(code AS TEXT)) = ''").get().total;
const semEan = db.prepare("SELECT COUNT(*) AS total FROM product_catalog WHERE ean IS NULL OR TRIM(CAST(ean AS TEXT)) = '' OR TRIM(CAST(ean AS TEXT)) = '0'").get().total;

const quarentena = db.prepare(`
    SELECT COUNT(*) AS total
    FROM sqlite_master
    WHERE type = 'table' AND name = 'product_quarantine'
`).get().total > 0
    ? db.prepare("SELECT COUNT(*) AS total FROM product_quarantine WHERE status = 'pendente'").get().total
    : 0;

const compras = db.prepare("SELECT COUNT(*) AS total FROM purchase_curve_products").get().total;

const duplicadosCompras = db.prepare(`
    SELECT company, product_code, COUNT(*) AS quantidade
    FROM purchase_curve_products
    GROUP BY company, product_code
    HAVING COUNT(*) > 1
    ORDER BY quantidade DESC
`).all();

console.log("=== PRODUTOS ===");
console.log("Total de cadastros:", total);
console.log("Ativos:", ativos);
console.log("Inativos:", inativos);
console.log("Sem código:", semCodigo);
console.log("Sem EAN:", semEan);
console.log("Duplicados por Filial + Código:", duplicadosCodigo.length);
console.log("Duplicados por Filial + EAN:", duplicadosEan.length);
console.log("Produtos em quarentena pendentes:", quarentena);

if (duplicadosCodigo.length) {
    console.log("\n--- DUPLICADOS POR CÓDIGO ---");
    console.table(duplicadosCodigo.slice(0, 30));
}

if (duplicadosEan.length) {
    console.log("\n--- DUPLICADOS POR EAN ---");
    console.table(duplicadosEan.slice(0, 30));
}

console.log("\n=== COMPRAS ===");
console.log("Total de registros de curva de compras:", compras);
console.log("Duplicados por Empresa + Código:", duplicadosCompras.length);

if (duplicadosCompras.length) {
    console.log("\n--- DUPLICADOS EM COMPRAS ---");
    console.table(duplicadosCompras.slice(0, 30));
}

db.close();
