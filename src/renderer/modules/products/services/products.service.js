function getProductsApi() {
    if (
        !window.alfadime ||
        !window.alfadime.products
    ) {
        throw new Error(
            "API de produtos nao disponivel. Reinicie o Alfadime."
        );
    }

    return window.alfadime.products;
}

export function listProducts(filters = {}) {
    return getProductsApi().list(filters);
}

export function getFilterOptions(field) {
    return getProductsApi().getFilterOptions(field);
}

export function syncProductsExcel() {
    return getProductsApi().syncExcel();
}

export function subscribeProductsChanged(callback) {
    return getProductsApi().onChanged(callback);
}
