const {
    exportRowsToExcel
} = require(
    "../../services/excel-export.service"
);

const EXPORT_COLUMNS = [
    { key: "industry_global_code", label: "Código Global", width: 18 },
    { key: "laboratory_name", label: "Indústria", width: 30 },
    { key: "branch", label: "Filial", width: 14 },
    { key: "contact_name", label: "Responsável", width: 26 },
    { key: "cargo", label: "Cargo", width: 22 },
    { key: "phone", label: "Telefone", width: 20 },
    { key: "email", label: "E-mail", width: 32 },
    { key: "automatic_observation", label: "Observação Automática", width: 48 },
    { key: "status_label", label: "Situação", width: 34 },
    { key: "notes", label: "Observação manual", width: 42 },
    { key: "created_at", label: "Criado em", width: 14 },
    { key: "updated_at", label: "Atualizado em", width: 14 }
];

function formatDate(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }

    const text = String(value).trim();

    if (!text) return "";

    const isoMatch = text.match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (isoMatch) {
        return [
            isoMatch[3],
            isoMatch[2],
            isoMatch[1]
        ].join("/");
    }

    const brazilianMatch = text.match(
        /^(\d{2})\/(\d{2})\/(\d{4})/
    );

    if (brazilianMatch) {
        return [
            brazilianMatch[1],
            brazilianMatch[2],
            brazilianMatch[3]
        ].join("/");
    }

    const parsed = new Date(text);

    if (Number.isNaN(parsed.getTime())) {
        return text.split("T")[0];
    }

    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();

    return `${day}/${month}/${year}`;
}

function normalizeColumns(columns) {
    if (!Array.isArray(columns) || !columns.length) {
        return EXPORT_COLUMNS;
    }

    const validKeys = new Set(
        EXPORT_COLUMNS.map((column) => column.key)
    );

    const requestedColumns = columns
        .filter((column) => {
            return column && validKeys.has(column.key);
        })
        .map((column) => {
            const definition = EXPORT_COLUMNS.find((item) => {
                return item.key === column.key;
            });

            return {
                ...definition,
                label: column.label || definition.label,
                width: column.width || definition.width
            };
        });

    return requestedColumns.length
        ? requestedColumns
        : EXPORT_COLUMNS;
}

async function exportIndustryContactsExcel(
    rows = [],
    columns = EXPORT_COLUMNS
) {
    const exportRows = rows.map((row) => ({
        industry_global_code:
            row.industry_global_code ||
            row.global_code ||
            "",
        laboratory_name: row.laboratory_name || "",
        branch: row.branch || "",
        contact_name: row.contact_name || "",
        cargo: row.cargo || "",
        phone: row.phone || "",
        email: row.email || "",
        automatic_observation:
            row.automatic_observation || "",
        status_label:
            row.status_label || "",
        notes: row.notes || "",
        created_at: formatDate(row.created_at),
        updated_at: formatDate(row.updated_at)
    }));

    return exportRowsToExcel({
        moduleKey: "contatos-industrias",
        sheetName: "Contatos",
        columns: normalizeColumns(columns),
        rows: exportRows
    });
}

module.exports = {
    EXPORT_COLUMNS,
    formatDate,
    exportIndustryContactsExcel
};
