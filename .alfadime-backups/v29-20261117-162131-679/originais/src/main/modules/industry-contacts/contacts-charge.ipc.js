const { ipcMain } = require("electron");

const favoritesService = require("./contacts-charge-favorites.service");
const runService = require("./contacts-charge-run.service");

let registered = false;

function registerContactsChargeIpc() {
    if (registered) {
        return;
    }

    registered = true;

    ipcMain.handle("contacts:list-charge-favorites", () => {
        return favoritesService.listFavorites();
    });

    ipcMain.handle("contacts:get-charge-favorite", (_event, payload = {}) => {
        return favoritesService.getFavorite(payload.id);
    });

    ipcMain.handle("contacts:save-charge-favorite", (_event, payload = {}) => {
        return favoritesService.saveFavorite(payload);
    });

    ipcMain.handle("contacts:delete-charge-favorite", (_event, payload = {}) => {
        return favoritesService.deleteFavorite(payload.id);
    });

    ipcMain.handle("contacts:prepare-favorite-charge", (_event, payload = {}) => {
        return favoritesService.prepareFavoriteCharge(payload);
    });

    ipcMain.handle("contacts:send-favorite-charge", (_event, payload = {}) => {
        return favoritesService.sendFavoriteCharge(payload);
    });

    ipcMain.handle("contacts:charge-status", (_event, payload = {}) => {
        return favoritesService.getChargeStatus(payload);
    });

    ipcMain.handle("contacts:cancel-charge", (_event, payload = {}) => {
        return favoritesService.cancelCharge(payload);
    });

    ipcMain.handle("contacts:retry-failed-charge", (_event, payload = {}) => {
        return favoritesService.retryFailedCharge(payload);
    });

    ipcMain.handle("contacts:list-charge-runs", (_event, payload = {}) => {
        return runService.listRuns(payload.limit);
    });

    ipcMain.handle("contacts:get-charge-run", (_event, payload = {}) => {
        return runService.getRunSummary(payload.run_id);
    });

    ipcMain.handle("contacts:cancel-charge-run", (_event, payload = {}) => {
        return runService.cancelRun(payload.run_id);
    });

    ipcMain.handle("contacts:retry-charge-run", (_event, payload = {}) => {
        return runService.retryFailedCharge(payload.run_id);
    });
}

module.exports = {
    registerContactsChargeIpc
};
