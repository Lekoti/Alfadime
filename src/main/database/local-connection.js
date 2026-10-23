const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const { getAppUserData } = require("../config/app.config");

let localDatabase = null;

function getLocalDatabasePath() {
    return path.join(getAppUserData(), "alfadime-email-local.db");
}

function getLocalDatabase() {
    if (localDatabase) {
        return localDatabase;
    }

    const databasePath = getLocalDatabasePath();
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    localDatabase = new Database(databasePath);
    localDatabase.pragma("journal_mode = WAL");
    localDatabase.pragma("foreign_keys = ON");

    localDatabase.exec(`
        CREATE TABLE IF NOT EXISTS email_configs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            smtp_host TEXT NOT NULL,
            smtp_port INTEGER NOT NULL,
            smtp_secure TEXT NOT NULL,
            smtp_user TEXT NOT NULL,
            smtp_password_encrypted TEXT NOT NULL,
            imap_host TEXT NOT NULL,
            imap_port INTEGER NOT NULL,
            imap_secure TEXT NOT NULL,
            imap_user TEXT NOT NULL,
            imap_password_encrypted TEXT NOT NULL,
            from_name TEXT NOT NULL,
            from_email TEXT NOT NULL,
            reply_to_email TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);

    return localDatabase;
}

function closeLocalDatabase() {
    if (localDatabase) {
        localDatabase.close();
        localDatabase = null;
    }
}

module.exports = {
    getLocalDatabase,
    getLocalDatabasePath,
    closeLocalDatabase
};
