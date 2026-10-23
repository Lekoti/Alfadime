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


function getContactByLaboratoryKey(laboratoryKey, branch = "") {
    const rows = getDatabase().prepare(`
        SELECT * FROM industry_contacts
        WHERE laboratory_key = ? AND branch = ?
        ORDER BY id
        LIMIT 2
    `).all(normalizeLaboratoryKey(laboratoryKey), normalizeBranch(branch));
    if (rows.length > 1) {
        throw new Error("Há vários contatos para esta indústria e filial. Selecione um contato específico para a cobrança.");
    }
    return rows[0];
}


function getContactById(id) {
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
            WHERE id = ?
            LIMIT 1
        `)
        .get(id);
}


function findIdenticalContact(data, branch, ignoreId = null) {
    const key = normalizeLaboratoryKey(data.laboratory_key || data.laboratory_name);
    const identity = (value) => String(value || "").trim().toLocaleLowerCase("pt-BR");
    const fields = ["contact_name", "cargo", "phone", "email"];
    return getDatabase().prepare(
        "SELECT * FROM industry_contacts WHERE laboratory_key = ? AND branch = ?"
    ).all(key, branch).find((contact) => contact.id !== ignoreId &&
        fields.every((field) => identity(contact[field]) === identity(data[field])));
}


function assertDistinctContact(data, branch, ignoreId = null) {
    if (findIdenticalContact(data, branch, ignoreId)) {
        throw new Error("Este contato já existe na filial " + branch + ". Nenhum cadastro foi sobrescrito.");
    }
}


function normalizeContactPhone(value) {
    return String(value || "").replace(/\D/g, "");
}

function normalizeContactEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function getContactSaveMatches(data, branches) {
    const key = normalizeLaboratoryKey(data.laboratory_key || data.laboratory_name);
    const phone = normalizeContactPhone(data.phone);
    const email = normalizeContactEmail(data.email);
    const matches = [];
    for (const branch of branches) {
        const rows = getDatabase().prepare(
            "SELECT * FROM industry_contacts WHERE laboratory_key = ? AND branch = ? ORDER BY id"
        ).all(key, branch);
        for (const row of rows) {
            const matchedFields = [];
            if (phone && normalizeContactPhone(row.phone) === phone) matchedFields.push("Telefone");
            if (email && normalizeContactEmail(row.email) === email) matchedFields.push("E-mail");
            if (matchedFields.length) matches.push({ ...row, matched_fields: matchedFields });
        }
    }
    return matches;
}

function contactSaveSignature(data, branches, matches) {
    return crypto.createHash("sha256").update(JSON.stringify({
        key: normalizeLaboratoryKey(data.laboratory_key || data.laboratory_name),
        branches, matches
    })).digest("hex");
}

function saveContact(data = {}) {
    const allowed = ["DPR", "AMS", "DMT", "DMS", "DSC"];
    return getDatabase().transaction(() => {
        const laboratoryName = normalizeText(data.laboratory_name);
        const key = normalizeLaboratoryKey(data.laboratory_key || laboratoryName);
        if (!laboratoryName || !key) throw new Error("Indústria é obrigatória.");
        if (data.id) {
            const existing = getContactById(data.id);
            if (!existing) throw new Error("Contato não encontrado para atualização.");
            const branch = normalizeBranch(data.branch || data.filial);
            if (!allowed.includes(branch)) throw new Error("Selecione uma filial válida.");
            assertDistinctContact(data, branch, existing.id);
            return saveSingleContact({ ...data, branch });
        }
        const mode = data.branch_mode || "single";
        if (!["single", "selected", "all"].includes(mode)) throw new Error("Abrangência de filiais inválida.");
        const requested = mode === "all" ? allowed
            : mode === "selected" ? (Array.isArray(data.branches) ? data.branches : [])
            : [data.branch || data.filial];
        const branches = [...new Set(requested.map(normalizeBranch))];
        if (!branches.length || branches.some((branch) => !allowed.includes(branch))) {
            throw new Error("Selecione pelo menos uma filial válida.");
        }
        const matches = getContactSaveMatches(data, branches);
        const signature = contactSaveSignature(data, branches, matches);
        const resolution = data.conflict_resolution;
        if (matches.length && (!resolution || resolution.signature !== signature)) {
            return {
                confirmation_required: true,
                conflicts: matches,
                signature,
                requested_branches: branches,
                notice: resolution
                    ? "Os cadastros mudaram desde a consulta. Revise novamente antes de confirmar."
                    : "Há contatos com telefone ou e-mail correspondente. Nenhum dado foi gravado."
            };
        }
        if (resolution && resolution.signature !== signature) {
            return {
                confirmation_required: true,
                conflicts: matches,
                signature,
                requested_branches: branches,
                notice: "Os cadastros mudaram. Confirme novamente a operação."
            };
        }
        if (resolution && !["create", "update"].includes(resolution.action)) {
            throw new Error("Escolha atualizar os contatos selecionados ou criar novos.");
        }
        const selectedIds = new Set(Array.isArray(resolution?.contact_ids) ? resolution.contact_ids : []);
        if (resolution?.action === "update") {
            if ([...selectedIds].some((id) => !matches.some((item) => item.id === id))) {
                throw new Error("A seleção contém um contato que não corresponde à prévia.");
            }
            for (const branch of branches) {
                const candidates = matches.filter((item) => item.branch === branch);
                if (candidates.length && !candidates.some((item) => selectedIds.has(item.id))) {
                    throw new Error("Selecione pelo menos um contato para atualizar na filial " + branch + ".");
                }
            }
        }
        const created = [];
        const updated = [];
        const skipped = [];
        for (const branch of branches) {
            const candidates = matches.filter((item) => item.branch === branch);
            if (resolution?.action === "update" && candidates.length) {
                for (const contact of candidates.filter((item) => selectedIds.has(item.id))) {
                    updated.push(saveSingleContact({ ...contact, ...data, id: contact.id, branch,
                        service_region: data.service_region === undefined ? contact.service_region : data.service_region }));
                }
                continue;
            }
            if (!resolution) {
                const identical = findIdenticalContact(data, branch);
                if (identical) { skipped.push(identical); continue; }
            }
            created.push(saveSingleContact({ ...data, id: undefined, branch }));
        }
        return {
            ...(created[0] || updated[0] || skipped[0]),
            save_summary: {
                created: created.length, updated: updated.length, skipped: skipped.length,
                message: `${created.length} cadastro(s) criado(s), ${updated.length} atualizado(s) e ${skipped.length} já existente(s), mantido(s).`
            }
        };
    }).immediate();
}


function saveSingleContact(data = {}) {
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


    const existingContact = data.id
        ? getContactById(data.id)
        : null;


    if (data.id && !existingContact) {
        throw new Error(
            "Contato não encontrado para atualização."
        );
    }


    const contact = {
        id: existingContact?.id || crypto.randomUUID(),
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
            data.spreadsheet_row ||
            existingContact?.spreadsheet_row ||
            null,
        created_at:
            existingContact?.created_at ||
            data.created_at ||
            now,
        updated_at: now
    };


    if (existingContact) {
        database
            .prepare(`
                UPDATE industry_contacts
                SET
                    laboratory_name = @laboratory_name,
                    laboratory_key = @laboratory_key,
                    branch = @branch,
                    contact_name = @contact_name,
                    phone = @phone,
                    email = @email,
                    service_region = @service_region,
                    notes = @notes,
                    cargo = @cargo,
                    spreadsheet_row = @spreadsheet_row,
                    updated_at = @updated_at
                WHERE id = @id
            `)
            .run(contact);


        return getContactById(contact.id);
    }


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
        `)
        .run(contact);


    return getContactById(contact.id);
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
    getContactById,
    saveContact,
    deleteContact
};
