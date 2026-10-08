function AuditMultiSelect({
    label,
    values = [],
    selectedValues = [],
    onChange,
    placeholder = "Todos"
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
            values.map((value) =>
                String(value)
            )
        );
    }

    function clearAll() {
        onChange([]);
    }

    const selectedCount =
        selectedValues.length;

    return (
        <details className="audit-multi-select">
            <summary>
                <span>{label}</span>

                <strong>
                    {selectedCount
                        ? selectedCount
                        : placeholder}
                </strong>
            </summary>

            <div className="audit-multi-select-panel">
                <div className="audit-multi-select-actions">
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

                <div className="audit-multi-select-options">
                    {values.length === 0 && (
                        <span className="audit-no-options">
                            Nenhuma opcao encontrada.
                        </span>
                    )}

                    {values.map((value) => {
                        const stringValue = String(value);

                        return (
                            <label
                                key={stringValue}
                            >
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedValues.includes(
                                            stringValue
                                        )
                                    }
                                    onChange={() =>
                                        toggleValue(
                                            stringValue
                                        )
                                    }
                                />

                                <span>
                                    {stringValue}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>
        </details>
    );
}

export default AuditMultiSelect;
