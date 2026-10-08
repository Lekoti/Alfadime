const repository = require(
    "./products-corrections.repository"
);

const {
    CORRECTABLE_PRODUCT_FIELDS,
    PRODUCT_FIELD_LABELS
} = require(
    "./products-corrections.constants"
);

function normalizeValue(value) {
    return String(value ?? "")
        .trim();
}

function createCorrection(data = {}) {
    if (!data.product_id) {
        throw new Error(
            "Produto nao informado."
        );
    }

    if (
        !CORRECTABLE_PRODUCT_FIELDS.includes(
            data.field_name
        )
    ) {
        throw new Error(
            "Campo nao permitido para correcao."
        );
    }

    const product = repository.getProductById(
        data.product_id
    );

    if (!product) {
        throw new Error(
            "Produto nao encontrado."
        );
    }

    const currentValue = normalizeValue(
        product[data.field_name]
    );

    const correctedValue = normalizeValue(
        data.new_value
    );

    if (!correctedValue) {
        throw new Error(
            "Informe o novo valor da correcao."
        );
    }

    if (currentValue === correctedValue) {
        throw new Error(
            "O novo valor deve ser diferente do valor atual da planilha."
        );
    }

    return repository.createCorrection({
        product_id: product.id,
        branch: product.branch,
        code: product.code,
        ean: product.ean,
        field_name: data.field_name,
        old_value: currentValue,
        new_value: correctedValue,
        correction_reason:
            "Correcao registrada no Alfadime.",
        corrected_by: null
    });
}

function listCorrections(filters = {}) {
    return repository.listCorrections(filters);
}

function getCorrectionFilterOptions() {
    return repository.getCorrectionFilterOptions();
}

function cancelCorrection(id) {
    return repository.cancelCorrection(id);
}

function cancelCorrections(ids) {
    return repository.cancelCorrections(ids);
}

function revertCorrection(id) {
    return repository.revertCorrection(id);
}

function revertCorrections(ids) {
    return repository.revertCorrections(ids);
}

function markCorrectionsAsSent(ids) {
    return repository.markCorrectionsAsSent(ids);
}

function getPendingCorrectionsForProducts(
    productIds
) {
    return repository.listPendingCorrectionsByProductIds(
        productIds
    );
}

function confirmCorrectionsFromExcel() {
    return repository.confirmCorrectionsFromExcel();
}

function getCorrectableFields() {
    return CORRECTABLE_PRODUCT_FIELDS.map(
        (key) => ({
            key,
            label: PRODUCT_FIELD_LABELS[key]
        })
    );
}

module.exports = {
    createCorrection,
    listCorrections,
    getCorrectionFilterOptions,
    cancelCorrection,
    cancelCorrections,
    revertCorrection,
    revertCorrections,
    markCorrectionsAsSent,
    getPendingCorrectionsForProducts,
    confirmCorrectionsFromExcel,
    getCorrectableFields
};
function normalizeComparableValue(value) {
    return String(value ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
}

function getBulkCorrectionTargets(ean, fields = []) {
    const normalizedEan = String(ean ?? "").trim();

    if (!normalizedEan) {
        throw new Error(
            "EAN nao informado para a correcao em lote."
        );
    }

    const validFields = Array.isArray(fields)
        ? fields.filter((field) =>
            CORRECTABLE_PRODUCT_FIELDS.includes(field)
        )
        : [];

    const products = repository.getProductsByEan(
        normalizedEan
    );

    return products.map((product) => ({
        id: product.id,
        branch: product.branch,
        code: product.code,
        ean: product.ean,
        values: validFields.reduce(
            (result, fieldName) => {
                result[fieldName] =
                    product[fieldName] ?? "";

                return result;
            },
            {}
        )
    }));
}

function createBulkCorrections(data = {}) {
    const normalizedEan = String(data.ean ?? "").trim();

    if (!normalizedEan) {
        throw new Error(
            "EAN nao informado para a correcao em lote."
        );
    }

    const fields = data.fields || {};

    const corrections = Object.entries(fields)
        .map(([field_name, new_value]) => ({
            field_name,
            new_value: normalizeValue(new_value)
        }))
        .filter((item) =>
            CORRECTABLE_PRODUCT_FIELDS.includes(
                item.field_name
            ) &&
            item.new_value
        );

    if (!corrections.length) {
        throw new Error(
            "Informe ao menos um valor correto."
        );
    }

    const products = repository.getProductsByEan(
        normalizedEan
    );

    if (!products.length) {
        throw new Error(
            "Nenhum produto foi encontrado para este EAN."
        );
    }

    const selectedProductIds = Array.isArray(
        data.product_ids
    ) && data.product_ids.length
        ? new Set(data.product_ids)
        : new Set(
            products.map((product) => product.id)
        );

    const selectedProducts = products.filter(
        (product) => selectedProductIds.has(product.id)
    );

    if (!selectedProducts.length) {
        throw new Error(
            "Selecione ao menos uma filial."
        );
    }

    const items = [];

    for (const product of selectedProducts) {
        for (const correction of corrections) {
            const currentValue = normalizeValue(
                product[correction.field_name]
            );

            if (
                normalizeComparableValue(currentValue) ===
                normalizeComparableValue(
                    correction.new_value
                )
            ) {
                continue;
            }

            items.push({
                product_id: product.id,
                branch: product.branch,
                code: String(
                product.code ??
                product.product_code ??
                product.internal_code ??
                product.sirius_code ??
                ""
            ).trim(),
                ean: product.ean,
                field_name: correction.field_name,
                old_value: currentValue,
                new_value: correction.new_value,
                correction_reason:
                    "Correcao em lote registrada no Alfadime.",
                corrected_by: null
            });
        }
    }

    if (!items.length) {
        return {
            success: true,
            created: 0,
            skipped: selectedProducts.length,
            corrections: []
        };
    }

    const created = repository.createCorrectionsBatch(
        items
    );

    return {
        success: true,
        created: created.length,
        skipped: 0,
        corrections: created
    };
}

module.exports.getBulkCorrectionTargets =
    getBulkCorrectionTargets;

module.exports.createBulkCorrections =
    createBulkCorrections;

