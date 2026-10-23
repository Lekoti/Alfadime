import { useEffect, useMemo, useState } from "react";
import { Mail, X } from "lucide-react";
import {
    prepareFavoriteCharge,
    sendFavoriteCharge,
    getChargeStatus,
    cancelCharge
} from "../services/contacts.service";
import {
    CONTACT_CHARGE_ITEM_STATUS,
    CONTACT_CHARGE_ITEM_STATUS_LABELS
} from "../constants/contacts.constants";


function formatDuration(ms) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;


    return minutes > 0
        ? `${minutes}min ${remainingSeconds}s`
        : `${remainingSeconds}s`;
}


function formatDateTime(value) {
    if (!value) return "—";


    const date = new Date(value);


    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString("pt-BR");
}


export default function ContactChargeModal({
    open,
    favorite,
    contacts = [],
    onClose,
    onCompleted
}) {
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [search, setSearch] = useState("");
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState(null);
    const [result, setResult] = useState(null);
    const [preparing, setPreparing] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");


    useEffect(() => {
        if (!open) return;


        setSelectedContacts(
            favorite?.save_recipients
                ? (favorite.recipients || []).map((item) => item.contact_id)
                : []
        );
        setPreview(null);
        setStatus(null);
        setResult(null);
        setError("");
        setSuccess("");
        setSearch("");
    }, [open, favorite]);


    useEffect(() => {
        if (!preview?.preview_token || !sending) return;


        const intervalId = setInterval(async () => {
            try {
                const nextStatus = await getChargeStatus({
                    preview_token: preview.preview_token
                });


                setStatus(nextStatus);
            } catch {
                // Mantém o último status conhecido.
            }
        }, 1000);


        return () => clearInterval(intervalId);
    }, [preview?.preview_token, sending]);


    const availableContacts = useMemo(() => {
        const industryCodes = new Set(
            (favorite?.industries || []).map(
                (item) => item.industry_global_code
            )
        );


        const industryContacts = contacts.filter((contact) => {
            const code = contact.industry_global_code || contact.global_code;
            return code && industryCodes.has(code);
        });


        const savedContacts = favorite?.save_recipients
            ? contacts.filter((contact) =>
                (favorite.recipients || []).some(
                    (recipient) => recipient.contact_id === (contact.contact_id || contact.id)
                )
            )
            : [];


        const merged = new Map();


        [...savedContacts, ...industryContacts, ...contacts].forEach((contact) => {
            const id = contact.contact_id || contact.id;
            if (id && !merged.has(id)) merged.set(id, contact);
        });


        return Array.from(merged.values());
    }, [contacts, favorite]);


    const filteredContacts = useMemo(() => {
        const term = search.trim().toLocaleLowerCase("pt-BR");


        if (!term) return availableContacts;


        return availableContacts.filter((contact) => {
            const values = [
                contact.laboratory_name,
                contact.contact_name,
                contact.email,
                contact.branch
            ];


            return values
                .filter(Boolean)
                .some((value) =>
                    String(value).toLocaleLowerCase("pt-BR").includes(term)
                );
        });
    }, [availableContacts, search]);


    const selectedContactIds = new Set(selectedContacts);


    function toggleContact(contact) {
        const id = contact.contact_id || contact.id;


        setSelectedContacts((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    }


    function close() {
        setPreview(null);
        setStatus(null);
        setResult(null);
        setError("");
        setSuccess("");
        onClose();
    }


    async function handlePrepare() {
        setPreparing(true);
        setError("");
        setSuccess("");
        setResult(null);
        setStatus(null);


        try {
            const response = await prepareFavoriteCharge({
                favorite_id: favorite.id,
                contacts: availableContacts
                    .filter((contact) =>
                        selectedContactIds.has(contact.contact_id || contact.id)
                    )
                    .map((contact) => ({
                        contact_id: contact.contact_id || contact.id,
                        laboratory_name: contact.laboratory_name,
                        laboratory_key: contact.laboratory_key,
                        branch: contact.branch,
                        email: contact.email
                    }))
            });


            setPreview(response);
        } catch (prepareError) {
            setError(
                prepareError?.message ||
                "Não foi possível preparar a cobrança."
            );
        } finally {
            setPreparing(false);
        }
    }


    async function handleSend() {
        if (!preview?.preview_token) return;


        const confirmed = window.confirm(
            `Confirma o envio de ${preview.valid} e-mail(s)?`
        );


        if (!confirmed) return;


        setSending(true);
        setError("");
        setSuccess("");
        setResult(null);


        try {
            const response = await sendFavoriteCharge({
                preview_token: preview.preview_token
            });


            setResult(response);
            setSuccess(
                response.cancelled
                    ? `Envio cancelado. ${response.sent} de ${response.expected} e-mail(s) foram enviados.`
                    : `${response.sent} de ${response.expected} e-mail(s) enviados.`
            );
            setPreview(null);
            setStatus(null);
            onCompleted?.(response);
        } catch (sendError) {
            setError(
                sendError?.message ||
                "Não foi possível enviar a cobrança."
            );
        } finally {
            setSending(false);
        }
    }


    async function handleCancel() {
        if (!preview?.preview_token) return;


        try {
            await cancelCharge({
                preview_token: preview.preview_token
            });


            setSuccess("Cancelamento solicitado.");
        } catch (cancelError) {
            setError(
                cancelError?.message ||
                "Não foi possível solicitar o cancelamento."
            );
        }
    }


    if (!open) return null;


    const progress = status?.total
        ? Math.round((status.current / status.total) * 100)
        : 0;


    const failures = (result?.results || []).filter(
        (item) => !item.success
    );


    return (
        <div className="contacts-charge-overlay" role="dialog" aria-modal="true">
            <div className="contacts-charge-modal">
                <header className="contacts-charge-header">
                    <div>
                        <h2>Cobrança — {favorite?.name}</h2>


                        <span>
                            {selectedContacts.length} contato(s) selecionado(s)
                        </span>
                    </div>


                    <button
                        type="button"
                        className="contacts-charge-close-button"
                        onClick={close}
                        disabled={preparing || sending}
                        aria-label="Fechar"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>


                {!preview && (
                    <section className="contacts-charge-selection">
                        <input
                            type="text"
                            placeholder="Buscar contato"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />


                        <div className="contacts-charge-contact-list">
                            {filteredContacts.map((contact) => {
                                const id = contact.contact_id || contact.id;


                                return (
                                    <button
                                        type="button"
                                        key={id}
                                        className={
                                            selectedContactIds.has(id) ? "selected" : ""
                                        }
                                        onClick={() => toggleContact(contact)}
                                    >
                                        <strong>
                                            {contact.laboratory_name}
                                        </strong>


                                        <span>
                                            {contact.contact_name || "Sem contato"} • {contact.email || "Sem e-mail"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}


                {preview && (
                    <section className="contacts-charge-summary">
                        <h3>Resumo do envio</h3>


                        <div className="contacts-charge-summary-grid">
                            <span>
                                <strong>Selecionados:</strong> {preview.selected}
                            </span>


                            <span>
                                <strong>E-mails válidos:</strong> {preview.valid}
                            </span>


                            <span>
                                <strong>Inválidos:</strong> {preview.invalid.length}
                            </span>


                            <span>
                                <strong>Duplicados:</strong> {preview.duplicates.length}
                            </span>


                            <span>
                                <strong>Anexos:</strong> {preview.attachments.length}
                            </span>
                        </div>


                        <div className="contacts-charge-preview-email">
                            <strong>{preview.subject}</strong>


                            <pre>
                                {preview.body}
                            </pre>
                        </div>
                    </section>
                )}


                {sending && status && (
                    <section className="contacts-charge-progress">
                        <div className="contacts-charge-progress-header">
                            <strong>
                                Enviando {status.current} de {status.total}
                            </strong>


                            <span>{progress}%</span>
                        </div>


                        <div className="contacts-charge-progress-bar">
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
                    </section>
                )}


                {result && (
                    <section className="contacts-charge-result">
                        <h3>
                            {result.cancelled ? "Envio cancelado" : "Envio concluído"}
                        </h3>


                        <div className="contacts-charge-result-grid">
                            <span>
                                <strong>Enviados:</strong> {result.sent}
                            </span>


                            <span>
                                <strong>Erros:</strong> {result.failed}
                            </span>


                            <span>
                                <strong>Ignorados:</strong> {result.ignored}
                            </span>


                            <span>
                                <strong>Cancelados:</strong> {result.cancelled}
                            </span>
                        </div>


                        {failures.length > 0 && (
                            <div className="contacts-charge-errors">
                                <strong>
                                    {failures.length} envio(s) com erro:
                                </strong>


                                {failures.map((item, index) => (
                                    <span key={index}>
                                        {item.laboratory_name || item.recipient} — {item.error}
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>
                )}


                {error && (
                    <div className="contacts-charge-message error">
                        {error}
                    </div>
                )}


                {success && (
                    <div className="contacts-charge-message success">
                        {success}
                    </div>
                )}


                <footer className="contacts-charge-actions">
                    <button
                        type="button"
                        className="contacts-charge-cancel-button"
                        onClick={sending ? handleCancel : close}
                        disabled={preparing || (sending && status?.cancelRequested)}
                    >
                        {sending ? "Cancelar envio" : "Fechar"}
                    </button>


                    {!preview ? (
                        <button
                            type="button"
                            className="contacts-charge-send-button"
                            onClick={handlePrepare}
                            disabled={preparing || sending || selectedContacts.length === 0}
                        >
                            <Mail size={15} strokeWidth={1.9} />


                            {preparing ? "Preparando..." : "Preparar cobrança"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="contacts-charge-send-button"
                            onClick={handleSend}
                            disabled={preparing || sending}
                        >
                            <Mail size={15} strokeWidth={1.9} />


                            {sending ? "Enviando..." : "Enviar cobrança"}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
