const {
    getDatabase
} = require("../../database/connection");


const ALLOWED_FILTER_FIELDS = [
    "branch",
    "brand",
    "manufacturer_code",
    "group_code",
    "category_code",
    "unit",
    "controls_lot",
    "active",
    "therapeutic_class_code"
];


function getActiveProducts() {
    const database = getDatabase();


    return database
        .prepare(`
            SELECT
                product_catalog.id,
                product_catalog.branch,
                product_catalog.code,

                COALESCE(
                    NULLIF(
                        TRIM(curve.cod_prod_global),
                        ''
                    ),
                    product_catalog.sirius_code
                ) AS sirius_code,

                product_catalog.ean,
                product_catalog.sap_code,
                product_catalog.group_code,
                product_catalog.active_ingredient,
                product_catalog.commercial_name,
                product_catalog.manufacturer_code,
                product_catalog.brand,
                product_catalog.unit,
                product_catalog.standard_box,
                product_catalog.controls_lot,
                product_catalog.ms_registration,
                product_catalog.reference_code,
                product_catalog.therapeutic_class_code,
                product_catalog.height,
                product_catalog.width,
                product_catalog.length,
                product_catalog.category_code,
                product_catalog.active
            FROM product_catalog
            LEFT JOIN (
                SELECT
                    product_id,
                    MAX(
                        NULLIF(
                            TRIM(cod_prod_global),
                            ''
                        )
                    ) AS cod_prod_global
                FROM product_purchase_curve
                GROUP BY product_id
            ) AS curve
                ON curve.product_id =
                    product_catalog.id
            WHERE product_catalog.active = 1
            ORDER BY
                product_catalog.ean ASC,
                product_catalog.branch ASC,
                product_catalog.code ASC
        `)
        .all();
}


function getDistinctValues(field) {
    if (!ALLOWED_FILTER_FIELDS.includes(field)) {
        throw new Error(
            `Campo de filtro nao permitido: ${field}`
        );
    }


    const database = getDatabase();


    return database
        .prepare(`
            SELECT DISTINCT "${field}" AS value
            FROM product_catalog
            WHERE active = 1
              AND "${field}" IS NOT NULL
              AND TRIM(CAST("${field}" AS TEXT)) <> ''
            ORDER BY "${field}" ASC
        `)
        .all()
        .map((row) => row.value);
}


module.exports = {
    getActiveProducts,
    getDistinctValues,
    ALLOWED_FILTER_FIELDS
};