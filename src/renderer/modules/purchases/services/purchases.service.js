function getPurchasesApi() {
    if (!window.alfadime?.purchases) {
        throw new Error(
            "API de Compras não disponível. Reinicie o Alfadime."
        );
    }

    return window.alfadime.purchases;
}

export function listPurchaseSuggestions(filters = {}) {
    return getPurchasesApi().listSuggestions(filters);
}

export function getPurchaseFilterOptions(field) {
    return getPurchasesApi().getFilterOptions(field);
}

export function syncPurchasesCurveExcel() {
    return getPurchasesApi().syncCurveExcel();
}

export function subscribePurchasesChanged(callback) {
    return getPurchasesApi().onChanged(callback);
}

export function setPurchaseQuantityOverride(id, quantity) {
    return getPurchasesApi().setQuantityOverride(id, quantity);
}

export function getPurchaseQuantityOverridesCount() {
    return getPurchasesApi().getQuantityOverridesCount();
}

export function clearPurchaseQuantityOverrides() {
    return getPurchasesApi().clearQuantityOverrides();
}
