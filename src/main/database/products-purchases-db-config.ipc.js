const {
    ipcMain
} = require("electron");

const fs = require("node:fs");
const path = require("node:path");

const Database = require("better-sqlite3");

const {
    getDbConfig,
    saveDbConfig,
    getDefaultDatabasePath
} = require("./products-purchases-db-config.repository");

const authHandler = require(
    "../modules/auth/authHandler"
);

const {
    USER_ROLES
} = require(
    "../modules/auth/userRoles.constants"
);




let registered = false;




function canManageDatabaseConfig(user) {
    const role = String(user?.role || "").toLowerCase();


    return [
        USER_ROLES.CREATOR,
        USER_ROLES.ADMIN,
        USER_ROLES.EDITOR
    ].includes(role);
}




function requireDatabaseConfigPermission() {
    const user = authHandler.getAuthenticatedUser();


    if (!user) {
        throw new Error("Usuário não autenticado.");
    }


    if (!canManageDatabaseConfig(user)) {
        throw new Error(
            "Apenas Administradores e Staff podem alterar a configuração do banco."
        );
    }


    return user;
}




function testDatabaseConnection(databasePath) {
    const normalizedPath = String(databasePath || "").trim();


    if (!normalizedPath) {
        return {
            success: false,
            message: "Informe o caminho do banco de dados."
        };
    }


    const directory = path.dirname(normalizedPath);


    if (!fs.existsSync(directory)) {
        return {
            success: false,
            message: `Pasta não encontrada ou inacessível: ${directory}`
        };
    }


    let database = null;


    try {
        database = new Database(
            normalizedPath,
            {
                readonly: true
            }
        );


        database.prepare("SELECT 1").get();


        return {
            success: true,
            message: "Conexão com o banco realizada com sucesso.",
            path: normalizedPath
        };
    } catch (connectionError) {
        return {
            success: false,
            message: connectionError?.message ||
                "Não foi possível conectar ao banco de dados.",
            path: normalizedPath
        };
    } finally {
        if (database) {
            database.close();
        }
    }
}




function registerProductsPurchasesDbConfigIpc() {
    if (registered) {
        return;
    }


    registered = true;


    ipcMain.handle(
        "products-purchases:get-db-config",
        () => {
            const config = getDbConfig();


            return {
                ...config,
                defaultPath: getDefaultDatabasePath()
            };
        }
    );


    ipcMain.handle(
        "products-purchases:save-db-config",
        (event, config = {}) => {
            requireDatabaseConfigPermission();


            const savedConfig = saveDbConfig({
                path: config.path
            });


            return {
                ...savedConfig,
                defaultPath: getDefaultDatabasePath()
            };
        }
    );


    ipcMain.handle(
        "products-purchases:test-connection",
        (event, databasePath) => {
            requireDatabaseConfigPermission();


            return testDatabaseConnection(databasePath);
        }
    );
}




module.exports = {
    registerProductsPurchasesDbConfigIpc
};