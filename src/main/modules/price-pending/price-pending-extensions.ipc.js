const { ipcMain } = require("electron");
const priorityRepository = require("./price-pending-priority.repository");
const automaticChargeIpc = require("./price-pending-automatic-charge.ipc");
const authorization = require("./price-pending-authorization");
let registered = false;
function registerPricePendingExtensionsIpc() {
    if (registered) return;
    registered = true;
    automaticChargeIpc.registerPricePendingAutomaticChargeIpc();
    ipcMain.handle("price-pending:update-priority", (_event, payload = {}) => {
        authorization.context().requireCell("laboratory");
        const id = typeof payload?.id === "string" ? payload.id.trim() : "";
        if (!id) throw new Error("Registro obrigatório para atualizar a prioridade.");
        return priorityRepository.updatePriority(id, payload.priority);
    });
}
module.exports = { registerPricePendingExtensionsIpc };
