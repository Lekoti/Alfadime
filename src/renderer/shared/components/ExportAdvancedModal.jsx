import {
    useEffect,
    useState
} from "react";


import "./ExportAdvancedModal.css";


function ExportAdvancedModal({
    open,
    title,
    moduleKey,
    availableColumns,
    filterOptions,
    onClose,
    onExport
}) {
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [previewCount, setPreviewCount] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const [filters, setFilters] = useState({
        branch: "",
        active: "",
        brand: "",
        search: ""
    });

    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [templateName, setTemplateName] = useState("");
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);


    useEffect(() => {
        if (!open) {
            return;
        }

        let mounted = true;

        async function loadPreferences() {
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

                await loadTemplates();
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

        async function loadTemplates() {
            try {
                const savedTemplates =
                    await window.alfadime.export.getTemplates?.(
                        moduleKey
                    ) || [];

                if (mounted) {
                    setTemplates(savedTemplates);
                }
            } catch (templateError) {
                console.warn("Templates nao disponiveis", templateError);
            }
        }

        loadPreferences();

        return () => {
            mounted = false;
        };
    }, [
        open,
        moduleKey,
        availableColumns
    ]);


    useEffect(() => {
        if (!open || loading) {
            return;
        }

        const debounce = setTimeout(() => {
            loadPreview();
        }, 500);

        return () => clearTimeout(debounce);
    }, [filters, open, loading]);


    if (!open) {
        return null;
    }


    async function loadPreview() {
        try {
            setPreviewLoading(true);
            const count = await onExport({
                type: "preview",
                filters,
                columns: columns.filter((c) => c.selected)
            });
            setPreviewCount(count);
        } catch (previewError) {
            console.warn("Preview indisponivel", previewError);
        } finally {
            setPreviewLoading(false);
        }
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


    function handleFilterChange(key, value) {
        setFilters((current) => ({
            ...current,
            [key]: value
        }));
    }


    function handleTemplateChange(templateId) {
        setSelectedTemplate(templateId);

        const template = templates.find((t) => t.id === templateId);

        if (template) {
            if (template.filters_json) {
                try {
                    const parsedFilters = JSON.parse(template.filters_json);
                    setFilters(parsedFilters);
                } catch (err) {
                    console.error("Erro ao carregar filtros do template", err);
                }
            }

            if (template.columns_json) {
                try {
                    const parsedColumns = JSON.parse(template.columns_json);
                    setColumns((current) =>
                        current.map((col) => {
                            const saved = parsedColumns.find((c) => c.key === col.key);
                            return saved
                                ? { ...col, selected: saved.selected !== false }
                                : col;
                        })
                    );
                } catch (err) {
                    console.error("Erro ao carregar colunas do template", err);
                }
            }
        }
    }


    async function handleSaveTemplate() {
        if (!templateName.trim()) {
            setError("Informe um nome para o template.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            await window.alfadime.export.saveTemplate?.(
                moduleKey,
                templateName.trim(),
                filters,
                columns
            );

            await loadTemplates();
            setTemplateName("");
            setShowSaveTemplate(false);
        } catch (saveError) {
            console.error(saveError);
            setError("Nao foi possivel salvar o template.");
        } finally {
            setSaving(false);
        }
    }


    async function handleDeleteTemplate() {
        if (!selectedTemplate) {
            return;
        }

        if (!confirm("Tem certeza que deseja excluir este template?")) {
            return;
        }

        try {
            setSaving(true);
            setError("");

            await window.alfadime.export.deleteTemplate?.(
                moduleKey,
                selectedTemplate
            );

            await loadTemplates();
            setSelectedTemplate("");
        } catch (deleteError) {
            console.error(deleteError);
            setError("Nao foi possivel excluir o template.");
        } finally {
            setSaving(false);
        }
    }


    async function handleExport(exportData) {
        const selectedColumns = columns.filter(
            (column) => column.selected
        );

        if (!selectedColumns.length) {
            setError("Selecione ao menos uma coluna.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            await window.alfadime.export.savePreference(
                moduleKey,
                columns
            );

            const result = await onExport({
                type: "export",
                filters,
                columns: selectedColumns
            });

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


    async function loadTemplates() {
        try {
            const savedTemplates =
                await window.alfadime.export.getTemplates?.(
                    moduleKey
                ) || [];

            setTemplates(savedTemplates);
        } catch (templateError) {
            console.warn("Templates nao disponiveis", templateError);
        }
    }


    return (
        <div
            className="export-advanced-modal-backdrop"
            onMouseDown={onClose}
        >
            <section
                className="export-advanced-modal"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <header className="export-advanced-modal-header">
                    <div>
                        <span>
                            Exportacao Avancada
                        </span>

                        <h2>{title}</h2>

                        <p>
                            Escolha filtros, colunas e salve templates para exportacoes futuras.
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


                <div className="export-advanced-modal-content">
                    <div className="export-advanced-section">
                        <h3>Template</h3>

                        <div className="export-template-controls">
                            <select
                                value={selectedTemplate}
                                onChange={(e) =>
                                    handleTemplateChange(e.target.value)
                                }
                                disabled={loading || saving}
                            >
                                <option value="">
                                    Carregar template...
                                </option>
                                {templates.map((template) => (
                                    <option
                                        key={template.id}
                                        value={template.id}
                                    >
                                        {template.name}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowSaveTemplate(!showSaveTemplate)
                                }
                                disabled={loading || saving}
                                title="Salvar como novo template"
                            >
                                Salvar template
                            </button>

                            <button
                                type="button"
                                onClick={handleDeleteTemplate}
                                disabled={loading || saving || !selectedTemplate}
                                className="export-button-danger"
                            >
                                Excluir
                            </button>
                        </div>

                        {showSaveTemplate && (
                            <div className="export-save-template-form">
                                <input
                                    type="text"
                                    placeholder="Nome do template"
                                    value={templateName}
                                    onChange={(e) =>
                                        setTemplateName(e.target.value)
                                    }
                                    disabled={saving}
                                />

                                <button
                                    type="button"
                                    onClick={handleSaveTemplate}
                                    disabled={saving || !templateName.trim()}
                                >
                                    Salvar
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowSaveTemplate(false);
                                        setTemplateName("");
                                    }}
                                    disabled={saving}
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}
                    </div>


                    <div className="export-advanced-section">
                        <h3>Filtros de Exportacao</h3>

                        <div className="export-filters-grid">
                            <div className="export-filter-field">
                                <label>Filial</label>
                                <select
                                    value={filters.branch || ""}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "branch",
                                            e.target.value
                                        )
                                    }
                                    disabled={loading || saving}
                                >
                                    <option value="">
                                        Todas
                                    </option>
                                    {filterOptions?.branch?.map((branch) => (
                                        <option
                                            key={branch}
                                            value={branch}
                                        >
                                            {branch}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="export-filter-field">
                                <label>Status</label>
                                <select
                                    value={filters.active || ""}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "active",
                                            e.target.value
                                        )
                                    }
                                    disabled={loading || saving}
                                >
                                    <option value="">
                                        Ambos
                                    </option>
                                    <option value="1">
                                        Ativos
                                    </option>
                                    <option value="0">
                                        Inativos
                                    </option>
                                </select>
                            </div>

                            <div className="export-filter-field">
                                    <label>Laboratório</label>
                                <select
                                    value={filters.brand || ""}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "brand",
                                            e.target.value
                                        )
                                    }
                                    disabled={loading || saving}
                                >
                                    <option value="">
                                        Todas
                                    </option>
                                    {filterOptions?.brand?.map((brd) => (
                                        <option
                                            key={brd}
                                            value={brd}
                                        >
                                            {brd}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="export-filter-field export-filter-search">
                                <label>Busca</label>
                                <input
                                    type="text"
                                    placeholder="Nome comercial, EAN, codigo..."
                                    value={filters.search}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "search",
                                            e.target.value
                                        )
                                    }
                                    disabled={loading || saving}
                                />
                            </div>
                        </div>
                    </div>


                    <div className="export-advanced-section">
                        <h3>Colunas</h3>

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
                    </div>


                    {previewCount !== null && (
                        <div className="export-preview-info">
                            {previewLoading
                                ? "Contando produtos..."
                                : `${previewCount} produto(s) serao exportados`}
                        </div>
                    )}


                    {error && (
                        <div className="export-modal-error">
                            {error}
                        </div>
                    )}
                </div>


                <footer className="export-advanced-modal-actions">
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
                        disabled={
                            loading ||
                            saving ||
                            previewLoading ||
                            !columns.some((c) => c.selected)
                        }
                    >
                        {saving
                            ? "Gerando Excel..."
                            : `Gerar Excel (${previewCount ?? "?"} produtos)`}
                    </button>
                </footer>
            </section>
        </div>
    );
}


export default ExportAdvancedModal;
