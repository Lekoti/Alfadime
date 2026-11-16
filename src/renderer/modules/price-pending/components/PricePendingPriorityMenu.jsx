import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/price-pending-interactions.css";

const OPTIONS = [
    ["maxima", "Prioridade máxima"],
    ["alta", "Prioridade alta"],
    ["media", "Prioridade média"],
    ["baixa", "Prioridade baixa"],
    ["", "Sem prioridade"]
];

export default function PricePendingPriorityMenu({ row, disabled, onSelect }) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const current = OPTIONS.find(([value]) => value === (row.priority_label || ""));

    useEffect(() => {
        if (!open) return undefined;
        function closeOutside(event) {
            if (!buttonRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
        }
        function close() { setOpen(false); }
        function onKey(event) {
            if (event.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
            }
        }
        document.addEventListener("mousedown", closeOutside);
        document.addEventListener("keydown", onKey);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, true);
        return () => {
            document.removeEventListener("mousedown", closeOutside);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [open]);

    function toggle() {
        if (savingRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const height = 220;
        setPosition({
            left: Math.max(8, Math.min(rect.right - 180, window.innerWidth - 188)),
            top: Math.max(8, rect.bottom + height < window.innerHeight ? rect.bottom + 4 : rect.top - height)
        });
        setError("");
        setOpen(!open);
    }

    async function select(value) {
        if (savingRef.current) return;
        if (disabled) {
            setError("Você não tem permissão ou o módulo está em modo somente leitura.");
            return;
        }
        if (typeof onSelect !== "function") {
            setError("O salvamento de prioridade não está conectado à página.");
            return;
        }
        savingRef.current = true;
        setSaving(true); setError("");
        try {
            const result = await onSelect(row, value);
            if (!result?.success) throw new Error(result?.error || "O aplicativo não confirmou o salvamento da prioridade.");
            setOpen(false);
        } catch (failure) {
            setOpen(true);
            setError(failure?.message || "Não foi possível salvar a prioridade.");
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    return (
        <span className="pp-priority-control">
            <button ref={buttonRef} type="button" className="pp-priority-trigger"
                aria-label={`Escolher prioridade de ${row.laboratory || "indústria"}`}
                aria-haspopup="menu" aria-expanded={open} aria-busy={saving} disabled={saving} onClick={toggle}
                title={current?.[0] ? current[1] : "Escolher prioridade"}>
                {current?.[0] && <span className={`pp-priority-dot pp-priority-${current[0]}`} />}
                ▾
            </button>
            {open && createPortal(
                <div ref={menuRef} className="pp-priority-popup" role="menu" style={position}>
                    <div className="pp-priority-heading">Escolher prioridade</div>
                    {OPTIONS.map(([value, label]) => (
                        <button key={value || "none"} type="button" role="menuitemradio"
                            aria-checked={(row.priority_label || "") === value}
                            disabled={saving} onClick={() => select(value)}>
                            {value && <span className={`pp-priority-dot pp-priority-${value}`} />}
                            {label}{(row.priority_label || "") === value ? " ✓" : ""}
                        </button>
                    ))}
                    {saving && <div role="status">Salvando prioridade...</div>}
                    {disabled && <div className="pp-history-error" role="alert">Sem permissão para editar ou banco em modo somente leitura.</div>}
                    {error && <div className="pp-history-error" role="alert">{error}</div>}
                </div>, document.body
            )}
        </span>
    );
}
