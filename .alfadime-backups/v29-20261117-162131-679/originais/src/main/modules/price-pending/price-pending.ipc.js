const { ipcMain: originalIpcMain } = require("electron");
const access = require("./price-pending-access");
const readOnlyChannels = new Set([
    "commercial-policy:read", "price-pending:list", "price-pending:get-by-id",
    "price-pending:get-db-config", "price-pending:get-folders-config"
]);
const ipcMain = {
    handle(channel, handler) {
        originalIpcMain.handle(channel, (event, ...args) => {
            if (readOnlyChannels.has(channel)) access.requireUser();
            else access.requireEditor();
            return handler(event, ...args);
        });
    }
};
const path = require("node:path");
const repository = require("./price-pending.repository");
const { exportToExcel, exportToExcelByLaboratory } = require("./price-pending-export.service");
const { testSharedConnection, DEFAULT_SHARED_DATABASE_PATH } = require("./price-pending.database");
const { getDbConfig, saveDbConfig } = require("./price-pending-db-config.repository");
const { getFoldersConfig, saveFoldersConfig, DEFAULT_FOLDERS } = require("./price-pending-folders-config.repository");
const { refreshFromFolders, forceRefreshFromFolders } = require("./price-pending-file-monitor.service");
const { readCommercialPolicies } = require("./commercial-policy.service");
let registered = false;
function registerPricePendingIpc() {
    if (registered) return;
    registered = true;
    // Read-only endpoint. No new database and no change to pending-file routines.
    ipcMain.handle("commercial-policy:read", (_event, options={}) => readCommercialPolicies({force:options?.force===true}));
    ipcMain.handle("price-pending:list", () => repository.listRows());
    ipcMain.handle("price-pending:get-by-id", (event,id) => repository.getRowById(id));
    ipcMain.handle("price-pending:create", (event,data) => repository.createRow(data));
    ipcMain.handle("price-pending:update-cell", (event,payload) => repository.updateCell(payload.id,payload.column,payload.value));
    ipcMain.handle("price-pending:remove", (event,id) => repository.removeRow(id));
    ipcMain.handle("price-pending:update-email-receipt", (event,payload) => repository.updateEmailReceiptStatus(payload));
    ipcMain.handle("price-pending:refresh", async () => refreshFromFolders());
    ipcMain.handle("price-pending:force-refresh", async () => forceRefreshFromFolders());
    ipcMain.handle("price-pending:accept-external-update", (event,payload={}) => repository.acceptExternalCellUpdate({id:payload.id,column:payload.column}));
    ipcMain.handle("price-pending:export", (event,options={}) => {
        const {laboratory,filePath:customFilePath,includeColumns,rowIds}=options;
        const fileName=`precos-pendencias-${new Date().toISOString().slice(0,10)}.xlsx`;
        const filePath=customFilePath||path.join(__dirname,"..","..","..","exports",fileName);
        console.log("[IPC price-pending:export] Resolved filePath:",filePath);
        if(laboratory)return exportToExcelByLaboratory({filePath,laboratory});
        return exportToExcel({filePath,includeColumns,rowIds});
    });
    ipcMain.handle("price-pending:get-db-config", () => {
        const saved=getDbConfig();
        return {
            mode: "shared",
            path: DEFAULT_SHARED_DATABASE_PATH,
            defaultPath: DEFAULT_SHARED_DATABASE_PATH
        };
    });
    ipcMain.handle("price-pending:save-db-config", (event,config={}) => {
        const saved=saveDbConfig();
        return {
            mode: "shared",
            path: DEFAULT_SHARED_DATABASE_PATH,
            defaultPath: DEFAULT_SHARED_DATABASE_PATH
        };
    });
    ipcMain.handle("price-pending:test-connection", (event,customPath) => testSharedConnection(customPath));
    ipcMain.handle("price-pending:get-folders-config", () => getFoldersConfig());
    ipcMain.handle("price-pending:save-folders-config", (event,config={}) => {
        const prices=String(config.prices||DEFAULT_FOLDERS.prices).trim(),pending=String(config.pending||DEFAULT_FOLDERS.pending).trim();
        saveFoldersConfig({prices,pending});return getFoldersConfig();
    });
}
module.exports={registerPricePendingIpc};
