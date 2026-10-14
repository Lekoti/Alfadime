import {
    Pencil,
    Trash2,
    Mail
} from "lucide-react";

function IndustryContactsTable({
    rows,
    loading,
    deleting,
    charging,
    onEdit,
    onDelete,
    onCharge
}) {
    return (
        <div className="industry-contacts-table-wrapper">
            <table className="industry-contacts-table">
                <thead>
                    <tr>
                        <th>Código Global</th>
                        <th>Indústria</th>
                        <th>Filial</th>
                        <th>Responsável</th>
                        <th>Cargo</th>
                        <th>Telefone</th>
                        <th>E-mail</th>
                        <th>Observação Automática</th>
                        <th>Situação</th>
                        <th>Ações</th>
                    </tr>
                </thead>

                <tbody>
                    {loading && (
                        <tr>
                            <td
                                colSpan="10"
                                className="industry-contacts-empty-cell"
                            >
                                Carregando contatos...
                            </td>
                        </tr>
                    )}

                    {!loading &&
                        rows.map((row) => {
                            const statusLabel =
                                row.status_label ||
                                (
                                    row.has_contact === 1
                                        ? "Contato completo"
                                        : "Sem contato"
                                );

                            const hasContact =
                                row.has_contact === 1;

                            return (
                                <tr
                                    key={
                                        row.id ||
                                        `${row.laboratory_key}-${row.branch}`
                                    }
                                >
                                    <td>
                                        {
                                            row.industry_global_code ||
                                            row.global_code ||
                                            "-"
                                        }
                                    </td>

                                    <td
                                        className={
                                            "industry-contacts-laboratory"
                                        }
                                    >
                                        {
                                            row.laboratory_name ||
                                            "-"
                                        }
                                    </td>

                                    <td>
                                        {row.branch || "-"}
                                    </td>

                                    <td>
                                        {
                                            row.contact_name ||
                                            "-"
                                        }
                                    </td>

                                    <td>
                                        {row.cargo || "-"}
                                    </td>

                                    <td>
                                        {row.phone || "-"}
                                    </td>

                                    <td
                                        className={
                                            "industry-contacts-email-cell"
                                        }
                                    >
                                        {row.email || "-"}
                                    </td>

                                    <td
                                        className={
                                            "industry-contacts-observation-cell"
                                        }
                                    >
                                        {
                                            row.automatic_observation ||
                                            "-"
                                        }
                                    </td>

                                    <td>
                                        <span
                                            className={
                                                hasContact
                                                    ? "industry-contacts-status with-contact"
                                                    : "industry-contacts-status without-contact"
                                            }
                                            title={statusLabel}
                                        >
                                            {statusLabel}
                                        </span>
                                    </td>

                                    <td>
                                        <div
                                            className={
                                                "industry-contacts-row-actions"
                                            }
                                        >
                                            <button
                                                type="button"
                                                className={
                                                    "industry-contacts-edit-button"
                                                }
                                                onClick={() =>
                                                    onEdit(row)
                                                }
                                                disabled={
                                                    deleting ||
                                                    charging
                                                }
                                                title="Editar contato"
                                            >
                                                <Pencil
                                                    size={13}
                                                    strokeWidth={1.9}
                                                />

                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                className={
                                                    "industry-contacts-delete-button"
                                                }
                                                onClick={() =>
                                                    onDelete(row)
                                                }
                                                disabled={
                                                    deleting ||
                                                    charging
                                                }
                                                title="Excluir contato"
                                            >
                                                <Trash2
                                                    size={13}
                                                    strokeWidth={1.9}
                                                />

                                                Excluir
                                            </button>

                                            <button
                                                type="button"
                                                className={
                                                    "industry-contacts-charge-button"
                                                }
                                                onClick={() =>
                                                    onCharge(row)
                                                }
                                                disabled={
                                                    deleting ||
                                                    charging
                                                }
                                                title="Cobrar preços ou pendências"
                                            >
                                                <Mail
                                                    size={13}
                                                    strokeWidth={1.9}
                                                />

                                                Cobrar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                    {!loading && !rows.length && (
                        <tr>
                            <td
                                colSpan="10"
                                className="industry-contacts-empty-cell"
                            >
                                Nenhum contato encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default IndustryContactsTable;