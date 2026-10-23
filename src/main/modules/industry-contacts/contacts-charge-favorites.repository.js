const crypto = require("node:crypto");
const { getDatabase } = require("./industry-contacts.database");

function now() {
    return new Date().toISOString();
}

function normalizeText(value) {
    const text = String(value ?? "").trim();
    return text || null;
}

function ensureSchema(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS contact_charge_favorites (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            charge_type TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            save_recipients INTEGER NOT NULL DEFAULT 0,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS contact_charge_favorite_recipients (
            id TEXT PRIMARY KEY,
            favorite_id TEXT NOT NULL,
            contact_id TEXT NOT NULL,
            laboratory_name TEXT,
            laboratory_key TEXT,
            branch TEXT,
            email TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(favorite_id, contact_id, branch),
            FOREIGN KEY (favorite_id) REFERENCES contact_charge_favorites(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS contact_charge_favorite_industries (
            id TEXT PRIMARY KEY,
            favorite_id TEXT NOT NULL,
            industry_global_code TEXT NOT NULL,
            industry_name TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(favorite_id, industry_global_code),
            FOREIGN KEY (favorite_id) REFERENCES contact_charge_favorites(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS contact_charge_favorite_attachments (
            id TEXT PRIMARY KEY,
            favorite_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            mime_type TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (favorite_id) REFERENCES contact_charge_favorites(id) ON DELETE CASCADE
        );
    `);
}

function mapFavorite(row) {
    return {
        id: row.id,
        name: row.name,
        charge_type: row.charge_type,
        subject: row.subject,
        body: row.body,
        save_recipients: row.save_recipients === 1,
        notes: row.notes || "",
        created_at: row.created_at,
        updated_at: row.updated_at,
        recipients: [],
        industries: [],
        attachments: []
    };
}

function listFavorites() {
    const database = getDatabase();
    ensureSchema(database);

    const favorites = database
        .prepare("SELECT * FROM contact_charge_favorites ORDER BY name COLLATE NOCASE ASC")
        .all()
        .map(mapFavorite);

    const recipients = database
        .prepare("SELECT * FROM contact_charge_favorite_recipients ORDER BY laboratory_name COLLATE NOCASE ASC")
        .all();

    const industries = database
        .prepare("SELECT * FROM contact_charge_favorite_industries ORDER BY industry_name COLLATE NOCASE ASC")
        .all();

    const attachments = database
        .prepare("SELECT * FROM contact_charge_favorite_attachments ORDER BY file_name COLLATE NOCASE ASC")
        .all();

    for (const favorite of favorites) {
        favorite.recipients = recipients.filter((item) => item.favorite_id === favorite.id);
        favorite.industries = industries.filter((item) => item.favorite_id === favorite.id);
        favorite.attachments = attachments.filter((item) => item.favorite_id === favorite.id);
    }

    return favorites;
}

function getFavorite(id) {
    const database = getDatabase();
    ensureSchema(database);

    const row = database
        .prepare("SELECT * FROM contact_charge_favorites WHERE id = ?")
        .get(id);

    if (!row) return null;

    const favorite = mapFavorite(row);

    favorite.recipients = database
        .prepare("SELECT * FROM contact_charge_favorite_recipients WHERE favorite_id = ? ORDER BY laboratory_name COLLATE NOCASE ASC")
        .all(id);

    favorite.industries = database
        .prepare("SELECT * FROM contact_charge_favorite_industries WHERE favorite_id = ? ORDER BY industry_name COLLATE NOCASE ASC")
        .all(id);

    favorite.attachments = database
        .prepare("SELECT * FROM contact_charge_favorite_attachments WHERE favorite_id = ? ORDER BY file_name COLLATE NOCASE ASC")
        .all(id);

    return favorite;
}

function clearFavoriteRelations(database, favoriteId) {
    database.prepare("DELETE FROM contact_charge_favorite_recipients WHERE favorite_id = ?").run(favoriteId);
    database.prepare("DELETE FROM contact_charge_favorite_industries WHERE favorite_id = ?").run(favoriteId);
    database.prepare("DELETE FROM contact_charge_favorite_attachments WHERE favorite_id = ?").run(favoriteId);
}

function saveFavorite(data = {}) {
    const database = getDatabase();
    ensureSchema(database);

    const name = normalizeText(data.name);
    const chargeType = normalizeText(data.charge_type);
    const subject = normalizeText(data.subject);
    const body = normalizeText(data.body);

    if (!name) throw new Error("Informe o nome do favorito.");
    if (!chargeType) throw new Error("Informe o tipo de cobrança.");
    if (!subject) throw new Error("Informe o assunto do e-mail.");
    if (!body) throw new Error("Informe o corpo do e-mail.");

    const favoriteId = data.id || crypto.randomUUID();
    const existing = data.id
        ? database.prepare("SELECT id FROM contact_charge_favorites WHERE id = ?").get(data.id)
        : null;

    if (data.id && !existing) {
        throw new Error("Favorito não encontrado para atualização.");
    }

    const favorite = {
        id: favoriteId,
        name,
        charge_type: chargeType,
        subject,
        body,
        save_recipients: data.save_recipients ? 1 : 0,
        notes: normalizeText(data.notes),
        created_at: existing ? undefined : now(),
        updated_at: now()
    };

    if (existing) {
        database.prepare(`
            UPDATE contact_charge_favorites
            SET name = @name,
                charge_type = @charge_type,
                subject = @subject,
                body = @body,
                save_recipients = @save_recipients,
                notes = @notes,
                updated_at = @updated_at
            WHERE id = @id
        `).run(favorite);
    } else {
        database.prepare(`
            INSERT INTO contact_charge_favorites (
                id, name, charge_type, subject, body,
                save_recipients, notes, created_at, updated_at
            ) VALUES (
                @id, @name, @charge_type, @subject, @body,
                @save_recipients, @notes, @created_at, @updated_at
            )
        `).run(favorite);
    }

    clearFavoriteRelations(database, favoriteId);

    const recipients = Array.isArray(data.recipients) ? data.recipients : [];
    const industries = Array.isArray(data.industries) ? data.industries : [];
    const attachments = Array.isArray(data.attachments) ? data.attachments : [];

    if (favorite.save_recipients === 1) {
        const insertRecipient = database.prepare(`
            INSERT OR IGNORE INTO contact_charge_favorite_recipients (
                id, favorite_id, contact_id, laboratory_name,
                laboratory_key, branch, email, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const recipient of recipients) {
            const contactId = normalizeText(recipient.contact_id || recipient.id);
            if (!contactId) continue;

            insertRecipient.run(
                crypto.randomUUID(),
                favoriteId,
                contactId,
                normalizeText(recipient.laboratory_name),
                normalizeText(recipient.laboratory_key),
                normalizeText(recipient.branch),
                normalizeText(recipient.email),
                now()
            );
        }
    }

    const insertIndustry = database.prepare(`
        INSERT OR IGNORE INTO contact_charge_favorite_industries (
            id, favorite_id, industry_global_code, industry_name, created_at
        ) VALUES (?, ?, ?, ?, ?)
    `);

    for (const industry of industries) {
        const code = normalizeText(industry.industry_global_code || industry.code);
        if (!code) continue;

        insertIndustry.run(
            crypto.randomUUID(),
            favoriteId,
            code,
            normalizeText(industry.industry_name || industry.name),
            now()
        );
    }

    const insertAttachment = database.prepare(`
        INSERT INTO contact_charge_favorite_attachments (
            id, favorite_id, file_name, file_path, file_size, mime_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const attachment of attachments) {
        const filePath = normalizeText(attachment.file_path || attachment.path);
        const fileName = normalizeText(attachment.file_name || attachment.name);

        if (!filePath || !fileName) continue;

        insertAttachment.run(
            crypto.randomUUID(),
            favoriteId,
            fileName,
            filePath,
            Number(attachment.file_size || attachment.size || 0) || null,
            normalizeText(attachment.mime_type || attachment.type),
            now()
        );
    }

    return getFavorite(favoriteId);
}

function deleteFavorite(id) {
    const database = getDatabase();
    ensureSchema(database);

    const result = database
        .prepare("DELETE FROM contact_charge_favorites WHERE id = ?")
        .run(id);

    return { success: result.changes > 0 };
}

module.exports = {
    listFavorites,
    getFavorite,
    saveFavorite,
    deleteFavorite
};
