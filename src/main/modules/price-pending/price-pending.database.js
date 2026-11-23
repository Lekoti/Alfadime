const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const { getDatabase: getLocalDatabase } = require("../../database/connection");

const DEFAULT_SHARED_DATABASE_PATH = "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\precos-pendencias.db";
const SHARED_DB_BUSY_TIMEOUT_MS = 10000;
let sharedDatabase = null;
let sharedDatabasePath = null;

function getEffectiveConfig() { return { mode: "shared", path: DEFAULT_SHARED_DATABASE_PATH }; }
function isSharedMode() { return getEffectiveConfig().mode === "shared"; }

function openSharedDatabase(databasePath) {
    const databaseDirectory = path.dirname(databasePath);
    if (!fs.existsSync(databaseDirectory)) throw new Error(`Pasta do banco compartilhado nao encontrada: ${databaseDirectory}`);
    if (!fs.existsSync(databasePath)) throw new Error(`Banco compartilhado nao encontrado: ${databasePath}`);
    const database = new Database(databasePath);
    database.pragma("journal_mode = DELETE");
    database.pragma("synchronous = FULL");
    database.pragma("foreign_keys = ON");
    database.pragma(`busy_timeout = ${SHARED_DB_BUSY_TIMEOUT_MS}`);
    return database;
}

function getSharedDatabase() {
    const { path: databasePath } = getEffectiveConfig();
    if (sharedDatabase && sharedDatabasePath === databasePath) return sharedDatabase;
    if (sharedDatabase) { sharedDatabase.close(); sharedDatabase = null; }
    sharedDatabase = openSharedDatabase(databasePath);
    sharedDatabasePath = databasePath;
    return sharedDatabase;
}

const REQUIRED_ROW_COLUMNS = [
    { name: "observation", definition: "TEXT NOT NULL DEFAULT ''" },
    { name: "manual_cells", definition: "TEXT NOT NULL DEFAULT '{}'" },
    { name: "pending_external_updates", definition: "TEXT NOT NULL DEFAULT '{}'" },
    { name: "external_updated_at", definition: "TEXT NOT NULL DEFAULT ''" },
    { name: "priority_label", definition: "TEXT NOT NULL DEFAULT ''" }
];
const ensuredDatabases = new WeakSet();

function ensurePricePendingSchema(database) {
    if (ensuredDatabases.has(database)) return [];
    const addedColumns = [];
    const rowsTable = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'price_pending_rows'").get();
    if (rowsTable) {
        const existing = new Set(database.prepare("PRAGMA table_info(price_pending_rows)").all().map(c => c.name));
        for (const column of REQUIRED_ROW_COLUMNS) {
            if (existing.has(column.name)) continue;
            database.exec(`ALTER TABLE price_pending_rows ADD COLUMN ${column.name} ${column.definition}`);
            addedColumns.push(column.name);
        }
    }
    database.exec(`
        CREATE TABLE IF NOT EXISTS price_pending_cell_versions (
            row_id TEXT NOT NULL,
            column_name TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (row_id, column_name)
        );
        CREATE TABLE IF NOT EXISTS price_pending_drafts (
            row_id TEXT NOT NULL,
            column_name TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            value TEXT NOT NULL DEFAULT '',
            base_value TEXT NOT NULL DEFAULT '',
            base_version INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (row_id, column_name, owner_id)
        );
        CREATE TABLE IF NOT EXISTS price_pending_processed_files (
            id TEXT PRIMARY KEY, file_path TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL,
            file_type TEXT NOT NULL, file_size INTEGER NOT NULL, file_mtime_ms INTEGER NOT NULL,
            signature TEXT NOT NULL, processed_at TEXT NOT NULL, processed_by TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_price_pending_processed_files_signature ON price_pending_processed_files(signature);
        CREATE TABLE IF NOT EXISTS price_pending_refresh_locks (
            lock_key TEXT PRIMARY KEY, owner_id TEXT NOT NULL, owner_name TEXT,
            acquired_at TEXT NOT NULL, expires_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_price_pending_refresh_locks_expires_at ON price_pending_refresh_locks(expires_at);
        CREATE TABLE IF NOT EXISTS price_pending_automatic_charge (
            id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0, running INTEGER NOT NULL DEFAULT 0,
            last_success_at TEXT, last_error TEXT, updated_at TEXT NOT NULL
        );
    `);
    if (rowsTable) ensuredDatabases.add(database);
    return addedColumns;
}

function getPricePendingDatabase() {
    const database = isSharedMode() ? getSharedDatabase() : getLocalDatabase();
    ensurePricePendingSchema(database);
    return database;
}

function closePricePendingDatabase() {
    if (sharedDatabase) { sharedDatabase.close(); sharedDatabase = null; sharedDatabasePath = null; }
}

function testSharedConnection(customPath) {
    const databasePath = String(customPath || "").trim() || getEffectiveConfig().path;
    let testDatabase = null;
    try {
        testDatabase = openSharedDatabase(databasePath);
        const row = testDatabase.prepare("SELECT COUNT(*) AS total FROM price_pending_rows").get();
        return { success: true, message: `Conexao bem-sucedida. ${row?.total ?? 0} registro(s) encontrado(s).` };
    } catch (error) {
        return { success: false, message: error?.message || "Nao foi possivel conectar ao banco compartilhado." };
    } finally { if (testDatabase) testDatabase.close(); }
}

module.exports = { isSharedMode, getPricePendingDatabase, ensurePricePendingSchema, closePricePendingDatabase, getEffectiveConfig, testSharedConnection, DEFAULT_SHARED_DATABASE_PATH };
