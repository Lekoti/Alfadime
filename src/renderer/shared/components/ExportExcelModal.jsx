import {
    useEffect,
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

    useEffect(() => {
        if (!open) {
            return;
        }

        let mounted = true;

        async function loadPreference() {
            try {
                setLoading(true);
                setError("");

                const preference =
                    await window.alfadime.export.getPreference(
                        moduleKey
                    );

                let configuredColumns = [];

                if (preference?.columns_json) {
                    try {
                        configuredColumns = JSON.parse(
                            preference.columns_json
                        );
                    } catch (parseError) {
                        console.error(parseError);
                    }
                }

                const validConfiguredColumns =
                    configuredColumns.filter(
                        (savedColumn) =>
                            availableColumns.some(
                                (column) =>
                                    column.key ===
                                    savedColumn.key
                            )
                    );

                const missingColumns =
                    availableColumns.filter(
                        (column) =>
                            !validConfiguredColumns.some(
                                (savedColumn) =>
                                    savedColumn.key ===
                                    column.key
                            )
                    );

                const result =
                    validConfiguredColumns.length
                        ? [
                            ...validConfiguredColumns,
                            ...missingColumns.map(
                                (column) => ({
                                    ...column,
                                    selected: false
                                })
                            )
                        ]
                        : availableColumns.map(
                            (column) => ({
                                ...column,
                                selected:
                                    column.defaultSelected !== false
                            })
                        );

                if (mounted) {
                    setColumns(result);
                }
            } catch (loadError) {
                console.error(loadError);

                if (mounted) {
                    setError(
                        "Nao foi possivel carregar as preferencias de exportacao."
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
    }, [
        open,
        moduleKey,
        availableColumns
    ]);

    if (!open) {
        return null;
    }

    function toggleColumn(index) {
        setColumns((currentColumns) =>
            currentColumns.map(
                (column, currentIndex) =>
                    currentIndex === index
                        ? {
                            ...column,
                            selected:
                                !column.selected
                        }
                        : column
            )
        );
    }

    function handleColumnDragStart(event, index) {
        event.dataTransfer.setData("text/plain", String(index));
        event.dataTransfer.effectAllowed = "move";
    }

    function handleColumnDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }

    function handleColumnDrop(event, dropIndex) {
        event.preventDefault();

        const draggedIndex = Number(
            event.dataTransfer.getData("text/plain")
        );

        if (
            Number.isNaN(draggedIndex) ||
            draggedIndex === dropIndex
        ) {
            return;
        }

        setColumns((currentColumns) => {
            const nextColumns = [...currentColumns];
            const [moved] = nextColumns.splice(draggedIndex, 1);
            nextColumns.splice(dropIndex, 0, moved);
            return nextColumns;
        });
    }

    function selectAll() {
        setColumns((currentColumns) =>
            currentColumns.map((column) => ({
                ...column,
                selected: true
            }))
        );
    }

    function clearAll() {
        setColumns((currentColumns) =>
            currentColumns.map((column) => ({
                ...column,
                selected: false
            }))
        );
    }

    async function handleExport() {
        const selectedColumns = columns.filter(
            (column) => column.selected
        );

        if (!selectedColumns.length) {
            setError(
                "Selecione ao menos uma coluna."
            );

            return;
        }

        try {
            setSaving(true);
            setError("");

            await window.alfadime.export.savePreference(
                moduleKey,
                columns
            );

            const result = await onExport(
                selectedColumns
            );

            if (!result?.cancelled) {
                onClose();
            }
        } catch (exportError) {
            console.error(exportError);

            setError(
                exportError.message ||
                "Nao foi possivel exportar o Excel."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="export-modal-backdrop"
            onMouseDown={onClose}
        >
            <section
                className="export-modal"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <header className="export-modal-header">
                    <div>
                        <span>
                            Configuracao de exportacao
                        </span>

                        <h2>{title}</h2>

                        <p>
                            Escolha as colunas e defina a ordem do arquivo Excel.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Fechar
                    </button>
                </header>

                <div className="export-modal-toolbar">
                    <button
                        type="button"
                        onClick={selectAll}
                        disabled={loading || saving}
                    >
                        Selecionar todas
                    </button>

                    <button
                        type="button"
                        onClick={clearAll}
                        disabled={loading || saving}
                    >
                        Limpar selecao
                    </button>
                </div>

                {loading ? (
                    <div className="export-modal-loading">
                        Carregando configuracao...
                    </div>
                ) : (
                    <div className="export-columns-list">
                        {columns.map(
                            (column, index) => (
                                <div
                                    key={column.key}
                                    className={
                                        column.selected
                                            ? "export-column-row selected"
                                            : "export-column-row"
                                    }
                                    draggable={!saving}
                                    onDragStart={(event) =>
                                        handleColumnDragStart(event, index)
                                    }
                                    onDragOver={handleColumnDragOver}
                                    onDrop={(event) =>
                                        handleColumnDrop(event, index)
                                    }
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
                                            checked={
                                                Boolean(
                                                    column.selected
                                                )
                                            }
                                            onChange={() =>
                                                toggleColumn(
                                                    index
                                                )
                                            }
                                            disabled={saving}
                                        />

                                        <span>
                                            {column.label}
                                        </span>
                                    </label>
                                </div>
                            )
                        )}
                    </div>
                )}

                {error && (
                    <div className="export-modal-error">
                        {error}
                    </div>
                )}

                <footer className="export-modal-actions">
                    <button
                        type="button"
                        className="export-modal-cancel"
                        onClick={onClose}
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
                        {saving
                            ? "Gerando Excel..."
                            : "Gerar Excel"}
                    </button>
                </footer>
            </section>
        </div>
    );
}

export default ExportExcelModal;
