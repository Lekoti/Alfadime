const { ipcMain, shell } = require('electron');
const service = require('./email-dispatch-received.service');

let registered = false;

function registerEmailReceivedIpc() {
    if (registered) {
        return;
    }

    registered = true;

    ipcMain.handle('email-received:messages:list', () => {
        return service.listMessages();
    });

    ipcMain.handle('email-received:attachments:list', (event, messageId) => {
        return service.listAttachments(messageId);
    });

    ipcMain.handle('email-received:fetch', (event, configId) => {
        return service.fetchReceivedEmails(configId);
    });

    ipcMain.handle('email-received:process', (event, data) => {
        return service.processAttachments(data);
    });

        ipcMain.handle('email-received:run-routine', async () => {
        return service.runEmailRoutine();
    });
ipcMain.handle('email-received:dashboard', () => {
        return service.getDashboard();
    });

    ipcMain.handle('email-received:logs:list', () => {
        return service.listProcessingLogs();
    });

    ipcMain.handle('email-received:patterns:list', () => {
        return service.listPatterns();
    });

    ipcMain.handle('email-received:patterns:create', (event, data) => {
        return service.createPattern(data);
    });

    ipcMain.handle('email-received:patterns:delete', (event, id) => {
        return service.deletePattern(id);
    });
    ipcMain.handle('email-received:folders:open', (event, folderType) => {
        return service.openFolder(folderType);
    });
}

module.exports = {
    registerEmailReceivedIpc
};

