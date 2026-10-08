import {
    Save,
    X
} from "lucide-react";



function IndustryContactsForm({
    form,
    saving,
    onChange,
    onSubmit,
    onCancel
}) {
    function update(field, value) {
        onChange({
            ...form,
            [field]: value
        });
    }



    return (
        <section className="industry-contacts-form-panel">
            <div className="industry-contacts-panel-header">
                <div>
                    <h2>Cadastro de contato</h2>

                    <span>
                        Informe os dados do responsável.
                    </span>
                </div>

                <button
                    type="button"
                    className="industry-contacts-close-button"
                    onClick={onCancel}
                    title="Fechar cadastro"
                    aria-label="Fechar cadastro"
                >
                    <X
                        size={16}
                        strokeWidth={1.8}
                    />
                </button>
            </div>

            <form
                className="industry-contacts-form-grid"
                onSubmit={onSubmit}
            >
                <label>
                    Laboratório

                    <input
                        value={form.laboratory_name}
                        onChange={(event) =>
                            update(
                                "laboratory_name",
                                event.target.value
                            )
                        }
                        required
                    />
                </label>

                <label>
                    Filial

                    <input
                        value={form.branch}
                        onChange={(event) =>
                            update(
                                "branch",
                                event.target.value
                            )
                        }
                        placeholder="Ex.: DPR"
                    />
                </label>

                <label>
                    Nome do responsável

                    <input
                        value={form.contact_name}
                        onChange={(event) =>
                            update(
                                "contact_name",
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    Cargo

                    <input
                        value={form.cargo}
                        onChange={(event) =>
                            update(
                                "cargo",
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    Telefone

                    <input
                        value={form.phone}
                        onChange={(event) =>
                            update(
                                "phone",
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    E-mail

                    <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                            update(
                                "email",
                                event.target.value
                            )
                        }
                    />
                </label>

                <label className="industry-contacts-notes-field">
                    Observações

                    <textarea
                        value={form.notes}
                        onChange={(event) =>
                            update(
                                "notes",
                                event.target.value
                            )
                        }
                    />
                </label>

                <div className="industry-contacts-form-actions">
                    <button
                        type="button"
                        className="industry-contacts-cancel-button"
                        onClick={onCancel}
                        disabled={saving}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="industry-contacts-save-button"
                        disabled={saving}
                    >
                        <Save
                            size={15}
                            strokeWidth={2}
                        />

                        {
                            saving
                                ? "Salvando..."
                                : "Salvar contato"
                        }
                    </button>
                </div>
            </form>
        </section>
    );
}



export default IndustryContactsForm;