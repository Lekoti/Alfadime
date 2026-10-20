const path = require("node:path");

function getDefaultDatabaseDirectory() {
    return "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS";
}

function getDefaultDatabasePath() {
    return path.join(
        getDefaultDatabaseDirectory(),
        "alfadime.db"
    );
}

function getDbConfig() {
    return {
        path: getDefaultDatabasePath()
    };
}

function saveDbConfig(_config = {}) {
    return getDbConfig();
}

module.exports = {
    getDbConfig,
    saveDbConfig,
    getDefaultDatabaseDirectory,
    getDefaultDatabasePath
};