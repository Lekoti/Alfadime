const { ipcMain } = require("electron");
const service = require("./industry-contacts.service");
const chargeService = require("./industry-contacts-charge.service");
const database = require("./industry-contacts.database");
const configRepository = require("./industry-contacts-config.repository");
const authorization = require("../price-pending/price-pending-authorization");

let registered = false;
function object(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Dados de contato inválidos.");
    return value;
}
function registerIndustryContactsIpc() {
    if (registered) return;
    registered = true;
    function handle(channel, check, work) {
        ipcMain.handle(channel, (_event, data) => {
            check(authorization.context());
            return work(data);
        });
    }
    const read = auth => auth.requireModule("industry-contacts");
    const edit = auth => auth.requireModule("industry-contacts", "can_edit");
    const remove = auth => auth.requireModule("industry-contacts", "can_delete");
    const readConfig = auth => auth.requireAnyModule(["industry-contacts", "settings"]);
    const configure = auth => auth.requireModule("settings", "can_edit");
    handle("industry-contacts:list", read, () => require("./industry-contacts-charge-view.service").listLaboratories());
    handle("industry-contacts:without-contact", read, () => service.getLaboratoriesWithoutContacts());
    handle("industry-contacts:save", edit, data => service.saveContact(object(data)));
    handle("industry-contacts:delete", remove, id => {
        if (typeof id !== "string" || !id.trim()) throw new Error("Identificador de contato obrigatório.");
        return service.deleteContact(id.trim());
    });
    handle("industry-contacts:prepare-charge", edit, data => chargeService.prepareCharge(object(data)));
    handle("industry-contacts:send-charge", edit, data => chargeService.sendCharge(object(data)));
    handle("industry-contacts:prepare-bulk-charge", edit, data => chargeService.prepareBulkCharge(object(data)));
    handle("industry-contacts:send-bulk-charge", edit, data => chargeService.sendBulkCharge(object(data)));
    handle("industry-contacts:bulk-charge-status", read, data => chargeService.getBulkStatus(object(data)));
    handle("industry-contacts:cancel-bulk-charge", edit, data => chargeService.cancelBulkCharge(object(data)));
    handle("industry-contacts:get-db-config", readConfig, () => {
        const saved = configRepository.getDbConfig();
        return {
            mode: saved?.mode === "shared" ? "shared" : "local",
            path: String(saved?.path || "").trim() || configRepository.DEFAULT_SHARED_DATABASE_PATH,
            defaultPath: configRepository.DEFAULT_SHARED_DATABASE_PATH
        };
    });
    handle("industry-contacts:save-db-config", configure, (data = {}) => {
        const config = object(data);
        const mode = config.mode === "shared" ? "shared" : "local";
        const databasePath = String(config.path || "").trim() || configRepository.DEFAULT_SHARED_DATABASE_PATH;
        const saved = configRepository.saveDbConfig({ mode, path: databasePath });
        database.closeDatabase();
        return { mode: saved?.mode || mode, path: saved?.path || databasePath, defaultPath: configRepository.DEFAULT_SHARED_DATABASE_PATH };
    });
    handle("industry-contacts:test-connection", configure, customPath => database.testConnection(customPath));
}
module.exports = { registerIndustryContactsIpc };
