const { ipcMain } = require("electron");
const service = require("./price-pending-automatic-charge.service");
const access = require("./price-pending-access");
const authorization = require("./price-pending-authorization");
let registered = false;
function manager() {
    return authorization.context().requireFunction("price-pending", "manage_automatic_charge");
}
function registerPricePendingAutomaticChargeIpc() {
    if (registered) return;
    registered = true;
    ipcMain.handle("price-pending-automatic-charge:get-status", () => {
        authorization.context().requireModule("price-pending");
        return service.getStatus();
    });
    ipcMain.handle("price-pending-automatic-charge:set-enabled", (_event, enabled) => {
        const user = manager();
        if (typeof enabled !== "boolean") throw new Error("Estado de ativação inválido.");
        return service.setEnabled(enabled, access.name(user));
    });
    ipcMain.handle("price-pending-automatic-charge:set-interval", (_event, hours) => {
        const user = manager();
        if (!Number.isInteger(hours) || hours < 1 || hours > 8760) throw new Error("Informe um intervalo inteiro entre 1 e 8.760 horas.");
        return service.setChargeInterval(hours, access.name(user));
    });
    ipcMain.handle("price-pending-automatic-charge:clear-error", () => {
        const user = manager();
        return service.clearLastError(access.name(user));
    });
    ipcMain.handle("price-pending-automatic-charge:run-now", () => {
        manager();
        return service.runCharge(true);
    });
}
module.exports = { registerPricePendingAutomaticChargeIpc };
