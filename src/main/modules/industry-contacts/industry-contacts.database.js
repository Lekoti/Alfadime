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



function migrateMultipleContacts(connection) {
    const table = connection.prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'industry_contacts'"
    ).get();
    if (!table) return;
    const uniqueRule = /,\s*UNIQUE\s*\(\s*laboratory_key\s*,\s*branch\s*\)/i;
    if (!uniqueRule.test(table.sql)) {
        const uniqueIndexes = connection.pragma("index_list('industry_contacts')")
            .filter((index) => index.unique && index.origin !== "pk");
        if (uniqueIndexes.length) {
            throw new Error("Estrutura de contatos inesperada. Migração interrompida sem excluir registros.");
        }
        return;
    }
    const quote = (name) => '"' + String(name).replace(/"/g, '""') + '"';
    const tables = connection.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    ).all();
    for (const item of tables) {
        const references = connection.prepare("PRAGMA foreign_key_list(" + quote(item.name) + ")").all();
        if (references.some((reference) => reference.table === "industry_contacts")) {
            throw new Error("Há chaves estrangeiras referenciando contatos. Migração requer revisão específica.");
        }
    }
    const temporary = "industry_contacts_multiple_v1";
    if (connection.prepare("SELECT name FROM sqlite_master WHERE name = ?").get(temporary)) {
        throw new Error("Tabela temporária de migração já existe. Nenhuma tabela foi excluída.");
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = connection.name + ".before-multiple-contacts-" + stamp + ".db";
    connection.prepare("VACUUM INTO ?").run(backupPath);
    if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size === 0) {
        throw new Error("Backup do banco não confirmado. Migração cancelada.");
    }
    const foreignKeys = connection.pragma("foreign_keys", { simple: true });
    connection.pragma("foreign_keys = OFF");
    try {
        connection.transaction(() => {
            const schema = connection.prepare(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'industry_contacts'"
            ).get();
            if (schema.sql !== table.sql) throw new Error("Estrutura alterada durante a preparação. Reinicie a operação.");
            const objects = connection.prepare(
                "SELECT sql FROM sqlite_master WHERE tbl_name = 'industry_contacts' AND type IN ('index', 'trigger') AND sql IS NOT NULL"
            ).all();
            const columns = connection.pragma("table_info('industry_contacts')")
                .map((column) => quote(column.name)).join(", ");
            const create = table.sql.replace(uniqueRule, "")
                .replace(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"industry_contacts"|`industry_contacts`|\[industry_contacts\]|industry_contacts)/i,
                    "CREATE TABLE " + quote(temporary));
            if (create === table.sql || uniqueRule.test(create)) throw new Error("Não foi possível preparar a nova estrutura.");
            connection.exec(create);
            connection.exec("INSERT INTO " + quote(temporary) + " (" + columns + ") SELECT " + columns + " FROM industry_contacts");
            const originalCount = connection.prepare("SELECT COUNT(*) AS total FROM industry_contacts").get().total;
            const copiedCount = connection.prepare("SELECT COUNT(*) AS total FROM " + quote(temporary)).get().total;
            const difference = connection.prepare(
                "SELECT " + columns + " FROM industry_contacts EXCEPT SELECT " + columns + " FROM " + quote(temporary) + " LIMIT 1"
            ).get();
            if (originalCount !== copiedCount || difference) throw new Error("Conferência da cópia falhou. Transação cancelada.");
            connection.exec("DROP TABLE industry_contacts");
            connection.exec("ALTER TABLE " + quote(temporary) + " RENAME TO industry_contacts");
            for (const object of objects) connection.exec(object.sql);
            if (connection.pragma("foreign_key_check").length) throw new Error("Falha na verificação de integridade referencial.");
            const integrity = connection.pragma("quick_check", { simple: true });
            if (integrity !== "ok") throw new Error("Verificação do banco falhou: " + integrity);
        }).immediate();
        console.log("[Contatos] Múltiplos contatos habilitados. Backup:", backupPath);
    } finally {
        connection.pragma("foreign_keys = " + (foreignKeys ? "ON" : "OFF"));
    }
}


function ensureSchema(connection) {
    migrateMultipleContacts(connection);
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
            updated_at TEXT NOT NULL
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