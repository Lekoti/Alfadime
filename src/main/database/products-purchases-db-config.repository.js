const fs = require("node:fs");
const path = require("node:path");



function getApp() {
    try {
        const { app } = require("electron");
        if (app) {
            return app;
        }
    } catch {
        // Electron não disponível
    }
    return null;
}



function getConfigDirectory() {
    const app = getApp();


    if (app && typeof app.getPath === "function") {
        return app.getPath("userData");
    }


    const projectRoot = path.resolve(__dirname, "../../..");
    return path.join(projectRoot, "app-data");
}



function getConfigFilePath() {
    return path.join(
        getConfigDirectory(),
        "products-purchases-db-config.json"
    );
}



function getDefaultDatabaseDirectory() {
    return "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\PRODUTOS E COMPRAS";
}



function getDefaultDatabasePath() {
    return path.join(
        getDefaultDatabaseDirectory(),
        "alfadime.db"
    );
}



function getDbConfig() {
    const configFilePath = getConfigFilePath();


    try {
        if (!fs.existsSync(configFilePath)) {
            return {
                path: getDefaultDatabasePath()
            };
        }


        const rawConfig = fs.readFileSync(
            configFilePath,
            "utf8"
        );


        const parsedConfig = JSON.parse(rawConfig);


        return {
            path: String(parsedConfig?.path || "").trim() ||
                getDefaultDatabasePath()
        };
    } catch (configError) {
        console.error(
            "[DB CONFIG] Erro ao ler configuração:",
            configError
        );


        return {
            path: getDefaultDatabasePath()
        };
    }
}



function saveDbConfig({ path: databasePath }) {
    const normalizedPath = String(databasePath || "").trim();


    if (!normalizedPath) {
        throw new Error("Informe o caminho do banco de dados.");
    }


    const configDirectory = getConfigDirectory();


    if (!fs.existsSync(configDirectory)) {
        fs.mkdirSync(configDirectory, {
            recursive: true
        });
    }


    const configFilePath = getConfigFilePath();


    fs.writeFileSync(
        configFilePath,
        JSON.stringify({
            path: normalizedPath
        }, null, 2),
        "utf8"
    );


    return getDbConfig();
}



module.exports = {
    getDbConfig,
    saveDbConfig,
    getDefaultDatabaseDirectory,
    getDefaultDatabasePath
};