const {
    ipcMain
} = require("electron");

const service = require(
    "./notifications.service"
);

let registered = false;

function registerNotificationsIpc() {
    if (registered) {
        return;
    }

    registered = true;

    ipcMain.handle(
        "notifications:list",
        (_event, filters = {}) => {
            return service.listNotifications(
                filters
            );
        }
    );

    ipcMain.handle(
        "notifications:get-by-id",
        (_event, id) => {
            return service.getNotificationById(
                id
            );
        }
    );

    ipcMain.handle(
        "notifications:create",
        (_event, data = {}) => {
            return service.createNotification(
                data
            );
        }
    );

    ipcMain.handle(
        "notifications:mark-as-read",
        (_event, id) => {
            return service.markAsRead(
                id
            );
        }
    );

    ipcMain.handle(
        "notifications:dismiss",
        (_event, id) => {
            return service.dismiss(
                id
            );
        }
    );

    ipcMain.handle(
        "notifications:update-status",
        (_event, payload = {}) => {
            return service.updateStatus(
                payload.id,
                payload.status,
                payload
            );
        }
    );

    ipcMain.handle(
        "notifications:delete",
        (_event, id) => {
            return service.remove(
                id
            );
        }
    );

    ipcMain.handle(
        "notifications:summary",
        (_event, filters = {}) => {
            return service.getSummary(
                filters
            );
        }
    );
}

module.exports = {
    registerNotificationsIpc
};