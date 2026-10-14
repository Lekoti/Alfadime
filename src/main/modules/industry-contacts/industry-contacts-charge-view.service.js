const service = require("./industry-contacts.service");
const prices = require("../price-pending/price-pending.repository");
const history = require("./industry-contacts-charge-history.repository");

function laboratoryKey(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ").trim().toUpperCase();
}
function isUpdated(value, now = new Date()) {
    const match = String(value ?? "").trim().match(
        /^(?:Atualizado\s*)?(?:\d{1,2}\/)?(\d{1,2})\/(\d{4})$/i
    );
    if (!match) return false;
    const month = Number(match[1]);
    return month >= 1 && month <= 12 &&
        Number(match[2]) * 12 + month >= now.getFullYear() * 12 + now.getMonth() + 1;
}
function listLaboratories() {
    const result = service.listLaboratories();
    const priceRows = prices.listRows();
    if (!Array.isArray(result?.rows) || !Array.isArray(priceRows)) {
        throw new Error("Não foi possível conferir os dados de atualização dos contatos.");
    }
    const byLaboratory = new Map();
    for (const row of priceRows) {
        const key = laboratoryKey(row.laboratory);
        if (!byLaboratory.has(key)) byLaboratory.set(key, row);
    }
    const lastCharges = history.getLastChargesMap();
    const now = new Date();
    return {
        ...result,
        rows: result.rows.map((row) => {
            const branch = String(row.branch || "").trim().toUpperCase();
            const validBranch = ["DPR", "AMS", "DMT", "DMS", "DSC"].includes(branch);
            const priceRow = byLaboratory.get(laboratoryKey(row.laboratory_name));
            const suffix = branch.toLowerCase();
            const pricesUpdated = validBranch && isUpdated(priceRow?.[`precos_ok_${suffix}`], now);
            const pendingUpdated = validBranch && isUpdated(priceRow?.[`pendencias_ok_${suffix}`], now);
            const chargeStatus = pricesUpdated && pendingUpdated ? "updated" :
                !pricesUpdated && !pendingUpdated ? "both_missing" :
                    !pricesUpdated ? "prices_missing" : "pending_missing";
            const last = lastCharges.get(JSON.stringify([String(row.contact_id || row.id), row.branch || '']));
            return {
                ...row,
                prices_updated: Boolean(pricesUpdated),
                pending_updated: Boolean(pendingUpdated),
                charge_update_status: chargeStatus,
                charge_status_label: chargeStatus === "updated" ? "Preços e pendências atualizados" :
                    chargeStatus === "both_missing" ? "Precisa atualizar preços e pendências" :
                        chargeStatus === "prices_missing" ? "Precisa atualizar preços" : "Precisa atualizar pendências",
                last_prices_charge_at: last?.last_prices_charge_at || null,
                last_pending_charge_at: last?.last_pending_charge_at || null
            };
        })
    };
}
module.exports = { listLaboratories, isUpdated };
