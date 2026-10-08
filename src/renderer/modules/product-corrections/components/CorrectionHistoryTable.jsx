const FIELD_LABELS = {
    sirius_code: "Cod Sirius",
    sap_code: "Codigo SAP",
    group_code: "Grupo",
    active_ingredient: "Principio Ativo",
    commercial_name: "Nome Comercial",
    manufacturer_code: "Codigo Fabricante",
    brand: "Marca / Industria",
    unit: "Unidade",
    standard_box: "Caixa Padrao",
    controls_lot: "Controla Lote",
    ms_registration: "Registro MS",
    reference_code: "Codigo Referencia",
    therapeutic_class_code: "Classe Terapeutica",
    height: "Altura",
    width: "Largura",
    length: "Comprimento",
    category_code: "Categoria",
    active: "Ativo"
};

function getStatusLabel(status) {
    const labels = {
        pending_excel: "Pendente",
        sent_internal: "Feito / Atualizado",
        confirmed_in_excel: "Confirmada no Excel",
        cancelled: "Cancelada"
    };

    return labels[status] || status;
}

function formatValue(fieldName, value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    const text = String(value).trim();

    if (
        [
            "group_code",
            "category_code"
        ].includes(fieldName) &&
        /^\d$/.test(text)
    ) {
        return text.padStart(2, "0");
    }

    return text;
}

function CorrectionHistoryTable({
    corrections,
    selectedIds,
    onToggleSelection,
    onToggleAll
}) {
    const selectableCorrections = corrections.filter(
        (correction) =>
            [
                "pending_excel",
                "sent_internal"
            ].includes(correction.status)
    );

    const allSelected =
        selectableCorrections.length > 0 &&
        selectableCorrections.every(
            (correction) =>
                selectedIds.includes(
                    correction.id
                )
        );

    return (
        <div className="corrections-table-wrapper">
            <table className="corrections-table">
                <thead>
                    <tr>
                        <th className="correction-select-column">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() =>
                                    onToggleAll(
                                        selectableCorrections
                                    )
                                }
                                disabled={
                                    selectableCorrections.length === 0
                                }
                                title="Selecionar correcoes pendentes ou feitas"
                            />
                        </th>

                        <th>Status</th>
                        <th>Data</th>
                        <th>EAN</th>
                        <th>Filial</th>
                        <th>Cod</th>
                        <th>Campo</th>
                        <th>Valor da planilha</th>
                        <th>Valor corrigido</th>
                    </tr>
                </thead>

                <tbody>
                    {corrections.length === 0 && (
                        <tr>
                            <td
                                colSpan="9"
                                className="corrections-empty-row"
                            >
                                Nenhuma correcao encontrada.
                            </td>
                        </tr>
                    )}

                    {corrections.map((correction) => {
                        const isPending =
                            correction.status === "pending_excel";

                        const isDone =
                            correction.status === "sent_internal";

                        return (
                            <tr
                                key={correction.id}
                                className={
                                    selectedIds.includes(
                                        correction.id
                                    )
                                        ? "correction-row-selected"
                                        : ""
                                }
                            >
                                <td className="correction-select-column">
                                    {isPending || isDone ? (
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedIds.includes(
                                                    correction.id
                                                )
                                            }
                                            onChange={() =>
                                                onToggleSelection(
                                                    correction.id
                                                )
                                            }
                                        />
                                    ) : (
                                        "-"
                                    )}
                                </td>

                                <td>
                                    <span
                                        className={
                                            "correction-status " +
                                            correction.status
                                        }
                                    >
                                        {getStatusLabel(
                                            correction.status
                                        )}
                                    </span>
                                </td>

                                <td>
                                    {new Date(
                                        correction.updated_at
                                    ).toLocaleString(
                                        "pt-BR"
                                    )}
                                </td>

                                <td>
                                    {correction.ean || "-"}
                                </td>

                                <td>
                                    {correction.branch}
                                </td>

                                <td>
                                    {correction.code}
                                </td>

                                <td>
                                    {FIELD_LABELS[
                                        correction.field_name
                                    ] || correction.field_name}
                                </td>

                                <td>
                                    {formatValue(
                                        correction.field_name,
                                        correction.old_value
                                    )}
                                </td>

                                <td>
                                    {formatValue(
                                        correction.field_name,
                                        correction.new_value
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default CorrectionHistoryTable;