const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const {
    getDatabase: getLocalDatabase
} = require("../../database/connection");

const {
    getDbConfig
} = require("./price-pending-db-config.repository");

// Caminho padrao do banco compartilhado (rede). Pode ser sobrescrito em Configuracoes > Geral.
const DEFAULT_SHARED_DATABASE_PATH =
    "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\PRECOS E PENDENCIAS\\BANCO DE DADOS\\precos-pendencias-teste.db";

const SHARED_DB_BUSY_TIMEOUT_MS = 10000;

let sharedDatabase = null;
let sharedDatabasePath = null;

function getEffectiveConfig() {
    const config = getDbConfig();

    return {
        mode: config?.mode === "shared" ? "shared" : "local",
        path: String(config?.path || "").trim() || DEFAULT_SHARED_DATABASE_PATH
    };
}

function isSharedMode() {
    return getEffectiveConfig().mode === "shared";
}

function openSharedDatabase(databasePath) {
    const databaseDirectory = path.dirname(databasePath);

    if (!fs.existsSync(databaseDirectory)) {
        throw new Error(
            `Pasta do banco compartilhado nao encontrada: ${databaseDirectory}`
        );
    }

    if (!fs.existsSync(databasePath)) {
        throw new Error(
            `Banco compartilhado nao encontrado: ${databasePath}`
        );
    }

    const database = new Database(databasePath);

    // Em banco acessado por rede, nao usar WAL.
    database.pragma("journal_mode = DELETE");
    database.pragma("synchronous = FULL");
    database.pragma("foreign_keys = ON");
    database.pragma(`busy_timeout = ${SHARED_DB_BUSY_TIMEOUT_MS}`);

    return database;
}

function getSharedDatabase() {
    const { path: databasePath } = getEffectiveConfig();

    if (sharedDatabase && sharedDatabasePath === databasePath) {
        return sharedDatabase;
    }

    if (sharedDatabase) {
        sharedDatabase.close();
        sharedDatabase = null;
    }

    sharedDatabase = openSharedDatabase(databasePath);
    sharedDatabasePath = databasePath;

    console.log(
        "[Precos e Pendencias] Usando banco compartilhado:",
        databasePath
    );

    return sharedDatabase;
}

function getPricePendingDatabase() {
    if (isSharedMode()) {
        return getSharedDatabase();
    }

    return getLocalDatabase();
}

function closePricePendingDatabase() {
    if (sharedDatabase) {
        sharedDatabase.close();
        sharedDatabase = null;
        sharedDatabasePath = null;
    }
}

function testSharedConnection(customPath) {
    const databasePath = String(customPath || "").trim()
        || getEffectiveConfig().path;

    let testDatabase = null;

    try {
        testDatabase = openSharedDatabase(databasePath);

        const row = testDatabase
            .prepare("SELECT COUNT(*) AS total FROM price_pending_rows")
            .get();

        return {
            success: true,
            message: `Conexao bem-sucedida. ${row?.total ?? 0} registro(s) encontrado(s).`
        };
    } catch (error) {
        return {
            success: false,
            message: error?.message || "Nao foi possivel conectar ao banco compartilhado."
        };
    } finally {
        if (testDatabase) {
            testDatabase.close();
        }
    }
}

module.exports = {
    isSharedMode,
    getPricePendingDatabase,
    closePricePendingDatabase,
    getEffectiveConfig,
    testSharedConnection,
    DEFAULT_SHARED_DATABASE_PATH
};
