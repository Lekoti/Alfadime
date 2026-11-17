const { getPricePendingDatabase } = require("./price-pending.database");
const VALID_PRIORITIES = ["", "maxima", "alta", "media", "baixa"];

function normalizePriority(value) {
    const priority = String(value || "").trim().toLowerCase();
    return VALID_PRIORITIES.includes(priority) ? priority : "";
}

function updatePriority(id, priority) {
    const normalized = normalizePriority(priority);
    const database = getPricePendingDatabase();
    const result = database.prepare("UPDATE price_pending_rows SET priority_label = ?, updated_at = ? WHERE id = ? AND active = 1").run(normalized, new Date().toISOString(), id);
    if (!result.changes) throw new Error("Registro nao encontrado para atualizar a prioridade.");
    return { id, priority_label: normalized };
}

module.exports = { updatePriority, normalizePriority, VALID_PRIORITIES };
