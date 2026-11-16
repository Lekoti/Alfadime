const { ipcMain } = require("electron");
const service = require("./price-pending-automatic-charge.service");
const access = require("./price-pending-access");
let registered = false;
function registerPricePendingAutomaticChargeIpc() {
    if (registered) return;
    registered = true;
    ipcMain.handle("price-pending-automatic-charge:get-status", () => { access.requireUser(); return service.getStatus(); });
    ipcMain.handle("price-pending-automatic-charge:set-enabled", (_event, enabled) => {
        const user = access.requireEditor();
        if (typeof enabled !== "boolean") throw new Error("Estado de ativação inválido.");
        return service.setEnabled(enabled, access.name(user));
    });
    ipcMain.handle("price-pending-automatic-charge:run-now", () => { access.requireEditor(); return service.runCharge(); });
}
module.exports = { registerPricePendingAutomaticChargeIpc };
