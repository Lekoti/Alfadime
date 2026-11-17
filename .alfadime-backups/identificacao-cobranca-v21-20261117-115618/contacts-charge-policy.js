const WAIT_MS = 48 * 60 * 60 * 1000;
function identity(contact) {
    const key = String(contact?.laboratory_key || contact?.laboratory_name || "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const branch = String(contact?.branch || "").trim().toUpperCase();
    if (!key || !["DPR", "AMS", "DMT", "DMS", "DSC"].includes(branch)) throw new Error("Indústria/filial não identificada. Envio bloqueado antes do SMTP.");
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
module.exports = { WAIT_MS, identity, reference, classify };
