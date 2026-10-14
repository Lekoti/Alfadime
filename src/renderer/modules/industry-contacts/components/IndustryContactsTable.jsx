import { Pencil, Trash2, Mail } from "lucide-react";
import { formatChargeDate } from "../utils/industry-contacts-charge.utils";

export default function IndustryContactsTable({
    rows = [], loading, deleting, charging,
    canEdit = true, canDelete = true, canCharge = true,
    onEdit, onDelete, onCharge
}) {
    return (
        <div className="industry-contacts-table-wrapper">
            <table className="industry-contacts-table">
                <thead><tr>
                    <th>Código Global</th><th>Indústria</th><th>Filial</th><th>Responsável</th>
                    <th>Cargo</th><th>Telefone</th><th>E-mail</th><th>Observação Automática</th>
                    <th>Situação</th><th>Últ. cobrança de preços</th><th>Últ. cobrança de pendências</th><th>Ações</th>
                </tr></thead>
                <tbody>
                    {loading && <tr><td colSpan="12" className="industry-contacts-empty-cell">Carregando contatos...</td></tr>}
                    {!loading && rows.map((row) => {
                        const hasContact = row.has_contact === 1;
                        const status = row.status_label || (hasContact ? "Contato completo" : "Sem contato");
                        return (
                            <tr key={row.id || `${row.laboratory_key}-${row.branch}`}>
                                <td>{row.industry_global_code || row.global_code || "-"}</td>
                                <td className="industry-contacts-laboratory">{row.laboratory_name || "-"}</td>
                                <td>{row.branch || "-"}</td><td>{row.contact_name || "-"}</td>
                                <td>{row.cargo || "-"}</td><td>{row.phone || "-"}</td>
                                <td className="industry-contacts-email-cell">{row.email || "-"}</td>
                                <td className="industry-contacts-observation-cell">{row.automatic_observation || "-"}</td>
                                <td><span className={hasContact ? "industry-contacts-status with-contact" : "industry-contacts-status without-contact"}
                                    title={status}>{status}</span></td>
                                <td>{formatChargeDate(row.last_prices_charge_at)}</td>
                                <td>{formatChargeDate(row.last_pending_charge_at)}</td>
                                <td><div className="industry-contacts-row-actions">
                                    {canEdit && <button type="button" className="industry-contacts-edit-button"
                                        disabled={deleting || charging} onClick={() => onEdit(row)} title="Editar contato">
                                        <Pencil size={13} strokeWidth={1.9} />Editar
                                    </button>}
                                    {canDelete && <button type="button" className="industry-contacts-delete-button"
                                        disabled={deleting || charging} onClick={() => onDelete(row)} title="Excluir contato">
                                        <Trash2 size={13} strokeWidth={1.9} />Excluir
                                    </button>}
                                    {canCharge && <button type="button" className="industry-contacts-charge-button"
                                        disabled={deleting || charging} onClick={() => onCharge(row)} title="Cobrar preços ou pendências">
                                        <Mail size={13} strokeWidth={1.9} />Cobrar
                                    </button>}
                                </div></td>
                            </tr>
                        );
                    })}
                    {!loading && !rows.length && <tr><td colSpan="12" className="industry-contacts-empty-cell">Nenhum contato encontrado.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
