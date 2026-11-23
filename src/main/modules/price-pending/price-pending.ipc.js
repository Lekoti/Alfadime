const { ipcMain } = require("electron");
const path = require("node:path");
const authorization = require("./price-pending-authorization");
const repository = require("./price-pending.repository");
const cellEdits = require("./price-pending-cell-edits.service");
const { exportToExcel, exportToExcelByLaboratory } = require("./price-pending-export.service");
const { testSharedConnection, DEFAULT_SHARED_DATABASE_PATH } = require("./price-pending.database");
const { getDbConfig, saveDbConfig } = require("./price-pending-db-config.repository");
const { getFoldersConfig, saveFoldersConfig, DEFAULT_FOLDERS } = require("./price-pending-folders-config.repository");
const { refreshFromFolders, forceRefreshFromFolders } = require("./price-pending-file-monitor.service");
const { readCommercialPolicies } = require("./commercial-policy.service");

let registered = false;
function object(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Dados da operação inválidos.");
    return value;
}
function id(value) {
    if (typeof value !== "string" || !value.trim()) throw new Error("Identificador obrigatório.");
    return value.trim();
}
function registerPricePendingIpc() {
    if (registered) return;
    registered = true;
    ipcMain.handle("commercial-policy:read", (_event, options = {}) => {
        authorization.context().requireAnyModule(["price-pending", "purchases"]);
        return readCommercialPolicies({ force: options?.force === true });
    });
    ipcMain.handle("price-pending:list", () => {
        const auth = authorization.context();
        auth.requireModule("price-pending");
        return repository.listRows().map(auth.projectRow);
    });
    ipcMain.handle("price-pending:get-by-id", (_event, rowId) => {
        const auth = authorization.context();
        auth.requireModule("price-pending");
        return auth.projectRow(repository.getRowById(id(rowId)));
    });
    ipcMain.handle("price-pending:create", (_event, data) => {
        const auth = authorization.context();
        auth.requireFunction("price-pending", "add_laboratory");
        const payload = object(data);
        // Este canal cria cadastro; valores de células exigem autorização própria.
        if (Object.keys(payload).some(key => !["laboratory", "observation", "sort_order"].includes(key))) {
            throw new Error("Crie o cadastro e use os canais de edição autorizados para preencher células.");
        }
        if (String(payload.observation || "").trim()) auth.requireCell("observation");
        return auth.projectRow(repository.createRow(payload));
    });
    ipcMain.handle("price-pending:update-cell", (_event, data) => {
        const auth = authorization.context();
        const payload = object(data);
        auth.requireCell(payload.column);
        const result = cellEdits.updateCell({
            id: id(payload.id), column: payload.column,
            value: payload.value, expectedValue: payload.expectedValue,
            expectedVersion: Number(payload.expectedVersion), ownerId: String(auth.id)
        });
        const row = auth.projectRow(result.row);
        return result.conflict ? { pricePendingConflict: true, row } : row;
    });
    ipcMain.handle("price-pending:remove", (_event, rowId) => {
        authorization.context().requireFunction("price-pending", "remove_laboratory");
        return repository.removeRow(id(rowId));
    });
    ipcMain.handle("price-pending:update-email-receipt", (_event, data) => {
        const auth = authorization.context();
        const payload = object(data);
        const branch = String(payload.branch || "").trim().toUpperCase();
        const type = String(payload.type || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        if (!repository.VALID_BRANCHES.includes(branch)) throw new Error("Filial inválida.");
        const prefix = ["precos", "preco", "env_precos"].includes(type) ? "env_precos"
            : ["pendencias", "pendencia", "env_pend"].includes(type) ? "env_pend" : "";
        if (!prefix) throw new Error("Tipo de recebimento inválido.");
        auth.requireCell(`${prefix}_${branch.toLowerCase()}`);
        return repository.updateEmailReceiptStatus(payload);
    });
    ipcMain.handle("price-pending:refresh", () => {
        authorization.context().requireFunction("price-pending", "refresh_data");
        return refreshFromFolders();
    });
    ipcMain.handle("price-pending:force-refresh", () => {
        authorization.context().requireFunction("price-pending", "refresh_data");
        return forceRefreshFromFolders();
    });
    ipcMain.handle("price-pending:accept-external-update", (_event, data) => {
        const auth = authorization.context();
        const payload = object(data);
        auth.requireCell(payload.column);
        const result = cellEdits.acceptExternalUpdate({
            id: id(payload.id), column: payload.column,
            expectedValue: payload.expectedValue, expectedProposal: payload.expectedProposal
        });
        const row = auth.projectRow(result.row);
        return result.conflict ? { pricePendingConflict: true, row } : row;
    });
    ipcMain.handle("price-pending:list-cell-versions", (_event, rowIds) => {
        authorization.context().requireModule("price-pending");
        return repository.listCellVersions(Array.isArray(rowIds) ? rowIds : []);
    });
    ipcMain.handle("price-pending:list-drafts", () => {
        const auth = authorization.context();
        auth.requireModule("price-pending");
        return repository.listDrafts(String(auth.id));
    });
    ipcMain.handle("price-pending:save-draft", (_event, data) => {
        const auth = authorization.context();
        const payload = object(data);
        auth.requireCell(payload.column);
        return repository.saveDraft({
            rowId: id(payload.rowId), column: payload.column, ownerId: String(auth.id),
            value: payload.value, baseValue: payload.baseValue, baseVersion: payload.baseVersion
        });
    });
    ipcMain.handle("price-pending:delete-draft", (_event, data) => {
        const auth = authorization.context();
        const payload = object(data);
        auth.requireCell(payload.column);
        return repository.deleteDraft({ rowId: id(payload.rowId), column: payload.column, ownerId: String(auth.id) });
    });
    ipcMain.handle("price-pending:export", (_event, options = {}) => {
        const auth = authorization.context();
        auth.requireFunction("price-pending", "export_excel");
        object(options);
        const includeColumns = options.includeColumns === undefined
            ? authorization.COLUMNS.filter(auth.canViewColumn) : options.includeColumns;
        if (!Array.isArray(includeColumns) || !includeColumns.length || includeColumns.some(column => !auth.canViewColumn(column))) {
            throw new Error("A exportação contém colunas não autorizadas ou nenhuma coluna visível.");
        }
        const fileName = `precos-pendencias-${new Date().toISOString().slice(0, 10)}.xlsx`;
        const filePath = options.filePath || path.join(__dirname, "..", "..", "..", "exports", fileName);
        if (options.laboratory) {
            return exportToExcelByLaboratory({ filePath, laboratory: options.laboratory });
        }
        return exportToExcel({ filePath, includeColumns, rowIds: options.rowIds });
    });
    ipcMain.handle("price-pending:get-db-config", () => {
        authorization.context().requireAnyModule(["price-pending", "settings"]);
        getDbConfig();
        return { mode: "shared", path: DEFAULT_SHARED_DATABASE_PATH, defaultPath: DEFAULT_SHARED_DATABASE_PATH };
    });
    ipcMain.handle("price-pending:save-db-config", () => {
        authorization.context().requireModule("settings", "can_edit");
        saveDbConfig();
        return { mode: "shared", path: DEFAULT_SHARED_DATABASE_PATH, defaultPath: DEFAULT_SHARED_DATABASE_PATH };
    });
    ipcMain.handle("price-pending:test-connection", (_event, customPath) => {
        authorization.context().requireModule("settings", "can_edit");
        return testSharedConnection(customPath);
    });
    ipcMain.handle("price-pending:get-folders-config", () => {
        authorization.context().requireAnyModule(["price-pending", "settings"]);
        return getFoldersConfig();
    });
    ipcMain.handle("price-pending:save-folders-config", (_event, config = {}) => {
        authorization.context().requireModule("settings", "can_edit");
        object(config);
        const prices = String(config.prices || DEFAULT_FOLDERS.prices).trim();
        const pending = String(config.pending || DEFAULT_FOLDERS.pending).trim();
        saveFoldersConfig({ prices, pending });
        return getFoldersConfig();
    });
}
module.exports = { registerPricePendingIpc };
