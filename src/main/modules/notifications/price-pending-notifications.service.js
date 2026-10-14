const { getDatabase } = require("../../database/connection");
const priceRepository = require("../price-pending/price-pending.repository");
const notificationRepository = require("./notifications.repository");

const SOURCE = "price-pending";
const TYPE = "PRICE_PENDING_STATUS";
const BRANCHES = ["DPR", "AMS", "DMT", "DMS", "DSC"];

function getPeriod(value) {
    const text = String(value ?? "").trim();
    const match = text.match(/^(?:Atualizado\s*)?(?:\d{1,2}\/)?(\d{1,2})\/(\d{4})$/i);
    if (!match) return null;
    const month = Number(match[1]);
    return month >= 1 && month <= 12 ? Number(match[2]) * 12 + month : null;
}

function buildNotifications(rows, now = new Date()) {
    if (!Array.isArray(rows)) {
        throw new Error("Consulta de Preços e Pendências retornou formato inválido.");
    }
    const currentPeriod = now.getFullYear() * 12 + now.getMonth() + 1;
    const entries = [];
    const ids = new Set();
    for (const row of rows) {
        const id = String(row.id ?? "").trim();
        if (!id || ids.has(id)) {
            throw new Error("Registro sem ID ou com ID duplicado em Preços e Pendências.");
        }
        ids.add(id);
        for (const branch of BRANCHES) {
            const suffix = branch.toLowerCase();
            const pricesValue = row[`precos_ok_${suffix}`];
            const pendingValue = row[`pendencias_ok_${suffix}`];
            const pricesPeriod = getPeriod(pricesValue);
            const pendingPeriod = getPeriod(pendingValue);
            const pricesUpdated = pricesPeriod !== null && pricesPeriod >= currentPeriod;
            const pendingUpdated = pendingPeriod !== null && pendingPeriod >= currentPeriod;
            if (pricesUpdated && pendingUpdated) continue;
            const problems = [];
            if (!pricesUpdated) {
                problems.push(pricesPeriod === null
                    ? "preços sem atualização válida"
                    : "preços de período anterior");
            }
            if (!pendingUpdated) {
                problems.push(pendingPeriod === null
                    ? "pendências sem atualização válida"
                    : "pendências de período anterior");
            }
            const laboratory = String(row.laboratory ?? "").trim();
            entries.push({
                type: TYPE,
                title: "Atualização de preços e pendências",
                message: `${laboratory || "Laboratório não informado"} — ${branch}: ${problems.join("; ")}.`,
                source_module: SOURCE,
                source_id: `price-pending:${id}:${branch}`,
                laboratory_name: laboratory,
                laboratory_key: laboratory.normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "").toUpperCase()
                    .replace(/[^A-Z0-9]/g, ""),
                industry_global_code: row.industry_global_code || null,
                branch,
                priority: "high",
                metadata: {
                    price_pending_row_id: id,
                    prices_value: pricesValue ?? "",
                    pending_value: pendingValue ?? "",
                    prices_updated: pricesUpdated,
                    pending_updated: pendingUpdated
                }
            });
        }
    }
    return entries;
}

function reconcilePricePendingNotifications() {
    // A leitura completa deve terminar antes de qualquer limpeza.
    const entries = buildNotifications(priceRepository.listRows());
    const database = getDatabase();
    return database.transaction(() => {
        for (const entry of entries) {
            const existing = notificationRepository.getNotificationBySource(
                SOURCE, entry.source_id, TYPE
            );
            if (!existing) {
                notificationRepository.createNotification(entry);
            } else if (
                existing.title !== entry.title ||
                existing.message !== entry.message ||
                existing.laboratory_name !== entry.laboratory_name ||
                String(existing.industry_global_code ?? "") !== String(entry.industry_global_code ?? "") ||
                JSON.stringify(existing.metadata) !== JSON.stringify(entry.metadata)
            ) {
                notificationRepository.updateNotification(existing.id, entry);
            }
        }
        const active = new Set(entries.map((entry) => entry.source_id));
        const existingRows = database.prepare(`
            SELECT id, source_id FROM notifications
            WHERE source_module = ? AND type = ?
            ORDER BY created_at DESC, id DESC
        `).all(SOURCE, TYPE);
        const seen = new Set();
        const remove = database.prepare("DELETE FROM notifications WHERE id = ?");
        let removed = 0;
        for (const row of existingRows) {
            if (!active.has(row.source_id) || seen.has(row.source_id)) {
                removed += remove.run(row.id).changes;
            } else {
                seen.add(row.source_id);
            }
        }
        const legacy = database.prepare(`
            DELETE FROM notifications
            WHERE source_module = 'industry-contacts' AND type = ?
        `).run(TYPE);
        return { success: true, pending: entries.length, removed: removed + legacy.changes };
    })();
}

module.exports = {
    reconcilePricePendingNotifications,
    buildNotifications,
    getPeriod
};
