import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import ContactRowActionsMenu from "./ContactRowActionsMenu";


export default function IndustryContactsTable({
    rows = [],
    loading,
    deleting,
    charging,
    canEdit = true,
    canDelete = true,
    canCharge = true,
    onEdit,
    onDelete,
    onCharge,
    onChargeFavorite
}) {
    const [statusRow, setStatusRow] = useState(null);


    function getUpdateStatus(row) {
        const pricesUpdated = row.prices_updated === true;
        const pendingUpdated = row.pending_updated === true;


        if (pricesUpdated && pendingUpdated) {
            return {
                label: "Atualizado",
                className: "updated",
                icon: <CheckCircle2 size={13} strokeWidth={2} />
            };
        }


        if (!pricesUpdated && !pendingUpdated) {
            return {
                label: "Preços e pendências desatualizados",
                className: "outdated",
                icon: <AlertTriangle size={13} strokeWidth={2} />
            };
        }


        if (!pricesUpdated) {
            return {
                label: "Preços desatualizados",
                className: "outdated",
                icon: <AlertTriangle size={13} strokeWidth={2} />
            };
        }


        return {
            label: "Pendências desatualizadas",
            className: "outdated",
            icon: <AlertTriangle size={13} strokeWidth={2} />
        };
    }


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
                        <th>Atualização</th>
                        <th>Ações</th>
                    </tr>
                </thead>


                <tbody>
                    {loading && (
                        <tr>
                            <td colSpan="9" className="industry-contacts-empty-cell">
                                Carregando contatos...
                            </td>
                        </tr>
                    )}


                    {!loading && rows.map((row) => {
                        const updateStatus = getUpdateStatus(row);


                        return (
                            <tr key={row.id || `${row.laboratory_key}-${row.branch}`}>
                                <td>
                                    {row.industry_global_code || row.global_code || "-"}
                                </td>


                                <td className="industry-contacts-laboratory">
                                    {row.laboratory_name || "-"}
                                </td>


                                <td>{row.branch || "-"}</td>


                                <td>{row.contact_name || "-"}</td>


                                <td>{row.cargo || "-"}</td>


                                <td>{row.phone || "-"}</td>


                                <td className="industry-contacts-email-cell">
                                    {row.email || "-"}
                                </td>


                                <td>
                                    <button
                                        type="button"
                                        className={`contacts-update-status ${updateStatus.className}`}
                                        onClick={() => setStatusRow(row)}
                                        title="Ver detalhes da atualização"
                                    >
                                        {updateStatus.icon}


                                        {updateStatus.label}
                                    </button>
                                </td>


                                <td>
                                    <ContactRowActionsMenu
                                        row={row}
                                        canEdit={canEdit}
                                        canDelete={canDelete}
                                        canCharge={canCharge}
                                        disabled={deleting || charging}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onCharge={onCharge}
                                        onChargeFavorite={onChargeFavorite}
                                    />
                                </td>
                            </tr>
                        );
                    })}


                    {!loading && !rows.length && (
                        <tr>
                            <td colSpan="9" className="industry-contacts-empty-cell">
                                Nenhum contato encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>


            {statusRow && (
                <div className="contacts-charge-overlay" role="dialog" aria-modal="true">
                    <div className="contacts-charge-modal contacts-update-status-modal">
                        <header className="contacts-charge-header">
                            <div>
                                <h2>Situação de atualização</h2>


                                <span>{statusRow.laboratory_name}</span>
                            </div>


                            <button
                                type="button"
                                className="contacts-charge-close-button"
                                onClick={() => setStatusRow(null)}
                                aria-label="Fechar"
                            >
                                ×
                            </button>
                        </header>


                        <div className="contacts-update-status-details">
                            <div className={statusRow.prices_updated ? "updated" : "outdated"}>
                                <strong>Preços</strong>


                                <span>
                                    {statusRow.prices_updated
                                        ? "Atualizado"
                                        : "Desatualizado"}
                                </span>
                            </div>


                            <div className={statusRow.pending_updated ? "updated" : "outdated"}>
                                <strong>Pendências</strong>


                                <span>
                                    {statusRow.pending_updated
                                        ? "Atualizado"
                                        : "Desatualizado"}
                                </span>
                            </div>
                        </div>


                        <footer className="contacts-charge-actions">
                            <button
                                type="button"
                                className="contacts-charge-cancel-button"
                                onClick={() => setStatusRow(null)}
                            >
                                Fechar
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
