const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const moduleRoot = path.join(root, "src/main/modules/industry-contacts");
function load(file, mocks) {
    const module = { exports: {} };
    const code = fs.readFileSync(file, "utf8");
    const sandbox = {
        module, exports: module.exports, setImmediate, setTimeout, clearTimeout, setInterval, clearInterval,
        console: { log() {}, error() {} },
        require(name) {
            if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name];
            if (["node:crypto", "node:path", "node:fs", "node:async_hooks"].includes(name)) return require(name);
            throw new Error(`Dependência real bloqueada pelo teste: ${name}`);
        }
    };
    vm.runInNewContext(code, sandbox, { filename: file });
    return module.exports;
}
const { executeCharge } = require(path.join(moduleRoot, "contacts-charge-execution.service.js"));
function scenario(options = {}) {
    const item = { id: "i", contact_id: "c", email: "test@example.invalid", status: "pending" };
    let status = "pending";
    let calls = 0;
    const plan = {
        favorite: { id: "f", name: "f", charge_type: "both" },
        messages: [{ contact: { id: "c", laboratory_name: "LAB", branch: "DPR" }, to: item.email, attachments: [] }],
        fingerprints: new Map(), cancelRequested: Boolean(options.cancelled)
    };
    const runs = {
        startRun() { status = "running"; },
        updateItemStatus(runId, itemId, next) {
            if (options.sendingError && next === "sending") throw new Error("Banco ocupado antes do envio");
            if (options.sentError && next === "sent") throw new Error("Falha ao persistir sucesso");
            item.status = next;
        }
    };
    const execution = {
        createRun() { if (options.createError) throw new Error("Falha de criação"); return { id: "r", items: [item] }; },
        isCancellationRequested() { return Boolean(options.remoteCancelled); },
        finishRun(id, cancelled) { status = cancelled ? "cancelled" : "completed"; return { status, cancelled: cancelled ? 1 : 0 }; },
        interruptRun() { if (options.interruptError) throw new Error("Banco indisponível"); status = "interrupted"; return { status }; }
    };
    async function executePlan() {
        calls += 1;
        if (options.send) return options.send(plan);
        return { success: true, sent: 1, delivery_status: "sent", results: [{ success: true }] };
    }
    return { plan, run: () => executeCharge(plan, "token", { runs, execution, executePlan }), get: () => ({ status, item: item.status, calls }) };
}

test("sucesso: um destinatário, um resultado e contadores coerentes", async () => {
    const s = scenario(); const r = await s.run();
    assert.equal(r.success, true); assert.equal(r.sent, 1); assert.equal(r.failed, 0);
    assert.equal(r.processed, 1); assert.equal(r.results.length, 1); assert.ok(s.plan.finishedAt);
});
test("falha de histórico após SMTP não duplica nem transforma sucesso SMTP em falha", async () => {
    const s = scenario({ sentError: true }); const r = await s.run();
    assert.equal(r.success, false); assert.equal(r.sent, 1); assert.equal(r.failed, 0);
    assert.equal(r.processed, 1); assert.equal(r.results.length, 1);
    assert.ok(r.results[0].historyWarning); assert.equal(r.status, "interrupted");
});
test("erro ao marcar sending não chama envio e finaliza plano em memória", async () => {
    const s = scenario({ sendingError: true }); const r = await s.run();
    assert.equal(s.get().calls, 0); assert.equal(r.success, false); assert.equal(r.status, "interrupted"); assert.ok(s.plan.finishedAt);
});
test("erro na criação da execução também termina plano", async () => {
    const s = scenario({ createError: true }); const r = await s.run();
    assert.equal(r.run_id, null); assert.equal(r.success, false); assert.ok(s.plan.finishedAt);
});
test("cancelamento anterior ao início é preservado", async () => {
    const s = scenario({ cancelled: true }); const r = await s.run();
    assert.equal(s.get().calls, 0); assert.equal(r.cancelled, true); assert.equal(r.cancelledCount, 1);
});
test("pedido persistido de outra instância impede o próximo envio", async () => {
    const s = scenario({ remoteCancelled: true }); const r = await s.run();
    assert.equal(s.get().calls, 0); assert.equal(r.cancelled, true);
});
test("falha segura antes da transmissão produz uma falha sem resultado incerto", async () => {
    const s = scenario({ send: async () => { throw Object.assign(new Error("Pré-validação"), { safeToRetry: true }); } });
    const r = await s.run(); assert.equal(r.failed, 1); assert.equal(r.uncertain, 0); assert.equal(r.results.length, 1);
});
test("resultado incerto interrompe e não marca item como reenviável", async () => {
    const s = scenario({ send: async () => ({ success: false, sent: 0, delivery_status: "sending", results: [{ success: false, error: "Resposta incerta" }] }) });
    const r = await s.run(); assert.equal(r.uncertain, 1); assert.equal(r.failed, 0); assert.equal(s.get().item, "sending"); assert.equal(r.status, "interrupted");
});
test("falha na reserva após SMTP preserva evidência do envio", async () => {
    const s = scenario({ send: async () => { throw Object.assign(new Error("Falha de reserva"), { deliveryResult: { success: true, sent: 1, results: [{ success: true }] } }); } });
    const r = await s.run(); assert.equal(r.sent, 1); assert.equal(r.success, false); assert.equal(r.results.length, 1); assert.ok(r.results[0].historyWarning);
});
test("resposta malformada é conservadoramente interrompida", async () => {
    const s = scenario({ send: async () => ({ success: true, sent: 1, results: [] }) });
    const r = await s.run(); assert.equal(r.success, false); assert.equal(r.uncertain, 1);
});
test("falha até na persistência da interrupção não deixa finishedAt ausente", async () => {
    const s = scenario({ sendingError: true, interruptError: true }); const r = await s.run();
    assert.ok(s.plan.finishedAt); assert.match(r.error, /persistir interrupção/);
});
test("falha após primeiro destinatário não inicia o segundo", async () => {
    const s = scenario({ sentError: true });
    s.plan.messages.push({ ...s.plan.messages[0], to: "second@example.invalid" });
    const r = await s.run(); assert.equal(s.get().calls, 1); assert.equal(r.processed, 1); assert.equal(r.expected, 2);
});
function favoriteHarness(options = {}) {
    const favorite = { id: "fixed", name: "Fixo", charge_type: "both", recipients: [], industries: [], attachments: [] };
    const rows = options.rows || [
        { id: "dpr", branch: "DPR", email: "test@example.invalid", laboratory_name: "LAB", prices_updated: false, pending_updated: false },
        { id: "ams", branch: "AMS", email: "test@example.invalid", laboratory_name: "LAB", prices_updated: false, pending_updated: false }
    ];
    let calls = 0;
    const api = load(path.join(moduleRoot, "contacts-charge-favorites.service.js"), {
        "./contacts-charge-favorites.repository": { FIXED_FAVORITE_ID: "fixed", getFavorite: () => favorite, listFavorites() {}, saveFavorite() {}, deleteFavorite() {} },
        "./contacts-charge-run.repository": {}, "./industry-contacts.repository": { listLaboratories: () => [], getContactById: () => null },
        "./industry-contacts-charge-view.service": { listLaboratories: () => ({ rows }) },
        "../email-dispatch/email-dispatch.repository": { listEmailConfigs: () => [] },
        "../email-dispatch/email-dispatch-smtp.service": { sendEmailViaSmtp: () => { throw new Error("SMTP real proibido"); } },
        "../../utils/validation.utils": { isValidEmail: value => /@/.test(value) },
        "./industry-contacts-charge.constants": { CHARGE_TYPES: { BOTH: "both", PRICES: "prices", PENDING: "pending" }, CHARGE_SUBJECTS: { both: "Assunto" }, CHARGE_EMAIL_BODIES: { both: "Texto" } },
        "./industry-contacts-charge.service": { getAttachmentPaths: () => [] },
        "./contacts-charge-policy": { normalizeBranch: v => String(v).trim().toUpperCase(), VALID_BRANCHES: new Set(["DPR", "AMS", "DMT", "DMS", "DSC"]) },
        "./contacts-charge-execution.repository": {},
        "./contacts-charge-execution.service": { executeCharge: async plan => { calls++; plan.finishedAt = new Date().toISOString(); return { success: true }; } },
        "./contacts-charge-coordination": { manual: work => work() }
    });
    return { api, calls: () => calls };
}
test("mesmo e-mail preserva DPR e AMS em covered", async () => {
    const h = favoriteHarness(); const p = await h.api.prepareFavoriteCharge({ favorite_id: "fixed" });
    assert.equal(p.message_count, 1); assert.equal(p.messages[0].covered[0].branch, "DPR"); assert.equal(p.messages[0].covered[1].branch, "AMS");
});
test("preparação pode ser cancelada sem SMTP", async () => {
    const h = favoriteHarness(); await assert.rejects(h.api.prepareFavoriteCharge({ favorite_id: "fixed", shouldCancel: () => true }), /cancelada/); assert.equal(h.calls(), 0);
});
test("repetir token concluído não reenvia", async () => {
    const h = favoriteHarness(); const p = await h.api.prepareFavoriteCharge({ favorite_id: "fixed" });
    await h.api.sendFavoriteCharge({ preview_token: p.preview_token }); await h.api.sendFavoriteCharge({ preview_token: p.preview_token });
    assert.equal(h.calls(), 1); assert.equal(h.api.getChargeStatus({ preview_token: p.preview_token }).running, false);
});
test("cancelar token antes de enviar impede o executor de perder o sinal", async () => {
    const s = scenario({ cancelled: true }); const r = await s.run(); assert.equal(r.cancelled, true); assert.equal(s.get().calls, 0);
});
test("arquivos JavaScript de produção passam em verificação sintática", () => {
    const { spawnSync } = require("node:child_process");
    for (const rel of ["contacts-charge-execution.service.js", "contacts-charge-execution.repository.js", "contacts-charge-favorites.service.js", "contacts-charge-coordination.js", "contacts-charge-run.service.js", "industry-contacts-charge-view.service.js"]) {
        const r = spawnSync(process.execPath, ["--check", path.join(moduleRoot, rel)], { encoding: "utf8" });
        assert.equal(r.status, 0, r.stderr);
    }
    const r = spawnSync(process.execPath, ["--check", path.join(root, "src/main/modules/price-pending/price-pending-automatic-charge.service.js")], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
});
test("JSX parseado quando @babel/parser estiver disponível", t => {
    let parser;
    try { parser = require("@babel/parser"); } catch (_) { t.skip("Parser JSX não disponível; executar npm run build no Windows."); return; }
    parser.parse(fs.readFileSync(path.join(root, "src/renderer/modules/price-pending/components/PricePendingChargePanel.jsx"), "utf8"), { sourceType: "module", plugins: ["jsx"] });
});

function sqlHarness(t) {
    let DatabaseSync;
    try { ({ DatabaseSync } = require("node:sqlite")); }
    catch (_) { t.skip("node:sqlite indisponível; integração SQL deve ser validada no ambiente de destino."); return null; }
    const sqlite = new DatabaseSync(":memory:");
    t.after(() => sqlite.close());
    sqlite.exec(`
        CREATE TABLE contact_charge_runs (id TEXT PRIMARY KEY, status TEXT, finished_at TEXT, error_message TEXT);
        CREATE TABLE contact_charge_run_items (id TEXT PRIMARY KEY, run_id TEXT, status TEXT);
    `);
    const db = {
        exec: sql => sqlite.exec(sql),
        prepare: sql => sqlite.prepare(sql),
        transaction: work => ({ immediate() {
            sqlite.exec("BEGIN IMMEDIATE");
            try { const result = work(); sqlite.exec("COMMIT"); return result; }
            catch (error) { sqlite.exec("ROLLBACK"); throw error; }
        } })
    };
    const runs = {
        createRun(data) {
            sqlite.prepare("INSERT INTO contact_charge_runs VALUES (?, 'pending', NULL, NULL)").run("r");
            if (data.fail) throw new Error("Falha após cabeçalho");
            return this.getRun("r");
        },
        getRun(id) {
            const run = sqlite.prepare("SELECT * FROM contact_charge_runs WHERE id = ?").get(id);
            return run ? { ...run, items: sqlite.prepare("SELECT * FROM contact_charge_run_items WHERE run_id = ?").all(id) } : null;
        },
        refreshRunCounters() {},
        cancelRun(id) {
            sqlite.prepare("UPDATE contact_charge_run_items SET status = 'cancelled' WHERE run_id = ? AND status = 'pending'").run(id);
            sqlite.prepare("UPDATE contact_charge_runs SET status = 'cancelled' WHERE id = ?").run(id);
        },
        finishRun(id) { sqlite.prepare("UPDATE contact_charge_runs SET status = 'completed' WHERE id = ?").run(id); return this.getRun(id); }
    };
    const api = load(path.join(moduleRoot, "contacts-charge-execution.repository.js"), {
        "./industry-contacts.database": { getDatabase: () => db },
        "./contacts-charge-run.repository": runs
    });
    return { api, sqlite, runs };
}
test("SQL: criação reverte cabeçalho quando há falha na transação", t => {
    const h = sqlHarness(t); if (!h) return;
    assert.throws(() => h.api.createRun({ fail: true }), /Falha/);
    assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS n FROM contact_charge_runs").get().n, 0);
});
test("SQL: cancelamento é persistido sem concluir histórico prematuramente", t => {
    const h = sqlHarness(t); if (!h) return;
    h.api.createRun({}); h.api.requestCancel("r", "Teste");
    assert.equal(h.api.isCancellationRequested("r"), true);
    assert.equal(h.runs.getRun("r").status, "pending");
});
test("SQL: finalização rejeita item pending sem alterar status", t => {
    const h = sqlHarness(t); if (!h) return;
    h.api.createRun({}); h.sqlite.exec("INSERT INTO contact_charge_run_items VALUES ('i','r','pending')");
    assert.throws(() => h.api.finishRun("r", false), /pendentes/);
    assert.equal(h.runs.getRun("r").status, "pending");
});
test("SQL: cancelamento não converte sending incerto em cancelado", t => {
    const h = sqlHarness(t); if (!h) return;
    h.api.createRun({}); h.sqlite.exec("INSERT INTO contact_charge_run_items VALUES ('i','r','sending')");
    assert.throws(() => h.api.finishRun("r", true), /incerto/);
    assert.equal(h.runs.getRun("r").items[0].status, "sending");
});
test("SQL: interrupção registra erro sem apagar itens nem reservas", t => {
    const h = sqlHarness(t); if (!h) return;
    h.api.createRun({}); h.sqlite.exec("INSERT INTO contact_charge_run_items VALUES ('i','r','sending')");
    const run = h.api.interruptRun("r", "Conferir SMTP");
    assert.equal(run.status, "interrupted"); assert.equal(run.error_message, "Conferir SMTP");
    assert.equal(run.items[0].status, "sending");
});

function viewHarness(priceRows) {
    const api = load(path.join(moduleRoot, "industry-contacts-charge-view.service.js"), {
        "./industry-contacts.service": { listLaboratories: () => ({ rows: [{ id: "c", laboratory_name: "LAB", branch: "DPR" }] }) },
        "../price-pending/price-pending.repository": { listRows: () => priceRows },
        "./industry-contacts-charge-history.repository": { getLastChargesMap: () => new Map() },
        "../price-pending/price-pending-validation": { isUpdatedPeriod: value => value === "11/2026" }
    });
    return api;
}
test("visão usa parser compartilhado para data mensal e aceita nome com código sem ambiguidade", () => {
    const api = viewHarness([{ laboratory: "LAB - 123", precos_ok_dpr: "11/2026", pendencias_ok_dpr: "11/2026" }]);
    const result = api.listLaboratories(); assert.equal(result.rows[0].charge_update_status, "updated");
});
test("visão rejeita fallback de nome ambíguo", () => {
    const api = viewHarness([{ laboratory: "LAB - 123" }, { laboratory: "LAB - 456" }]);
    assert.throws(() => api.listLaboratories(), /Mais de um cadastro/);
});
test("visão preserva isenção NAO TRABALHA", () => {
    const api = viewHarness([{ laboratory: "LAB", precos_ok_dpr: "NAO TRABALHA", pendencias_ok_dpr: "NAO TRABALHA" }]);
    assert.equal(api.listLaboratories().rows[0].charge_update_status, "updated");
});
function automationHarness(initial = {}) {
    let current = { enabled: true, running: false, recovery_required: false, next_allowed_ms: 0, ...initial };
    const api = load(path.join(root, "src/main/modules/price-pending/price-pending-automatic-charge.service.js"), {
        "./price-pending-automatic-charge.repository": {
            getStatus: () => ({ ...current }),
            tryLock: () => { current.running = true; return "owner"; }, heartbeat: () => true,
            finish: () => { current.running = false; },
            setEnabled: value => { current.enabled = value; }, setIntervalHours() {}, clearLastError() {}
        },
        "../industry-contacts/contacts-charge-favorites.service": {
            FIXED_FAVORITE_ID: "fixed",
            prepareFavoriteCharge: async () => ({ preview_token: "t", message_count: 1 }),
            sendFavoriteCharge: async () => ({ success: true, sent: 1, expected: 1 }),
            getChargeStatus: () => ({ total: 1, current: 1, sent: 1, finishedAt: "2026-11-17T00:00:00Z" }),
            cancelCharge() {}
        },
        "../industry-contacts/contacts-charge-coordination": { automatic: work => work() }
    });
    return api;
}
test("automação publica snapshot final mesmo em execução com menos de um segundo", async () => {
    const api = automationHarness(); const result = await api.runCharge(true);
    assert.equal(result.success, true); assert.equal(api.getStatus().progress.current, 1); assert.equal(api.getStatus().progress.sent, 1);
});
test("reserva com lease não expirado é tratada como externa, não como interrupção comprovada", () => {
    const api = automationHarness({ running: true }); assert.equal(api.getStatus().phase, "external");
});
test("reserva expirada continua visível mesmo com agendamento desativado", () => {
    const api = automationHarness({ enabled: false, running: true, recovery_required: true });
    assert.equal(api.getStatus().phase, "interrupted");
});
