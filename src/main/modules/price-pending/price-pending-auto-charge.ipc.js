const { ipcMain } = require("electron");
const autoChargeService = require("./price-pending-auto-charge.service");


const ALLOWED_ROLES = new Set(["creator", "editor", "admin"]);
let registered = false;


function assertCanManage(getAuthenticatedUser) {
    const user = getAuthenticatedUser?.();
    if (!user || !ALLOWED_ROLES.has(String(user.role || "").toLowerCase())) {
        throw new Error("Somente Editor, Staff e Admin podem alterar a cobrança automática.");
    }
    return user;
}


function registerPricePendingAutoChargeIpc({ getAuthenticatedUser } = {}) {
    if (registered) return;
    registered = true;

    ipcMain.handle("price-pending-auto-charge:get-state", () => {
        return autoChargeService.getConfiguration();
    });

    ipcMain.handle("price-pending-auto-charge:set-enabled", (_event, enabled) => {
        const user = assertCanManage(getAuthenticatedUser);
        if (typeof enabled !== "boolean") {
            throw new Error("Informe se a cobrança automática deve ficar ativa.");
        }
        return autoChargeService.setEnabled(
            enabled,
            user.display_name || user.username || user.role
        );
    });

    ipcMain.handle("price-pending-auto-charge:list-history", (_event, limit) => {
        return autoChargeService.listEvents(limit);
    });

    autoChargeService.start();
}


module.exports = {
    registerPricePendingAutoChargeIpc,
    stopPricePendingAutoCharge: autoChargeService.stop
};
