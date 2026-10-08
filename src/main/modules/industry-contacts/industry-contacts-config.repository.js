const crypto = require("node:crypto");

const {
    getDatabase
} = require("../../database/connection");



const SETTING_KEY =
    "industry_contacts_db_config";



const DEFAULT_SHARED_DATABASE_PATH =
    "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\CONTATOS\\contatos.db";



function getDbConfig() {
    const database = getDatabase();

    const row =
        database
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
        return JSON.parse(
            row.setting_value
        );
    } catch {
        return null;
    }
}



function saveDbConfig({
    mode,
    path
}) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const value =
        JSON.stringify({
            mode:
                mode === "shared"
                    ? "shared"
                    : "local",
            path:
                String(path || "").trim() ||
                DEFAULT_SHARED_DATABASE_PATH
        });

    const existing =
        database
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

    return getDbConfig();
}



function ensureDefaultDbConfig() {
    const existing =
        getDbConfig();

    if (existing) {
        return existing;
    }

    return saveDbConfig({
        mode: "shared",
        path: DEFAULT_SHARED_DATABASE_PATH
    });
}



module.exports = {
    DEFAULT_SHARED_DATABASE_PATH,
    getDbConfig,
    saveDbConfig,
    ensureDefaultDbConfig
};