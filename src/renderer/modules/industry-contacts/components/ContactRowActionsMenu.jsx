import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

export default function ContactRowActionsMenu({
    row, canEdit = true, canDelete = true, canCharge = true,
    disabled = false, onEdit, onDelete, onCharge, onChargeFavorite
}) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState(null);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const restoreFocus = useRef(false);

    useEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    useLayoutEffect(() => {
        if (!open) {
            setPosition(null);
            if (restoreFocus.current) buttonRef.current?.focus();
            restoreFocus.current = false;
            return;
        }
        const button = buttonRef.current;
        const menu = menuRef.current;
        if (!button || !menu) return;
        const rect = button.getBoundingClientRect();
        const bounds = menu.getBoundingClientRect();
        const margin = 8;
        const below = window.innerHeight - rect.bottom - margin - 6;
        const above = rect.top - margin - 6;
        const useAbove = bounds.height > below && above > below;
        const available = Math.max(0, useAbove ? above : below);
        const height = Math.min(bounds.height, available);
        const top = useAbove ? rect.top - height - 6 : rect.bottom + 6;
        const left = Math.max(margin, Math.min(rect.right - bounds.width,
            window.innerWidth - bounds.width - margin));
        setPosition({ top: Math.max(margin, top), left, maxHeight: available });
        menu.querySelector('button:not(:disabled)')?.focus();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function outside(event) {
            if (!buttonRef.current?.contains(event.target) &&
                !menuRef.current?.contains(event.target)) setOpen(false);
        }
        function keydown(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                restoreFocus.current = true;
                setOpen(false);
            }
            if (event.key === "Tab") setOpen(false);
        }
        function closeOnMove(event) {
            if (event.type === "scroll" && menuRef.current?.contains(event.target)) return;
            setOpen(false);
        }
        document.addEventListener("mousedown", outside);
        document.addEventListener("keydown", keydown);
        window.addEventListener("scroll", closeOnMove, true);
        window.addEventListener("resize", closeOnMove);
        return () => {
            document.removeEventListener("mousedown", outside);
            document.removeEventListener("keydown", keydown);
            window.removeEventListener("scroll", closeOnMove, true);
            window.removeEventListener("resize", closeOnMove);
        };
    }, [open]);

    function execute(action) {
        restoreFocus.current = true;
        setOpen(false);
        if (typeof action === "function") action(row);
    }

    const actions = [
        { visible: canCharge, action: onCharge, label: "Cobrar preços ou pendências" },
        { visible: canCharge, action: onChargeFavorite, label: "Cobrar por favorito" },
        { visible: canEdit, action: onEdit, label: "Editar contato" },
        { visible: canDelete, action: onDelete, label: "Excluir contato", danger: true }
    ].filter((item) => item.visible);

    return (
        <div className="contacts-row-actions">
            <button ref={buttonRef} type="button" className="contacts-actions-button"
                disabled={disabled} aria-expanded={open} title="Ações"
                onClick={() => setOpen((current) => !current)}>
                <MoreHorizontal size={15} strokeWidth={2} />
                Ações
            </button>
            {open && createPortal(
                <div ref={menuRef} className="contacts-actions-menu"
                    aria-label="Ações do contato"
                    style={{ position: "fixed", top: position?.top ?? 0,
                        left: position?.left ?? 0, right: "auto", zIndex: 900,
                        visibility: position ? "visible" : "hidden",
                        width: "min(250px, calc(100vw - 16px))", minWidth: 0,
                        maxHeight: position?.maxHeight ?? "calc(100vh - 16px)",
                        overflowY: "auto", boxSizing: "border-box" }}>
                    {actions.map((item) => (
                        <button key={item.label} type="button"
                            className={item.danger ? "danger" : undefined}
                            style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}
                            onClick={() => execute(item.action)}>
                            {item.label}
                        </button>
                    ))}
                </div>, document.body
            )}
        </div>
    );
}
