const { ipcMain } = require("electron");

const repository = require("./price-pending.repository");

const {
    exportToExcel,
    exportToExcelByLaboratory
} = require("./price-pending-export.service");

const {
    testSharedConnection,
    DEFAULT_SHARED_DATABASE_PATH
} = require("./price-pending.database");

const {
    getDbConfig,
    saveDbConfig
} = require("./price-pending-db-config.repository");

const {
    getFoldersConfig,
    saveFoldersConfig,
    DEFAULT_FOLDERS
} = require("./price-pending-folders-config.repository");

const path = require("node:path");

let registered = false;

function registerPricePendingIpc() {
    if (registered) {
        return;
    }

    registered = true;

    ipcMain.handle("price-pending:list", () => {
        return repository.listRows();
    });

    ipcMain.handle("price-pending:get-by-id", (event, id) => {
        return repository.getRowById(id);
    });

    ipcMain.handle("price-pending:create", (event, data) => {
        return repository.createRow(data);
    });

    ipcMain.handle("price-pending:update-cell", (event, payload) => {
        return repository.updateCell(payload.id, payload.column, payload.value);
    });

    ipcMain.handle("price-pending:remove", (event, id) => {
        return repository.removeRow(id);
    });

    ipcMain.handle("price-pending:update-email-receipt", (event, payload) => {
        return repository.updateEmailReceiptStatus(payload);
    });

    ipcMain.handle("price-pending:refresh", async () => {
        const {
            refreshFromFolders
        } = require(
            "./price-pending-file-monitor.service"
        );

        return refreshFromFolders();
    });

    ipcMain.handle("price-pending:export", (event, options = {}) => {
        const { laboratory, filePath: customFilePath, includeColumns } = options;

        const fileName = `precos-pendencias-${new Date().toISOString().slice(0, 10)}.xlsx`;
        const filePath = customFilePath || path.join(
            __dirname,
            "..",
            "..",
            "..",
            "exports",
            fileName
        );

        console.log("[IPC price-pending:export] Resolved filePath:", filePath);

        if (laboratory) {
            return exportToExcelByLaboratory({
                filePath,
                laboratory
            });
        }

        return exportToExcel({
            filePath,
            includeColumns
        });
    });

    ipcMain.handle("price-pending:get-db-config", () => {
        const saved = getDbConfig();

        return {
            mode: saved?.mode === "shared" ? "shared" : "local",
            path: String(saved?.path || "").trim() || DEFAULT_SHARED_DATABASE_PATH,
            defaultPath: DEFAULT_SHARED_DATABASE_PATH
        };
    });

    ipcMain.handle("price-pending:save-db-config", (event, config = {}) => {
        const mode = config.mode === "shared" ? "shared" : "local";
        const dbPath = String(config.path || "").trim() || DEFAULT_SHARED_DATABASE_PATH;

        saveDbConfig({
            mode,
            path: dbPath
        });

        return {
            mode,
            path: dbPath,
            defaultPath: DEFAULT_SHARED_DATABASE_PATH
        };
    });

    ipcMain.handle("price-pending:test-connection", (event, customPath) => {
        return testSharedConnection(customPath);
    });

    ipcMain.handle("price-pending:get-folders-config", () => {
        return getFoldersConfig();
    });


    ipcMain.handle("price-pending:save-folders-config", (event, config = {}) => {
        const prices = String(config.prices || DEFAULT_FOLDERS.prices).trim();
        const pending = String(config.pending || DEFAULT_FOLDERS.pending).trim();


        saveFoldersConfig({
            prices,
            pending
        });


        return getFoldersConfig();
    });
}

module.exports = {
    registerPricePendingIpc
};