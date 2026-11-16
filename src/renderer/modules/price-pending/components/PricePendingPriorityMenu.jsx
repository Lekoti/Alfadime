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

    useEffect(() => {
        function handleClick(event) {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const current = OPTIONS.find(option => option.value === (row.priority_label || ""));

    return (
        <div className="price-pending-priority" ref={ref}>
            {current?.value && <span className={`priority-tag ${current.className}`}>{current.label}</span>}
            <button type="button" className="priority-button" disabled={disabled} onClick={() => setOpen(!open)} title="Escolher prioridade">▾</button>
            {open && (
                <div className="priority-menu">
                    {OPTIONS.map(option => (
                        <button key={option.value || "none"} type="button" onClick={() => { setOpen(false); onSelect(row, option.value); }}>
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
