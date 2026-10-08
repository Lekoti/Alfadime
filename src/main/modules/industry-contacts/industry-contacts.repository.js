const crypto = require("node:crypto");

const {
    getDatabase
} = require(
    "./industry-contacts.database"
);

function normalizeLaboratoryKey(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

function normalizeText(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const text = String(value).trim();

    return text || null;
}

function normalizeBranch(value) {
    return normalizeText(value)?.toUpperCase() || "";
}

function mapContactRow(row) {
    return {
        id: row.id,
        laboratory_name: row.laboratory_name,
        laboratory_key: row.laboratory_key,
        branch: row.branch,
        contact_id: row.id,
        contact_name: row.contact_name,
        phone: row.phone,
        email: row.email,
        service_region: row.service_region,
        notes: row.notes,
        cargo: row.cargo,
        spreadsheet_row: row.spreadsheet_row,
        created_at: row.created_at,
        updated_at: row.updated_at,
        has_contact: 1,
        source_contact: 1,
        industry_global_code:
            row.industry_global_code ||
            row.global_code ||
            null,
        automatic_observation:
            row.automatic_observation || null,
        status_label:
            row.status_label || null,
        notification_events:
            row.notification_events || []
    };
}

function getLaboratoriesWithContacts() {
    const database = getDatabase();

    const rows =
        database
            .prepare(`
                SELECT
                    id,
                    laboratory_name,
                    laboratory_key,
                    branch,
                    contact_name,
                    phone,
                    email,
                    service_region,
                    notes,
                    cargo,
                    spreadsheet_row,
                    created_at,
                    updated_at
                FROM industry_contacts
                ORDER BY
                    laboratory_name COLLATE NOCASE ASC,
                    branch COLLATE NOCASE ASC
            `)
            .all();

    return rows.map(mapContactRow);
}

function getLaboratoriesWithoutContacts() {
    return [];
}

function listLaboratories() {
    return getLaboratoriesWithContacts();
}

function getContactByLaboratoryKey(
    laboratoryKey,
    branch = ""
) {
    const database = getDatabase();

    return database
        .prepare(`
            SELECT
                id,
                laboratory_name,
                laboratory_key,
                branch,
                contact_name,
                phone,
                email,
                service_region,
                notes,
                cargo,
                spreadsheet_row,
                created_at,
                updated_at
            FROM industry_contacts
            WHERE laboratory_key = ?
                AND branch = ?
            LIMIT 1
        `)
        .get(
            laboratoryKey,
            normalizeBranch(branch)
        );
}

function saveContact(data = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const laboratoryName = normalizeText(
        data.laboratory_name
    );

    const laboratoryKey = normalizeLaboratoryKey(
        data.laboratory_key || laboratoryName
    );

    const branch = normalizeBranch(
        data.branch || data.filial
    );

    if (!laboratoryName || !laboratoryKey) {
        throw new Error(
            "Laboratório é obrigatório."
        );
    }

    const contact = {
        id: data.id || crypto.randomUUID(),
        laboratory_name: laboratoryName,
        laboratory_key: laboratoryKey,
        branch,
        contact_name: normalizeText(
            data.contact_name
        ),
        phone: normalizeText(data.phone),
        email: normalizeText(data.email),
        service_region: normalizeText(
            data.service_region
        ),
        notes: normalizeText(data.notes),
        cargo: normalizeText(data.cargo),
        spreadsheet_row:
            data.spreadsheet_row || null,
        created_at: data.created_at || now,
        updated_at: now
    };

    database
        .prepare(`
            INSERT INTO industry_contacts (
                id,
                laboratory_name,
                laboratory_key,
                branch,
                contact_name,
                phone,
                email,
                service_region,
                notes,
                cargo,
                spreadsheet_row,
                created_at,
                updated_at
            ) VALUES (
                @id,
                @laboratory_name,
                @laboratory_key,
                @branch,
                @contact_name,
                @phone,
                @email,
                @service_region,
                @notes,
                @cargo,
                @spreadsheet_row,
                @created_at,
                @updated_at
            )
            ON CONFLICT(laboratory_key, branch)
            DO UPDATE SET
                laboratory_name =
                    excluded.laboratory_name,
                contact_name =
                    excluded.contact_name,
                phone =
                    excluded.phone,
                email =
                    excluded.email,
                service_region =
                    excluded.service_region,
                notes =
                    excluded.notes,
                cargo =
                    excluded.cargo,
                spreadsheet_row =
                    excluded.spreadsheet_row,
                updated_at =
                    excluded.updated_at
        `)
        .run(contact);

    return getContactByLaboratoryKey(
        laboratoryKey,
        branch
    );
}

function deleteContact(id) {
    const database = getDatabase();

    const result =
        database
            .prepare(`
                DELETE FROM industry_contacts
                WHERE id = ?
            `)
            .run(id);

    return {
        success: result.changes > 0
    };
}

module.exports = {
    normalizeLaboratoryKey,
    normalizeBranch,
    getLaboratoriesWithContacts,
    getLaboratoriesWithoutContacts,
    listLaboratories,
    getContactByLaboratoryKey,
    saveContact,
    deleteContact
};