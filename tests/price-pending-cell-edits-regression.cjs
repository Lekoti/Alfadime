const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const file = path.join(root, "src/main/modules/price-pending/price-pending-cell-edits.service.js");
function fixture() {
    let row = { id: "r", active: 1, laboratory: "LAB", observation: "", precos_ok_dpr: "01/11/2026",
        pending_external_updates: { precos_ok_dpr: { value: "30/11/2026", fileName: "p.xlsx", fileMtimeMs: 123, updatedAt: "2026-11-18T20:00:00Z" } } };
    let inside = false, writes = 0;
    const clone = x => JSON.parse(JSON.stringify(x));
    const db = {
        prepare() { return { get(id) { assert.equal(inside, true); return row.id === id && row.active === 1 ? clone(row) : undefined; } }; },
        transaction(work) { return { immediate() { const before = clone(row); inside = true;
            try { return work(); } catch (error) { row = before; throw error; } finally { inside = false; }
        } }; }
    };
    const repo = {
        EDITABLE_COLUMNS: ["laboratory", "observation", "precos_ok_dpr"], EXTERNAL_COLUMNS: ["precos_ok_dpr"],
        getRowById() { return clone(row); },
        updateCell(id, col, value) { assert.equal(inside, true); writes++; row[col] = String(value ?? ""); return clone(row); },
        acceptExternalCellUpdate({column}) { assert.equal(inside, true); writes++; row[column] = row.pending_external_updates[column].value; delete row.pending_external_updates[column]; return clone(row); }
    };
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(file, "utf8"), { module, exports: module.exports, require(name) {
        if (name === "./price-pending.repository") return repo;
        if (name === "./price-pending.database") return { getPricePendingDatabase: () => db };
        throw new Error(`Dependência real bloqueada: ${name}`);
    } }, { filename: file });
    return { api: module.exports, row: () => row, writes: () => writes,
        payload: () => ({ id: "r", column: "precos_ok_dpr", value: "20/11/2026", expectedValue: "01/11/2026" }) };
}
test("serviço: grava dentro da transação quando a base coincide", () => {
    const f = fixture(); assert.equal(f.api.updateCell(f.payload()).conflict, false); assert.equal(f.writes(), 1);
});
test("serviço: segunda edição da mesma base não sobrescreve a primeira", () => {
    const f = fixture(), p = f.payload(); f.api.updateCell(p);
    assert.equal(f.api.updateCell({...p, value:"05/11/2026"}).conflict, true);
    assert.equal(f.row().precos_ok_dpr, "20/11/2026"); assert.equal(f.writes(), 1);
});
test("serviço: outra coluna não provoca conflito", () => {
    const f = fixture(); f.row().observation = "Nova";
    assert.equal(f.api.updateCell(f.payload()).conflict, false); assert.equal(f.row().observation, "Nova");
});
test("serviço: ausência de base impede a gravação", () => {
    const f = fixture(), p = f.payload(); delete p.expectedValue;
    assert.throws(() => f.api.updateCell(p), /original/); assert.equal(f.writes(), 0);
});
test("serviço: coluna arbitrária não chega ao banco", () => {
    const f = fixture(); assert.throws(() => f.api.updateCell({...f.payload(), column:"id; DROP TABLE x"}), /Coluna/); assert.equal(f.writes(), 0);
});
test("serviço: linha removida não é gravada", () => {
    const f = fixture(); f.row().active=0;
    assert.throws(() => f.api.updateCell(f.payload()), /removido/); assert.equal(f.writes(),0);
});
test("serviço: proposta alterada depois da confirmação é bloqueada", () => {
    const f=fixture(), expectedProposal={...f.row().pending_external_updates.precos_ok_dpr};
    f.row().pending_external_updates.precos_ok_dpr.value="31/12/2026";
    assert.equal(f.api.acceptExternalUpdate({...f.payload(),expectedProposal}).conflict,true); assert.equal(f.writes(),0);
});
test("serviço: proposta atual é delegada ao repositório na transação", () => {
    const f=fixture();
    assert.equal(f.api.acceptExternalUpdate({...f.payload(),expectedProposal:f.row().pending_external_updates.precos_ok_dpr}).conflict,false);
    assert.equal(f.row().precos_ok_dpr,"30/11/2026"); assert.equal(f.writes(),1);
});
test("serviço: ausência de proposta original impede aceite", () => {
    const f=fixture(); assert.throws(()=>f.api.acceptExternalUpdate(f.payload()),/Proposta/); assert.equal(f.writes(),0);
});
test("interface: tabela envia snapshot e página o repassa", () => {
    const table=fs.readFileSync(path.join(root,"src/renderer/modules/price-pending/components/PricePendingTable.jsx"),"utf8");
    const page=fs.readFileSync(path.join(root,"src/renderer/modules/price-pending/pages/PricePendingPage.jsx"),"utf8");
    assert.match(table,/expectedProposal: \{ \.\.\.proposal \}/);
    assert.match(table,/resolveConflict: "review"/);
    assert.match(page,/await rowsState.acceptExternalUpdate\(payload\)/);
});
test("interface: hook conserva base e trata conflito explícito", () => {
    const hook=fs.readFileSync(path.join(root,"src/renderer/modules/price-pending/hooks/usePricePendingRows.js"),"utf8");
    assert.match(hook,/expectedValue: expectedValuesRef\.current\.get\(cellKey\)/);
    assert.match(hook,/Seu rascunho foi preservado/);
    assert.match(hook,/pricePendingConflict === true/);
});
