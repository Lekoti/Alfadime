const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const price = path.join(root, "src/main/modules/price-pending");
const contacts = path.join(root, "src/main/modules/industry-contacts");
function load(file, mocks) {
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(file, "utf8"), {
        module, exports: module.exports, __dirname: path.dirname(file),
        require(name) {
            if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name];
            if (["node:crypto", "node:path"].includes(name)) return require(name);
            throw new Error(`Dependência real bloqueada: ${name}`);
        }
    }, { filename: file });
    return module.exports;
}
function fixture() {
    const state = {
        session: { id: 1, role: "editor" },
        response: { success: true, data: {
            user: { id: 1, role: "editor", is_active: 1 },
            modules: ["price-pending", "industry-contacts", "purchases", "settings"].map(module_key => ({ module_key, can_view: true, can_edit: true, can_delete: true })),
            functions: []
        } }
    };
    const api = load(path.join(price, "price-pending-authorization.js"), {
        "./price-pending-access": { requireUser() { if (!state.session) throw new Error("Usuário não autenticado."); return state.session; } },
        "../auth/granularPermissionsDatabaseService": { getPermissionsForUser: () => state.response }
    });
    const grant = (function_key, action = "can_execute") => {
        const existing = state.response.data.functions.find(item => item.module_key === "price-pending" && item.function_key === function_key);
        if (existing) existing[action] = true;
        else state.response.data.functions.push({ module_key: "price-pending", function_key, [action]: true });
    };
    return { state, api, grant };
}
function ipcEnvironment(kind, fixtureData = fixture()) {
    const handlers = new Map(); let effects = 0;
    const count = () => { effects++; return {}; };
    const ipc = { handle: (channel, handler) => handlers.set(channel, handler) };
    const repo = {
        VALID_BRANCHES: ["DPR", "AMS", "DMT", "DMS", "DSC"],
        listRows: () => [{ id: "r", laboratory: "LAB", observation: "oculto", precos_ok_dpr: "11/2026", manual_cells: { observation: true }, pending_external_updates: { observation: { value: "segredo" } } }],
        getRowById: () => ({ id: "r" }), createRow: count, updateCell: count, removeRow: count,
        updateEmailReceiptStatus: count, acceptExternalCellUpdate: count
    };
    const generic = new Proxy({}, { get: (_target, key) => key === "getRun" ? () => ({ id: "r", source: "automatic" }) : count });
    let api;
    if (kind === "price") {
        api = load(path.join(price, "price-pending.ipc.js"), {
            electron: { ipcMain: ipc }, "./price-pending-authorization": fixtureData.api,
            "./price-pending.repository": repo,
            "./price-pending-export.service": { exportToExcel: count, exportToExcelByLaboratory: count },
            "./price-pending.database": { testSharedConnection: count, DEFAULT_SHARED_DATABASE_PATH: "temporary" },
            "./price-pending-db-config.repository": { getDbConfig: count, saveDbConfig: count },
            "./price-pending-folders-config.repository": { getFoldersConfig: count, saveFoldersConfig: count, DEFAULT_FOLDERS: { prices: "temporary", pending: "temporary" } },
            "./price-pending-file-monitor.service": { refreshFromFolders: count, forceRefreshFromFolders: count },
            "./commercial-policy.service": { readCommercialPolicies: count }
        });
        api.registerPricePendingIpc();
    } else if (kind === "automatic") {
        api = load(path.join(price, "price-pending-automatic-charge.ipc.js"), {
            electron: { ipcMain: ipc }, "./price-pending-authorization": fixtureData.api,
            "./price-pending-access": { name: user => String(user.id) },
            "./price-pending-automatic-charge.service": generic
        });
        api.registerPricePendingAutomaticChargeIpc();
    } else if (kind === "favorites") {
        api = load(path.join(contacts, "contacts-charge.ipc.js"), {
            electron: { ipcMain: ipc }, "../price-pending/price-pending-authorization": fixtureData.api,
            "./contacts-charge-favorites.service": generic, "./contacts-charge-run.service": generic
        });
        api.registerContactsChargeIpc();
    } else if (kind === "contacts") {
        api = load(path.join(contacts, "industry-contacts.ipc.js"), {
            electron: { ipcMain: ipc }, "../price-pending/price-pending-authorization": fixtureData.api,
            "./industry-contacts.service": generic, "./industry-contacts-charge.service": generic,
            "./industry-contacts.database": generic, "./industry-contacts-config.repository": generic,
            "./industry-contacts-charge-view.service": generic
        });
        api.registerIndustryContactsIpc();
    } else {
        api = load(path.join(price, "price-pending-extensions.ipc.js"), {
            electron: { ipcMain: ipc }, "./price-pending-authorization": fixtureData.api,
            "./price-pending-priority.repository": { updatePriority: count },
            "./price-pending-automatic-charge.ipc": { registerPricePendingAutomaticChargeIpc() {} }
        });
        api.registerPricePendingExtensionsIpc();
    }
    return { ...fixtureData, handlers, effects: () => effects, call: (name, data) => handlers.get(name)({}, data) };
}
test("sem sessão: autorização bloqueia", () => {
    const f = fixture(); f.state.session = null; assert.throws(() => f.api.context(), /autenticado/);
});
test("usuário desativado é bloqueado mesmo com sessão antiga", () => {
    const f = fixture(); f.state.response.data.user.is_active = 0; assert.throws(() => f.api.context(), /inativo/);
});
test("ID divergente e erro no resolvedor falham fechados", () => {
    const f = fixture(); f.state.response.data.user.id = 2; assert.throws(() => f.api.context(), /inválida/);
    f.state.response = { success: false }; assert.throws(() => f.api.context(), /verificar/);
});
test("papel atual no banco prevalece sobre papel da sessão", () => {
    const f = fixture(); f.grant("manage_automatic_charge"); f.state.response.data.user.role = "viewer";
    assert.throws(() => f.api.context().requireFunction("price-pending", "manage_automatic_charge"), /perfil/);
});
test("criador sem permissão explícita não recebe bypass", () => {
    const f = fixture(); f.state.response.data.user.role = "creator";
    assert.throws(() => f.api.context().requireFunction("price-pending", "manage_automatic_charge"), /permissão/);
});
test("permissão de função não supera módulo invisível", () => {
    const f = fixture(); f.grant("manage_automatic_charge"); f.state.response.data.modules[0].can_view = false;
    assert.throws(() => f.api.context().requireFunction("price-pending", "manage_automatic_charge"), /permissão/);
});
test("grant e revogação são lidos em cada requisição", () => {
    const f = fixture(); f.grant("manage_automatic_charge");
    assert.equal(f.api.context().requireFunction("price-pending", "manage_automatic_charge").id, 1);
    f.state.response.data.functions = [];
    assert.throws(() => f.api.context().requireFunction("price-pending", "manage_automatic_charge"), /permissão/);
});
test("edição de célula exige ação e coluna, além de visualização", () => {
    const f = fixture(); f.grant("edit_values", "can_edit"); f.grant("precos_ok_dpr", "can_view"); f.grant("precos_ok", "can_view");
    assert.throws(() => f.api.context().requireCell("precos_ok_dpr"), /edição/);
    f.grant("precos_ok_dpr", "can_edit"); assert.equal(f.api.context().requireCell("precos_ok_dpr").id, 1);
    assert.throws(() => f.api.context().requireCell("precos_ok_ams"), /edição/);
});
test("alias de edição de laboratório preservado", () => {
    const f = fixture(); f.grant("laboratory", "can_view"); f.grant("laboratory", "can_edit");
    assert.equal(f.api.context().requireCell("laboratory").id, 1);
});
test("dados e propostas de colunas ocultas não vazam pelo retorno", () => {
    const f = fixture(); f.grant("laboratory", "can_view");
    const r = f.api.context().projectRow({ id: "r", laboratory: "LAB", observation: "segredo", manual_cells: { observation: true }, pending_external_updates: { observation: { value: "segredo" } } });
    assert.equal(r.laboratory, "LAB"); assert.equal(r.observation, undefined);
    assert.equal(Object.keys(r.manual_cells).length, 0); assert.equal(Object.keys(r.pending_external_updates).length, 0);
});
test("gerenciar automação não concede edição de favoritos arbitrários", () => {
    const f = fixture(); f.grant("manage_automatic_charge"); f.state.response.data.modules[1].can_edit = false;
    assert.throws(() => f.api.context().requireCharge(), /permissão/);
    assert.equal(f.api.context().requireHistoryControl({ source: "automatic" }).id, 1);
    assert.throws(() => f.api.context().requireHistoryControl({ source: "manual" }), /permissão/);
});
for (const kind of ["price", "automatic", "favorites", "contacts", "priority"]) {
    test(`IPC ${kind}: todos os canais registrados negam usuário não autenticado antes de efeitos`, () => {
        const h = ipcEnvironment(kind); h.state.session = null;
        assert.ok(h.handlers.size > 0);
        for (const [channel, handler] of h.handlers) {
            assert.throws(() => handler({}, {}), /autenticado/, channel);
        }
        assert.equal(h.effects(), 0);
    });
}
for (const [channel, data] of [
    ["price-pending:update-cell", { id: "r", column: "precos_ok_dpr", value: "11/2026" }],
    ["price-pending:accept-external-update", { id: "r", column: "precos_ok_dpr" }],
    ["price-pending:remove", "r"],
    ["price-pending:refresh", {}],
    ["price-pending:force-refresh", {}],
    ["price-pending:export", { includeColumns: ["laboratory"] }]
]) {
    test(`IPC negado sem efeito: ${channel}`, () => {
        const h = ipcEnvironment("price"); assert.throws(() => h.call(channel, data), /permissão/); assert.equal(h.effects(), 0);
    });
}
test("IPC exportação recusa coluna oculta mesmo com ação autorizada", () => {
    const h = ipcEnvironment("price"); h.grant("export_excel");
    assert.throws(() => h.call("price-pending:export", { includeColumns: ["observation"] }), /autorizadas/); assert.equal(h.effects(), 0);
});
test("IPC criação não permite injetar valor de célula sem autorização", () => {
    const h = ipcEnvironment("price"); h.grant("add_laboratory");
    assert.throws(() => h.call("price-pending:create", { laboratory: "LAB", precos_ok_dpr: "11/2026" }), /canais de edição/); assert.equal(h.effects(), 0);
});
test("IPC atualização de recebimento exige a coluna correta", () => {
    const h = ipcEnvironment("price");
    assert.throws(() => h.call("price-pending:update-email-receipt", { laboratory: "LAB", type: "precos", branch: "DPR" }), /permissão/); assert.equal(h.effects(), 0);
});
test("IPC edição autorizada chega uma vez ao repositório", () => {
    const h = ipcEnvironment("price"); h.grant("laboratory", "can_view"); h.grant("laboratory", "can_edit");
    h.call("price-pending:update-cell", { id: "r", column: "laboratory", value: "LAB" }); assert.equal(h.effects(), 1);
});
test("IPC lista preserva shape e remove coluna negada", () => {
    const h = ipcEnvironment("price"); h.grant("laboratory", "can_view");
    const r = h.call("price-pending:list"); assert.equal(r[0].laboratory, "LAB"); assert.equal(r[0].observation, undefined);
});
test("vínculo Política Comercial continua acessível pelo módulo Compras", () => {
    const h = ipcEnvironment("price"); h.state.response.data.modules[0].can_view = false;
    h.call("commercial-policy:read", {}); assert.equal(h.effects(), 1);
});
test("editor sem settings.can_edit não muda configuração", () => {
    const h = ipcEnvironment("price"); h.state.response.data.modules[3].can_edit = false;
    assert.throws(() => h.call("price-pending:save-folders-config", {}), /permissão/); assert.equal(h.effects(), 0);
});
test("automação requer ação específica e rejeita intervalo fracionário", () => {
    const h = ipcEnvironment("automatic"); assert.throws(() => h.call("price-pending-automatic-charge:run-now"), /permissão/);
    h.grant("manage_automatic_charge"); assert.throws(() => h.call("price-pending-automatic-charge:set-interval", 1.5), /inteiro/);
    h.call("price-pending-automatic-charge:run-now"); assert.equal(h.effects(), 1);
});
test("favoritos e contatos rejeitam exclusão sem can_delete", () => {
    for (const kind of ["favorites", "contacts"]) {
        const h = ipcEnvironment(kind); h.state.response.data.modules[1].can_delete = false;
        const channel = kind === "favorites" ? "contacts:delete-charge-favorite" : "industry-contacts:delete";
        assert.throws(() => h.call(channel, kind === "favorites" ? { id: "f" } : "c"), /permissão/); assert.equal(h.effects(), 0);
    }
});
test("consulta de histórico continua permitida sem editar Contatos", () => {
    const h = ipcEnvironment("favorites"); h.state.response.data.modules[1].can_view = false;
    h.call("contacts:list-charge-runs", { limit: 100 }); assert.equal(h.effects(), 1);
});
const { classifyResult } = require(path.join(price, "price-pending-charge-result.js"));
test("cancelamento não vira conclusão genérica com falhas", () => {
    const r = classifyResult({ success: false, cancelled: true, sent: 3, failed: 5 });
    assert.equal(r.kind, "cancelada"); assert.match(r.message, /cancelada/); assert.equal(r.success, false);
});
test("erro explícito e incerteza prevalecem sobre cancelamento", () => {
    assert.equal(classifyResult({ cancelled: true, error: "Falha ao persistir" }).message, "Falha ao persistir");
    assert.equal(classifyResult({ cancelled: true, uncertain: 1 }).kind, "falha");
});
test("sucesso verdadeiro limpa aviso; falha preserva diagnóstico do executor", () => {
    assert.equal(classifyResult({ success: true }).message, "");
    assert.equal(classifyResult({ success: false, error: "Motivo detalhado" }).message, "Motivo detalhado");
});
test("arquivos de produção passam em node --check", () => {
    const paths = [
        [price, "price-pending-authorization.js"], [price, "price-pending.ipc.js"],
        [price, "price-pending-automatic-charge.ipc.js"], [price, "price-pending-extensions.ipc.js"],
        [price, "price-pending-charge-result.js"], [price, "price-pending-automatic-charge.repository.js"],
        [contacts, "contacts-charge.ipc.js"], [contacts, "industry-contacts.ipc.js"]
    ];
    for (const [directory, file] of paths) {
        const r = spawnSync(process.execPath, ["--check", path.join(directory, file)], { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr);
    }
});

test("resultado inconsistente não é promovido a sucesso", () => {
    assert.equal(classifyResult({ success: true, failed: 1 }).success, false);
});
test("repositório registra cancelamento sem gravar um falso last_error", () => {
    const records = [];
    const db = {
        exec() {},
        prepare(sql) { return { run(...args) { records.push({ sql, args }); return { changes: 1 }; } }; },
        transaction: work => ({ immediate: work })
    };
    const api = load(path.join(price, "price-pending-automatic-charge.repository.js"), {
        "./price-pending.database": { getPricePendingDatabase: () => db },
        "./price-pending-charge-result": { classifyResult }
    });
    api.finish("owner", { success: false, cancelled: true, sent: 3, failed: 5 });
    const update = records.find(row => row.sql.includes("SET owner = NULL"));
    const event = records.find(row => row.sql.includes("INSERT INTO price_pending_auto_events"));
    assert.equal(update.args[0], 0); assert.equal(update.args[2], null); assert.equal(event.args[1], "cancelada");
    assert.equal(JSON.parse(event.args[3]).cancelled, true);
});
test("repositório preserva motivo detalhado de falha", () => {
    const records = [];
    const db = { exec() {}, prepare(sql) { return { run(...args) { records.push({ sql, args }); return { changes: 1 }; } }; }, transaction: work => ({ immediate: work }) };
    const api = load(path.join(price, "price-pending-automatic-charge.repository.js"), {
        "./price-pending.database": { getPricePendingDatabase: () => db }, "./price-pending-charge-result": { classifyResult }
    });
    api.finish("owner", { success: false, error: "Falha ao persistir resultado SMTP" });
    assert.equal(records.find(row => row.sql.includes("SET owner = NULL")).args[2], "Falha ao persistir resultado SMTP");
});
