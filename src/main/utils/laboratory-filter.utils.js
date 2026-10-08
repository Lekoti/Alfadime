function normalizeGlobalLaboratoryCode(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}


function getGlobalLaboratoryRows(database) {
    return database
        .prepare(`
            SELECT DISTINCT
                lab AS name
            FROM product_purchase_curve
            WHERE lab IS NOT NULL
                AND TRIM(lab) <> ''
        `)
        .all();
}


function groupLaboratoryOptions(rows = []) {
    const grouped = new Map();


    for (const row of rows) {
        const name = String(row.name || "").trim();
        const code = normalizeGlobalLaboratoryCode(name);


        if (!code || grouped.has(code)) {
            continue;
        }


        grouped.set(code, {
            code,
            name
        });
    }


    return Array.from(grouped.values()).sort((left, right) =>
        left.name.localeCompare(right.name, "pt-BR")
    );
}


function getUnifiedLaboratoryOptions(database) {
    return groupLaboratoryOptions(
        getGlobalLaboratoryRows(database)
    );
}


function getMatchingGlobalLaboratoryCodes(database, selectedCode) {
    const normalizedCode = normalizeGlobalLaboratoryCode(selectedCode);


    if (!normalizedCode) {
        return [];
    }


    return getGlobalLaboratoryRows(database)
        .map((row) => String(row.name || "").trim())
        .filter(
            (name) =>
                normalizeGlobalLaboratoryCode(name) ===
                normalizedCode
        );
}


module.exports = {
    getMatchingGlobalLaboratoryCodes,
    getUnifiedLaboratoryOptions,
    normalizeGlobalLaboratoryCode
};