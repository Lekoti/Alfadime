const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
test("exportação por laboratório respeita permissões", () => {
    const ipc = read("src/main/modules/price-pending/price-pending.ipc.js");
    const service = read("src/main/modules/price-pending/price-pending-export.service.js");
    assert.match(ipc, /exportToExcelByLaboratory\(\{ filePath, laboratory: options\.laboratory, includeColumns \}\)/);
    assert.match(service, /function exportToExcelByLaboratory\(\{ filePath, laboratory, includeColumns \} = \{\}\)/);
    assert.match(service, /includeColumns === undefined\s*\?\s*\[\.\.\.COLUMN_DEFINITIONS\.keys\(\)\]\s*:\s*validateColumns\(includeColumns\)/);
});
test("cobrança fixa agrupa destinatários por e-mail", () => {
    const favorites = read("src/main/modules/industry-contacts/contacts-charge-favorites.service.js");
    assert.match(favorites, /const groups = new Map\(\);/);
    assert.match(favorites, /const group = groups\.get\(email\);/);
    assert.match(favorites, /groups\.set\(email, \{ email, branch, rows: \[row\], needsPrices, needsPending \}\);/);
    assert.match(favorites, /for \(const group of groups\.values\(\)\)/);
});
test("coordenação reserva por e-mail e identidade", () => {
    const coordination = read("src/main/modules/industry-contacts/contacts-charge-coordination.js");
    assert.match(coordination, /const email = String\(message\.to \|\| ""\)\.trim\(\)\.toLowerCase\(\);/);
    assert.match(coordination, /const keys = new Set\(covered\.map\(item => item\.identity_key\)\);/);
    assert.match(coordination, /INSERT INTO charge_identity_locks_v5/);
});
