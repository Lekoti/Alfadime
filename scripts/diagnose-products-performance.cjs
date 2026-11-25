#!/usr/bin/env node

const path = require("node:path");
const Database = require("better-sqlite3");

const defaultDatabasePath =
    "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\alfadime.db";

const databasePath = process.argv[2] || defaultDatabasePath;

function formatBytes(value) {
    const units = ["B", "KB", "MB", "GB"];
    let size = Number(value) || 0;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
    }

    return `${size.toFixed(2)} ${units[unit]}`;
}

function timed(label, statement, params = []) {
    const startedAt = process.hrtime.bigint();
    const rows = statement.all(...params);
    const finishedAt = process.hrtime.bigint();
    const elapsedMs = Number(finishedAt - startedAt) / 1_000_000;

    console.log(`\n[TIME] ${label}`);
    console.log(`Tempo: ${elapsedMs.toFixed(2)} ms`);
    console.log(`Linhas: ${rows.length}`);

    return rows;
}

function main() {
    console.log("[DIAGNOSTICO] Banco:", databasePath);

    const database = new Database(databasePath, {
        readonly: true,
        fileMustExist: true
    });

    const page = database.pragma("page_size", { simple: true });
    const pageCount = database.pragma("page_count", { simple: true });
    const freelistCount = database.pragma("freelist_count", { simple: true });
    const journalMode = database.pragma("journal_mode", { simple: true });

    console.log("\n[ARQUIVO]");
    console.log(`page_size: ${page}`);
    console.log(`page_count: ${pageCount}`);
    console.log(`freelist_count: ${freelistCount}`);
    console.log(`Espaco livre estimado: ${formatBytes(freelistCount * page)}`);
    console.log(`journal_mode: ${journalMode}`);

    const counts = database.prepare(`
        SELECT
            (SELECT COUNT(*) FROM product_catalog) AS products,
            (SELECT COUNT(*) FROM product_purchase_curve) AS purchase_curve,
            (SELECT COUNT(*) FROM product_corrections) AS corrections,
            (SELECT COUNT(*) FROM product_change_history) AS change_history
    `).get();

    console.log("\n[REGISTROS]");
    console.log(counts);

    const space = database.prepare(`
        SELECT
            name,
            SUM(pgsize) AS bytes
        FROM dbstat
        GROUP BY name
        ORDER BY bytes DESC
        LIMIT 30
    `).all();

    console.log("\n[ESPACO POR TABELA/INDICE]");
    for (const item of space) {
        console.log(`${item.name}: ${formatBytes(item.bytes)}`);
    }

    const duplicateProductsByCode = database.prepare(`
        SELECT
            branch,
            code,
            COUNT(*) AS total
        FROM product_catalog
        WHERE code IS NOT NULL
          AND TRIM(code) <> ''
        GROUP BY branch, code
        HAVING COUNT(*) > 1
        ORDER BY total DESC, branch ASC, code ASC
        LIMIT 50
    `).all();

    const duplicateProductsByEan = database.prepare(`
        SELECT
            branch,
            ean,
            COUNT(*) AS total
        FROM product_catalog
        WHERE ean IS NOT NULL
          AND TRIM(ean) <> ''
        GROUP BY branch, ean
        HAVING COUNT(*) > 1
        ORDER BY total DESC, branch ASC, ean ASC
        LIMIT 50
    `).all();

    console.log("\n[PRODUTOS DUPLICADOS POR FILIAL + CODIGO]");
    console.log(duplicateProductsByCode);

    console.log("\n[PRODUTOS DUPLICADOS POR FILIAL + EAN]");
    console.log(duplicateProductsByEan);

    const duplicateCurveByProductCompany = database.prepare(`
        SELECT
            product_id,
            empresa,
            COUNT(*) AS total
        FROM product_purchase_curve
        GROUP BY product_id, empresa
        HAVING COUNT(*) > 1
        ORDER BY total DESC
        LIMIT 50
    `).all();

    const duplicateCurveByProductCompanyCode = database.prepare(`
        SELECT
            product_id,
            empresa,
            cod_prod,
            COUNT(*) AS total
        FROM product_purchase_curve
        WHERE cod_prod IS NOT NULL
          AND TRIM(cod_prod) <> ''
        GROUP BY product_id, empresa, cod_prod
        HAVING COUNT(*) > 1
        ORDER BY total DESC
        LIMIT 50
    `).all();

    console.log("\n[CURVA DUPLICADA POR PRODUTO + EMPRESA]");
    console.log(duplicateCurveByProductCompany);

    console.log("\n[CURVA DUPLICADA POR PRODUTO + EMPRESA + CODIGO]");
    console.log(duplicateCurveByProductCompanyCode);

    const orphanCurves = database.prepare(`
        SELECT
            COUNT(*) AS total
        FROM product_purchase_curve AS curve
        LEFT JOIN product_catalog AS product
            ON product.id = curve.product_id
        WHERE product.id IS NULL
    `).get();

    console.log("\n[CURVAS SEM PRODUTO]");
    console.log(orphanCurves);

    const countStatement = database.prepare(`
        SELECT COUNT(*) AS total
        FROM product_catalog AS pc
        WHERE 1 = 1
    `);

    timed(
        "Contagem simples de produtos",
        countStatement
    );

    const listStatement = database.prepare(`
        SELECT
            pc.*,
            (
                SELECT curve.cod_prod
                FROM product_purchase_curve AS curve
                WHERE curve.product_id = pc.id
                    AND curve.cod_prod IS NOT NULL
                    AND TRIM(CAST(curve.cod_prod AS TEXT)) <> ''
                ORDER BY curve.empresa ASC
                LIMIT 1
            ) AS code,
            (
                SELECT curve.cod_prod_global
                FROM product_purchase_curve AS curve
                WHERE curve.product_id = pc.id
                    AND curve.cod_prod_global IS NOT NULL
                    AND TRIM(CAST(curve.cod_prod_global AS TEXT)) <> ''
                    AND CAST(curve.cod_prod_global AS TEXT) <> '1'
                ORDER BY curve.empresa ASC
                LIMIT 1
            ) AS sirius_code
        FROM product_catalog AS pc
        WHERE 1 = 1
        ORDER BY
            pc.branch ASC,
            pc.commercial_name ASC
        LIMIT 50
        OFFSET 0
    `);

    timed(
        "Listagem paginada de 50 produtos",
        listStatement
    );

    const searchStatement = database.prepare(`
        SELECT COUNT(*) AS total
        FROM product_catalog AS pc
        WHERE (
            pc.branch LIKE ?
            OR pc.ean LIKE ?
            OR pc.sap_code LIKE ?
            OR pc.active_ingredient LIKE ?
            OR pc.commercial_name LIKE ?
            OR pc.brand LIKE ?
            OR pc.ms_registration LIKE ?
            OR EXISTS (
                SELECT 1
                FROM product_purchase_curve AS search_curve
                WHERE search_curve.product_id = pc.id
                    AND (
                        search_curve.cod_prod LIKE ?
                        OR search_curve.cod_prod_global LIKE ?
                    )
            )
        )
    `);

    timed(
        "Contagem com busca curinga '%1%'",
        searchStatement,
        Array(9).fill("%1%")
    );

    database.close();

    console.log("\n[DIAGNOSTICO] Concluido. Nenhuma alteracao foi feita no banco.");
}

try {
    main();
} catch (error) {
    console.error("[DIAGNOSTICO][ERRO]", error);
    process.exitCode = 1;
}
