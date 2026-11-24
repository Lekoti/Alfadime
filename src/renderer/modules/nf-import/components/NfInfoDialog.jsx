import React, { useEffect, useRef } from "react";
export default function NfInfoDialog({ open, title, onClose, children }) {
    const ref = useRef(null);
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        else if (!open && dialog.open) dialog.close();
    }, [open]);
    return <dialog ref={ref} className="nf-info-dialog" aria-label={title}
        onCancel={(event) => { event.preventDefault(); onClose?.(); }} onClose={() => { if (open) onClose?.(); }}>
        <header className="nf-info-dialog-heading"><h2>{title}</h2><button type="button" autoFocus onClick={() => onClose?.()}>Fechar</button></header>
        <div className="nf-info-dialog-body">{children}</div>
    </dialog>;
}
