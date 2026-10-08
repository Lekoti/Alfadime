const crypto = require("node:crypto");



const {
    getDatabase
} = require("../../database/connection");



const {
    PRODUCT_CATALOG_FIELDS
} = require("./products.constants");
const { toSafeNumber } = require("../../utils/validation.utils");
const {
    getMatchingGlobalLaboratoryCodes,
    getUnifiedLaboratoryOptions
} = require("../../utils/laboratory-filter.utils");



function buildProductsFilters(filters = {}) {
    let whereClause = `
        WHERE 1 = 1
    `;



    const params = [];



    if (
        filters.active !== undefined &&
        filters.active !== ""
    ) {
        whereClause += `
            AND pc.active = ?
        `;



        params.push(
            toSafeNumber(filters.active, 0)
        );
    }



    if (filters.branch) {
        whereClause += `
            AND pc.branch = ?
        `;



        params.push(
            String(filters.branch)
        );
    }



    if (filters.group_code) {
        whereClause += `
            AND pc.group_code = ?
        `;



        params.push(
            String(filters.group_code)
        );
    }



    if (filters.category_code) {
        whereClause += `
            AND pc.category_code = ?
        `;



        params.push(
            String(filters.category_code)
        );
    }



    const laboratory = filters.laboratory_code ??
        filters.laboratory;



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



    if (
        filters.controls_lot !== undefined &&
        filters.controls_lot !== ""
    ) {
        whereClause += `
            AND pc.controls_lot = ?
        `;



        params.push(
            toSafeNumber(filters.controls_lot, 0)
        );
    }



    if (filters.search) {
        const search = `%${String(filters.search).trim()}%`;



        whereClause += `
            AND (
                pc.branch LIKE ?
                OR ppc.cod_prod LIKE ?
                OR ppc.cod_prod_global LIKE ?
                OR pc.ean LIKE ?
                OR pc.sap_code LIKE ?
                OR pc.active_ingredient LIKE ?
                OR pc.commercial_name LIKE ?
                OR pc.brand LIKE ?
                OR pc.ms_registration LIKE ?
            )
        `;



        params.push(
            search,
            search,
            search,
            search,
            search,
            search,
            search,
            search,
            search
        );
    }



    return {
        whereClause,
        params
    };
}



function listProducts(filters = {}) {
    const database = getDatabase();



    const {
        whereClause,
        params
    } = buildProductsFilters(filters);



    const pageSize = Math.min(
        Math.max(
            toSafeNumber(filters.pageSize, 50),
            1
        ),
        200
    );



    const page = Math.max(
        toSafeNumber(filters.page, 1),
        1
    );



    // CORREÇÃO: Usar COUNT(DISTINCT pc.id) para evitar duplicação do JOIN
    const total = database
        .prepare(`
            SELECT COUNT(DISTINCT pc.id) AS total
            FROM product_catalog AS pc
            LEFT JOIN product_purchase_curve AS ppc
                ON ppc.product_id = pc.id
            ${whereClause}
        `)
        .get(...params)
        .total;



    const totalPages = Math.max(
        Math.ceil(total / pageSize),
        1
    );



    const currentPage = Math.min(
        page,
        totalPages
    );



    const offset = (
        currentPage - 1
    ) * pageSize;



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
            LIMIT ?
            OFFSET ?
        `)
        .all(
            ...params,
            pageSize,
            offset
        );



    return {
        rows,
        pagination: {
            page: currentPage,
            pageSize,
            total,
            totalPages,
            offset
        }
    };
}



function getDistinctValues(field) {
    if (!PRODUCT_CATALOG_FIELDS.includes(field)) {
        throw new Error(
            `Campo nao permitido: ${field}`
        );
    }



    const database = getDatabase();



    return database
        .prepare(`
            SELECT DISTINCT "${field}" AS value
            FROM product_catalog
            WHERE "${field}" IS NOT NULL
              AND TRIM("${field}") <> ''
            ORDER BY "${field}" ASC
        `)
        .all()
        .map((row) => row.value);
}



// Retorna valores unicos normalizados para filtros (agrupa nomes similares)
function getUniqueFilterValues(field) {
    if (field === "laboratory") {
        return getUnifiedLaboratoryOptions(getDatabase());
    }



    if (!PRODUCT_CATALOG_FIELDS.includes(field)) {
        throw new Error(
            `Campo nao permitido: ${field}`
        );
    }



    const database = getDatabase();



    const allValues = database
        .prepare(`
            SELECT DISTINCT "${field}" AS value
            FROM product_catalog
            WHERE "${field}" IS NOT NULL
              AND TRIM("${field}") <> ''
            ORDER BY "${field}" ASC
        `)
        .all()
        .map((row) => row.value);



    const normalizedMap = new Map();



    for (const value of allValues) {
        const normalized = String(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/\s+/g, " ")
            .trim();



        if (!normalizedMap.has(normalized)) {
            normalizedMap.set(normalized, value);
        }
    }



    return Array.from(normalizedMap.values()).sort();
}



function createImportHistory(data = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();



    const item = {
        id: crypto.randomUUID(),
        source_file_name: String(
            data.source_file_name || ""
        ),
        source_file_path: String(
            data.source_file_path || ""
        ),
        total_rows: toSafeNumber(data.total_rows, 0),
        valid_rows: toSafeNumber(data.valid_rows, 0),
        inserted_rows: 0,
        updated_rows: 0,
        deactivated_rows: 0,
        ignored_rows: toSafeNumber(data.ignored_rows, 0),
        status: String(data.status || "processing"),
        error_message: null,
        started_at: now,
        finished_at: null,
        created_at: now
    };



    database
        .prepare(`
            INSERT INTO product_import_history (
                id,
                source_file_name,
                source_file_path,
                total_rows,
                valid_rows,
                inserted_rows,
                updated_rows,
                deactivated_rows,
                ignored_rows,
                status,
                error_message,
                started_at,
                finished_at,
                created_at
            ) VALUES (
                @id,
                @source_file_name,
                @source_file_path,
                @total_rows,
                @valid_rows,
                @inserted_rows,
                @updated_rows,
                @deactivated_rows,
                @ignored_rows,
                @status,
                @error_message,
                @started_at,
                @finished_at,
                @created_at
            )
        `)
        .run(item);



    return item;
}



function finishImportHistory(id, data = {}) {
    const database = getDatabase();



    database
        .prepare(`
            UPDATE product_import_history
            SET
                inserted_rows = ?,
                updated_rows = ?,
                deactivated_rows = ?,
                ignored_rows = ?,
                status = ?,
                error_message = ?,
                finished_at = ?
            WHERE id = ?
        `)
        .run(
            toSafeNumber(data.inserted_rows, 0),
            toSafeNumber(data.updated_rows, 0),
            toSafeNumber(data.deactivated_rows, 0),
            toSafeNumber(data.ignored_rows, 0),
            String(data.status || "completed"),
            data.error_message
                ? String(data.error_message)
                : null,
            new Date().toISOString(),
            id
        );
}



function syncProducts(products = [], source = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();



    const findExisting = database.prepare(`
        SELECT id
        FROM product_catalog
        WHERE branch = ?
          AND (
              code = ?
              OR (
                  code IS NULL
                  AND ? IS NULL
                  AND ean = ?
              )
          )
        LIMIT 1
    `);



    const insertProduct = database.prepare(`
        INSERT INTO product_catalog (
            id,
            branch,
            code,
            sirius_code,
            ean,
            sap_code,
            group_code,
            active_ingredient,
            commercial_name,
            manufacturer_code,
            brand,
            unit,
            standard_box,
            controls_lot,
            ms_registration,
            reference_code,
            therapeutic_class_code,
            height,
            width,
            length,
            category_code,
            active,
            source_file_name,
            imported_at,
            created_at,
            updated_at
        ) VALUES (
            @id,
            @branch,
            @code,
            @sirius_code,
            @ean,
            @sap_code,
            @group_code,
            @active_ingredient,
            @commercial_name,
            @manufacturer_code,
            @brand,
            @unit,
            @standard_box,
            @controls_lot,
            @ms_registration,
            @reference_code,
            @therapeutic_class_code,
            @height,
            @width,
            @length,
            @category_code,
            @active,
            @source_file_name,
            @imported_at,
            @created_at,
            @updated_at
        )
    `);



    const updateProduct = database.prepare(`
        UPDATE product_catalog
        SET
            sirius_code = @sirius_code,
            ean = @ean,
            sap_code = @sap_code,
            group_code = @group_code,
            active_ingredient = @active_ingredient,
            commercial_name = @commercial_name,
            manufacturer_code = @manufacturer_code,
            brand = @brand,
            unit = @unit,
            standard_box = @standard_box,
            controls_lot = @controls_lot,
            ms_registration = @ms_registration,
            reference_code = @reference_code,
            therapeutic_class_code = @therapeutic_class_code,
            height = @height,
            width = @width,
            length = @length,
            category_code = @category_code,
            active = @active,
            source_file_name = @source_file_name,
            imported_at = @imported_at,
            updated_at = @updated_at
        WHERE branch = @branch
          AND code = @code
    `);



    const syncTransaction = database.transaction(() => {
        let inserted = 0;
        let updated = 0;
        let deactivated = 0;



        database.exec(`
            CREATE TEMP TABLE IF NOT EXISTS imported_product_keys (
                branch TEXT NOT NULL,
                code TEXT,
                ean TEXT
            );



            DELETE FROM imported_product_keys;
        `);



        const saveKey = database.prepare(`
            INSERT INTO imported_product_keys (
                branch,
                code,
                ean
            ) VALUES (?, ?, ?)
        `);



        for (const product of products) {
            const item = {
                ...product,
                id: crypto.randomUUID(),
                source_file_name: source.fileName || null,
                imported_at: now,
                created_at: now,
                updated_at: now
            };



            const existing = findExisting.get(
                item.branch,
                item.code,
                item.code,
                item.ean
            );



            if (existing) {
                updateProduct.run(item);
                updated++;
            } else {
                insertProduct.run(item);
                inserted++;
            }



            saveKey.run(
                item.branch,
                item.code,
                item.ean
            );
        }



        const result = database
            .prepare(`
                UPDATE product_catalog
                SET
                    active = 0,
                    updated_at = ?
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM imported_product_keys
                    WHERE imported_product_keys.branch =
                        product_catalog.branch
                    AND (
                        imported_product_keys.code =
                            product_catalog.code
                        OR (
                            imported_product_keys.code IS NULL
                            AND product_catalog.code IS NULL
                            AND imported_product_keys.ean =
                                product_catalog.ean
                        )
                    )
                )
            `)
            .run(now);



        deactivated = result.changes;



        return {
            inserted,
            updated,
            deactivated
        };
    });



    return syncTransaction();
}



module.exports = {
    listProducts,
    getDistinctValues,
    getUniqueFilterValues,
    createImportHistory,
    finishImportHistory,
    syncProducts
};