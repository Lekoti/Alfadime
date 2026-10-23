import { Save, X } from "lucide-react";
import { INDUSTRY_CONTACT_BRANCHES } from "../constants/industry-contacts.constants";


export default function IndustryContactsForm({
    form, saving = false, onChange, onSubmit, onCancel
}) {
    const editing = Boolean(form.id);
    const mode = editing ? "single" : (form.branch_mode || "single");
    const selected = Array.isArray(form.branches) ? form.branches : [];

    function update(field, value) {
        onChange({ ...form, [field]: value });
    }

    function toggleBranch(branch) {
        update("branches", selected.includes(branch)
            ? selected.filter((value) => value !== branch)
            : [...selected, branch]);
    }

    function submit(event) {
        if (mode === "selected" && selected.length === 0) {
            event.preventDefault();
            window.alert("Selecione pelo menos uma filial.");
            return;
        }
        onSubmit(event);
    }

    return (
        <section className="industry-contacts-form-panel">
            <div className="industry-contacts-panel-header">
                <div>
                    <h2>{editing ? "Editar contato" : "Cadastro de contato"}</h2>
                    <span>{editing
                        ? "A edição altera somente este cadastro."
                        : "Escolha as filiais que receberão o mesmo contato."}</span>
                </div>
                <button type="button" className="industry-contacts-close-button"
                    onClick={onCancel} disabled={saving} aria-label="Fechar cadastro">
                    <X size={16} strokeWidth={1.8} />
                </button>
            </div>

            <form className="industry-contacts-form-grid" onSubmit={submit}>
                <label>Indústria
                    <input value={form.laboratory_name || ""} disabled={saving}
                        onChange={(event) => update("laboratory_name", event.target.value)} required />
                </label>
                {!editing && (
                    <label>Abrangência
                        <select value={mode} disabled={saving}
                            onChange={(event) => update("branch_mode", event.target.value)}>
                            <option value="single">Uma filial</option>
                            <option value="selected">Filiais selecionadas</option>
                            <option value="all">Todas as filiais</option>
                        </select>
                    </label>
                )}
                {mode === "single" && (
                    <label>Filial
                        <select value={form.branch || ""} disabled={saving} required
                            onChange={(event) => update("branch", event.target.value)}>
                            <option value="">Selecione</option>
                            {INDUSTRY_CONTACT_BRANCHES.map((branch) => (
                                <option key={branch} value={branch}>{branch}</option>
                            ))}
                        </select>
                    </label>
                )}
                {[
                    ["contact_name", "Nome do responsável", "text"],
                    ["cargo", "Cargo", "text"],
                    ["phone", "Telefone", "tel"],
                    ["email", "E-mail", "email"]
                ].map(([field, label, type]) => (
                    <label key={field}>{label}
                        <input type={type} value={form[field] || ""} disabled={saving}
                            onChange={(event) => update(field, event.target.value)} />
                    </label>
                ))}
                {!editing && mode !== "single" && (
                    <fieldset className="contacts-branch-selection" disabled={saving}>
                        <legend>{mode === "all" ? "Filiais incluídas" : "Selecione as filiais"}</legend>
                        <div>
                            {INDUSTRY_CONTACT_BRANCHES.map((branch) => (
                                <label key={branch}>
                                    <input type="checkbox" checked={mode === "all" || selected.includes(branch)}
                                        disabled={mode === "all" || saving}
                                        onChange={() => toggleBranch(branch)} />
                                    {branch}
                                </label>
                            ))}
                        </div>
                        <p>Se houver telefone ou e-mail correspondente, você poderá escolher atualizar os contatos ou criar novos.</p>
                    </fieldset>
                )}
                <label className="industry-contacts-notes-field">Observações
                    <textarea value={form.notes || ""} disabled={saving}
                        onChange={(event) => update("notes", event.target.value)} />
                </label>
                <div className="industry-contacts-form-actions">
                    <button type="button" className="industry-contacts-cancel-button"
                        onClick={onCancel} disabled={saving}>Cancelar</button>
                    <button type="submit" className="industry-contacts-save-button" disabled={saving}>
                        <Save size={15} strokeWidth={2} />
                        {saving ? "Salvando..." : "Salvar contato"}
                    </button>
                </div>
            </form>
        </section>
    );
}
