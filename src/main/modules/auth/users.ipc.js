const usersHandler = require("./usersHandler");



function registerUsersIpc(ipcMain, getAuthenticatedUser) {
    console.log(
        "[USERS] Registrando handlers IPC de usuários"
    );


    ipcMain.handle(
        "users:list",
        () => {
            return usersHandler.listUsers();
        }
    );


    ipcMain.handle(
        "users:create",
        (_event, data) => {
            return usersHandler.createUser(
                data,
                getAuthenticatedUser()
            );
        }
    );


    ipcMain.handle(
        "users:update",
        (_event, id, data) => {
            return usersHandler.updateUser(
                id,
                data,
                getAuthenticatedUser()
            );
        }
    );


    ipcMain.handle(
        "users:delete",
        (_event, id) => {
            return usersHandler.deleteUser(
                id,
                getAuthenticatedUser()
            );
        }
    );


    ipcMain.handle(
        "users:set-active",
        (_event, id, isActive) => {
            return usersHandler.setUserActive(
                id,
                isActive,
                getAuthenticatedUser()
            );
        }
    );


    ipcMain.handle(
        "users:list-permissions",
        () => {
            return usersHandler.listPermissions();
        }
    );


    console.log(
        "[USERS] Handlers IPC registrados com sucesso"
    );
}



module.exports = {
    registerUsersIpc
};