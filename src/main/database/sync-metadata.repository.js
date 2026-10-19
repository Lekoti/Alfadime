const {
    getDatabase
} = require("./connection");



const VALID_MODULE_KEYS = [
    "products",
    "purchases"
];



function normalizeModuleKey(moduleKey) {
    const normalizedModuleKey = String(moduleKey || "")
        .trim()
        .toLowerCase();


    if (!VALID_MODULE_KEYS.includes(normalizedModuleKey)) {
        throw new Error(`Módulo inválido para sincronização: ${moduleKey}`);
    }


    return normalizedModuleKey;
}



function getSyncMetadata(moduleKey) {
    const normalizedModuleKey = normalizeModuleKey(moduleKey);
    const database = getDatabase();


    const row = database.prepare(`
        SELECT
            id,
            module_key,
            last_sync_at,
            last_sync_by,
            last_sync_source,
            created_at,
            updated_at
        FROM sync_metadata
        WHERE module_key = ?
        LIMIT 1
    `).get(normalizedModuleKey);


    return row || null;
}



function setSyncMetadata({
    moduleKey,
    syncedBy = "",
    source = ""
}) {
    const normalizedModuleKey = normalizeModuleKey(moduleKey);
    const database = getDatabase();
    const now = new Date().toISOString();


    const result = database.prepare(`
        INSERT INTO sync_metadata (
            module_key,
            last_sync_at,
            last_sync_by,
            last_sync_source,
            created_at,
            updated_at
        ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
        )
        ON CONFLICT(module_key) DO UPDATE SET
            last_sync_at = excluded.last_sync_at,
            last_sync_by = excluded.last_sync_by,
            last_sync_source = excluded.last_sync_source,
            updated_at = excluded.updated_at
    `).run(
        normalizedModuleKey,
        now,
        String(syncedBy || "").trim(),
        String(source || "").trim(),
        now,
        now
    );


    if (result.changes === 0) {
        throw new Error("Não foi possível registrar a última atualização.");
    }


    return getSyncMetadata(normalizedModuleKey);
}



module.exports = {
    getSyncMetadata,
    setSyncMetadata,
    VALID_MODULE_KEYS
};