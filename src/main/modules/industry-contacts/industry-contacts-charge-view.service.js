const service = require("./industry-contacts.service");
const prices = require("../price-pending/price-pending.repository");
const history = require("./industry-contacts-charge-history.repository");
const { isUpdatedPeriod } = require("../price-pending/price-pending-validation");

function laboratoryKey(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ").trim().toUpperCase();
}
function normalizedLookupKey(value) {
    return laboratoryKey(value).replace(/^#\s*/, "").replace(/(?:\s*-\s*|\s+)\d+\s*$/, "").trim();
}
function isUpdated(value, now = new Date()) {
    return isUpdatedPeriod(value, now);
}
function isNotWorking(value) {
    return String(value ?? "").trim().toUpperCase() === "NAO TRABALHA";
}
function addIndex(index, key, row) {
    if (!key) return;
    const entries = index.get(key) || [];
    entries.push(row);
    index.set(key, entries);
}
function listLaboratories() {
    const result = service.listLaboratories();
    const priceRows = prices.listRows();
    if (!Array.isArray(result?.rows) || !Array.isArray(priceRows)) {
        throw new Error("Não foi possível conferir os dados de atualização dos contatos.");
    }
    const exact = new Map();
    const normalized = new Map();
    for (const row of priceRows) {
        addIndex(exact, laboratoryKey(row.laboratory), row);
        addIndex(normalized, normalizedLookupKey(row.laboratory), row);
    }
    const lastCharges = history.getLastChargesMap();
    const now = new Date();
    return {
        ...result,
        rows: result.rows.map(row => {
            const direct = exact.get(laboratoryKey(row.laboratory_name));
            const candidates = direct?.length ? direct : normalized.get(normalizedLookupKey(row.laboratory_name)) || [];
            if (candidates.length > 1) {
                throw new Error(`Mais de um cadastro corresponde a ${row.laboratory_name}. Corrija a identificação antes de preparar cobranças.`);
            }
            const priceRow = candidates[0];
            const branch = String(row.branch || "").trim().toUpperCase();
            const validBranch = ["DPR", "AMS", "DMT", "DMS", "DSC"].includes(branch);
            const suffix = branch.toLowerCase();
            const pricesNotWorking = validBranch && isNotWorking(priceRow?.[`precos_ok_${suffix}`]);
            const pendingNotWorking = validBranch && isNotWorking(priceRow?.[`pendencias_ok_${suffix}`]);
            const pricesUpdated = validBranch && (isUpdated(priceRow?.[`precos_ok_${suffix}`], now) || pricesNotWorking);
            const pendingUpdated = validBranch && (isUpdated(priceRow?.[`pendencias_ok_${suffix}`], now) || pendingNotWorking);
            const chargeStatus = pricesUpdated && pendingUpdated ? "updated"
                : !pricesUpdated && !pendingUpdated ? "both_missing" : !pricesUpdated ? "prices_missing" : "pending_missing";
            const last = lastCharges.get(JSON.stringify([String(row.contact_id || row.id), row.branch || ""]));
            return {
                ...row,
                prices_updated: Boolean(pricesUpdated), pending_updated: Boolean(pendingUpdated),
                prices_not_working: Boolean(pricesNotWorking), pending_not_working: Boolean(pendingNotWorking),
                charge_update_status: chargeStatus,
                charge_status_label: pricesNotWorking && pendingNotWorking ? "Não trabalha — isento de cobrança"
                    : chargeStatus === "updated" ? "Preços e pendências atualizados"
                    : chargeStatus === "both_missing" ? "Precisa atualizar preços e pendências"
                    : chargeStatus === "prices_missing" ? "Precisa atualizar preços" : "Precisa atualizar pendências",
                last_prices_charge_at: last?.last_prices_charge_at || null,
                last_pending_charge_at: last?.last_pending_charge_at || null
            };
        })
    };
}
module.exports = { listLaboratories, isUpdated, isNotWorking };
