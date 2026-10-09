const granularPermissionsHandler = require("./granularPermissionsHandler");


function registerGranularPermissionsIpc(
    ipcMain,
    getAuthenticatedUser
) {
    console.log(
        "[PERMISSIONS] Registrando handlers IPC de permissões granulares"
    );

    ipcMain.handle(
        "permissions:list-modules",
        () => {
            return granularPermissionsHandler.listModules();
        }
    );

    ipcMain.handle(
        "permissions:list-functions",
        (_event, moduleKey) => {
            return granularPermissionsHandler.listFunctions(
                moduleKey
            );
        }
    );

    ipcMain.handle(
        "permissions:get-for-user",
        (_event, userId) => {
            return granularPermissionsHandler.getPermissionsForUser(
                userId
            );
        }
    );

    ipcMain.handle(
        "permissions:get-for-role",
        (_event, role) => {
            return granularPermissionsHandler.getPermissionsForRole(
                role
            );
        }
    );

    ipcMain.handle(
        "permissions:save",
        (_event, payload) => {
            return granularPermissionsHandler.savePermissions(
                payload,
                getAuthenticatedUser()
            );
        }
    );

    ipcMain.handle(
        "permissions:clear-user-overrides",
        (_event, userId) => {
            return granularPermissionsHandler.clearUserOverrides(
                userId,
                getAuthenticatedUser()
            );
        }
    );

    console.log(
        "[PERMISSIONS] Handlers IPC registrados com sucesso"
    );
}


module.exports = {
    registerGranularPermissionsIpc
};