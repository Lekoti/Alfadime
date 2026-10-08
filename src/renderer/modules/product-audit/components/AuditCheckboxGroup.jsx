function AuditCheckboxGroup({
    title,
    options = [],
    selectedValues = [],
    onChange,
    emptyMessage = "Nenhuma opcao encontrada."
}) {
    function toggleValue(value) {
        const stringValue = String(value);

        if (selectedValues.includes(stringValue)) {
            onChange(
                selectedValues.filter(
                    (item) => item !== stringValue
                )
            );

            return;
        }

        onChange([
            ...selectedValues,
            stringValue
        ]);
    }

    function selectAll() {
        onChange(
            options.map((option) =>
                String(option.value)
            )
        );
    }

    function clearAll() {
        onChange([]);
    }

    return (
        <section className="audit-checkbox-group">
            <header>
                <strong>{title}</strong>

                <div>
                    <button
                        type="button"
                        onClick={selectAll}
                    >
                        Todos
                    </button>

                    <button
                        type="button"
                        onClick={clearAll}
                    >
                        Limpar
                    </button>
                </div>
            </header>

            <div className="audit-checkbox-options">
                {options.length === 0 && (
                    <span className="audit-checkbox-empty">
                        {emptyMessage}
                    </span>
                )}

                {options.map((option) => {
                    const value = String(
                        option.value
                    );

                    return (
                        <label key={value}>
                            <input
                                type="checkbox"
                                checked={
                                    selectedValues.includes(
                                        value
                                    )
                                }
                                onChange={() =>
                                    toggleValue(value)
                                }
                            />

                            <span>
                                {option.label}
                            </span>
                        </label>
                    );
                })}
            </div>
        </section>
    );
}

export default AuditCheckboxGroup;
