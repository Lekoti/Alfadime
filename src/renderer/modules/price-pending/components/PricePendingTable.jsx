import { useMemo } from "react";
import PricePendingPriorityMenu from "./PricePendingPriorityMenu";
import { getUpdateDateClass } from "../utils/price-pending.utils";

export default function PricePendingTable({
    rows = [], allRowsCount = 0, searchTerm = "", headerGroups = [], visibleColumnsList = [],
    permissions, savingCell = null, saving = false, readOnly = false, interactionLocked = false, tableWrapperRef, onScroll,
    onUpdateValue, onSaveCell, onRemoveLaboratory, onSelectPriority, onAcceptExternalUpdate
}) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const totalColumns = useMemo(() => {
        let count = visibleColumnsList.length;
        if (permissions.canViewIndustryGlobalCode) count += 1;
        if (permissions.canViewLaboratory) count += 1;
        if (permissions.canViewObservation) count += 1;
        if (permissions.canRemoveLaboratory) count += 1;
        return count;
    }, [permissions, visibleColumnsList]);

    function conflictActions(row, column) {
        if (!row.__ppConflicts?.includes(column)) return null;
        return (
            <div className="pp-conflict-actions" role="status">
                <span>Conflito: rascunho não salvo.</span>
                <button type="button" disabled={saving || readOnly || interactionLocked}
                    onClick={() => onSaveCell(row, column, { resolveConflict: "review" })}>Revisar</button>
                <button type="button" disabled={saving || interactionLocked}
                    onClick={() => onSaveCell(row, column, { resolveConflict: "discard" })}>Descartar rascunho</button>
            </div>
        );
    }

    return (
        <section className="price-pending-card">
            <div className="price-pending-card-header">
                <div><strong>Lista de laboratorios</strong><span>{safeRows.length} registro(s){searchTerm && ` (filtrado de ${allRowsCount})`}</span></div>
                {(saving || savingCell !== null) && <span className="saving-indicator">Salvando...</span>}
            </div>
            <div ref={tableWrapperRef} className="price-pending-table-wrapper" onScroll={onScroll}>
                <table className="price-pending-table">
                    <thead>
                        <tr>
                            {permissions.canViewIndustryGlobalCode && <th rowSpan="2" className="industry-global-code-header">Codigo Global</th>}
                            {permissions.canViewLaboratory && <th rowSpan="2" className="laboratory-header">Laboratorios</th>}
                            {permissions.canViewObservation && <th rowSpan="2" className="observation-header">Observacao</th>}
                            {headerGroups.map(({ group, groupColumns }) => (
                                <th key={group.key} colSpan={groupColumns.length} className={`group-header group-${group.key}`}>{group.label}</th>
                            ))}
                            {permissions.canRemoveLaboratory && <th rowSpan="2" className="actions-header">Acoes</th>}
                        </tr>
                        <tr>
                            {headerGroups.flatMap(({ group, groupColumns }) => groupColumns.map(column => (
                                <th key={column.key} className={`branch-header group-${group.key}`}>{column.label}</th>
                            )))}
                        </tr>
                    </thead>
                    <tbody>
                        {safeRows.length === 0 && (
                            <tr><td colSpan={totalColumns} className="empty-row">{searchTerm ? "Nenhum laboratorio encontrado para a busca." : "Nenhum laboratorio cadastrado."}</td></tr>
                        )}
                        {safeRows.map(row => (
                            <tr key={row.id}>
                                {permissions.canViewIndustryGlobalCode && <td className="industry-global-code-cell">{row.industry_global_code || ""}</td>}
                                {permissions.canViewLaboratory && (
                                    <td className="laboratory-cell">
                                        <PricePendingPriorityMenu row={row} disabled={readOnly || interactionLocked || !permissions.canEditLaboratory} onSelect={onSelectPriority} />
                                        <input type="text" value={row.laboratory || ""} disabled={readOnly || interactionLocked || !permissions.canEditLaboratory}
                                            onChange={event => onUpdateValue(row.id, "laboratory", event.target.value)}
                                            onBlur={() => onSaveCell(row, "laboratory")} title="Edite e clique fora para salvar" />
                                        {conflictActions(row, "laboratory")}
                                    </td>
                                )}
                                {permissions.canViewObservation && (
                                    <td className="observation-cell">
                                        <input type="text" value={row.observation || ""} disabled={readOnly || interactionLocked || !permissions.canEditObservation}
                                            onChange={event => onUpdateValue(row.id, "observation", event.target.value)}
                                            onBlur={() => onSaveCell(row, "observation")} title={row.observation || ""} />
                                        {conflictActions(row, "observation")}
                                    </td>
                                )}
                                {visibleColumnsList.map(column => {
                                    const canEditColumn = permissions.canEditValues && permissions.canEditFunction(permissions.moduleKey, column.key);
                                    const proposal = row.pending_external_updates?.[column.key];
                                    return (
                                        <td key={column.key} className={`editable-cell group-${column.group} ${getUpdateDateClass(row[column.key])}`}>
                                            <input type="text" value={row[column.key] || ""} disabled={readOnly || interactionLocked || !canEditColumn}
                                                onChange={event => onUpdateValue(row.id, column.key, event.target.value)}
                                                onBlur={() => onSaveCell(row, column.key)}
                                                title={row[column.key] || ""} />
                                            {conflictActions(row, column.key)}
                                            {proposal && (
                                                <div className="pp-external-proposal">
                                                    <span title={`Proposta: ${String(proposal.value ?? "")}\nOrigem: ${proposal.fileName || "-"}\nRegistro: ${proposal.updatedAt || "-"}`}>Proposta externa</span>
                                                    {canEditColumn && typeof onAcceptExternalUpdate === "function" && (
                                                        <button type="button" disabled={saving || readOnly || interactionLocked}
                                                            onClick={() => {
                                                                if (window.confirm(
                                                                    `Processar a proposta "${String(proposal.value ?? "")}"?\nOrigem: ${proposal.fileName || "-"}\n\nValores protegidos continuarão preservados.`
                                                                )) onAcceptExternalUpdate({
                                                                    id: row.id, column: column.key,
                                                                    expectedValue: String(row[column.key] ?? ""),
                                                                    expectedProposal: { ...proposal }
                                                                });
                                                            }}>Aceitar</button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                {permissions.canRemoveLaboratory && (
                                    <td className="actions-cell">
                                        <button type="button" className="remove-button" disabled={saving || readOnly} onClick={() => onRemoveLaboratory(row)}>Remover</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
