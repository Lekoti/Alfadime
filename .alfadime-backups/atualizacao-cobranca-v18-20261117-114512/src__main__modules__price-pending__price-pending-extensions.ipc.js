const { ipcMain } = require("electron");
const priorityRepository = require("./price-pending-priority.repository");
const automaticCharge = require("./price-pending-automatic-charge.service");
const automaticChargeIpc = require("./price-pending-automatic-charge.ipc");
const authHandler = require("../auth/authHandler");
const { USER_ROLES } = require("../auth/userRoles.constants");

let registered = false;
function requireEditor() {
    const user = authHandler.getAuthenticatedUser();
    if (!user) throw new Error("Usuario nao autenticado.");
    if (![USER_ROLES.CREATOR, USER_ROLES.ADMIN, USER_ROLES.EDITOR].includes(String(user?.role || "").toLowerCase())) {
        throw new Error("Apenas Criador, Administrador e Editor podem alterar a prioridade.");
    }
    return user;
}
function registerPricePendingExtensionsIpc() {
    if (registered) return;
    registered = true;
    automaticChargeIpc.registerPricePendingAutomaticChargeIpc();
    ipcMain.handle("price-pending:update-priority", (_event, payload = {}) => {
        requireEditor();
        const id = String(payload?.id || "").trim();
        if (!id) throw new Error("Registro obrigatório para atualizar a prioridade.");
        return priorityRepository.updatePriority(id, payload?.priority);
    });
}
module.exports = { registerPricePendingExtensionsIpc };
