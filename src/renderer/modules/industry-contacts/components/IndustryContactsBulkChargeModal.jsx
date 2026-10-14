import { useEffect, useMemo, useState } from "react";
import { Mail } from "lucide-react";
import {
    prepareIndustryContactBulkCharge,
    sendIndustryContactBulkCharge
} from "../services/industry-contacts.service";


const CHARGE_TYPES = {
    PRICES: "prices",
    PENDING: "pending",
    BOTH: "both"
};


const SCOPES = {
    MISSING: "missing",
    ALL: "all"
};


function formatDuration(ms) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}min ${remainingSeconds}s` : `${remainingSeconds}s`;
}


function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
}


export default function IndustryContactsBulkChargeModal({
    open,
    rows = [],
    onClose,
    onCompleted
}) {
    const [chargeType, setChargeType] = useState(CHARGE_TYPES.BOTH);
    const [scope, setScope] = useState(SCOPES.MISSING);
    const [preparing, setPreparing] = useState(false);
    const [sending, setSending] = useState(false);
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [result, setResult] = useState(null);


    const selectedRows = useMemo(() => {
        if (!open) return [];


        if (scope === SCOPES.ALL) {
            return rows.filter((row) =>
                Boolean(String(row.email || "").trim())
            );
        }


        return rows.filter((row) => {
            const hasEmail = Boolean(String(row.email || "").trim());
            if (!hasEmail) return false;

            if (chargeType === CHARGE_TYPES.PRICES) {
                return row.prices_updated === false;
            }

            if (chargeType === CHARGE_TYPES.PENDING) {
                return row.pending_updated === false;
            }

            return row.prices_updated === false || row.pending_updated === false;
        });
    }, [open, rows, chargeType, scope]);


    useEffect(() => {
        if (!preview?.preview_token || !sending) return;

        const intervalId = setInterval(async () => {
            try {
                const nextStatus = await window.alfadime.ipc.invoke(
                    "industry-contacts:bulk-charge-status",
                    { preview_token: preview.preview_token }
                );
                setStatus(nextStatus);
            } catch {
                // Mantém a última situação conhecida.
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [preview?.preview_token, sending]);


    if (!open) {
        return null;
    }


    async function handlePrepare() {
        setPreparing(true);
        setError("");
        setSuccess("");
        setResult(null);
        setStatus(null);

        try {
            const response = await prepareIndustryContactBulkCharge({
                charge_type: chargeType,
                contacts: selectedRows.map((row) => ({
                    contact_id: row.contact_id || row.id,
                    laboratory_key: row.laboratory_key,
                    branch: row.branch,
                    laboratory_name: row.laboratory_name,
                    email: row.email,
                    prices_updated: row.prices_updated,
                    pending_updated: row.pending_updated
                }))
            });

            setPreview(response);
        } catch (prepareError) {
            setError(prepareError?.message || "Não foi possível preparar a cobrança em lote.");
        } finally {
            setPreparing(false);
        }
    }


    async function handleSend() {
        if (!preview?.preview_token) return;

        const confirmed = window.confirm(
            `Confirma o envio de ${preview.valid} e-mail(s)? ` +
            "Contatos repetidos no mesmo e-mail receberão apenas um envio."
        );

        if (!confirmed) return;

        setSending(true);
        setError("");
        setSuccess("");
        setResult(null);

        try {
            const response = await sendIndustryContactBulkCharge({
                preview_token: preview.preview_token
            });

            setResult(response);
            setSuccess(
                response.cancelled
                    ? `Envio cancelado. ${response.sent} de ${response.expected} e-mail(s) foram enviados antes do cancelamento.`
                    : `${response.sent} de ${response.expected} e-mail(s) enviados.`
            );
            setPreview(null);
            setStatus(null);
            onCompleted?.(response);
        } catch (sendError) {
            setError(sendError?.message || "Não foi possível enviar a cobrança em lote.");
        } finally {
            setSending(false);
        }
    }


    async function handleCancel() {
        if (!preview?.preview_token) return;

        try {
            await window.alfadime.ipc.invoke(
                "industry-contacts:cancel-bulk-charge",
                { preview_token: preview.preview_token }
            );
            setSuccess("Cancelamento solicitado. Os e-mails já enviados permanecem registrados.");
        } catch (cancelError) {
            setError(cancelError?.message || "Não foi possível solicitar o cancelamento.");
        }
    }


    function close() {
        setPreview(null);
        setStatus(null);
        setResult(null);
        setError("");
        setSuccess("");
        onClose();
    }


    const failures = (result?.results || []).filter((item) => !item.success);
    const progress = status?.total ? Math.round((status.current / status.total) * 100) : 0;

    return (
        <div className="industry-contacts-charge-overlay" role="dialog" aria-modal="true">
            <div className="industry-contacts-charge-modal">
                <div className="industry-contacts-charge-header">
                    <div>
                        <h2>Cobrança em lote</h2>
                        <span>{selectedRows.length} contato(s) selecionado(s)</span>
                    </div>

                    <button
                        type="button"
                        className="industry-contacts-close-button"
                        onClick={close}
                        disabled={preparing || sending}
                        aria-label="Fechar"
                    >
                        ×
                    </button>
                </div>

                <p>Selecione o tipo e o alcance da cobrança:</p>

                <div className="industry-contacts-bulk-options">
                    <label>
                        <span>Tipo de cobrança</span>
                        <select
                            value={chargeType}
                            disabled={preparing || sending}
                            onChange={(event) => setChargeType(event.target.value)}
                        >
                            <option value={CHARGE_TYPES.PRICES}>Preços</option>
                            <option value={CHARGE_TYPES.PENDING}>Pendências</option>
                            <option value={CHARGE_TYPES.BOTH}>Preços e pendências</option>
                        </select>
                    </label>

                    <label>
                        <span>Alcance</span>
                        <select
                            value={scope}
                            disabled={preparing || sending}
                            onChange={(event) => setScope(event.target.value)}
                        >
                            <option value={SCOPES.MISSING}>Somente o que falta atualizar</option>
                            <option value={SCOPES.ALL}>Todos os contatos filtrados</option>
                        </select>
                    </label>
                </div>

                {error && (
                    <div className="industry-contacts-message error">{error}</div>
                )}

                {success && (
                    <div className="industry-contacts-message success">{success}</div>
                )}

                {preview && (
                    <div className="industry-contacts-bulk-preview">
                        <strong>Prévia preparada</strong>
                        <span>{preview.valid} e-mail(s) serão enviados.</span>
                        <span>
                            Somente preços: {preview.pricesOnly} • Somente pendências: {preview.pendingOnly} • Ambos: {preview.both}
                        </span>
                        {preview.duplicates.length > 0 && (
                            <span className="industry-contacts-bulk-invalid">
                                {preview.duplicates.length} contato(s) repetido(s) em outras filiais serão ignorados para não duplicar e-mail.
                            </span>
                        )}
                        {preview.invalid.length > 0 && (
                            <span className="industry-contacts-bulk-invalid">
                                {preview.invalid.length} contato(s) ignorado(s) por e-mail inválido ou ausente.
                            </span>
                        )}
                        {preview.skipped.length > 0 && (
                            <span className="industry-contacts-bulk-invalid">
                                {preview.skipped.length} contato(s) já estão atualizados.
                            </span>
                        )}
                    </div>
                )}

                {sending && status && (
                    <div className="industry-contacts-bulk-progress">
                        <div className="industry-contacts-bulk-progress-header">
                            <strong>
                                Enviando {status.current} de {status.total}
                            </strong>
                            <span>{progress}%</span>
                        </div>

                        <div className="industry-contacts-bulk-progress-bar">
                            <div style={{ width: `${progress}%` }} />
                        </div>

                        <span>
                            {status.currentLaboratory
                                ? `Enviando: ${status.currentLaboratory}`
                                : "Preparando envio..."}
                        </span>

                        <span>
                            Início: {formatDateTime(status.startedAt)} •
                            Restante: {formatDuration(status.remainingMs)} •
                            Previsão: {formatDateTime(status.estimatedFinishAt)}
                        </span>

                        {status.cancelRequested && (
                            <span className="industry-contacts-bulk-invalid">
                                Cancelamento solicitado. O envio será interrompido após o e-mail atual.
                            </span>
                        )}
                    </div>
                )}

                {result && (
                    <div className="industry-contacts-bulk-result">
                        <strong>
                            {result.cancelled ? "Envio cancelado" : "Envio concluído"}
                        </strong>
                        <span>Início: {formatDateTime(result.startedAt)}</span>
                        <span>Término: {formatDateTime(result.finishedAt)}</span>
                        <span>Enviados: {result.sent} de {result.expected}</span>

                        {failures.length > 0 && (
                            <div className="industry-contacts-bulk-errors">
                                <strong>{failures.length} erro(s):</strong>
                                {failures.map((item, index) => (
                                    <span key={index}>
                                        {item.laboratory_name || item.recipient} — {item.error}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="industry-contacts-charge-actions">
                    <button
                        type="button"
                        className="industry-contacts-cancel-button"
                        onClick={sending ? handleCancel : close}
                        disabled={preparing || (sending && status?.cancelRequested)}
                    >
                        {sending ? "Cancelar envio" : "Cancelar"}
                    </button>

                    {!preview ? (
                        <button
                            type="button"
                            className="industry-contacts-save-button"
                            onClick={handlePrepare}
                            disabled={preparing || sending || selectedRows.length === 0}
                        >
                            <Mail size={15} strokeWidth={1.9} />
                            {preparing ? "Preparando..." : "Preparar cobrança"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="industry-contacts-save-button"
                            onClick={handleSend}
                            disabled={preparing || sending}
                        >
                            <Mail size={15} strokeWidth={1.9} />
                            {sending ? "Enviando..." : "Enviar em lote"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
