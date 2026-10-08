const {
    getDatabase
} = require("../../database/connection");

const SETTING_KEY = "price_pending_db_config";

function getDbConfig() {
    const database = getDatabase();

    const row = database
        .prepare(`
            SELECT setting_value
            FROM settings
            WHERE setting_key = ?
            LIMIT 1
        `)
        .get(SETTING_KEY);

    if (!row || !row.setting_value) {
        return null;
    }

    try {
        return JSON.parse(row.setting_value);
    } catch {
        return null;
    }
}

function saveDbConfig({ mode, path }) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const value = JSON.stringify({
        mode,
        path
    });

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
            .run(value, now, SETTING_KEY);
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
                require("node:crypto").randomUUID(),
                SETTING_KEY,
                value,
                now,
                now
            );
    }

    return getDbConfig();
}

module.exports = {
    getDbConfig,
    saveDbConfig,
    ensureDefaultDbConfig
};

function ensureDefaultDbConfig(defaultSharedPath) {
    const existing = getDbConfig();

    if (existing) {
        return existing;
    }

    return saveDbConfig({
        mode: "shared",
        path: defaultSharedPath
    });
}
