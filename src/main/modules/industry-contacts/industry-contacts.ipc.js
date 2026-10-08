const {
    ipcMain
} = require("electron");

const service = require(
    "./industry-contacts.service"
);

const chargeService = require(
    "./industry-contacts-charge.service"
);

const database = require(
    "./industry-contacts.database"
);

const configRepository = require(
    "./industry-contacts-config.repository"
);

let registered = false;

function registerIndustryContactsIpc() {
    if (registered) {
        return;
    }

    registered = true;

    ipcMain.handle(
        "industry-contacts:list",
        () => {
            return service.listLaboratories();
        }
    );

    ipcMain.handle(
        "industry-contacts:without-contact",
        () => {
            return service.getLaboratoriesWithoutContacts();
        }
    );

    ipcMain.handle(
        "industry-contacts:save",
        (_event, data) => {
            return service.saveContact(data);
        }
    );

    ipcMain.handle(
        "industry-contacts:delete",
        (_event, id) => {
            return service.deleteContact(id);
        }
    );

    ipcMain.handle(
        "industry-contacts:prepare-charge",
        (_event, payload = {}) => {
            return chargeService.prepareCharge(
                payload
            );
        }
    );

    ipcMain.handle(
        "industry-contacts:send-charge",
        (_event, payload = {}) => {
            return chargeService.sendCharge(
                payload
            );
        }
    );

    ipcMain.handle(
        "industry-contacts:get-db-config",
        () => {
            const saved =
                configRepository.getDbConfig();

            return {
                mode:
                    saved?.mode === "shared"
                        ? "shared"
                        : "local",
                path:
                    String(saved?.path || "").trim() ||
                    configRepository
                        .DEFAULT_SHARED_DATABASE_PATH,
                defaultPath:
                    configRepository
                        .DEFAULT_SHARED_DATABASE_PATH
            };
        }
    );

    ipcMain.handle(
        "industry-contacts:save-db-config",
        (_event, config = {}) => {
            const mode =
                config.mode === "shared"
                    ? "shared"
                    : "local";

            const databasePath =
                String(config.path || "").trim() ||
                configRepository
                    .DEFAULT_SHARED_DATABASE_PATH;

            const saved =
                configRepository.saveDbConfig({
                    mode,
                    path: databasePath
                });

            database.closeDatabase();

            return {
                mode:
                    saved?.mode || mode,
                path:
                    saved?.path || databasePath,
                defaultPath:
                    configRepository
                        .DEFAULT_SHARED_DATABASE_PATH
            };
        }
    );

    ipcMain.handle(
        "industry-contacts:test-connection",
        (_event, customPath) => {
            return database.testConnection(
                customPath
            );
        }
    );
}

module.exports = {
    registerIndustryContactsIpc
};