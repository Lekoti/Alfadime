function getAuditApi() {
    if (
        !window.alfadime ||
        !window.alfadime.productAudit
    ) {
        throw new Error(
            "API de auditoria nao disponivel. Reinicie o Alfadime."
        );
    }

    return window.alfadime.productAudit;
}

export function listAuditIssues(filters = {}) {
    return getAuditApi().list(filters);
}

export function getAuditFilterOptions(field) {
    return getAuditApi().getFilterOptions(field);
}

export function subscribeProductsChanged(callback) {
    if (
        !window.alfadime ||
        !window.alfadime.products
    ) {
        return () => {};
    }

    return window.alfadime.products.onChanged(
        callback
    );
}
