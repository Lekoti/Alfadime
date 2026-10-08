const service = require(
    "./product-audit.service"
);

const {
    exportRowsToExcel
} = require(
    "../../services/excel-export.service"
);

function getIssueTypeLabel(type) {
    const labels = {
        ean_audit:
            "Divergencias entre filiais",
        invalid_ean:
            "EAN ausente ou invalido",
        duplicate_ean_branch:
            "EAN repetido na mesma filial"
    };

    return labels[type] || type;
}

function getFieldsLabel(fields = []) {
    return fields
        .map((field) => field.label)
        .join(" | ");
}

function getAuditRowsForExport(filters = {}) {
    const issues = service.listAllAuditIssues(filters);

    return issues.map((issue) => ({
        priority:
            issue.severity === "error"
                ? "Alta"
                : "Conferir",

        ean: issue.ean || "",

        issue_type: getIssueTypeLabel(
            issue.type
        ),

        branches: issue.branches.join(" | "),

        branches_count: issue.branchesCount,

        products_count: issue.productsCount,

        divergent_fields: getFieldsLabel(
            issue.divergentFields
        ),

        missing_fields: getFieldsLabel(
            issue.missingFields
        ),

        message: issue.message || ""
    }));
}

async function exportAuditExcel(
    filters,
    columns
) {
    const rows = getAuditRowsForExport(filters);

    return exportRowsToExcel({
        moduleKey: "AUDITORIA-PRODUTOS",
        sheetName: "Auditoria",
        columns,
        rows
    });
}

module.exports = {
    exportAuditExcel
};
