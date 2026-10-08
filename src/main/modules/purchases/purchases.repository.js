const crypto = require("node:crypto");
const { getDatabase } = require("../../database/connection");
const {
    getMatchingGlobalLaboratoryCodes,
    getUnifiedLaboratoryOptions
} = require("../../utils/laboratory-filter.utils");


const BRANCHES = {
    DPR: "DIMEBRAS PR",
    AMS: "ALFAMED MS",
    DMT: "DIMEBRAS MT",
    DMS: "DIMEBRAS MS",
    DSC: "DIMEBRAS SC"
};


function getValue(object, ...keys) {
    for (const key of keys) {
        if (
            object[key] !== undefined &&
            object[key] !== null
        ) {
            return object[key];
        }
    }


    return null;
}


function normalizeText(value) {
    if (value === null || value === undefined) {
        return null;
    }


    const text = String(value).trim();


    return text || null;
}


function normalizeNumber(value, fallback = 0) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }


    const number = Number(value);


    return Number.isFinite(number)
        ? number
        : fallback;
}


function buildWhereClause(filters = {}) {
    let whereClause = "WHERE 1 = 1";
    const params = [];


    if (filters.company) {
        whereClause += " AND company = ?";
        params.push(String(filters.company));
    }


    const laboratoryCode = filters.laboratory_code ??
        filters.laboratory ??
        filters.laboratoryname ??
        filters.laboratory_name;


    if (laboratoryCode) {
        const laboratoryValues = getMatchingGlobalLaboratoryCodes(
            getDatabase(),
            laboratoryCode
        );


        if (laboratoryValues.length) {
            whereClause += `
                AND EXISTS (
                    SELECT 1
                    FROM product_purchase_curve AS laboratory
                    WHERE laboratory.empresa = company
                        AND laboratory.cod_prod = product_code
                        AND laboratory.lab IN (${laboratoryValues.map(() => "?").join(", ")})
                )
            `;


            params.push(...laboratoryValues);
        } else {
            whereClause += " AND 1 = 0";
        }
    }


    const effectiveCurve =
        filters.effective_curve ??
        filters.effectivecurve;


    if (effectiveCurve) {
        whereClause += " AND effective_curve = ?";


        params.push(
            String(effectiveCurve)
                .trim()
                .toUpperCase()
        );
    }


    if (filters.search) {
        const search = `%${String(filters.search).trim()}%`;


        whereClause += `
            AND (
                company LIKE ?
                OR product_code LIKE ?
                OR barcode LIKE ?
                OR description LIKE ?
                OR laboratory_name LIKE ?
            )
        `;


        params.push(
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


function listCurveProducts(filters = {}) {
    const database = getDatabase();


    const {
        whereClause,
        params
    } = buildWhereClause(filters);


    const pageSize = Math.min(
        Math.max(
            Number(filters.pageSize) || 50,
            1
        ),
        200
    );


    const page = Math.max(
        Number(filters.page) || 1,
        1
    );


    const total = database
        .prepare(`
            SELECT COUNT(*) AS total
            FROM purchase_curve_products
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


    const baseRows = database
        .prepare(`
            SELECT *
            FROM purchase_curve_products
            ${whereClause}
            ORDER BY
                company ASC,
                laboratory_name ASC,
                description ASC,
                product_code ASC
            LIMIT ?
            OFFSET ?
        `)
        .all(
            ...params,
            pageSize,
            offset
        );


    if (!baseRows.length) {
        return {
            rows: [],
            pagination: {
                page: currentPage,
                pageSize,
                total,
                totalPages,
                offset
            }
        };
    }


    const productCodes = [
        ...new Set(
            baseRows.map((row) => String(row.product_code))
        )
    ];


    const placeholders = productCodes
        .map(() => "?")
        .join(", ");


    const relatedRows = database
        .prepare(`
            SELECT
                company,
                product_code,
                last_purchase_price,
                penultimate_purchase_price,
                antepenultimate_purchase_price,
                average_cost,
                curve_value,
                curve_unit,
                standard_box
            FROM purchase_curve_products
            WHERE product_code IN (${placeholders})
                AND company IN (?, ?, ?, ?, ?)
        `)
        .all(
            ...productCodes,
            BRANCHES.DPR,
            BRANCHES.AMS,
            BRANCHES.DMT,
            BRANCHES.DMS,
            BRANCHES.DSC
        );


    const branchByCompany = Object.fromEntries(
        Object.entries(BRANCHES)
            .map(([branch, company]) => [
                company,
                branch
            ])
    );


    const relatedByProduct = new Map();


    for (const row of relatedRows) {
        const productCode = String(row.product_code);
        const branch = branchByCompany[row.company];


        if (!branch) {
            continue;
        }


        if (!relatedByProduct.has(productCode)) {
            relatedByProduct.set(productCode, {});
        }


        relatedByProduct
            .get(productCode)[branch] = row;
    }


    const rows = baseRows.map((row) => {
        const branchPrices = relatedByProduct.get(
            String(row.product_code)
        ) || {};


        const branchPriceValues = Object.values(branchPrices)
            .map((b) => b.last_purchase_price)
            .filter((p) => p !== null && p !== undefined && p !== "");
        
        let averageCost = row.average_cost;
        if (
            (averageCost === null || averageCost === undefined || averageCost === "") &&
            branchPriceValues.length > 0
        ) {
            const sum = branchPriceValues.reduce((acc, val) => acc + Number(val), 0);
            averageCost = sum / branchPriceValues.length;
        }


        return {
            ...row,
            branchPrices,
            lastPurchaseDPR: branchPrices.DPR?.last_purchase_price ?? null,
            lastPurchaseAMS: branchPrices.AMS?.last_purchase_price ?? null,
            lastPurchaseDMT: branchPrices.DMT?.last_purchase_price ?? null,
            lastPurchaseDMS: branchPrices.DMS?.last_purchase_price ?? null,
            lastPurchaseDSC: branchPrices.DSC?.last_purchase_price ?? null,
            penultimatePurchasePrice: branchPrices.DPR?.penultimate_purchase_price ?? 
                                      branchPrices.AMS?.penultimate_purchase_price ?? 
                                      row.penultimate_purchase_price ?? null,
            antepenultimatePurchasePrice: branchPrices.DPR?.antepenultimate_purchase_price ?? 
                                          branchPrices.AMS?.antepenultimate_purchase_price ?? 
                                          row.antepenultimate_purchase_price ?? null,
            averageCost: averageCost,
            curveValue: row.curve_value ?? branchPrices.DPR?.curve_value ?? null,
            curveUnit: row.curve_unit ?? branchPrices.DPR?.curve_unit ?? null,
            standardBox: row.standard_box ?? branchPrices.DPR?.standard_box ?? null
        };
    });


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


function listAllCurveProducts(filters = {}) {
    const database = getDatabase();


    const {
        whereClause,
        params
    } = buildWhereClause(filters);


    const baseRows = database
        .prepare(`
            SELECT *
            FROM purchase_curve_products
            ${whereClause}
            ORDER BY
                company ASC,
                laboratory_name ASC,
                description ASC,
                product_code ASC
        `)
        .all(...params);


    if (!baseRows.length) {
        return [];
    }


    const productCodes = [
        ...new Set(
            baseRows.map((row) => String(row.product_code))
        )
    ];


    const placeholders = productCodes
        .map(() => "?")
        .join(", ");


    const relatedRows = database
        .prepare(`
            SELECT
                company,
                product_code,
                last_purchase_price,
                penultimate_purchase_price,
                antepenultimate_purchase_price,
                average_cost,
                curve_value,
                curve_unit,
                standard_box
            FROM purchase_curve_products
            WHERE product_code IN (${placeholders})
                AND company IN (?, ?, ?, ?, ?)
        `)
        .all(
            ...productCodes,
            BRANCHES.DPR,
            BRANCHES.AMS,
            BRANCHES.DMT,
            BRANCHES.DMS,
            BRANCHES.DSC
        );


    const branchByCompany = Object.fromEntries(
        Object.entries(BRANCHES)
            .map(([branch, company]) => [
                company,
                branch
            ])
    );


    const relatedByProduct = new Map();


    for (const row of relatedRows) {
        const productCode = String(row.product_code);
        const branch = branchByCompany[row.company];


        if (!branch) {
            continue;
        }


        if (!relatedByProduct.has(productCode)) {
            relatedByProduct.set(productCode, {});
        }


        relatedByProduct
            .get(productCode)[branch] = row;
    }


    return baseRows.map((row) => {
        const branchPrices = relatedByProduct.get(
            String(row.product_code)
        ) || {};


        const branchPriceValues = Object.values(branchPrices)
            .map((b) => b.last_purchase_price)
            .filter((p) => p !== null && p !== undefined && p !== "");
        
        let averageCost = row.average_cost;
        if (
            (averageCost === null || averageCost === undefined || averageCost === "") &&
            branchPriceValues.length > 0
        ) {
            const sum = branchPriceValues.reduce((acc, val) => acc + Number(val), 0);
            averageCost = sum / branchPriceValues.length;
        }


        return {
            ...row,
            branchPrices,
            lastPurchaseDPR: branchPrices.DPR?.last_purchase_price ?? null,
            lastPurchaseAMS: branchPrices.AMS?.last_purchase_price ?? null,
            lastPurchaseDMT: branchPrices.DMT?.last_purchase_price ?? null,
            lastPurchaseDMS: branchPrices.DMS?.last_purchase_price ?? null,
            lastPurchaseDSC: branchPrices.DSC?.last_purchase_price ?? null,
            averageCost: averageCost,
            curveValue: row.curve_value ?? branchPrices.DPR?.curve_value ?? null,
            curveUnit: row.curve_unit ?? branchPrices.DPR?.curve_unit ?? null,
            standardBox: row.standard_box ?? branchPrices.DPR?.standard_box ?? null
        };
    });
}

function getFilterOptions(field) {
    const fieldMap = {
        laboratoryname: "laboratory_name",
        effectivecurve: "effective_curve",
        productcode: "product_code",
        curvevalue: "curve_value",
        curveunit: "curve_unit",
        company: "company",
        description: "description",
        currentstock: "current_stock",
        blockedstock: "blocked_stock",
        averagesale12m: "average_sale_12m",
        averagesale6m: "average_sale_6m",
        averagesale3m: "average_sale_3m",
        lastpurchaseprice: "last_purchase_price",
        penultimatepurchaseprice: "penultimate_purchase_price",
        antepenultimatepurchaseprice: "antepenultimate_purchase_price",
        averagecost: "average_cost",
        standardbox: "standard_box",
        sourcefilename: "source_file_name",
        importedat: "imported_at",
        createdat: "created_at",
        updatedat: "updated_at"
    };


    const actualField = fieldMap[field] || field;


    if (actualField === "laboratory_name") {
        return getUnifiedLaboratoryOptions(getDatabase());
    }


    return getDatabase()
        .prepare(`
            SELECT DISTINCT ${actualField} AS value
            FROM purchase_curve_products
            WHERE ${actualField} IS NOT NULL
                AND TRIM(CAST(${actualField} AS TEXT)) <> ''
            ORDER BY ${actualField} ASC
        `)
        .all()
        .map((row) => row.value);
}


function upsertCurveProducts(products, source = {}) {
    const database = getDatabase();
    const now = new Date().toISOString();


    database.exec("CREATE INDEX IF NOT EXISTS idx_product_catalog_branch_code ON product_catalog(branch, code)");
    database.exec("CREATE INDEX IF NOT EXISTS idx_product_catalog_branch_ean ON product_catalog(branch, ean)");


    console.log("Carregando produtos em memória...");
    const loadStart = Date.now();
    const allProducts = database.prepare(`
        SELECT id, branch, code, ean
        FROM product_catalog
    `).all();


    const productByBranchCode = new Map();
    const productByBranchEan = new Map();


    for (const p of allProducts) {
        const branch = String(p.branch || "").trim();
        const code = String(p.code || "").trim();
        const ean = String(p.ean || "").trim();
        
        if (code && code !== "null") {
            const key = `${branch}|${code}`;
            productByBranchCode.set(key, p);
        }
        
        if (ean && ean !== "null" && ean !== "0") {
            const key = `${branch}|${ean}`;
            productByBranchEan.set(key, p);
        }
    }


    const loadTime = ((Date.now() - loadStart) / 1000).toFixed(2);
    console.log(`Produtos carregados: ${allProducts.length} em ${loadTime}s`);
    console.log(`Map Cod: ${productByBranchCode.size}, Map EAN: ${productByBranchEan.size}`);


    const columns = [
        "id", "company", "product_code", "barcode", "description",
        "laboratory_name", "current_stock", "blocked_stock",
        "average_sale_12m", "average_sale_6m", "average_sale_3m",
        "last_purchase_price", "penultimate_purchase_price",
        "antepenultimate_purchase_price", "average_cost",
        "last_purchase_price_dpr", "last_purchase_price_ams",
        "last_purchase_price_dms", "last_purchase_price_dmt",
        "last_purchase_price_dsc", "curve_value", "curve_unit",
        "effective_curve", "standard_box",
        "jan_quantity", "feb_quantity", "mar_quantity", "apr_quantity",
        "may_quantity", "jun_quantity", "jul_quantity", "aug_quantity",
        "sep_quantity", "oct_quantity", "nov_quantity", "dec_quantity",
        "source_file_name", "imported_at", "created_at", "updated_at"
    ];


    const updateColumns = columns.filter(
        (column) => !["id", "company", "product_code", "created_at"].includes(column)
    );


    const insertCurve = database.prepare(`
        INSERT INTO purchase_curve_products (
            ${columns.join(", ")}
        ) VALUES (
            ${columns.map(() => "?").join(", ")}
        )
        ON CONFLICT(company, product_code)
        DO UPDATE SET ${updateColumns.map((column) => `${column} = excluded.${column}`).join(", ")}
    `);


    const insertProductPurchaseCurve = database.prepare(`
        INSERT OR REPLACE INTO product_purchase_curve (
            product_id, empresa, cod_prod, cod_fabr_global,
            cod_barras, descricao, lab, estoque, estoque_bloq, media_mes,
            ult_comp, penult_comp, curva_valor, curva_unidade,
            curva_fabr_valor, cx_padrao, created_at, updated_at
        ) VALUES (
            @product_id, @empresa, @cod_prod, @cod_fabr_global,
            @cod_barras, @descricao, @lab, @estoque, @estoque_bloq, @media_mes,
            @ult_comp, @penult_comp, @curva_valor, @curva_unidade,
            @curva_fabr_valor, @cx_padrao, @created_at, @updated_at
        )
    `);


    let inserted = 0;
    let updated = 0;
    let curveInserted = 0;
    let linkedByCode = 0;
    let linkedByEan = 0;
    let notLinked = 0;
    let invalidRows = 0;


    console.log("Processando Curva Compras...");
    const processStart = Date.now();


    const process = database.transaction((items) => {
        for (const product of items) {
            const company = normalizeText(
                getValue(product, "company", "empresa", "branch", "filial")
            );
            
            const productCode = normalizeText(
                getValue(product, "product_code", "productCode", "cod_prod", "codProd", "code")
            );
            
            const barcode = normalizeText(
                getValue(product, "barcode", "bar_code", "cod_barras", "codBarras", "ean")
            );


            if (!company || !productCode) {
                invalidRows += 1;
                continue;
            }


            let productRow = productByBranchCode.get(`${company}|${productCode}`);
            
            if (!productRow && barcode) {
                productRow = productByBranchEan.get(`${company}|${barcode}`);
                
                if (productRow) {
                    linkedByEan += 1;
                }
            } else if (productRow) {
                linkedByCode += 1;
            }


            if (!productRow) {
                notLinked += 1;
                continue;
            }


            const existing = database.prepare(`
                SELECT id FROM purchase_curve_products
                WHERE company = ? AND product_code = ?
                LIMIT 1
            `).get(company, productCode);


            const row = {
                id: existing?.id || crypto.randomUUID(),
                company,
                product_code: productCode,
                barcode,
                description: normalizeText(getValue(product, "description", "descricao")),
                laboratory_name: normalizeText(getValue(product, "laboratory_name", "laboratoryName", "lab", "laboratorio")),
                current_stock: normalizeNumber(getValue(product, "current_stock", "currentStock", "estoque")),
                blocked_stock: normalizeNumber(getValue(product, "blocked_stock", "blockedStock", "estoque_bloq")),
                average_sale_12m: normalizeNumber(getValue(product, "average_sale_12m", "averageSale12m", "media_mes")),
                average_sale_6m: normalizeNumber(getValue(product, "average_sale_6m", "averageSale6m")),
                average_sale_3m: normalizeNumber(getValue(product, "average_sale_3m", "averageSale3m")),
                last_purchase_price: getValue(product, "last_purchase_price", "lastPurchasePrice", "ult_comp"),
                penultimate_purchase_price: getValue(product, "penultimate_purchase_price", "penultimatePurchasePrice", "penult_comp"),
                antepenultimate_purchase_price: getValue(product, "antepenultimate_purchase_price", "antepenultimatePurchasePrice", "antepenult_comp"),
                average_cost: getValue(product, "average_cost", "averageCost", "p_medio"),
                last_purchase_price_dpr: getValue(product, "last_purchase_price_dpr", "lastPurchasePriceDPR"),
                last_purchase_price_ams: getValue(product, "last_purchase_price_ams", "lastPurchasePriceAMS"),
                last_purchase_price_dms: getValue(product, "last_purchase_price_dms", "lastPurchasePriceDMS"),
                last_purchase_price_dmt: getValue(product, "last_purchase_price_dmt", "lastPurchasePriceDMT"),
                last_purchase_price_dsc: getValue(product, "last_purchase_price_dsc", "lastPurchasePriceDSC"),
                curve_value: normalizeText(getValue(product, "curve_value", "curveValue", "curva_valor")),
                curve_unit: normalizeText(getValue(product, "curve_unit", "curveUnit", "curva_unidade")),
                effective_curve: normalizeText(getValue(product, "effective_curve", "effectiveCurve", "curva_fabr_valor")),
                standard_box: normalizeNumber(getValue(product, "standard_box", "standardBox", "cx_padrao")),
                jan_quantity: normalizeNumber(getValue(product, "jan_quantity", "janQuantity")),
                feb_quantity: normalizeNumber(getValue(product, "feb_quantity", "febQuantity")),
                mar_quantity: normalizeNumber(getValue(product, "mar_quantity", "marQuantity")),
                apr_quantity: normalizeNumber(getValue(product, "apr_quantity", "aprQuantity")),
                may_quantity: normalizeNumber(getValue(product, "may_quantity", "mayQuantity")),
                jun_quantity: normalizeNumber(getValue(product, "jun_quantity", "junQuantity")),
                jul_quantity: normalizeNumber(getValue(product, "jul_quantity", "julQuantity")),
                aug_quantity: normalizeNumber(getValue(product, "aug_quantity", "augQuantity")),
                sep_quantity: normalizeNumber(getValue(product, "sep_quantity", "sepQuantity")),
                oct_quantity: normalizeNumber(getValue(product, "oct_quantity", "octQuantity")),
                nov_quantity: normalizeNumber(getValue(product, "nov_quantity", "novQuantity")),
                dec_quantity: normalizeNumber(getValue(product, "dec_quantity", "decQuantity")),
                source_file_name: source.fileName || null,
                imported_at: now,
                created_at: now,
                updated_at: now
            };


            insertCurve.run(...columns.map((column) => row[column]));


            if (existing) {
                updated += 1;
            } else {
                inserted += 1;
            }


            insertProductPurchaseCurve.run({
                product_id: productRow.id,
                empresa: company,
                cod_prod: productCode,
                cod_fabr_global: normalizeText(getValue(product, "cod_fabr_global", "codFabrGlobal", "manufacturer_global_code", "manufacturerGlobalCode")),
                cod_barras: barcode,
                descricao: row.description,
                lab: row.laboratory_name,
                estoque: row.current_stock,
                estoque_bloq: row.blocked_stock,
                media_mes: row.average_sale_12m,
                ult_comp: row.last_purchase_price,
                penult_comp: row.penultimate_purchase_price,
                curva_valor: row.curve_value,
                curva_unidade: row.curve_unit,
                curva_fabr_valor: row.effective_curve,
                cx_padrao: row.standard_box,
                created_at: now,
                updated_at: now
            });


            curveInserted += 1;
        }
    });


    process(products);


    const processTime = ((Date.now() - processStart) / 1000).toFixed(2);


    console.log(`purchase_curve_products: ${inserted} inseridos, ${updated} atualizados`);
    console.log(`product_purchase_curve: ${curveInserted} vinculados`);
    console.log(`Vínculos por Cod: ${linkedByCode}, por EAN: ${linkedByEan}, sem vínculo: ${notLinked}, inválidos: ${invalidRows}`);
    console.log(`Tempo total: ${processTime}s`);


    return {
        inserted,
        updated,
        curveInserted,
        linkedByCode,
        linkedByEan,
        notLinked,
        invalidRows
    };
}


function createImportHistory(data) {
    const database = getDatabase();
    const now = new Date().toISOString();


    const item = {
        id: crypto.randomUUID(),
        source_file_name: String(data.source_file_name || ""),
        source_file_path: String(data.source_file_path || ""),
        total_rows: Number(data.total_rows || 0),
        valid_rows: Number(data.valid_rows || 0),
        ignored_rows: Number(data.ignored_rows || 0),
        status: "processing",
        created_at: now,
        started_at: now
    };


    database
        .prepare(`
            INSERT INTO purchase_curve_import_history (
                id,
                source_file_name,
                source_file_path,
                total_rows,
                valid_rows,
                inserted_rows,
                updated_rows,
                ignored_rows,
                status,
                error_message,
                started_at,
                finished_at,
                created_at
            ) VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                0,
                0,
                ?,
                ?,
                NULL,
                ?,
                NULL,
                ?
            )
        `)
        .run(
            item.id,
            item.source_file_name,
            item.source_file_path,
            item.total_rows,
            item.valid_rows,
            item.ignored_rows,
            item.status,
            item.started_at,
            item.created_at
        );


    return item;
}


function finishImportHistory(id, data = {}) {
    getDatabase()
        .prepare(`
            UPDATE purchase_curve_import_history
            SET
                inserted_rows = ?,
                updated_rows = ?,
                ignored_rows = ?,
                status = ?,
                error_message = ?,
                finished_at = ?
            WHERE id = ?
        `)
        .run(
            Number(data.inserted_rows || 0),
            Number(data.updated_rows || 0),
            Number(data.ignored_rows || 0),
            String(data.status || "completed"),
            data.error_message
                ? String(data.error_message)
                : null,
            new Date().toISOString(),
            id
        );
}


function getPurchaseSuggestionsByIds(selectedIds) {
    const database = getDatabase();


    if (
        !Array.isArray(selectedIds) ||
        selectedIds.length === 0
    ) {
        return [];
    }


    const placeholders = selectedIds
        .map(() => "?")
        .join(", ");


    const rows = database
        .prepare(`
            SELECT *
            FROM purchase_curve_products
            WHERE id IN (${placeholders})
            ORDER BY
                company ASC,
                laboratory_name ASC,
                description ASC
        `)
        .all(...selectedIds);


    if (!rows.length) {
        return [];
    }


    const productCodes = [
        ...new Set(
            rows.map((row) => String(row.product_code))
        )
    ];


    const codePlaceholders = productCodes
        .map(() => "?")
        .join(", ");


    const relatedRows = database
        .prepare(`
            SELECT
                company,
                product_code,
                last_purchase_price,
                penultimate_purchase_price,
                antepenultimate_purchase_price,
                average_cost,
                curve_value,
                curve_unit,
                standard_box
            FROM purchase_curve_products
            WHERE product_code IN (${codePlaceholders})
                AND company IN (?, ?, ?, ?, ?)
        `)
        .all(
            ...productCodes,
            BRANCHES.DPR,
            BRANCHES.AMS,
            BRANCHES.DMT,
            BRANCHES.DMS,
            BRANCHES.DSC
        );


    const branchByCompany = Object.fromEntries(
        Object.entries(BRANCHES)
            .map(([branch, company]) => [
                company,
                branch
            ])
    );


    const relatedByProduct = new Map();


    for (const row of relatedRows) {
        const productCode = String(row.product_code);
        const branch = branchByCompany[row.company];


        if (!branch) {
            continue;
        }


        if (!relatedByProduct.has(productCode)) {
            relatedByProduct.set(productCode, {});
        }


        relatedByProduct
            .get(productCode)[branch] = row;
    }


    return rows.map((row) => {
        const branchPrices = relatedByProduct.get(
            String(row.product_code)
        ) || {};
        
        const branchPriceValues = Object.values(branchPrices)
            .map((b) => b.last_purchase_price)
            .filter((p) => p !== null && p !== undefined && p !== "");
        
        let averageCost = row.average_cost;
        if (
            (averageCost === null || averageCost === undefined || averageCost === "") &&
            branchPriceValues.length > 0
        ) {
            const sum = branchPriceValues.reduce((acc, val) => acc + Number(val), 0);
            averageCost = sum / branchPriceValues.length;
        }
        
        return {
            ...row,
            branchPrices,
            lastPurchaseDPR: branchPrices.DPR?.last_purchase_price ?? null,
            lastPurchaseAMS: branchPrices.AMS?.last_purchase_price ?? null,
            lastPurchaseDMT: branchPrices.DMT?.last_purchase_price ?? null,
            lastPurchaseDMS: branchPrices.DMS?.last_purchase_price ?? null,
            lastPurchaseDSC: branchPrices.DSC?.last_purchase_price ?? null,
            averageCost: averageCost,
            curveValue: row.curve_value ?? branchPrices.DPR?.curve_value ?? null,
            curveUnit: row.curve_unit ?? branchPrices.DPR?.curve_unit ?? null,
            standardBox: row.standard_box ?? branchPrices.DPR?.standard_box ?? null
        };
    });
}


module.exports = {
    BRANCHES,
    listCurveProducts,
    listAllCurveProducts,
    getFilterOptions,
    upsertCurveProducts,
    createImportHistory,
    finishImportHistory,
    getPurchaseSuggestionsByIds
};