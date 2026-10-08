const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const {
    getDbConfig,
    DEFAULT_SHARED_DATABASE_PATH
} = require(
    "./industry-contacts-config.repository"
);



const BUSY_TIMEOUT_MS = 10000;



let database = null;



function getDatabasePath() {
    const config =
        getDbConfig();

    const configuredPath =
        String(config?.path || "").trim();

    return configuredPath ||
        DEFAULT_SHARED_DATABASE_PATH;
}



function ensureDatabaseDirectory(databasePath) {
    const directory =
        path.dirname(databasePath);

    if (!fs.existsSync(directory)) {
        throw new Error(
            "Pasta do banco de contatos não encontrada: " +
            directory
        );
    }
}



function ensureSchema(connection) {
    connection.exec(`
        CREATE TABLE IF NOT EXISTS industry_contacts (
            id TEXT PRIMARY KEY,
            laboratory_name TEXT NOT NULL,
            laboratory_key TEXT NOT NULL,
            branch TEXT NOT NULL DEFAULT '',
            contact_name TEXT,
            phone TEXT,
            email TEXT,
            service_region TEXT,
            notes TEXT,
            cargo TEXT,
            spreadsheet_row INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(laboratory_key, branch)
        );

        CREATE INDEX IF NOT EXISTS
            idx_industry_contacts_laboratory_name
            ON industry_contacts(laboratory_name);

        CREATE INDEX IF NOT EXISTS
            idx_industry_contacts_laboratory_key
            ON industry_contacts(laboratory_key);

        CREATE INDEX IF NOT EXISTS
            idx_industry_contacts_branch
            ON industry_contacts(branch);

        CREATE INDEX IF NOT EXISTS
            idx_industry_contacts_email
            ON industry_contacts(email);

        CREATE INDEX IF NOT EXISTS
            idx_industry_contacts_service_region
            ON industry_contacts(service_region);

        CREATE INDEX IF NOT EXISTS
            idx_industry_contacts_cargo
            ON industry_contacts(cargo);
    `);
}



function openDatabase(customPath = "") {
    const databasePath =
        String(customPath || "").trim() ||
        getDatabasePath();

    ensureDatabaseDirectory(databasePath);

    const connection =
        new Database(databasePath);

    connection.pragma(
        "journal_mode = DELETE"
    );

    connection.pragma(
        "synchronous = FULL"
    );

    connection.pragma(
        "foreign_keys = ON"
    );

    connection.pragma(
        `busy_timeout = ${BUSY_TIMEOUT_MS}`
    );

    ensureSchema(connection);

    console.log(
        "[Contatos] Banco conectado:",
        databasePath
    );

    return connection;
}



function getDatabase() {
    if (!database) {
        database = openDatabase();
    }

    return database;
}



function testConnection(customPath = "") {
    let testDatabase = null;

    try {
        const databasePath =
            String(customPath || "").trim() ||
            getDatabasePath();

        testDatabase =
            openDatabase(databasePath);

        const result =
            testDatabase
                .prepare(`
                    SELECT COUNT(*) AS total
                    FROM industry_contacts
                `)
                .get();

        return {
            success: true,
            path: databasePath,
            total: result.total,
            message:
                `Conexão realizada. ${result.total} contato(s) encontrado(s).`
        };
    } catch (error) {
        return {
            success: false,
            path:
                String(customPath || "").trim() ||
                getDatabasePath(),
            message:
                error.message ||
                "Não foi possível acessar o banco de contatos."
        };
    } finally {
        if (testDatabase) {
            testDatabase.close();
        }
    }
}



function closeDatabase() {
    if (database) {
        database.close();
        database = null;
    }
}



module.exports = {
    getDatabase,
    getDatabasePath,
    testConnection,
    closeDatabase
};