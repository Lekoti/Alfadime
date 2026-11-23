import React from "react";
export default function NfCodeInput({ value, manual, label, onChange, onRestore, onDetails }) {
    const invalid = Boolean(value) && !/^\d{1,20}$/.test(value.trim());
    return <div className="nf-code-field">
        <input className="nf-code-input" type="text" inputMode="numeric" maxLength={20} value={value || ""}
            onChange={(event) => onChange(event.target.value)} aria-label="Código interno da filial destinatária" aria-invalid={invalid}
            placeholder="Digitar código" title="Apenas na conferência; não altera cadastro. Editar zera os vínculos desta NF." />
        <span className={manual ? "nf-code-manual" : "nf-muted"}>{invalid ? "Use apenas dígitos (até 20)." : label}</span>
        <div className="nf-code-actions">{manual && <button type="button" onClick={onRestore}>Restaurar consulta</button>}<button type="button" onClick={onDetails}>Detalhes</button></div>
    </div>;
}
