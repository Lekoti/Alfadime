const {
    getDatabase
} = require("../../database/connection");


const SETTING_KEY = "price_pending_folders_config";


// Caminhos padrão (fallback)
const DEFAULT_FOLDERS = {
    prices: "\\\\10.0.0.20\\Compras\\1.COMPRAS\\PRECOS SUBIDOS SIRIUS\\PRECOS ATUALIZADOS",
    pending: "\\\\10.0.0.20\\Compras\\1.COMPRAS\\PRECOS\\PENDENCIAS"
};


function getFoldersConfig() {
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
        return {
            prices: DEFAULT_FOLDERS.prices,
            pending: DEFAULT_FOLDERS.pending
        };
    }


    try {
        const parsed = JSON.parse(row.setting_value);


        return {
            prices: String(parsed.prices || DEFAULT_FOLDERS.prices).trim(),
            pending: String(parsed.pending || DEFAULT_FOLDERS.pending).trim()
        };
    } catch {
        return {
            prices: DEFAULT_FOLDERS.prices,
            pending: DEFAULT_FOLDERS.pending
        };
    }
}


function saveFoldersConfig({ prices, pending }) {
    const database = getDatabase();
    const now = new Date().toISOString();


    const value = JSON.stringify({
        prices: String(prices || DEFAULT_FOLDERS.prices).trim(),
        pending: String(pending || DEFAULT_FOLDERS.pending).trim()
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


    return getFoldersConfig();
}


module.exports = {
    getFoldersConfig,
    saveFoldersConfig,
    DEFAULT_FOLDERS
};
