function getCorrectionsApi() {
    if (
        !window.alfadime ||
        !window.alfadime.productCorrections
    ) {
        throw new Error(
            "API de correções não disponível. Reinicie o Alfadime."
        );
    }


    return window.alfadime.productCorrections;
}


export function listCorrections(filters = {}) {
    return getCorrectionsApi().list(filters);
}


export function getCorrectionFilterOptions() {
    return getCorrectionsApi().getFilterOptions();
}


export function createCorrection(data) {
    return getCorrectionsApi().create(data);
}


export function cancelCorrection(id) {
    return getCorrectionsApi().cancel(id);
}


export function cancelCorrections(ids = []) {
    return getCorrectionsApi().cancelMany(ids);
}


export function revertCorrection(id) {
    return getCorrectionsApi().revert(id);
}


export function revertCorrections(ids = []) {
    return getCorrectionsApi().revertMany(ids);
}


export function markCorrectionsAsSent(ids = []) {
    return getCorrectionsApi().markSent(ids);
}


export function getPendingCorrectionsByProducts(
    productIds = []
) {
    return getCorrectionsApi().getPendingByProducts(
        productIds
    );
}


export function getCorrectableFields() {
    return getCorrectionsApi().getFields();
}


export function getCorrectionBranches() {
    return getCorrectionsApi().getBranches();
}


export function getCsvExportBranches() {
    return getCorrectionsApi().getCsvBranches();
}


export function exportCorrectionsCsv(branch) {
    return getCorrectionsApi().exportCsv(branch);
}


export function exportAllCorrectionsCsv() {
    return getCorrectionsApi().exportAllCsv();
}


export function getBulkCorrectionTargets(
    ean,
    fields = []
) {
    return getCorrectionsApi().getBulkTargets(
        ean,
        fields
    );
}


export function createBulkCorrections(data = {}) {
    return getCorrectionsApi().createBulk(data);
}