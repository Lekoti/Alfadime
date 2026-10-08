const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");


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


    // Fallback: usar pasta do projeto
    const projectRoot = path.resolve(__dirname, "../../..");
    return path.join(projectRoot, "app-data");
}


function getDataDirectory() {
    return path.join(
        getAppUserData(),
        "data"
    );
}


function getDatabasePath() {
    const configuredPath = String(
        process.env.ALFADIME_DB_PATH || ''
    ).trim();


    if (configuredPath) {
        return configuredPath;
    }


    return path.join(
        getDataDirectory(),
        "alfadime.db"
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


function runMigrations(database) {
    const migrationsDirectory = getMigrationsDirectory();

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


function initializeDatabase() {
    if (!database) {
        ensureDataDirectory();

        console.log('[DB] Database path:', getDatabasePath());

        database = new Database(
            getDatabasePath()
        );

        database.pragma("journal_mode = WAL");
        database.pragma("foreign_keys = ON");

        runMigrations(database);
        runSeeds(database);

        console.log(
            `Banco conectado: ${getDatabasePath()}`
        );
    }

    return database;
}


function getDatabase() {
    return initializeDatabase();
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
    closeDatabase
};