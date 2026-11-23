const { getDatabase } = require("../../database/connection");
const { BRANCHES } = require("./nf-import.constants");
function normalizeBranch(value) {
    const text = String(value ?? "").trim().toUpperCase();
    return BRANCHES.find((branch) => [branch.key, branch.name, branch.code, branch.folder].includes(text) ||
        (/^\d+$/.test(text) && Number(text) === Number(branch.code)))?.key || text;
}
function lookupProducts(eans) {
    if (!Array.isArray(eans) || eans.length > 1000) throw new Error("Consulta limitada a 1.000 EANs por lote.");
    const values = [...new Set(eans.map(String).filter((ean) => /^\d{8,14}$/.test(ean)))];
    if (!values.length) return [];
    const keys = values.map((ean) => ean.replace(/^0+/, ""));
    const database = getDatabase();
    const result = [];
    for (let offset = 0; offset < keys.length; offset += 200) {
        const batch = keys.slice(offset, offset + 200);
        const rows = database.prepare(`
            SELECT pc.id, pc.branch, pc.ean, pc.commercial_name, pc.active,
                   curve.empresa, curve.cod_prod
            FROM product_catalog AS pc
            LEFT JOIN product_purchase_curve AS curve ON curve.product_id = pc.id
            WHERE LTRIM(TRIM(CAST(pc.ean AS TEXT)), '0') IN (${batch.map(() => "?").join(",")})
        `).all(...batch);
        for (const row of rows) {
            result.push({
                productId: row.id, branch: normalizeBranch(row.branch),
                ean: String(row.ean ?? ""), description: row.commercial_name,
                active: Number(row.active) === 1,
                code: normalizeBranch(row.empresa) === normalizeBranch(row.branch)
                    ? String(row.cod_prod ?? "").trim() : ""
            });
        }
    }
    return result.filter((row, index, list) => list.findIndex((other) =>
        other.productId === row.productId && other.code === row.code) === index);
}
module.exports = { lookupProducts, normalizeBranch };
