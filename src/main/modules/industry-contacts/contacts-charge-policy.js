const WAIT_MS = 48 * 60 * 60 * 1000;
const VALID_BRANCHES = new Set(["DPR", "AMS", "DMT", "DMS", "DSC"]);
function normalizeBranch(value) {
    return String(value || "")
        .replace(/[\u00A0\u2007\u202F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}
function identity(contact) {
    const key = String(contact?.laboratory_key || contact?.laboratory_name || "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const branch = normalizeBranch(contact?.branch);
    if (!key || !VALID_BRANCHES.has(branch)) {
        throw new Error(`Indústria/filial não identificada. Indústria: ${contact?.laboratory_name || contact?.laboratory_key || "não informada"}; Filial: ${branch || "não informada"}.`);
    }
    return JSON.stringify([key, branch]);
}
function reference(row) {
    if (row.status === "preflight_failed") return 0;
    const start = Number(row.started_ms || 0);
    const end = Number(row.finished_ms || 0);
    return Math.max(Number.isFinite(start) ? start : 0, Number.isFinite(end) ? end : 0);
}
function classify(smtpStarted, result) {
    if (result?.success === true && !result.results?.some(item => item.historyWarning)) return "sent";
    return smtpStarted ? "sending" : "preflight_failed";
}
module.exports = { WAIT_MS, identity, reference, classify, normalizeBranch, VALID_BRANCHES };
