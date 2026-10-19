const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const {
    getDbConfig,
    getDefaultDatabasePath
} = require("./products-purchases-db-config.repository");



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



function getAppUserData() {
    const app = getApp();
    if (app && typeof app.getPath === "function") {
        return app.getPath("userData");
    }


    const projectRoot = path.resolve(__dirname, "../../..");
    return path.join(projectRoot, "app-data");
}



function getDataDirectory() {
    return path.join(
        getAppUserData(),
        "data"
    );
}



function getLocalDatabasePath() {
    return path.join(
        getDataDirectory(),
        "alfadime.db"
    );
}



function getDatabasePath() {
    const configuredPath = String(
        process.env.ALFADIME_DB_PATH || ''
    ).trim();


    if (configuredPath) {
        return configuredPath;
    }


    try {
        const config = getDbConfig();


        return String(config?.path || "").trim() ||
            getDefaultDatabasePath();
    } catch (configError) {
        console.error(
            "[DB] Erro ao ler configuração do banco:",
            configError
        );


        return getDefaultDatabasePath();
    }
}



function isNetworkDatabasePath(databasePath) {
    return String(databasePath || "").startsWith("\\\\");
}



function getDatabaseDirectory(databasePath) {
    return path.dirname(
        String(databasePath || "")
    );
}



function getUsersDatabaseDirectory() {
    const configuredPath = String(
        process.env.ALFADIME_USERS_DB_PATH || ''
    ).trim();


    if (configuredPath) {
        return configuredPath;
    }


    return "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\USUARIOS";
}



function getUsersDatabasePath() {
    return path.join(
        getUsersDatabaseDirectory(),
        "alfadime-users.db"
    );
}



function getProjectDatabaseDirectory() {
    const app = getApp();
    if (app && app.isPackaged) {
        return path.join(
            process.resourcesPath,
            "database"
        );
    }


    return path.join(
        __dirname,
        "../../../database"
    );
}



function getMigrationsDirectory() {
    return path.join(
        getProjectDatabaseDirectory(),
        "migrations"
    );
}



function getUserMigrationsDirectory() {
    return path.join(
        getProjectDatabaseDirectory(),
        "user-migrations"
    );
}



function getSeedsDirectory() {
    return path.join(
        getProjectDatabaseDirectory(),
        "seeds"
    );
}



function ensureDataDirectory() {
    const dataDirectory = getDataDirectory();


    if (!fs.existsSync(dataDirectory)) {
        fs.mkdirSync(dataDirectory, {
            recursive: true
        });
    }
}



function ensureDatabaseDirectory(databasePath) {
    const databaseDirectory = getDatabaseDirectory(databasePath);


    if (!fs.existsSync(databaseDirectory)) {
        throw new Error(
            `Pasta do banco de dados não está acessível: ${databaseDirectory}`
        );
    }
}



function migrateLocalDatabaseToNetwork() {
    const networkDatabasePath = getDatabasePath();
    const localDatabasePath = getLocalDatabasePath();


    if (fs.existsSync(networkDatabasePath)) {
        return;
    }


    if (!fs.existsSync(localDatabasePath)) {
        return;
    }


    console.log(
        '[DB] Migrando banco local para a rede:',
        networkDatabasePath
    );


    fs.copyFileSync(
        localDatabasePath,
        networkDatabasePath
    );


    const localWalPath = `${localDatabasePath}-wal`;
    const localShmPath = `${localDatabasePath}-shm`;


    if (fs.existsSync(localWalPath)) {
        fs.copyFileSync(
            localWalPath,
            `${networkDatabasePath}-wal`
        );
    }


    if (fs.existsSync(localShmPath)) {
        fs.copyFileSync(
            localShmPath,
            `${networkDatabasePath}-shm`
        );
    }


    console.log(
        '[DB] Banco local migrado com sucesso para a rede.'
    );
}



function runMigrations(database, migrationsDirectory) {
    console.log('[MIGRATIONS] Directory:', migrationsDirectory);
    console.log('[MIGRATIONS] Exists:', fs.existsSync(migrationsDirectory));


    if (!fs.existsSync(migrationsDirectory)) {
        throw new Error(
            `Diretório de migrations não encontrado: ${migrationsDirectory}`
        );
    }


    database.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL UNIQUE,
            executed_at TEXT NOT NULL
        );
    `);


    const migrationFiles = fs
        .readdirSync(migrationsDirectory)
        .filter((file) => file.endsWith(".sql"))
        .sort();


    console.log('[MIGRATIONS] Files found:', migrationFiles);


    for (const filename of migrationFiles) {
        const alreadyExecuted = database
            .prepare(`
                SELECT id
                FROM schema_migrations
                WHERE filename = ?
                LIMIT 1
            `)
            .get(filename);


        if (alreadyExecuted) {
            console.log('[MIGRATIONS] Already executed:', filename);
            continue;
        }


        console.log('[MIGRATIONS] Executing:', filename);


        const migrationPath = path.join(
            migrationsDirectory,
            filename
        );


        const migrationSql = fs.readFileSync(
            migrationPath,
            "utf8"
        );


        const executeMigration = database.transaction(() => {
            database.exec(migrationSql);


            database
                .prepare(`
                    INSERT INTO schema_migrations (
                        filename,
                        executed_at
                    ) VALUES (?, ?)
                `)
                .run(
                    filename,
                    new Date().toISOString()
                );
        });


        executeMigration();


        console.log(
            `Migration executada: ${filename}`
        );
    }
}



function runSeeds(database) {
    const seedPath = path.join(
        getSeedsDirectory(),
        "price-pending-seed.js"
    );



    if (!fs.existsSync(seedPath)) {
        console.log(
            "Seed de preços e pendências não encontrado."
        );



        return;
    }


    const {
        seedPricePendingRows
    } = require(seedPath);
    const result = seedPricePendingRows(database);


    console.log(
        "Seed de preços e pendências:",
        result
    );
}



let database = null;
let usersDatabase = null;



function initializeDatabase() {
    if (!database) {
        const databasePath = getDatabasePath();


        ensureDatabaseDirectory(databasePath);
        migrateLocalDatabaseToNetwork();


        console.log('[DB] Database path:', databasePath);


        database = new Database(
            databasePath
        );


        if (isNetworkDatabasePath(databasePath)) {
            database.pragma("journal_mode = DELETE");
        } else {
            database.pragma("journal_mode = WAL");
        }


        database.pragma("foreign_keys = ON");


        runMigrations(
            database,
            getMigrationsDirectory()
        );


        runSeeds(database);


        console.log(
            `Banco conectado: ${databasePath}`
        );
    }


    return database;
}



function initializeUsersDatabase() {
    if (usersDatabase) {
        return usersDatabase;
    }


    const usersDatabasePath =
        getUsersDatabasePath();


    if (!fs.existsSync(getUsersDatabaseDirectory())) {
        throw new Error(
            `Pasta de usuários na rede não está acessível: ${getUsersDatabaseDirectory()}`
        );
    }


    console.log(
        '[USERS DB] Database path:',
        usersDatabasePath
    );


    usersDatabase = new Database(
        usersDatabasePath
    );


    usersDatabase.pragma("journal_mode = DELETE");
    usersDatabase.pragma("foreign_keys = ON");


    runMigrations(
        usersDatabase,
        getUserMigrationsDirectory()
    );


    console.log(
        `Banco de usuários conectado: ${usersDatabasePath}`
    );


    return usersDatabase;
}



function getDatabase() {
    return initializeDatabase();
}



function getUsersDatabase() {
    return initializeUsersDatabase();
}



function closeDatabase() {
    if (database) {
        database.close();
        database = null;
    }


    if (usersDatabase) {
        usersDatabase.close();
        usersDatabase = null;
    }
}



module.exports = {
    getDatabase,
    getUsersDatabase,
    getDatabasePath,
    getLocalDatabasePath,
    getUsersDatabasePath,
    closeDatabase
};