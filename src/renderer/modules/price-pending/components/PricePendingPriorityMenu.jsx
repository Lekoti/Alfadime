import { useEffect, useRef, useState } from "react";

const OPTIONS = [
    { value: "maxima", label: "Prioridade maxima", className: "priority-maxima" },
    { value: "alta", label: "Prioridade alta", className: "priority-alta" },
    { value: "media", label: "Prioridade media", className: "priority-media" },
    { value: "baixa", label: "Prioridade baixa", className: "priority-baixa" },
    { value: "", label: "Sem prioridade", className: "priority-none" }
];

export default function PricePendingPriorityMenu({ row, disabled, onSelect }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const current = OPTIONS.find((option) => option.value === (row.priority_label || ""));

    useEffect(() => {
        function handleOutside(event) {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    return (
        <div className="price-pending-priority" ref={ref}>
            {current?.value && <span className={`priority-tag ${current.className}`}>{current.label}</span>}
            <button
                type="button"
                className="priority-button"
                disabled={disabled}
                title={disabled ? "Sem permissao para alterar a prioridade" : "Escolher prioridade"}
                onClick={() => setOpen(!open)}
            >
                ▾
            </button>
            {open && (
                <div className="priority-menu">
                    <strong className="priority-menu-title">Escolher prioridade</strong>
                    {OPTIONS.map((option) => (
                        <button
                            key={option.value || "none"}
                            type="button"
                            onClick={() => { setOpen(false); onSelect(row, option.value); }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
