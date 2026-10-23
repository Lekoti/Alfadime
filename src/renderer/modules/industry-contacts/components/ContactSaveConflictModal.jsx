import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "../styles/contact-save-conflict.css";

export default function ContactSaveConflictModal({ request, onResolve }) {
    const [selected, setSelected] = useState([]);
    const panelRef = useRef(null);
    const conflicts = request.preview.conflicts || [];
    const conflictingBranches = [...new Set(conflicts.map((item) => item.branch))];
    const missingBranches = request.preview.requested_branches.filter((branch) => !conflictingBranches.includes(branch));
    const canUpdate = conflicts.length > 0 && conflictingBranches.every((branch) =>
        conflicts.some((item) => item.branch === branch && selected.includes(item.id)));

    useEffect(() => {
        const previous = document.activeElement;
        const panel = panelRef.current;
        panel?.focus();
        function keydown(event) {
            if (event.key === "Escape") { event.preventDefault(); onResolve(null); }
            if (event.key !== "Tab") return;
            const elements = panel?.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
            if (!elements?.length) { event.preventDefault(); return; }
            const first = elements[0];
            const last = elements[elements.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
                event.preventDefault(); first.focus();
            }
        }
        document.addEventListener("keydown", keydown);
        return () => { document.removeEventListener("keydown", keydown); previous?.focus?.(); };
    }, [onResolve]);

    function choose(action) {
        onResolve({ action, signature: request.preview.signature,
            contact_ids: action === "update" ? selected : [] });
    }

    return createPortal(
        <div className="contact-save-conflict-overlay">
            <section className="contact-save-conflict-panel" ref={panelRef} tabIndex={-1}
                role="dialog" aria-modal="true" aria-labelledby="contact-save-conflict-title">
                <header>
                    <div><h2 id="contact-save-conflict-title">Contatos já cadastrados</h2>
                        <p>{request.preview.notice}</p></div>
                    <button type="button" className="industry-contacts-close-button"
                        aria-label="Cancelar" onClick={() => onResolve(null)}><X size={16} /></button>
                </header>
                <div className="contact-save-conflict-incoming">
                    <strong>Dados que serão gravados</strong>
                    <p>{request.data.laboratory_name} · {request.data.contact_name || "Sem responsável"} · {request.data.cargo || "Sem cargo"}</p>
                    <p>{request.data.phone || "Sem telefone"} · {request.data.email || "Sem e-mail"}</p>
                    <p>Observações: {request.data.notes || "Em branco"}</p>
                </div>
                <p>Ao atualizar, os campos do formulário substituirão os dos contatos marcados, inclusive campos em branco. IDs serão preservados.</p>
                <div className="contact-save-conflict-list">
                    {conflicts.map((contact) => (
                        <label key={contact.id} className="contact-save-conflict-row">
                            <input type="checkbox" checked={selected.includes(contact.id)}
                                onChange={(event) => setSelected((current) => event.target.checked
                                    ? [...current, contact.id] : current.filter((id) => id !== contact.id))} />
                            <span><strong>{contact.branch} — {contact.contact_name || "Sem responsável"}</strong>
                                <span>{contact.cargo || "Sem cargo"} · {contact.phone || "Sem telefone"}</span>
                                <span>{contact.email || "Sem e-mail"}</span>
                                <small>Coincidência: {contact.matched_fields.join(" e ")}</small>
                            </span>
                        </label>
                    ))}
                </div>
                {missingBranches.length > 0 && <p>Sem correspondência: {missingBranches.join(", ")}. Será criado um contato em cada uma dessas filiais ao confirmar.</p>}
                {conflicts.length > 0 && <p>Para atualizar, marque pelo menos um contato por filial com correspondência. Os não marcados serão preservados. “Criar novo” adiciona uma linha em cada filial escolhida, mesmo onde já existe contato idêntico.</p>}
                <footer>
                    <button type="button" className="industry-contacts-cancel-button" onClick={() => onResolve(null)}>Cancelar</button>
                    <button type="button" className="industry-contacts-cancel-button" onClick={() => choose("create")}>Criar novo</button>
                    <button type="button" className="industry-contacts-save-button" disabled={!canUpdate}
                        onClick={() => choose("update")}>Atualizar selecionados</button>
                </footer>
            </section>
        </div>, document.body
    );
}
