import { useEffect, useMemo, useRef, useState } from "react";


import {
    getPendingExternalUpdate,
    getUpdateDateClass
} from "../utils/price-pending.utils";


const PRIORITY_OPTIONS = [
    { value: "maximum", label: "Prioridade máxima" },
    { value: "high", label: "Prioridade alta" },
    { value: "medium", label: "Prioridade média" },
    { value: "low", label: "Prioridade baixa" },
    { value: "", label: "Sem prioridade" }
];


export default function PricePendingTable({
    rows = [],
    allRowsCount = 0,
    searchTerm = "",
    headerGroups = [],
    visibleColumnsList = [],
    permissions,
    savingCell = null,
    saving = false,
    readOnly = false,
    tableWrapperRef,
    onScroll,
    onUpdateValue,
    onSaveCell,
    onUpdatePriority,
    onRemoveLaboratory,
    onAcceptExternalUpdate
}) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const [priorityMenuRow, setPriorityMenuRow] = useState(null);


    const totalColumns = useMemo(() => {
        let count = visibleColumnsList.length;

        if (permissions.canViewIndustryGlobalCode) count += 1;
        if (permissions.canViewLaboratory) count += 1;
        if (permissions.canViewObservation) count += 1;
        if (permissions.canRemoveLaboratory) count += 1;

        return count;
    }, [
        permissions,
        visibleColumnsList
    ]);


    return (
        <section className="price-pending-card">
            <div className="price-pending-card-header">
                <div>
                    <strong>Lista de laboratórios</strong>


                    <span>
                        {safeRows.length} registro(s)
                        {searchTerm && ` (filtrado de ${allRowsCount})`}
                    </span>
                </div>


                {(saving || savingCell !== null) && (
                    <span className="saving-indicator">
                        Salvando...
                    </span>
                )}
            </div>


            <div
                ref={tableWrapperRef}
                className="price-pending-table-wrapper"
                onScroll={onScroll}
            >
                <table className="price-pending-table">
                    <thead>
                        <tr>
                            {permissions.canViewIndustryGlobalCode && (
                                <th
                                    rowSpan="2"
                                    className="industry-global-code-header"
                                >
                                    Código Global
                                </th>
                            )}


                            {permissions.canViewLaboratory && (
                                <th
                                    rowSpan="2"
                                    className="laboratory-header"
                                >
                                    Laboratórios
                                </th>
                            )}


                            {permissions.canViewObservation && (
                                <th
                                    rowSpan="2"
                                    className="observation-header"
                                >
                                    Observação
                                </th>
                            )}


                            {headerGroups.map(({ group, groupColumns }) => (
                                <th
                                    key={group.key}
                                    colSpan={groupColumns.length}
                                    className={`group-header group-${group.key}`}
                                >
                                    {group.label}
                                </th>
                            ))}


                            {permissions.canRemoveLaboratory && (
                                <th
                                    rowSpan="2"
                                    className="actions-header"
                                >
                                    Ações
                                </th>
                            )}
                        </tr>


                        <tr>
                            {headerGroups.flatMap(
                                ({ group, groupColumns }) => {
                                    return groupColumns.map((column) => (
                                        <th
                                            key={column.key}
                                            className={`branch-header group-${group.key}`}
                                        >
                                            {column.label}
                                        </th>
                                    ));
                                }
                            )}
                        </tr>
                    </thead>


                    <tbody>
                        {safeRows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={totalColumns}
                                    className="empty-row"
                                >
                                    {searchTerm
                                        ? "Nenhum laboratório encontrado para a busca."
                                        : "Nenhum laboratório cadastrado."}
                                </td>
                            </tr>
                        )}


                        {safeRows.map((row) => (
                            <tr key={row.id}>
                                {permissions.canViewIndustryGlobalCode && (
                                    <td className="industry-global-code-cell">
                                        {row.industry_global_code || ""}
                                    </td>
                                )}


                                {permissions.canViewLaboratory && (
                                    <td className="laboratory-cell">
                                        <div className="price-pending-laboratory-editor">
                                            <input
                                                type="text"
                                                value={row.laboratory || ""}
                                                disabled={
                                                    readOnly ||
                                                    !permissions.canEditLaboratory
                                                }
                                                onChange={(event) =>
                                                    onUpdateValue(
                                                        row.id,
                                                        "laboratory",
                                                        event.target.value
                                                    )
                                                }
                                                onBlur={() =>
                                                    onSaveCell(row, "laboratory")
                                                }
                                                title="Edite e clique fora para salvar"
                                            />

                                            {row.priority && (
                                                <span
                                                    className={`price-pending-priority-badge priority-${row.priority}`}
                                                >
                                                    {PRIORITY_OPTIONS.find(
                                                        (option) => option.value === row.priority
                                                    )?.label}
                                                </span>
                                            )}

                                            {permissions.canEditPriority && (
                                                <div className="price-pending-priority-picker">
                                                    <button
                                                        type="button"
                                                        className="price-pending-priority-trigger"
                                                        disabled={readOnly || saving || savingCell !== null}
                                                        aria-label={`Alterar prioridade de ${row.laboratory}`}
                                                        title="Alterar prioridade"
                                                        aria-expanded={priorityMenuRow === row.id}
                                                        onClick={() =>
                                                            setPriorityMenuRow(
                                                                priorityMenuRow === row.id ? null : row.id
                                                            )
                                                        }
                                                    >
                                                        ▾
                                                    </button>

                                                    {priorityMenuRow === row.id && (
                                                        <div
                                                            className="price-pending-priority-menu"
                                                            role="menu"
                                                        >
                                                            {PRIORITY_OPTIONS.map((option) => (
                                                                <button
                                                                    key={option.value || "none"}
                                                                    type="button"
                                                                    role="menuitem"
                                                                    disabled={readOnly}
                                                                    onClick={() => {
                                                                        setPriorityMenuRow(null);
                                                                        onUpdatePriority(row.id, option.value);
                                                                    }}
                                                                >
                                                                    {option.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                )}


                                {permissions.canViewObservation && (
                                    <td className="observation-cell">
                                        <input
                                            type="text"
                                            value={row.observation || ""}
                                            disabled={
                                                readOnly ||
                                                !permissions.canEditObservation
                                            }
                                            onChange={(event) =>
                                                onUpdateValue(
                                                    row.id,
                                                    "observation",
                                                    event.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                onSaveCell(row, "observation")
                                            }
                                            title={row.observation || ""}
                                        />
                                    </td>
                                )}


                                {visibleColumnsList.map((column) => {
                                    const pendingUpdate =
                                        getPendingExternalUpdate(
                                            row,
                                            column.key
                                        );


                                    const isManualUpdate = Boolean(
                                        row.manual_cells?.[column.key]
                                    );


                                    const canAcceptExternalUpdate = Boolean(
                                        pendingUpdate &&
                                        permissions.canEditValues
                                    );


                                    const canEditColumn =
                                        permissions.canEditValues &&
                                        permissions.canEditFunction(
                                            permissions.moduleKey,
                                            column.key
                                        );


                                    return (
                                        <td
                                            key={column.key}
                                            className={
                                                `editable-cell group-${column.group} ` +
                                                getUpdateDateClass(
                                                    row[column.key]
                                                ) +
                                                (pendingUpdate
                                                    ? " external-update-pending"
                                                    : "") +
                                                (isManualUpdate
                                                    ? " manual-update"
                                                    : "")
                                            }
                                        >
                                            <input
                                                type="text"
                                                value={row[column.key] || ""}
                                                disabled={
                                                    readOnly ||
                                                    !canEditColumn
                                                }
                                                onChange={(event) =>
                                                    onUpdateValue(
                                                        row.id,
                                                        column.key,
                                                        event.target.value
                                                    )
                                                }
                                                onBlur={() =>
                                                    onSaveCell(
                                                        row,
                                                        column.key
                                                    )
                                                }
                                                title={
                                                    pendingUpdate
                                                        ? `Atualização externa pendente: ${String(
                                                            pendingUpdate.value ?? ""
                                                        )}`
                                                        : isManualUpdate
                                                            ? `Atualizado manualmente: ${row[column.key] || ""}`
                                                            : row[column.key] || ""
                                                }
                                            />


                                            {canAcceptExternalUpdate && (
                                                <button
                                                    type="button"
                                                    className="accept-external-update-button"
                                                    disabled={savingCell !== null}
                                                    onClick={() =>
                                                        onAcceptExternalUpdate({
                                                            id: row.id,
                                                            column: column.key
                                                        })
                                                    }
                                                    title={`Aceitar atualização externa: ${String(
                                                        pendingUpdate.value ?? ""
                                                    )}`}
                                                >
                                                    ✓
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}


                                {permissions.canRemoveLaboratory && (
                                    <td className="actions-cell">
                                        <button
                                            type="button"
                                            className="remove-button"
                                            disabled={saving || readOnly}
                                            onClick={() =>
                                                onRemoveLaboratory(row)
                                            }
                                        >
                                            Remover
                                        </button>
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