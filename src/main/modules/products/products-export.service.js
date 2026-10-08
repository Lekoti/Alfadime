const repository = require(
    "./products.repository"
);



const {
    exportRowsToExcel
} = require(
    "../../services/excel-export.service"
);



const {
    getDatabase
} = require(
    "../../database/connection"
);



const crypto = require("crypto");
const { toSafeNumber } = require("../../utils/validation.utils");
const {
    getMatchingGlobalLaboratoryCodes
} = require("../../utils/laboratory-filter.utils");



function formatBoolean(value) {
    return toSafeNumber(value, 0) === 1
        ? "Sim"
        : "Nao";
}



function getProductsForExport(filters = {}) {
    const database = getDatabase();
    
    console.log("[EXPORT] Filters recebidos:", filters);
    
    // Build WHERE clause igual ao products.repository.js
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
    
    // CORREÇÃO: laboratory_code e laboratory usam product_purchase_curve
    // brand usa campo direto pc.brand
    const laboratory = filters.laboratory_code ?? filters.laboratory;
    
    if (laboratory) {
        const laboratoryValues = getMatchingGlobalLaboratoryCodes(
            database,
            laboratory
        );
        
        console.log("[EXPORT] Laboratory values:", laboratoryValues);
        
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
            console.log("[EXPORT] Sem laboratory values, adicionando AND 1 = 0");
        }
    }
    
    // CORREÇÃO: Filtro brand direto no campo pc.brand (não usa laboratório)
    if (filters.brand) {
        whereClause += " AND pc.brand = ?";
        params.push(String(filters.brand));
    }
    
    if (filters.controls_lot !== "" && filters.controls_lot !== undefined) {
        whereClause += " AND pc.controls_lot = ?";
        params.push(toSafeNumber(filters.controls_lot, 0));
    }
    
    if (filters.search) {
        const search = `%${String(filters.search).trim()}%`;
        whereClause += `
            AND (
                pc.branch LIKE ? OR
                ppc.cod_prod LIKE ? OR
                ppc.cod_prod_global LIKE ? OR
                pc.ean LIKE ? OR
                pc.sap_code LIKE ? OR
                pc.active_ingredient LIKE ? OR
                pc.commercial_name LIKE ? OR
                pc.brand LIKE ? OR
                pc.ms_registration LIKE ?
            )
        `;
        params.push(
            search, search, search, search, search,
            search, search, search, search
        );
    }
    
    console.log("[EXPORT] WHERE clause:", whereClause);
    console.log("[EXPORT] Params:", params);
    
    // Busca TODOS os produtos sem LIMIT/OFFSET para exportação
    const rows = database
        .prepare(`
            SELECT
                pc.*,
                ppc.cod_prod AS code,
                ppc.cod_prod_global AS sirius_code
            FROM product_catalog AS pc
            LEFT JOIN product_purchase_curve AS ppc
                ON ppc.product_id = pc.id
            ${whereClause}
            ORDER BY
                pc.branch ASC,
                pc.commercial_name ASC,
                ppc.cod_prod ASC
        `)
        .all(...params);
    
    console.log("[EXPORT] Total de produtos encontrados:", rows.length);
    
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
    
    console.log("[EXPORT] Total de produtos mapeados:", result.length);
    
    return result;
}



function countProductsForExport(filters = {}) {
    const database = getDatabase();



    let whereClause = "WHERE 1 = 1";
    const params = [];



    if (filters.branch) {
        whereClause += " AND branch = ?";
        params.push(String(filters.branch));
    }



    if (filters.active !== "" && filters.active !== undefined) {
        whereClause += " AND active = ?";
        params.push(toSafeNumber(filters.active, 0));
    }



    if (filters.category_code) {
        whereClause += " AND category_code = ?";
        params.push(String(filters.category_code));
    }



    if (filters.group_code) {
        whereClause += " AND group_code = ?";
        params.push(String(filters.group_code));
    }



    if (filters.brand) {
        whereClause += " AND brand = ?";
        params.push(String(filters.brand));
    }



    if (filters.search) {
        const search = `%${String(filters.search).trim()}%`;
        whereClause += ` AND (
            branch LIKE ? OR
            code LIKE ? OR
            sirius_code LIKE ? OR
            ean LIKE ? OR
            sap_code LIKE ? OR
            active_ingredient LIKE ? OR
            commercial_name LIKE ? OR
            brand LIKE ? OR
            ms_registration LIKE ?
        )`;
        params.push(
            search, search, search, search, search,
            search, search, search, search
        );
    }



    const result = database
        .prepare(`SELECT COUNT(*) AS total FROM product_catalog ${whereClause}`)
        .get(...params);



    return result.total;
}



async function exportProductsExcel(
    filters,
    columns
) {
    const rows = getProductsForExport(filters);
    
    console.log("[EXPORT EXCEL] Rows:", rows.length);



    return exportRowsToExcel({
        moduleKey: "PRODUTOS",
        sheetName: "Produtos",
        columns,
        rows
    });
}



async function exportProductsAdvanced(
    filters,
    columns
) {
    const rows = getProductsForExport(filters);
    
    console.log("[EXPORT ADVANCED] Rows:", rows.length);



    return exportRowsToExcel({
        moduleKey: "PRODUTOS",
        sheetName: "Produtos",
        columns,
        rows
    });
}



async function getExportTemplates(moduleKey) {
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



    const existing = database
        .prepare(`SELECT id FROM exporttemplates WHERE modulekey = ? AND name = ?`)
        .get(moduleKey, name);



    if (existing) {
        throw new Error("Template com este nome ja existe.");
    }



    const template = {
        id: crypto.randomUUID(),
        modulekey: moduleKey,
        name: name,
        filters_json: JSON.stringify(filters),
        columns_json: JSON.stringify(columns),
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
    exportProductsExcel,
    exportProductsAdvanced,
    getProductsForExport,
    countProductsForExport,
    getExportTemplates,
    saveExportTemplate,
    deleteExportTemplate
};