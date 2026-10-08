const repository = require(
    "./product-audit.repository"
);


const {
    AUDITABLE_FIELDS,
    HIGH_PRIORITY_DIVERGENT_FIELDS
} = require(
    "./product-audit.constants"
);


const {
    toSafeNumber
} = require(
    "../../utils/validation.utils"
);


const TYPE_TO_FIELD = {
    divergent_commercial_name: "commercial_name",
    divergent_active_ingredient: "active_ingredient",
    divergent_brand: "brand",
    divergent_sirius_code: "sirius_code",
    divergent_sap_code: "sap_code",
    divergent_group_code: "group_code",
    divergent_category_code: "category_code",
    divergent_unit: "unit",
    divergent_standard_box: "standard_box",
    divergent_controls_lot: "controls_lot",
    divergent_ms_registration: "ms_registration",
    divergent_reference_code: "reference_code",
    divergent_therapeutic_class: "therapeutic_class_code",
    divergent_height: "height",
    divergent_width: "width",
    divergent_length: "length",
    divergent_active: "active",

    missing_commercial_name: "commercial_name",
    missing_active_ingredient: "active_ingredient",
    missing_brand: "brand",
    missing_sirius_code: "sirius_code",
    missing_sap_code: "sap_code",
    missing_group_code: "group_code",
    missing_category_code: "category_code",
    missing_unit: "unit",
    missing_ms_registration: "ms_registration",
    missing_reference_code: "reference_code",
    missing_therapeutic_class: "therapeutic_class_code",
    missing_dimensions: "dimensions"
};


function normalizeText(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .trim()
        .replace(/\s+/g, " ");
}


function normalizeComparisonText(value) {
    return normalizeText(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}


function normalizeEan(value) {
    return normalizeText(value)
        .replace(/\D/g, "");
}


function normalizeArray(values) {
    if (!Array.isArray(values)) {
        return [];
    }


    return values
        .map((value) =>
            String(value).trim()
        )
        .filter(Boolean);
}


function uniqueArray(values) {
    return [
        ...new Set(
            values.filter(Boolean)
        )
    ];
}


function includesAny(values, candidates) {
    if (!candidates.length) {
        return true;
    }


    return candidates.some((candidate) =>
        values.includes(candidate)
    );
}


function isValidEan13(value) {
    const ean = normalizeEan(value);


    if (!/^\d{13}$/.test(ean)) {
        return false;
    }


    if (/^0{13}$/.test(ean)) {
        return false;
    }


    const digits = ean
        .split("")
        .map(Number);


    const checkDigit = digits[12];


    const sum = digits
        .slice(0, 12)
        .reduce(
            (total, digit, index) =>
                total + (
                    index % 2 === 0
                        ? digit
                        : digit * 3
                ),
            0
        );


    const expectedCheckDigit =
        (10 - (sum % 10)) % 10;


    return checkDigit === expectedCheckDigit;
}


function normalizeAuditValue(value, type) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }


    if (type === "boolean") {
        return toSafeNumber(value, 0) === 1
            ? "SIM"
            : "NAO";
    }


    if (type === "number") {
        const number = Number(value);


        return Number.isFinite(number)
            ? String(number)
            : "";
    }


    return normalizeComparisonText(value);
}


function displayAuditValue(value, type) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }


    if (type === "boolean") {
        return toSafeNumber(value, 0) === 1
            ? "Sim"
            : "Nao";
    }


    return normalizeText(value);
}


function groupProductsByEan(products) {
    const groups = new Map();


    for (const product of products) {
        const ean = normalizeEan(product.ean);


        if (!isValidEan13(ean)) {
            continue;
        }


        if (!groups.has(ean)) {
            groups.set(ean, []);
        }


        groups.get(ean).push(product);
    }


    return groups;
}


function getDuplicateEansByBranch(products) {
    const groups = new Map();


    for (const product of products) {
        const ean = normalizeEan(product.ean);


        if (!ean) {
            continue;
        }


        const key = [
            product.branch,
            ean
        ].join("::");


        if (!groups.has(key)) {
            groups.set(key, []);
        }


        groups.get(key).push(product);
    }


    return Array.from(groups.values())
        .filter((group) => group.length > 1);
}


function compareField(products, field) {
    const values = new Map();
    const missingBranches = [];


    for (const product of products) {
        const normalized = normalizeAuditValue(
            product[field.key],
            field.type
        );


        const display = displayAuditValue(
            product[field.key],
            field.type
        );


        if (!normalized) {
            missingBranches.push(
                product.branch
            );


            continue;
        }


        if (!values.has(normalized)) {
            values.set(normalized, {
                value: display,
                branches: []
            });
        }


        values
            .get(normalized)
            .branches
            .push(product.branch);
    }


    const distinctValues = Array.from(
        values.values()
    );


    return {
        key: field.key,
        label: field.label,
        type: field.type,

        status:
            missingBranches.length > 0 &&
            distinctValues.length > 1
                ? "divergent_and_missing"
                : missingBranches.length > 0
                    ? "missing"
                    : distinctValues.length > 1
                        ? "divergent"
                        : "consistent",

        values: distinctValues,
        missingBranches,

        hasDivergence:
            distinctValues.length > 1,

        hasMissing:
            missingBranches.length > 0
    };
}


function createInvalidEanIssue(product) {
    const ean = normalizeEan(product.ean);


    return {
        id: [
            "invalid_ean",
            product.id
        ].join("::"),

        type: "invalid_ean",
        severity: "warning",
        ean: ean || null,

        branches: [product.branch],
        branchesCount: 1,
        productsCount: 1,

        divergentFields: [],
        missingFields: [],
        comparisons: [],

        message: ean
            ? "EAN invalido. O produto deve possuir um EAN-13 valido."
            : "EAN ausente. O produto nao possui identificacao EAN-13.",

        products: [product]
    };
}


function createDuplicateEanIssue(products) {
    const ean = normalizeEan(
        products[0]?.ean
    );


    return {
        id: [
            "duplicate_ean_branch",
            products
                .map((product) => product.id)
                .sort()
                .join("-")
        ].join("::"),

        type: "duplicate_ean_branch",
        severity: "warning",
        ean: ean || null,

        branches: uniqueArray(
            products.map(
                (product) => product.branch
            )
        ),

        branchesCount: 1,
        productsCount: products.length,

        divergentFields: [],
        missingFields: [],
        comparisons: [],

        message:
            "O mesmo EAN aparece mais de uma vez na mesma filial.",

        products
    };
}


function createEanAuditIssue(ean, products) {
    const comparisons = AUDITABLE_FIELDS.map(
        (field) =>
            compareField(products, field)
    );


    const divergentFields = comparisons.filter(
        (comparison) =>
            comparison.hasDivergence
    );


    const missingFields = comparisons.filter(
        (comparison) =>
            comparison.hasMissing
    );


    if (
        divergentFields.length === 0 &&
        missingFields.length === 0
    ) {
        return null;
    }


    const hasHighPriorityDivergence =
        divergentFields.some((field) =>
            HIGH_PRIORITY_DIVERGENT_FIELDS.includes(
                field.key
            )
        );


    return {
        id: [
            "ean_audit",
            ean
        ].join("::"),

        type: "ean_audit",
        severity: hasHighPriorityDivergence
            ? "error"
            : "warning",
        ean,

        branches: uniqueArray(
            products.map(
                (product) => product.branch
            )
        ),

        branchesCount: new Set(
            products.map(
                (product) => product.branch
            )
        ).size,

        productsCount: products.length,

        divergentFields,
        missingFields,
        comparisons,

        message:
            "Foram encontradas divergencias ou informacoes ausentes entre filiais para este EAN.",

        products
    };
}


function buildAuditIssues(products) {
    const issues = [];


    for (const product of products) {
        const ean = normalizeEan(product.ean);


        if (!isValidEan13(ean)) {
            issues.push(
                createInvalidEanIssue(product)
            );
        }
    }


    const duplicateGroups =
        getDuplicateEansByBranch(products);


    for (const productsWithSameEan of duplicateGroups) {
        issues.push(
            createDuplicateEanIssue(
                productsWithSameEan
            )
        );
    }


    const eanGroups =
        groupProductsByEan(products);


    for (const [
        ean,
        groupedProducts
    ] of eanGroups.entries()) {
        const branchesCount = new Set(
            groupedProducts.map(
                (product) => product.branch
            )
        ).size;


        if (branchesCount < 2) {
            continue;
        }


        const issue = createEanAuditIssue(
            ean,
            groupedProducts
        );


        if (issue) {
            issues.push(issue);
        }
    }


    return issues;
}


function productMatchesFilters(product, filters) {
    const arrayFilters = [
        {
            filterKey: "branches",
            productKey: "branch"
        },
        {
            filterKey: "brands",
            productKey: "brand"
        },
        {
            filterKey: "manufacturerCodes",
            productKey: "manufacturer_code"
        },
        {
            filterKey: "groupCodes",
            productKey: "group_code"
        },
        {
            filterKey: "categoryCodes",
            productKey: "category_code"
        },
        {
            filterKey: "units",
            productKey: "unit"
        },
        {
            filterKey: "therapeuticClasses",
            productKey: "therapeutic_class_code"
        }
    ];


    for (const item of arrayFilters) {
        const selectedValues = normalizeArray(
            filters[item.filterKey]
        );


        if (!selectedValues.length) {
            continue;
        }


        const productValue = String(
            product[item.productKey] ?? ""
        );


        if (!selectedValues.includes(productValue)) {
            return false;
        }
    }


    if (
        filters.controlsLot !== undefined &&
        filters.controlsLot !== ""
    ) {
        if (
            toSafeNumber(product.controls_lot, 0) !==
            toSafeNumber(filters.controlsLot, 0)
        ) {
            return false;
        }
    }


    if (
        filters.productActive !== undefined &&
        filters.productActive !== ""
    ) {
        if (
            toSafeNumber(product.active, 0) !==
            toSafeNumber(filters.productActive, 0)
        ) {
            return false;
        }
    }


    return true;
}


function issueMatchesSpecificTypes(
    issue,
    selectedTypes
) {
    if (!selectedTypes.length) {
        return true;
    }


    for (const type of selectedTypes) {
        if (
            type === "ean_audit" &&
            issue.type === "ean_audit"
        ) {
            return true;
        }


        if (
            type === "invalid_ean" &&
            issue.type === "invalid_ean"
        ) {
            return true;
        }


        if (
            type === "duplicate_ean_branch" &&
            issue.type === "duplicate_ean_branch"
        ) {
            return true;
        }


        const fieldKey =
            TYPE_TO_FIELD[type];


        if (!fieldKey) {
            continue;
        }


        if (
            type === "divergent_sirius_code" &&
            issue.divergentFields.some(
                (field) =>
                    field.key === "sirius_code"
            )
        ) {
            return true;
        }


        if (
            type.startsWith("divergent_") &&
            type !== "divergent_sirius_code" &&
            issue.divergentFields.some(
                (field) =>
                    field.key === fieldKey
            )
        ) {
            return true;
        }


        if (type.startsWith("missing_")) {
            if (
                fieldKey === "dimensions" &&
                issue.missingFields.some(
                    (field) =>
                        [
                            "height",
                            "width",
                            "length"
                        ].includes(field.key)
                )
            ) {
                return true;
            }


            if (
                issue.missingFields.some(
                    (field) =>
                        field.key === fieldKey
                )
            ) {
                return true;
            }
        }
    }


    return false;
}


function issueMatchesFilters(issue, filters = {}) {
    if (
        !issueMatchesSpecificTypes(
            issue,
            normalizeArray(filters.types)
        )
    ) {
        return false;
    }


    const severities = normalizeArray(
        filters.severities
    );


    if (
        severities.length &&
        !severities.includes(issue.severity)
    ) {
        return false;
    }


    const selectedBranches = normalizeArray(
        filters.branches
    );


    if (
        selectedBranches.length &&
        !includesAny(
            issue.branches,
            selectedBranches
        )
    ) {
        return false;
    }


    const divergentFieldKeys = normalizeArray(
        filters.divergentFields
    );


    if (divergentFieldKeys.length) {
        const issueFields =
            issue.divergentFields.map(
                (field) => field.key
            );


        if (
            !includesAny(
                issueFields,
                divergentFieldKeys
            )
        ) {
            return false;
        }
    }


    const missingFieldKeys = normalizeArray(
        filters.missingFields
    );


    if (missingFieldKeys.length) {
        const issueFields =
            issue.missingFields.map(
                (field) => field.key
            );


        if (
            !includesAny(
                issueFields,
                missingFieldKeys
            )
        ) {
            return false;
        }
    }


    const hasProductFilters =
        normalizeArray(filters.brands).length > 0 ||
        normalizeArray(
            filters.manufacturerCodes
        ).length > 0 ||
        normalizeArray(filters.groupCodes).length > 0 ||
        normalizeArray(
            filters.categoryCodes
        ).length > 0 ||
        normalizeArray(filters.units).length > 0 ||
        normalizeArray(
            filters.therapeuticClasses
        ).length > 0 ||
        (
            filters.controlsLot !== undefined &&
            filters.controlsLot !== ""
        ) ||
        (
            filters.productActive !== undefined &&
            filters.productActive !== ""
        );


    if (hasProductFilters) {
        const matchingProducts =
            issue.products.filter((product) =>
                productMatchesFilters(
                    product,
                    filters
                )
            );


        if (matchingProducts.length === 0) {
            return false;
        }
    }


    if (
        filters.minBranches &&
        issue.branchesCount <
            toSafeNumber(filters.minBranches, 0)
    ) {
        return false;
    }


    if (filters.search) {
        const search = String(
            filters.search
        ).toUpperCase();


        const content = JSON.stringify(
            issue
        ).toUpperCase();


        if (!content.includes(search)) {
            return false;
        }
    }


    return true;
}


function getFilteredAuditIssues(filters = {}) {
    const products =
        repository.getActiveProducts();


    const allIssues = buildAuditIssues(products);


    return allIssues
        .filter((issue) =>
            issueMatchesFilters(
                issue,
                filters
            )
        );
}


function listAuditIssues(filters = {}) {
    const issues = getFilteredAuditIssues(filters);


    const pageSize = Math.min(
        Math.max(
            toSafeNumber(filters.pageSize, 50),
            1
        ),
        200
    );


    const total = issues.length;


    const totalPages = Math.max(
        Math.ceil(total / pageSize),
        1
    );


    const requestedPage = Math.max(
        toSafeNumber(filters.page, 1),
        1
    );


    const page = Math.min(
        requestedPage,
        totalPages
    );


    const offset = (
        page - 1
    ) * pageSize;


    return {
        rows: issues.slice(
            offset,
            offset + pageSize
        ),

        summary: {
            total,

            errors: issues.filter(
                (issue) =>
                    issue.severity === "error"
            ).length,

            warnings: issues.filter(
                (issue) =>
                    issue.severity === "warning"
            ).length
        },

        pagination: {
            page,
            pageSize,
            total,
            totalPages,
            offset
        }
    };
}


function listAllAuditIssues(filters = {}) {
    return getFilteredAuditIssues(filters);
}


function getAuditFilterOptions(field) {
    return repository.getDistinctValues(field);
}


module.exports = {
    listAllAuditIssues,
    listAuditIssues,
    getAuditFilterOptions,
    isValidEan13
};