const repository = require(
    "../repositories/products-corrections.repository"
);

const {
    exportRowsToExcel
} = require(
    "../../../services/excel-export.service"
);

const {
    PRODUCT_FIELD_LABELS,
    CORRECTION_STATUS_LABELS
} = require(
    "../constants/products-corrections.constants"
);

function getStatusLabel(status) {
    return CORRECTION_STATUS_LABELS[status] || status;
}

function formatGroupOrCategory(fieldName, value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }

    const text = String(value).trim();

    if (
        [
            "group_code",
            "category_code"
        ].includes(fieldName) &&
        /^\d$/.test(text)
    ) {
        return text.padStart(2, "0");
    }

    return text;
}

function formatDate(value) {
    if (!value) {
        return "";
    }

    return new Date(value).toLocaleString(
        "pt-BR"
    );
}

function getCorrectionsForExport(filters = {}) {
    const exportFilters = {
        ...filters
    };

    delete exportFilters.page;
    delete exportFilters.pageSize;

    const corrections = repository.listCorrections(
        exportFilters
    );

    return corrections.map((correction) => ({
        status: getStatusLabel(
            correction.status
        ),

        correction_date: formatDate(
            correction.updated_at
        ),

        ean: correction.ean || "",

        branch: correction.branch || "",

        code: correction.code || "",

        commercial_name:
            correction.commercial_name || "",

        active_ingredient:
            correction.active_ingredient || "",

        brand: correction.brand || "",

        corrected_field:
            PRODUCT_FIELD_LABELS[
                correction.field_name
            ] || correction.field_name,

        old_value: formatGroupOrCategory(
            correction.field_name,
            correction.old_value
        ),

        new_value: formatGroupOrCategory(
            correction.field_name,
            correction.new_value
        )
    }));
}

async function exportCorrectionsExcel(
    filters,
    columns
) {
    const rows = getCorrectionsForExport(filters);

    return exportRowsToExcel({
        moduleKey: "CORRECOES-PRODUTOS",
        sheetName: "Correcoes",
        columns,
        rows
    });
}

module.exports = {
    exportCorrectionsExcel
};