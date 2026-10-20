const crypto = require("node:crypto");

const {
    getDatabase
} = require("../../database/connection");

const SETTING_KEY = "price_pending_db_config";

const DEFAULT_SHARED_DATABASE_PATH =
    "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\precos-pendencias.db";

function getCentralizedConfig() {
    return {
        mode: "shared",
        path: DEFAULT_SHARED_DATABASE_PATH
    };
}

function getStoredDbConfig() {
    const database = getDatabase();

    const row = database
        .prepare(`
            SELECT setting_value
            FROM settings
            WHERE setting_key = ?
            LIMIT 1
        `)
        .get(SETTING_KEY);

    if (!row?.setting_value) {
        return null;
    }

    try {
        return JSON.parse(row.setting_value);
    } catch {
        return null;
    }
}

function isCentralizedConfig(config) {
    return Boolean(
        config &&
        config.mode === "shared" &&
        config.path === DEFAULT_SHARED_DATABASE_PATH
    );
}

function getDbConfig() {
    const existing = getStoredDbConfig();

    if (!isCentralizedConfig(existing)) {
        return saveDbConfig();
    }

    return getCentralizedConfig();
}

function saveDbConfig(_config = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const config = getCentralizedConfig();
    const value = JSON.stringify(config);

    const existing = database
        .prepare(`
            SELECT id
            FROM settings
            WHERE setting_key = ?
            LIMIT 1
        `)
        .get(SETTING_KEY);

    if (existing) {
        database
            .prepare(`
                UPDATE settings
                SET setting_value = ?,
                    updated_at = ?
                WHERE setting_key = ?
            `)
            .run(
                value,
                now,
                SETTING_KEY
            );
    } else {
        database
            .prepare(`
                INSERT INTO settings (
                    id,
                    setting_key,
                    setting_value,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?)
            `)
            .run(
                crypto.randomUUID(),
                SETTING_KEY,
                value,
                now,
                now
            );
    }

    return config;
}

function ensureDefaultDbConfig(_defaultSharedPath) {
    return getDbConfig();
}

module.exports = {
    getDbConfig,
    saveDbConfig,
    ensureDefaultDbConfig
};