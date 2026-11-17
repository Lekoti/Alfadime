const { ipcMain } = require("electron");
const service = require("./price-pending-automatic-charge.service");
const authHandler = require("../auth/authHandler");
const { USER_ROLES } = require("../auth/userRoles.constants");

let registered = false;
function canManage(user) {
    return [USER_ROLES.CREATOR, USER_ROLES.ADMIN, USER_ROLES.EDITOR].includes(String(user?.role || "").toLowerCase());
}
function requirePermission() {
    const user = authHandler.getAuthenticatedUser();
    if (!user) throw new Error("Usuario nao autenticado.");
    if (!canManage(user)) throw new Error("Apenas Editor, Staff e Administrador podem gerenciar a cobranca automatica.");
    return user;
}
function registerPricePendingAutomaticChargeIpc() {
    if (registered) return;
    registered = true;
    ipcMain.handle("price-pending-automatic-charge:get-status", () => service.getStatus());
    ipcMain.handle("price-pending-automatic-charge:set-enabled", (_e, enabled) => { requirePermission(); return service.setEnabled(Boolean(enabled)); });
    ipcMain.handle("price-pending-automatic-charge:run-now", () => { requirePermission(); return service.runCharge(); });
}
module.exports = { registerPricePendingAutomaticChargeIpc };
