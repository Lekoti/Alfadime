const repository = require("./price-pending.repository");
const { getPricePendingDatabase } = require("./price-pending.database");

function parseObject(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(String(value || "{}"));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
}
function proposalKey(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return JSON.stringify([
        String(value.value ?? ""), String(value.fileName || ""),
        value.fileMtimeMs == null ? null : Number(value.fileMtimeMs),
        String(value.updatedAt || "")
    ]);
}
function execute(payload, acceptProposal) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Dados da edição inválidos.");
    if (typeof payload.id !== "string" || !payload.id.trim()) throw new Error("Identificador obrigatório.");
    if (!repository.EDITABLE_COLUMNS.includes(payload.column)) throw new Error("Coluna não permitida para edição.");
    if (typeof payload.expectedValue !== "string") throw new Error("Valor original não informado. Atualize o aplicativo e recarregue os dados antes de editar.");
    if (!Number.isInteger(Number(payload.expectedVersion))) throw new Error("Versão da célula não informada. Atualize o aplicativo e recarregue os dados antes de editar.");
    if (typeof payload.ownerId !== "string" || !payload.ownerId.trim()) throw new Error("Usuário não identificado para salvar o rascunho.");
    if (acceptProposal && !repository.EXTERNAL_COLUMNS.includes(payload.column)) throw new Error("Coluna não permitida para proposta externa.");
    if (acceptProposal && proposalKey(payload.expectedProposal) === null) throw new Error("Proposta original não informada. Recarregue os dados.");
    const database = getPricePendingDatabase();
    return database.transaction(() => {
        const row = database.prepare(`
            SELECT * FROM price_pending_rows WHERE id = ? AND active = 1 LIMIT 1
        `).get(payload.id);
        if (!row) throw new Error("Registro removido ou não encontrado.");
        const versionRow = database.prepare(`
            SELECT version FROM price_pending_cell_versions WHERE row_id = ? AND column_name = ?
        `).get(payload.id, payload.column);
        const currentVersion = Number(versionRow?.version ?? 1);
        if (Number(payload.expectedVersion) !== currentVersion) return { conflict: true, row: repository.getRowById(payload.id) };
        const valueChanged = String(row[payload.column] ?? "") !== payload.expectedValue;
        const proposalChanged = acceptProposal &&
            proposalKey(parseObject(row.pending_external_updates)[payload.column]) !== proposalKey(payload.expectedProposal);
        if (valueChanged || proposalChanged) return { conflict: true, row: repository.getRowById(payload.id) };
        const saved = acceptProposal
            ? repository.acceptExternalCellUpdate({ id: payload.id, column: payload.column })
            : repository.updateCell(payload.id, payload.column, payload.value);
        repository.bumpCellVersion(payload.id, payload.column);
        repository.deleteDraft({ rowId: payload.id, column: payload.column, ownerId: payload.ownerId });
        return { conflict: false, row: saved, version: repository.getCellVersion(payload.id, payload.column) };
    }).immediate();
}
function updateCell(payload) { return execute(payload, false); }
function acceptExternalUpdate(payload) { return execute(payload, true); }
module.exports = { updateCell, acceptExternalUpdate };
