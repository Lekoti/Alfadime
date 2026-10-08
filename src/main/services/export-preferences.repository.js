const crypto = require("node:crypto");

const {
    getDatabase
} = require("../database/connection");

function getExportPreference(moduleKey) {
    const database = getDatabase();

    return database
        .prepare(`
            SELECT *
            FROM export_preferences
            WHERE module_key = ?
            LIMIT 1
        `)
        .get(moduleKey);
}

function saveExportPreference(
    moduleKey,
    columns
) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const existing = getExportPreference(
        moduleKey
    );

    const columnsJson = JSON.stringify(columns);

    if (existing) {
        database
            .prepare(`
                UPDATE export_preferences
                SET
                    columns_json = ?,
                    updated_at = ?
                WHERE module_key = ?
            `)
            .run(
                columnsJson,
                now,
                moduleKey
            );

        return getExportPreference(moduleKey);
    }

    const preference = {
        id: crypto.randomUUID(),
        module_key: moduleKey,
        columns_json: columnsJson,
        created_at: now,
        updated_at: now
    };

    database
        .prepare(`
            INSERT INTO export_preferences (
                id,
                module_key,
                columns_json,
                created_at,
                updated_at
            ) VALUES (
                @id,
                @module_key,
                @columns_json,
                @created_at,
                @updated_at
            )
        `)
        .run(preference);

    return preference;
}

module.exports = {
    getExportPreference,
    saveExportPreference
};
