import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    createCorrection,
    getCorrectableFields
} from "../../product-corrections/services/product-corrections.service";

function getDisplayValue(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }

    return String(value);
}

function CorrectionFormModal({
    product,
    preselectedField,
    onClose,
    onSaved
}) {
    const [fields, setFields] = useState([]);
    const [fieldName, setFieldName] = useState(
        preselectedField || ""
    );
    const [newValue, setNewValue] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        setFieldName(
            preselectedField || ""
        );
    }, [preselectedField]);

    useEffect(() => {
        async function loadFields() {
            try {
                const result =
                    await getCorrectableFields();

                setFields(
                    Array.isArray(result)
                        ? result
                        : []
                );

                if (
                    !preselectedField &&
                    Array.isArray(result) &&
                    result.length > 0
                ) {
                    setFieldName(
                        result[0].key
                    );
                }
            } catch (loadError) {
                console.error(loadError);

                setError(
                    "Nao foi possivel carregar os campos permitidos."
                );
            }
        }

        loadFields();
    }, [preselectedField]);

    const selectedField = useMemo(
        () =>
            fields.find(
                (field) =>
                    field.key === fieldName
            ),
        [
            fields,
            fieldName
        ]
    );

    const currentValue = getDisplayValue(
        product?.[fieldName]
    );

    useEffect(() => {
        setNewValue("");
    }, [
        fieldName,
        product?.id
    ]);

    if (!product) {
        return null;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");

            await createCorrection({
                product_id: product.id,
                field_name: fieldName,
                new_value: newValue
            });

            onSaved();
            onClose();
        } catch (saveError) {
            console.error(saveError);

            setError(
                saveError.message ||
                "Nao foi possivel salvar a correcao."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="correction-modal-backdrop"
            onMouseDown={onClose}
        >
            <section
                className="correction-modal correction-modal-simple"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <header className="correction-modal-header">
                    <div>
                        <span>
                            Correcao de cadastro
                        </span>

                        <h2>
                            {selectedField?.label ||
                                "Campo do produto"}
                        </h2>

                        <p>
                            Filial: {product.branch} |
                            Cod: {product.code} |
                            EAN: {product.ean || "-"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                    >
                        Fechar
                    </button>
                </header>

                <div className="correction-modal-warning">
                    O valor sera registrado no historico
                    do Alfadime. A tabela continuara mostrando
                    o valor da planilha ate o sistema interno
                    atualizar o arquivo Excel.
                </div>

                <form
                    className="correction-form"
                    onSubmit={handleSubmit}
                >
                    <div className="correction-values">
                        <div>
                            <span>
                                Campo selecionado
                            </span>

                            <strong>
                                {selectedField?.label || "-"}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Valor atual da planilha
                            </span>

                            <strong>
                                {currentValue || "-"}
                            </strong>
                        </div>
                    </div>

                    <div className="correction-form-row">
                        <label htmlFor="correction-new-value">
                            Novo valor correto
                        </label>

                        <input
                            id="correction-new-value"
                            type="text"
                            value={newValue}
                            onChange={(event) =>
                                setNewValue(
                                    event.target.value
                                )
                            }
                            placeholder="Digite o valor correto"
                            disabled={saving}
                            autoFocus
                            required
                        />
                    </div>

                    {error && (
                        <div className="correction-form-error">
                            {error}
                        </div>
                    )}

                    <footer className="correction-form-actions">
                        <button
                            type="button"
                            className="correction-close-button"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="correction-save-button"
                            disabled={
                                saving ||
                                !fieldName ||
                                !newValue.trim()
                            }
                        >
                            {saving
                                ? "Salvando..."
                                : "Registrar correcao"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}

export default CorrectionFormModal;
