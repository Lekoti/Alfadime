const { getDatabase } = require("../../database/connection");
const auditService = require("../product-audit/product-audit.service");
const repository = require("./notifications.repository");

const SOURCE = "product-audit";
const TYPE = "PRODUCT_DIVERGENCE";
const BRANCHES = {
    DPR: "DPR", "DIMEBRAS PR": "DPR",
    AMS: "AMS", "ALFAMED MS": "AMS",
    DMT: "DMT", "DIMEBRAS MT": "DMT",
    DMS: "DMS", "DIMEBRAS MS": "DMS",
    DSC: "DSC", "DIMEBRAS SC": "DSC"
};

function getBranch(value) {
    const key = String(value ?? "").trim().toUpperCase();
    const branch = BRANCHES[key];
    if (!branch) throw new Error(`Filial não reconhecida na auditoria: ${key}`);
    return branch;
}

function buildNotifications(issues) {
    if (!Array.isArray(issues)) {
        throw new Error("Resultado inválido da auditoria. Nenhuma notificação foi removida.");
    }
    const entries = new Map();
    for (const issue of issues) {
        if (issue.type !== "ean_audit") continue;
        if (!Array.isArray(issue.divergentFields)) {
            throw new Error("Ocorrência de auditoria sem campos divergentes válidos.");
        }
        for (const field of issue.divergentFields) {
            if (!field.key || !Array.isArray(field.values) || field.values.length < 2) {
                throw new Error("Campo divergente sem valores válidos.");
            }
            const ean = String(issue.ean ?? "").trim();
            if (!ean) throw new Error("Ocorrência divergente sem EAN.");
            const branches = new Set();
            const values = field.values.map((item) => {
                if (!Array.isArray(item.branches) || !item.branches.length) {
                    throw new Error("Valor divergente sem filial.");
                }
                const itemBranches = [...new Set(item.branches.map(getBranch))].sort();
                itemBranches.forEach((branch) => branches.add(branch));
                return { value: String(item.value ?? ""), branches: itemBranches };
            }).sort((a, b) => a.value.localeCompare(b.value));
            const comparison = values.map((item) =>
                `${item.branches.join(", ")}: ${item.value}`
            ).join("; ");
            const label = String(field.label || field.key);
            for (const branch of [...branches].sort()) {
                const sourceId = `audit:${JSON.stringify([ean, field.key, branch])}`;
                entries.set(sourceId, {
                    type: TYPE,
                    title: `Divergência de produto — ${label}`,
                    message: `EAN ${ean} — ${label}. ${comparison}.`,
                    source_module: SOURCE,
                    source_id: sourceId,
                    branch,
                    priority: issue.severity === "error" ? "high" : "normal",
                    metadata: {
                        audit_issue_id: issue.id,
                        ean,
                        field_name: field.key,
                        field_label: label,
                        values,
                        branch
                    }
                });
            }
        }
    }
    return [...entries.values()];
}

function reconcileProductAuditNotifications() {
    const database = getDatabase();
    return database.transaction(() => {
        const entries = buildNotifications(auditService.listAllAuditIssues({}));
        for (const entry of entries) {
            const existing = repository.getNotificationBySource(SOURCE, entry.source_id, TYPE);
            if (!existing) {
                repository.createNotification(entry);
            } else if (
                existing.title !== entry.title || existing.message !== entry.message ||
                existing.priority !== entry.priority ||
                JSON.stringify(existing.metadata) !== JSON.stringify(entry.metadata)
            ) {
                repository.updateNotification(existing.id, entry);
            }
        }
        const active = new Set(entries.map((entry) => entry.source_id));
        const rows = database.prepare(`
            SELECT id, source_id FROM notifications
            WHERE source_module = ? AND type = ?
            ORDER BY created_at DESC, id DESC
        `).all(SOURCE, TYPE);
        const seen = new Set();
        const remove = database.prepare("DELETE FROM notifications WHERE id = ?");
        let removed = 0;
        for (const row of rows) {
            if (!active.has(row.source_id) || seen.has(row.source_id)) {
                removed += remove.run(row.id).changes;
            } else {
                seen.add(row.source_id);
            }
        }
        return { success: true, pending: entries.length, removed };
    })();
}

module.exports = { buildNotifications, reconcileProductAuditNotifications };
