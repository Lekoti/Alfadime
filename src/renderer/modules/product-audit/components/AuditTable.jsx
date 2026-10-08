function getTypeLabel(type) {
    const labels = {
        ean_audit:
            "Divergências entre filiais",

        invalid_ean:
            "EAN ausente ou inválido",

        duplicate_ean_branch:
            "EAN repetido na mesma filial"
    };


    return labels[type] || type;
}


function getFieldsLabel(fields = []) {
    if (!fields.length) {
        return "-";
    }


    return fields
        .map((field) => field.label)
        .join(", ");
}


function AuditTable({
    issues,
    onOpenDetails
}) {
    return (
        <div className="audit-table-wrapper">
            <table className="audit-table">
                <colgroup>
                    <col className="audit-col-priority" />
                    <col className="audit-col-ean" />
                    <col className="audit-col-type" />
                    <col className="audit-col-branches" />
                    <col className="audit-col-divergent" />
                    <col className="audit-col-missing" />
                    <col className="audit-col-action" />
                </colgroup>

                <thead>
                    <tr>
                        <th>Prioridade</th>
                        <th>EAN</th>
                        <th>Tipo</th>
                        <th>Filiais</th>
                        <th>Campos divergentes</th>
                        <th>Campos ausentes</th>
                        <th>Ação</th>
                    </tr>
                </thead>

                <tbody>
                    {issues.length === 0 && (
                        <tr>
                            <td
                                colSpan="7"
                                className="audit-empty-row"
                            >
                                Nenhuma divergência encontrada.
                            </td>
                        </tr>
                    )}

                    {issues.map((issue) => (
                        <tr key={issue.id}>
                            <td className="audit-priority-cell">
                                <span
                                    className={
                                        issue.severity === "error"
                                            ? "audit-severity error"
                                            : "audit-severity warning"
                                    }
                                >
                                    {issue.severity === "error"
                                        ? "Alta"
                                        : "Conferir"}
                                </span>
                            </td>

                            <td className="audit-ean-cell">
                                {issue.ean || "-"}
                            </td>

                            <td>
                                {getTypeLabel(issue.type)}
                            </td>

                            <td>
                                {issue.branches.join(", ")}
                            </td>

                            <td>
                                {getFieldsLabel(
                                    issue.divergentFields
                                )}
                            </td>

                            <td>
                                {getFieldsLabel(
                                    issue.missingFields
                                )}
                            </td>

                            <td className="audit-action-cell">
                                <button
                                    type="button"
                                    className="audit-details-button"
                                    onClick={() =>
                                        onOpenDetails(issue)
                                    }
                                >
                                    Ver detalhes
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


export default AuditTable;