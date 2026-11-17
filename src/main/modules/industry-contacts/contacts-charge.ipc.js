const { ipcMain } = require("electron");
const favoritesService = require("./contacts-charge-favorites.service");
const runService = require("./contacts-charge-run.service");
const authorization = require("../price-pending/price-pending-authorization");

let registered = false;
function payload(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Dados de cobrança inválidos.");
    return value;
}
function identifier(value) {
    if (typeof value !== "string" || !value.trim()) throw new Error("Identificador obrigatório.");
    return value.trim();
}
function registerContactsChargeIpc() {
    if (registered) return;
    registered = true;
    function handle(channel, check, work) {
        ipcMain.handle(channel, (_event, data = {}) => {
            const auth = authorization.context();
            check(auth);
            return work(payload(data));
        });
    }
    const readFavorites = auth => auth.requireModule("industry-contacts");
    const editFavorites = auth => auth.requireModule("industry-contacts", "can_edit");
    const deleteFavorites = auth => auth.requireModule("industry-contacts", "can_delete");
    const readHistory = auth => auth.requireAnyModule(["price-pending", "industry-contacts"]);
    const charge = auth => auth.requireCharge();
    handle("contacts:list-charge-favorites", readFavorites, () => favoritesService.listFavorites());
    handle("contacts:get-charge-favorite", readFavorites, data => favoritesService.getFavorite(identifier(data.id)));
    handle("contacts:save-charge-favorite", editFavorites, data => favoritesService.saveFavorite(data));
    handle("contacts:delete-charge-favorite", deleteFavorites, data => favoritesService.deleteFavorite(identifier(data.id)));
    handle("contacts:prepare-favorite-charge", charge, data => favoritesService.prepareFavoriteCharge(data));
    handle("contacts:send-favorite-charge", charge, data => favoritesService.sendFavoriteCharge({ preview_token: identifier(data.preview_token) }));
    handle("contacts:charge-status", readHistory, data => favoritesService.getChargeStatus({ preview_token: identifier(data.preview_token) }));
    handle("contacts:cancel-charge", charge, data => favoritesService.cancelCharge({ preview_token: identifier(data.preview_token) }));
    handle("contacts:retry-failed-charge", charge, data => favoritesService.retryFailedCharge({ run_id: identifier(data.run_id) }));
    handle("contacts:list-charge-runs", readHistory, data => {
        const limit = data.limit === undefined ? 50 : Number(data.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("Limite de histórico inválido: use de 1 a 500.");
        return runService.listRuns(limit);
    });
    handle("contacts:get-charge-run", readHistory, data => runService.getRunSummary(identifier(data.run_id)));
    function historyControl(method) {
        return data => {
            const runId = identifier(data.run_id);
            const auth = authorization.context();
            auth.requireHistoryControl(runService.getRun(runId));
            return method(runId);
        };
    }
    handle("contacts:cancel-charge-run", readHistory, historyControl(runService.cancelRun));
    handle("contacts:retry-charge-run", readHistory, historyControl(runService.retryFailedCharge));
}
module.exports = { registerContactsChargeIpc };
