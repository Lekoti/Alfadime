const authHandler = require('./authHandler');

function registerAuthIpc(ipcMain) {
    console.log('[AUTH] Registrando handlers IPC de autenticação');

    ipcMain.handle('auth:login', async (_event, { username, isPersistent }) => {
        console.log('[AUTH] Login request:', { username, isPersistent });
        return await authHandler.login(username, isPersistent);
    });

    ipcMain.handle('auth:logout', async () => {
        console.log('[AUTH] Logout request');
        return await authHandler.logout();
    });

    ipcMain.handle('auth:get_current_session', async () => {
        return await authHandler.getCurrentSession();
    });

    ipcMain.handle('auth:get_computer_id', async () => {
        return authHandler.getComputerId();
    });

    ipcMain.handle('auth:validate_session', async () => {
        return await authHandler.validateSession();
    });

    ipcMain.handle('auth:update_last_access', async () => {
        return await authHandler.updateLastAccessHandler();
    });

    console.log('[AUTH] Handlers IPC registrados com sucesso');
}

module.exports = { registerAuthIpc };