const repository = require(
    "../repositories/products.repository"
);


const {
    exportRowsToExcel
} = require(
    "../../../services/excel-export.service"
);


const {
    getDatabase
} = require(
    "../../../database/connection"
);


const crypto = require("crypto");
const { toSafeNumber } = require("../../../utils/validation.utils");
const {
    getMatchingGlobalLaboratoryCodes
} = require("../../../utils/laboratory-filter.utils");



const ALLOWED_EXPORT_MODULE_KEYS = [
    "PRODUTOS"
];

const MAX_TEMPLATE_NAME_LENGTH = 80;



function formatBoolean(value) {
    return toSafeNumber(value, 0) === 1
        ? "Sim"
        : "Nao";
}



function buildExportFilters(filters = {}) {
    let whereClause = "WHERE 1 = 1";
    const params = [];

    if (filters.active !== "" && filters.active !== undefined) {
        whereClause += " AND pc.active = ?";
        params.push(toSafeNumber(filters.active, 0));
    }

    if (filters.branch) {
        whereClause += " AND pc.branch = ?";
        params.push(String(filters.branch));
    }

    if (filters.group_code) {
        whereClause += " AND pc.group_code = ?";
        params.push(String(filters.group_code));
    }

    if (filters.category_code) {
        whereClause += " AND pc.category_code = ?";
        params.push(String(filters.category_code));
    }

    const laboratory = filters.laboratory_code ?? filters.laboratory;

    if (laboratory) {
        const laboratoryValues = getMatchingGlobalLaboratoryCodes(
            getDatabase(),
            laboratory
        );

        if (laboratoryValues.length) {
            whereClause += `
                AND EXISTS (
                    SELECT 1
                    FROM product_purchase_curve AS laboratory
                    WHERE laboratory.product_id = pc.id
                        AND laboratory.lab IN (${laboratoryValues.map(() => "?").join(", ")})
                )
            `;
            params.push(...laboratoryValues);
        } else {
            whereClause += " AND 1 = 0";
        }
    }

    if (filters.brand) {
        whereClause += " AND pc.brand = ?";
        params.push(String(filters.brand));
    }

    if (filters.controls_lot !== "" && filters.controls_lot !== undefined) {
        whereClause += " AND pc.controls_lot = ?";
        params.push(toSafeNumber(filters.controls_lot, 0));
    }

    if (filters.search) {
        const search = String(filters.search).trim();

        if (/^\d+$/.test(search)) {
            const numericSearch = `${search}%`;

            whereClause += `
                AND (
                    pc.ean = ?
                    OR pc.sap_code = ?
                    OR pc.ean LIKE ?
                    OR pc.sap_code LIKE ?
                    OR pc.branch LIKE ?
                    OR pc.active_ingredient LIKE ?
                    OR pc.commercial_name LIKE ?
                    OR pc.brand LIKE ?
                    OR pc.ms_registration LIKE ?
                    OR EXISTS (
                        SELECT 1
                        FROM product_purchase_curve AS search_curve
                        WHERE search_curve.product_id = pc.id
                            AND (
                                search_curve.cod_prod LIKE ?
                                OR search_curve.cod_prod_global LIKE ?
                            )
                    )
                )
            `;

            params.push(
                search,
                search,
                numericSearch,
                numericSearch,
                `%${search}%`,
                `%${search}%`,
                `%${search}%`,
                `%${search}%`,
                `%${search}%`,
                numericSearch,
                numericSearch
            );
        } else {
            const textSearch = `%${search}%`;

            whereClause += `
                AND (
                    pc.branch LIKE ?
                    OR pc.ean LIKE ?
                    OR pc.sap_code LIKE ?
                    OR pc.active_ingredient LIKE ?
                    OR pc.commercial_name LIKE ?
                    OR pc.brand LIKE ?
                    OR pc.ms_registration LIKE ?
                    OR EXISTS (
                        SELECT 1
                        FROM product_purchase_curve AS search_curve
                        WHERE search_curve.product_id = pc.id
                            AND (
                                search_curve.cod_prod LIKE ?
                                OR search_curve.cod_prod_global LIKE ?
                            )
                    )
                )
            `;

            params.push(
                textSearch,
                textSearch,
                textSearch,
                textSearch,
                textSearch,
                textSearch,
                textSearch,
                textSearch,
                textSearch
            );
        }
    }

    return {
        whereClause,
        params
    };
}



function getProductsForExport(filters = {}) {
    const database = getDatabase();
    const {
        whereClause,
        params
    } = buildExportFilters(filters);

    const rows = database
        .prepare(`
            SELECT
                pc.*,
                (
                    SELECT curve.cod_prod
                    FROM product_purchase_curve AS curve
                    WHERE curve.product_id = pc.id
                        AND curve.cod_prod IS NOT NULL
                        AND TRIM(CAST(curve.cod_prod AS TEXT)) <> ''
                    ORDER BY curve.empresa ASC
                    LIMIT 1
                ) AS code,
                (
                    SELECT curve.cod_prod_global
                    FROM product_purchase_curve AS curve
                    WHERE curve.product_id = pc.id
                        AND curve.cod_prod_global IS NOT NULL
                        AND TRIM(CAST(curve.cod_prod_global AS TEXT)) <> ''
                        AND CAST(curve.cod_prod_global AS TEXT) <> '1'
                    ORDER BY curve.empresa ASC
                    LIMIT 1
                ) AS sirius_code
            FROM product_catalog AS pc
            ${whereClause}
            ORDER BY
                pc.branch ASC,
                pc.commercial_name ASC
        `)
        .all(...params);

    const result = rows.map((product) => ({
        branch: product.branch || "",
        code: product.code || "",
        sirius_code: product.sirius_code || "",
        ean: product.ean || "",
        sap_code: product.sap_code || "",
        group_code: product.group_code || "",
        active_ingredient:
            product.active_ingredient || "",
        commercial_name:
            product.commercial_name || "",
        manufacturer_code:
            product.manufacturer_code || "",
        brand: product.brand || "",
        unit: product.unit || "",
        standard_box:
            product.standard_box ?? "",
        controls_lot: formatBoolean(
            product.controls_lot
        ),
        ms_registration:
            product.ms_registration || "",
        reference_code:
            product.reference_code || "",
        therapeutic_class_code:
            product.therapeutic_class_code || "",
        height: product.height ?? "",
        width: product.width ?? "",
        length: product.length ?? "",
        category_code:
            product.category_code || "",
        active: formatBoolean(
            product.active
        )
    }));

    return result;
}



function countProductsForExport(filters = {}) {
    const database = getDatabase();
    const {
        whereClause,
        params
    } = buildExportFilters(filters);

    const result = database
        .prepare(`
            SELECT COUNT(*) AS total
            FROM product_catalog AS pc
            ${whereClause}
        `)
        .get(...params);

    return result.total;
}



async function exportProductsAdvanced(
    filters,
    columns
) {
    const rows = getProductsForExport(filters);

    return exportRowsToExcel({
        moduleKey: "PRODUTOS",
        sheetName: "Produtos",
        columns,
        rows
    });
}



function validateTemplateInput(
    moduleKey,
    name
) {
    if (
        !ALLOWED_EXPORT_MODULE_KEYS.includes(
            moduleKey
        )
    ) {
        throw new Error(
            "Módulo de exportação inválido."
        );
    }

    const normalizedName = String(
        name || ""
    ).trim();

    if (!normalizedName) {
        throw new Error(
            "Informe o nome do template."
        );
    }

    if (
        normalizedName.length >
        MAX_TEMPLATE_NAME_LENGTH
    ) {
        throw new Error(
            `O nome do template deve ter no máximo ${MAX_TEMPLATE_NAME_LENGTH} caracteres.`
        );
    }

    return normalizedName;
}



async function getExportTemplates(moduleKey) {
    if (
        !ALLOWED_EXPORT_MODULE_KEYS.includes(
            moduleKey
        )
    ) {
        throw new Error(
            "Módulo de exportação inválido."
        );
    }

    const database = getDatabase();

    const templates = database
        .prepare(`
            SELECT id, name, modulekey, filters_json, columns_json, createdat
            FROM exporttemplates
            WHERE modulekey = ?
            ORDER BY name ASC
        `)
        .all(moduleKey);

    return templates.map((t) => ({
        id: t.id,
        name: t.name,
        modulekey: t.modulekey,
        filters_json: t.filters_json,
        columns_json: t.columns_json,
        createdat: t.createdat
    }));
}



async function saveExportTemplate(moduleKey, name, filters, columns) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const validatedName = validateTemplateInput(
        moduleKey,
        name
    );

    const existing = database
        .prepare(`SELECT id FROM exporttemplates WHERE modulekey = ? AND name = ?`)
        .get(moduleKey, validatedName);

    if (existing) {
        throw new Error("Template com este nome ja existe.");
    }

    const template = {
        id: crypto.randomUUID(),
        modulekey: moduleKey,
        name: validatedName,
        filters_json: JSON.stringify(filters || {}),
        columns_json: JSON.stringify(columns || []),
        createdat: now
    };

    database
        .prepare(`
            INSERT INTO exporttemplates
            (id, modulekey, name, filters_json, columns_json, createdat)
            VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(
            template.id,
            template.modulekey,
            template.name,
            template.filters_json,
            template.columns_json,
            template.createdat
        );

    return template;
}



async function deleteExportTemplate(moduleKey, templateId) {
    if (
        !ALLOWED_EXPORT_MODULE_KEYS.includes(
            moduleKey
        )
    ) {
        throw new Error(
            "Módulo de exportação inválido."
        );
    }

    const database = getDatabase();

    const result = database
        .prepare(`DELETE FROM exporttemplates WHERE id = ? AND modulekey = ?`)
        .run(templateId, moduleKey);

    if (result.changes === 0) {
        throw new Error("Template nao encontrado.");
    }

    return { success: true };
}



module.exports = {
    exportProductsAdvanced,
    getProductsForExport,
    countProductsForExport,
    getExportTemplates,
    saveExportTemplate,
    deleteExportTemplate
};