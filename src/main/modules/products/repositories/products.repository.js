const crypto = require("node:crypto");


const {
    getDatabase
} = require("../../../database/connection");


const {
    PRODUCT_CATALOG_FIELDS
} = require("../constants/products.constants");
const { toSafeNumber } = require("../../../utils/validation.utils");
const {
    getMatchingGlobalLaboratoryCodes,
    getUnifiedLaboratoryOptions
} = require("../../../utils/laboratory-filter.utils");


const MAX_FILTER_VALUES = 500;
const SYNC_CHUNK_SIZE = 200;

const PRODUCT_COMPARISON_FIELDS = [
    "sirius_code",
    "ean",
    "sap_code",
    "group_code",
    "active_ingredient",
    "commercial_name",
    "manufacturer_code",
    "brand",
    "unit",
    "standard_box",
    "controls_lot",
    "ms_registration",
    "reference_code",
    "therapeutic_class_code",
    "height",
    "width",
    "length",
    "category_code",
    "active"
];


function buildProductsFilters(filters = {}) {
    let whereClause = "\n        WHERE 1 = 1\n    ";

    const params = [];

    if (filters.active === "quarantine") {
        whereClause += "\n            AND EXISTS (\n                SELECT 1\n                FROM product_quarantine AS pq\n                WHERE pq.product_id = pc.id\n                    AND pq.status = 'pendente'\n            )\n        ";
    } else if (
        filters.active !== undefined &&
        filters.active !== ""
    ) {
        whereClause += "\n            AND pc.active = ?\n        ";

        params.push(
            toSafeNumber(filters.active, 0)
        );
    }

    if (filters.branch) {
        whereClause += "\n            AND pc.branch = ?\n        ";

        params.push(
            String(filters.branch)
        );
    }

    if (filters.group_code) {
        whereClause += "\n            AND pc.group_code = ?\n        ";

        params.push(
            String(filters.group_code)
        );
    }

    if (filters.category_code) {
        whereClause += "\n            AND pc.category_code = ?\n        ";

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
            whereClause += "\n                AND EXISTS (\n                    SELECT 1\n                    FROM product_purchase_curve AS laboratory\n                    WHERE laboratory.product_id = pc.id\n                        AND laboratory.lab IN (" + laboratoryValues.map(() => "?").join(", ") + ")\n                )\n            ";

            params.push(...laboratoryValues);
        } else {
            whereClause += " AND 1 = 0";
        }
    }

    if (
        filters.controls_lot !== undefined &&
        filters.controls_lot !== ""
    ) {
        whereClause += "\n            AND pc.controls_lot = ?\n        ";

        params.push(
            toSafeNumber(filters.controls_lot, 0)
        );
    }

    if (filters.search) {
        const search = String(filters.search).trim();

        if (/^\d+$/.test(search)) {
            const numericSearch = search + "%";

            whereClause += "\n                AND (\n                    pc.ean = ?\n                    OR pc.sap_code = ?\n                    OR pc.ean LIKE ?\n                    OR pc.sap_code LIKE ?\n                    OR pc.branch LIKE ?\n                    OR pc.active_ingredient LIKE ?\n                    OR pc.commercial_name LIKE ?\n                    OR pc.brand LIKE ?\n                    OR pc.ms_registration LIKE ?\n                    OR EXISTS (\n                        SELECT 1\n                        FROM product_purchase_curve AS search_curve\n                        WHERE search_curve.product_id = pc.id\n                            AND (\n                                search_curve.cod_prod LIKE ?\n                                OR search_curve.cod_prod_global LIKE ?\n                            )\n                    )\n                )\n            ";

            params.push(
                search,
                search,
                numericSearch,
                numericSearch,
                "%" + search + "%",
                "%" + search + "%",
                "%" + search + "%",
                "%" + search + "%",
                "%" + search + "%",
                numericSearch,
                numericSearch
            );
        } else {
            const textSearch = "%" + search + "%";

            whereClause += "\n                AND (\n                    pc.branch LIKE ?\n                    OR pc.ean LIKE ?\n                    OR pc.sap_code LIKE ?\n                    OR pc.active_ingredient LIKE ?\n                    OR pc.commercial_name LIKE ?\n                    OR pc.brand LIKE ?\n                    OR pc.ms_registration LIKE ?\n                    OR EXISTS (\n                        SELECT 1\n                        FROM product_purchase_curve AS search_curve\n                        WHERE search_curve.product_id = pc.id\n                            AND (\n                                search_curve.cod_prod LIKE ?\n                                OR search_curve.cod_prod_global LIKE ?\n                            )\n                    )\n                )\n            ";

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

    const total = database
        .prepare("\n            SELECT COUNT(*) AS total\n            FROM product_catalog AS pc\n            " + whereClause + "\n        ")
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
        .prepare("\n            SELECT\n                pc.*,\n                (\n                    SELECT curve.cod_prod\n                    FROM product_purchase_curve AS curve\n                    WHERE curve.product_id = pc.id\n                        AND curve.cod_prod IS NOT NULL\n                        AND TRIM(CAST(curve.cod_prod AS TEXT)) <> ''\n                    ORDER BY curve.empresa ASC\n                    LIMIT 1\n                ) AS code,\n                (\n                    SELECT curve.cod_prod_global\n                    FROM product_purchase_curve AS curve\n                    WHERE curve.product_id = pc.id\n                        AND curve.cod_prod_global IS NOT NULL\n                        AND TRIM(CAST(curve.cod_prod_global AS TEXT)) <> ''\n                        AND CAST(curve.cod_prod_global AS TEXT) <> '1'\n                    ORDER BY curve.empresa ASC\n                    LIMIT 1\n                ) AS sirius_code\n            FROM product_catalog AS pc\n            " + whereClause + "\n            ORDER BY\n                pc.branch ASC,\n                pc.commercial_name ASC\n            LIMIT ?\n            OFFSET ?\n        ")
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
            "Campo nao permitido: " + field
        );
    }

    const database = getDatabase();

    return database
        .prepare("\n            SELECT DISTINCT \"" + field + "\" AS value\n            FROM product_catalog\n            WHERE \"" + field + "\" IS NOT NULL\n              AND TRIM(\"" + field + "\") <> ''\n            ORDER BY \"" + field + "\" ASC\n            LIMIT ?\n        ")
        .all(MAX_FILTER_VALUES)
        .map((row) => row.value);
}


function getUniqueFilterValues(field) {
    if (field === "laboratory") {
        return getUnifiedLaboratoryOptions(getDatabase());
    }

    if (!PRODUCT_CATALOG_FIELDS.includes(field)) {
        throw new Error(
            "Campo nao permitido: " + field
        );
    }

    const database = getDatabase();

    const allValues = database
        .prepare("\n            SELECT DISTINCT \"" + field + "\" AS value\n            FROM product_catalog\n            WHERE \"" + field + "\" IS NOT NULL\n              AND TRIM(\"" + field + "\") <> ''\n            ORDER BY \"" + field + "\" ASC\n            LIMIT ?\n        ")
        .all(MAX_FILTER_VALUES)
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

    return Array.from(normalizedMap.values())
        .sort()
        .slice(0, MAX_FILTER_VALUES);
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
        .prepare("\n            INSERT INTO product_import_history (\n                id,\n                source_file_name,\n                source_file_path,\n                total_rows,\n                valid_rows,\n                inserted_rows,\n                updated_rows,\n                deactivated_rows,\n                ignored_rows,\n                status,\n                error_message,\n                started_at,\n                finished_at,\n                created_at\n            ) VALUES (\n                @id,\n                @source_file_name,\n                @source_file_path,\n                @total_rows,\n                @valid_rows,\n                @inserted_rows,\n                @updated_rows,\n                @deactivated_rows,\n                @ignored_rows,\n                @status,\n                @error_message,\n                @started_at,\n                @finished_at,\n                @created_at\n            )\n        ")
        .run(item);

    return item;
}


function finishImportHistory(id, data = {}) {
    const database = getDatabase();

    database
        .prepare("\n            UPDATE product_import_history\n            SET\n                inserted_rows = ?,\n                updated_rows = ?,\n                deactivated_rows = ?,\n                ignored_rows = ?,\n                status = ?,\n                error_message = ?,\n                finished_at = ?\n            WHERE id = ?\n        ")
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


function hasValue(value) {
    return value !== null &&
        value !== undefined &&
        String(value).trim() !== "";
}


function isSyncableProduct(product = {}) {
    return hasValue(product.branch) &&
        (
            hasValue(product.code) ||
            hasValue(product.ean)
        );
}


function normalizeComparisonValue(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
}


function hasProductChanges(existingProduct, excelProduct) {
    return PRODUCT_COMPARISON_FIELDS.some(
        (field) =>
            normalizeComparisonValue(
                existingProduct[field]
            ) !==
            normalizeComparisonValue(
                excelProduct[field]
            )
    );
}


function buildProductKey(branch, value, type) {
    if (!hasValue(value)) {
        return null;
    }

    return [
        String(branch || "").trim(),
        type,
        String(value).trim()
    ].join("|");
}


function chunkItems(items, size) {
    const chunks = [];

    for (
        let index = 0;
        index < items.length;
        index += size
    ) {
        chunks.push(
            items.slice(
                index,
                index + size
            )
        );
    }

    return chunks;
}


function yieldToEventLoop() {
    return new Promise((resolve) => {
        setImmediate(resolve);
    });
}


async function syncProducts(products = [], source = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();

    const syncableProducts = products.filter(
        isSyncableProduct
    );

    const skipped = products.length -
        syncableProducts.length;

    if (!syncableProducts.length) {
        throw new Error(
            "Nenhum produto valido para sincronizar. Nenhum registro foi alterado."
        );
    }

    const existingProducts = database
        .prepare("\n            SELECT *\n            FROM product_catalog\n        ")
        .all();

    const productsByCode = new Map();
    const productsByEan = new Map();

    for (const product of existingProducts) {
        const codeKey = buildProductKey(
            product.branch,
            product.code,
            "code"
        );

        const eanKey = buildProductKey(
            product.branch,
            product.ean,
            "ean"
        );

        if (codeKey) {
            productsByCode.set(codeKey, product);
        }

        if (eanKey) {
            productsByEan.set(eanKey, product);
        }
    }

    const planilhaCodeKeys = new Set();
    const planilhaEanKeys = new Set();
    const seenProductIds = new Set();

    const productsToInsert = [];
    const productsToUpdate = [];

    let unchanged = 0;
    let duplicateRows = 0;

    for (const product of syncableProducts) {
        const codeKey = buildProductKey(
            product.branch,
            product.code,
            "code"
        );

        const eanKey = buildProductKey(
            product.branch,
            product.ean,
            "ean"
        );

        const isDuplicate =
            (codeKey && planilhaCodeKeys.has(codeKey)) ||
            (eanKey && planilhaEanKeys.has(eanKey));

        if (isDuplicate) {
            duplicateRows += 1;
            continue;
        }

        if (codeKey) {
            planilhaCodeKeys.add(codeKey);
        }

        if (eanKey) {
            planilhaEanKeys.add(eanKey);
        }

        let existingProduct = null;

        if (codeKey) {
            existingProduct = productsByCode.get(codeKey);
        }

        if (!existingProduct && eanKey) {
            existingProduct = productsByEan.get(eanKey);
        }

        const item = {
            ...product,
            id: existingProduct?.id || crypto.randomUUID(),
            source_file_name: source.fileName || null,
            imported_at: now,
            created_at: now,
            updated_at: now
        };

        if (existingProduct) {
            seenProductIds.add(existingProduct.id);

            if (hasProductChanges(existingProduct, item)) {
                productsToUpdate.push(item);
            } else {
                unchanged += 1;
            }

            continue;
        }

        productsToInsert.push(item);
    }

    const insertProduct = database.prepare("\n        INSERT INTO product_catalog (\n            id,\n            branch,\n            code,\n            sirius_code,\n            ean,\n            sap_code,\n            group_code,\n            active_ingredient,\n            commercial_name,\n            manufacturer_code,\n            brand,\n            unit,\n            standard_box,\n            controls_lot,\n            ms_registration,\n            reference_code,\n            therapeutic_class_code,\n            height,\n            width,\n            length,\n            category_code,\n            active,\n            source_file_name,\n            imported_at,\n            created_at,\n            updated_at\n        ) VALUES (\n            @id,\n            @branch,\n            @code,\n            @sirius_code,\n            @ean,\n            @sap_code,\n            @group_code,\n            @active_ingredient,\n            @commercial_name,\n            @manufacturer_code,\n            @brand,\n            @unit,\n            @standard_box,\n            @controls_lot,\n            @ms_registration,\n            @reference_code,\n            @therapeutic_class_code,\n            @height,\n            @width,\n            @length,\n            @category_code,\n            @active,\n            @source_file_name,\n            @imported_at,\n            @created_at,\n            @updated_at\n        )\n    ");

    const updateProduct = database.prepare("\n        UPDATE product_catalog\n        SET\n            sirius_code = @sirius_code,\n            ean = @ean,\n            sap_code = @sap_code,\n            group_code = @group_code,\n            active_ingredient = @active_ingredient,\n            commercial_name = @commercial_name,\n            manufacturer_code = @manufacturer_code,\n            brand = @brand,\n            unit = @unit,\n            standard_box = @standard_box,\n            controls_lot = @controls_lot,\n            ms_registration = @ms_registration,\n            reference_code = @reference_code,\n            therapeutic_class_code = @therapeutic_class_code,\n            height = @height,\n            width = @width,\n            length = @length,\n            category_code = @category_code,\n            active = @active,\n            source_file_name = @source_file_name,\n            imported_at = @imported_at,\n            updated_at = @updated_at\n        WHERE id = @id\n    ");

    const quarantineProduct = database.prepare("\n        INSERT INTO product_quarantine (\n            id,\n            product_id,\n            branch,\n            code,\n            ean,\n            commercial_name,\n            reason,\n            status,\n            detected_at,\n            created_at\n        )\n        SELECT\n            ?,\n            id,\n            branch,\n            code,\n            ean,\n            commercial_name,\n            'nao_encontrado_na_planilha',\n            'pendente',\n            ?,\n            ?\n        FROM product_catalog\n        WHERE id = ?\n          AND NOT EXISTS (\n              SELECT 1\n              FROM product_quarantine\n              WHERE product_id = ?\n                AND status = 'pendente'\n          )\n    ");

    const restoreQuarantine = database.prepare("\n        UPDATE product_quarantine\n        SET\n            status = 'restaurado',\n            resolved_at = ?\n        WHERE product_id = ?\n          AND status = 'pendente'\n    ");

    let inserted = 0;
    let updated = 0;
    let quarantined = 0;
    let restored = 0;

    const insertChunk = database.transaction((items) => {
        for (const item of items) {
            insertProduct.run(item);
            inserted += 1;
        }
    });

    const updateChunk = database.transaction((items) => {
        for (const item of items) {
            updateProduct.run(item);
            updated += 1;
        }
    });

    const quarantineChunk = database.transaction((items) => {
        for (const productId of items) {
            const result = quarantineProduct.run(
                crypto.randomUUID(),
                now,
                now,
                productId,
                productId
            );

            quarantined += result.changes;
        }
    });

    const restoreChunk = database.transaction((items) => {
        for (const productId of items) {
            const result = restoreQuarantine.run(
                now,
                productId
            );

            restored += result.changes;
        }
    });

    for (const chunk of chunkItems(
        productsToInsert,
        SYNC_CHUNK_SIZE
    )) {
        insertChunk(chunk);
        await yieldToEventLoop();
    }

    for (const chunk of chunkItems(
        productsToUpdate,
        SYNC_CHUNK_SIZE
    )) {
        updateChunk(chunk);
        await yieldToEventLoop();
    }

    const missingProductIds = existingProducts
        .filter(
            (product) => !seenProductIds.has(product.id)
        )
        .map((product) => product.id);

    for (const chunk of chunkItems(
        missingProductIds,
        SYNC_CHUNK_SIZE
    )) {
        quarantineChunk(chunk);
        await yieldToEventLoop();
    }

    const restoredProductIds = Array.from(seenProductIds);

    for (const chunk of chunkItems(
        restoredProductIds,
        SYNC_CHUNK_SIZE
    )) {
        restoreChunk(chunk);
        await yieldToEventLoop();
    }

    return {
        inserted,
        updated,
        unchanged,
        deactivated: 0,
        skipped,
        duplicateRows,
        quarantined,
        restored
    };
}


module.exports = {
    listProducts,
    getDistinctValues,
    getUniqueFilterValues,
    createImportHistory,
    finishImportHistory,
    syncProducts
};
