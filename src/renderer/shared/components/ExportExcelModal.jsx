import {
    useEffect,
    useRef,
    useState
} from "react";

import "./ExportExcelModal.css";

function ExportExcelModal({
    open,
    title,
    moduleKey,
    availableColumns,
    onClose,
    onExport
}) {
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const savingRef = useRef(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        let mounted = true;
        const definitions = Array.isArray(availableColumns)
            ? availableColumns
            : [];

        function getDefaultColumns() {
            return definitions.map((column) => ({
                ...column,
                selected: column.defaultSelected !== false
            }));
        }

        async function loadPreference() {
            try {
                setLoading(true);
                setError("");
                setColumns([]);

                const preference =
                    await window.alfadime.export.getPreference(moduleKey);

                let configuredColumns = [];

                if (preference?.columns_json) {
                    try {
                        const parsed = JSON.parse(preference.columns_json);
                        configuredColumns = Array.isArray(parsed) ? parsed : [];
                    } catch (parseError) {
                        console.error(parseError);
                    }
                }

                const definitionsByKey = new Map(
                    definitions.map((column) => [column.key, column])
                );
                const restoredColumns = [];
                const restoredKeys = new Set();

                for (const savedColumn of configuredColumns) {
                    const currentColumn = definitionsByKey.get(savedColumn?.key);

                    if (!currentColumn || restoredKeys.has(currentColumn.key)) {
                        continue;
                    }

                    restoredKeys.add(currentColumn.key);
                    restoredColumns.push({
                        ...currentColumn,
                        selected: typeof savedColumn.selected === "boolean"
                            ? savedColumn.selected
                            : currentColumn.defaultSelected !== false
                    });
                }

                const missingColumns = definitions.filter(
                    (column) => !restoredKeys.has(column.key)
                );

                const result = restoredColumns.length
                    ? [
                        ...restoredColumns,
                        ...missingColumns.map((column) => ({
                            ...column,
                            selected: false
                        }))
                    ]
                    : getDefaultColumns();

                if (mounted) {
                    setColumns(result);
                }
            } catch (loadError) {
                console.error(loadError);

                if (mounted) {
                    setColumns(getDefaultColumns());
                    setError(
                        "Não foi possível carregar as preferências. A configuração padrão foi carregada."
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadPreference();

        return () => {
            mounted = false;
        };
    }, [open, moduleKey, availableColumns]);

    if (!open) {
        return null;
    }

    function getColumnLabel(column) {
        if (moduleKey !== "price-pending") {
            return column.label;
        }

        const groupLabels = {
            env_precos: "Preços Recebidos",
            env_pend: "Pendências Recebidas",
            precos_ok: "Preços Atualizados",
            pendencias_ok: "Pendências Atualizadas"
        };
        const fixedLabels = {
            industry_global_code: "Código Global",
            laboratory: "Laboratórios",
            observation: "Observação"
        };

        if (Object.prototype.hasOwnProperty.call(fixedLabels, column.key)) {
            return fixedLabels[column.key];
        }

        const match = /^(env_precos|env_pend|precos_ok|pendencias_ok)_(dpr|ams|dmt|dms|dsc)$/.exec(
            String(column.key ?? "")
        );

        return match
            ? `${groupLabels[match[1]]} — ${match[2].toUpperCase()}`
            : column.label;
    }

    function closeModal() {
        if (!savingRef.current) {
            onClose();
        }
    }

    function toggleColumn(index) {
        if (loading || savingRef.current) {
            return;
        }

        setColumns((currentColumns) =>
            currentColumns.map((column, currentIndex) =>
                currentIndex === index
                    ? { ...column, selected: !column.selected }
                    : column
            )
        );
    }

    function handleColumnDragStart(event, index) {
        if (loading || savingRef.current) {
            event.preventDefault();
            return;
        }

        event.dataTransfer.setData("text/plain", String(index));
        event.dataTransfer.effectAllowed = "move";
    }

    function handleColumnDragOver(event) {
        if (loading || savingRef.current) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }

    function handleColumnDrop(event, dropIndex) {
        event.preventDefault();

        if (loading || savingRef.current) {
            return;
        }

        const rawIndex = event.dataTransfer.getData("text/plain");

        if (!rawIndex.trim()) {
            return;
        }

        const draggedIndex = Number(rawIndex);

        if (!Number.isInteger(draggedIndex) || draggedIndex === dropIndex) {
            return;
        }

        setColumns((currentColumns) => {
            if (draggedIndex < 0 || draggedIndex >= currentColumns.length) {
                return currentColumns;
            }

            const nextColumns = [...currentColumns];
            const [moved] = nextColumns.splice(draggedIndex, 1);
            nextColumns.splice(dropIndex, 0, moved);
            return nextColumns;
        });
    }

    function selectAll() {
        if (loading || savingRef.current) {
            return;
        }
        setColumns((currentColumns) =>
            currentColumns.map((column) => ({ ...column, selected: true }))
        );
    }

    function clearAll() {
        if (loading || savingRef.current) {
            return;
        }
        setColumns((currentColumns) =>
            currentColumns.map((column) => ({ ...column, selected: false }))
        );
    }

    async function handleExport() {
        if (loading || savingRef.current) {
            return;
        }

        const selectedColumns = columns.filter((column) => column.selected);

        if (!selectedColumns.length) {
            setError("Selecione ao menos uma coluna.");
            return;
        }

        try {
            savingRef.current = true;
            setSaving(true);
            setError("");

            await window.alfadime.export.savePreference(moduleKey, columns);
            const result = await onExport(selectedColumns);

            if (!result?.cancelled) {
                onClose();
            }
        } catch (exportError) {
            console.error(exportError);
            setError(exportError.message || "Não foi possível exportar o Excel.");
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    return (
        <div className="export-modal-backdrop" onMouseDown={closeModal}>
            <section
                className="export-modal"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="export-modal-header">
                    <div>
                        <span>Configuração de exportação</span>
                        <h2>{title}</h2>
                        <p>Escolha as colunas e defina a ordem do arquivo Excel.</p>
                    </div>
                    <button type="button" onClick={closeModal} disabled={saving}>
                        Fechar
                    </button>
                </header>

                <div className="export-modal-toolbar">
                    <button type="button" onClick={selectAll} disabled={loading || saving}>
                        Selecionar todas
                    </button>
                    <button type="button" onClick={clearAll} disabled={loading || saving}>
                        Limpar seleção
                    </button>
                </div>

                {loading ? (
                    <div className="export-modal-loading">
                        Carregando configuração...
                    </div>
                ) : (
                    <div className="export-columns-list">
                        {columns.map((column, index) => (
                            <div
                                key={column.key}
                                className={column.selected
                                    ? "export-column-row selected"
                                    : "export-column-row"}
                                draggable={!saving}
                                onDragStart={(event) => handleColumnDragStart(event, index)}
                                onDragOver={handleColumnDragOver}
                                onDrop={(event) => handleColumnDrop(event, index)}
                            >
                                <span
                                    className="export-column-drag-handle"
                                    title="Arraste para reordenar"
                                >
                                    ⋮⋮
                                </span>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(column.selected)}
                                        onChange={() => toggleColumn(index)}
                                        disabled={saving}
                                    />
                                    <span>{getColumnLabel(column)}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                )}

                {error && <div className="export-modal-error">{error}</div>}

                <footer className="export-modal-actions">
                    <button
                        type="button"
                        className="export-modal-cancel"
                        onClick={closeModal}
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="export-modal-confirm"
                        onClick={handleExport}
                        disabled={loading || saving}
                    >
                        {saving ? "Gerando Excel..." : "Gerar Excel"}
                    </button>
                </footer>
            </section>
        </div>
    );
}

export default ExportExcelModal;
