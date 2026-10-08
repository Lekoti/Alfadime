import {
    useEffect,
    useMemo,
    useState
} from "react";


import CorrectionHistoryTable from
    "../components/CorrectionHistoryTable";


import {
    cancelCorrection,
    cancelCorrections,
    exportAllCorrectionsCsv,
    exportCorrectionsCsv,
    getCorrectionFilterOptions,
    getCsvExportBranches,
    listCorrections,
    markCorrectionsAsSent,
    revertCorrection,
    revertCorrections
} from "../services/product-corrections.service";


import {
    useModuleState
} from "../../../hooks/useModuleState";


import "../styles/product-corrections.css";


const MODULE_ID = "product-corrections";


const FIELD_LABELS = {
    sirius_code: "Cód. Sirius",
    sap_code: "Código SAP",
    group_code: "Grupo",
    active_ingredient: "Princípio Ativo",
    commercial_name: "Nome Comercial",
    manufacturer_code: "Código Fabricante",
    brand: "Marca / Indústria",
    unit: "Unidade",
    standard_box: "Caixa Padrão",
    controls_lot: "Controla Lote",
    ms_registration: "Registro MS",
    reference_code: "Código Referência",
    therapeutic_class_code: "Classe Terapêutica",
    height: "Altura",
    width: "Largura",
    length: "Comprimento",
    category_code: "Categoria",
    active: "Ativo"
};


const BRANCH_LABELS = {
    "DIMEBRAS PR": "DIMEBRAS PR — PRODUTOS_0001.csv",
    "ALFAMED MS": "ALFAMED MS — PRODUTOS_0002.csv",
    "DIMEBRAS MT": "DIMEBRAS MT — PRODUTOS_0003.csv",
    "DIMEBRAS MS": "DIMEBRAS MS — PRODUTOS_0005.csv",
    "DIMEBRAS SC": "DIMEBRAS SC — PRODUTOS_0006.csv"
};


const INITIAL_STATE = {
    status: "",
    branch: "",
    fieldName: "",
    search: "",
    filtersPanelOpen: false
};


function ProductCorrectionsPage() {
    const [state, setField] = useModuleState(
        MODULE_ID,
        INITIAL_STATE
    );


    const status = state.status;
    const branch = state.branch;
    const fieldName = state.fieldName;
    const search = state.search;
    const filtersPanelOpen = state.filtersPanelOpen;


    const [corrections, setCorrections] = useState([]);
    const [filterOptions, setFilterOptions] =
        useState({
            branches: [],
            fields: []
        });

    const [loading, setLoading] = useState(true);
    const [markingSent, setMarkingSent] =
        useState(false);
    const [deleting, setDeleting] = useState(false);
    const [selectedIds, setSelectedIds] =
        useState([]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [
        exportModalOpen,
        setExportModalOpen
    ] = useState(false);

    const [
        exportBranches,
        setExportBranches
    ] = useState([]);

    const [
        exportBranch,
        setExportBranch
    ] = useState("");

    const [
        exportingCsv,
        setExportingCsv
    ] = useState(false);

    const [
        loadingExportBranches,
        setLoadingExportBranches
    ] = useState(false);


    async function loadFilterOptions() {
        try {
            const result =
                await getCorrectionFilterOptions();

            setFilterOptions({
                branches: Array.isArray(
                    result?.branches
                )
                    ? result.branches
                    : [],

                fields: Array.isArray(
                    result?.fields
                )
                    ? result.fields
                    : []
            });
        } catch (optionsError) {
            console.error(optionsError);
        }
    }


    async function loadCorrections() {
        try {
            setLoading(true);
            setError("");

            const result = await listCorrections({
                status,
                branch,
                field_name: fieldName,
                search
            });

            const nextCorrections =
                Array.isArray(result)
                    ? result
                    : [];

            setCorrections(nextCorrections);

            setSelectedIds((currentIds) =>
                currentIds.filter((id) =>
                    nextCorrections.some(
                        (correction) =>
                            correction.id === id
                    )
                )
            );
        } catch (loadError) {
            console.error(loadError);

            setError(
                loadError.message ||
                "Não foi possível carregar o histórico."
            );
        } finally {
            setLoading(false);
        }
    }


    async function loadExportBranches() {
        try {
            setLoadingExportBranches(true);

            const result =
                await getCsvExportBranches();

            const nextBranches = Array.isArray(result)
                ? result
                : [];

            setExportBranches(nextBranches);

            setExportBranch((currentBranch) => {
                if (
                    currentBranch &&
                    nextBranches.includes(currentBranch)
                ) {
                    return currentBranch;
                }

                return "";
            });
        } catch (branchesError) {
            console.error(branchesError);

            setError(
                branchesError.message ||
                "Não foi possível carregar as filiais disponíveis para exportação."
            );
        } finally {
            setLoadingExportBranches(false);
        }
    }


    useEffect(() => {
        loadFilterOptions();
    }, []);


    useEffect(() => {
        loadCorrections();
    }, [
        status,
        branch,
        fieldName,
        search
    ]);


    useEffect(() => {
        if (exportModalOpen) {
            loadExportBranches();
        }
    }, [exportModalOpen]);


    function setStatus(next) {
        setField(
            "status",
            typeof next === "function"
                ? next(status)
                : next
        );
        setSelectedIds([]);
    }


    function setBranch(next) {
        setField(
            "branch",
            typeof next === "function"
                ? next(branch)
                : next
        );
        setSelectedIds([]);
    }


    function setFieldName(next) {
        setField(
            "fieldName",
            typeof next === "function"
                ? next(fieldName)
                : next
        );
        setSelectedIds([]);
    }


    function setSearch(next) {
        setField(
            "search",
            typeof next === "function"
                ? next(search)
                : next
        );
        setSelectedIds([]);
    }


    function setFiltersPanelOpen(next) {
        setField(
            "filtersPanelOpen",
            typeof next === "function"
                ? next(filtersPanelOpen)
                : next
        );
    }


    const selectedCorrections = useMemo(
        () =>
            corrections.filter(
                (correction) =>
                    selectedIds.includes(
                        correction.id
                    )
            ),
        [
            corrections,
            selectedIds
        ]
    );


    const selectedPendingCorrections = useMemo(
        () =>
            selectedCorrections.filter(
                (correction) =>
                    correction.status ===
                    "pending_excel"
            ),
        [selectedCorrections]
    );


    const selectedDoneCorrections = useMemo(
        () =>
            selectedCorrections.filter(
                (correction) =>
                    correction.status ===
                    "sent_internal"
            ),
        [selectedCorrections]
    );


    const summary = useMemo(
        () => ({
            total: corrections.length,
            pending: corrections.filter(
                (item) =>
                    item.status ===
                    "pending_excel"
            ).length,
            sent: corrections.filter(
                (item) =>
                    item.status ===
                    "sent_internal"
            ).length,
            confirmed: corrections.filter(
                (item) =>
                    item.status ===
                    "confirmed_in_excel"
            ).length
        }),
        [corrections]
    );


    function toggleSelection(id) {
        setSelectedIds((currentIds) =>
            currentIds.includes(id)
                ? currentIds.filter(
                    (currentId) =>
                        currentId !== id
                )
                : [
                    ...currentIds,
                    id
                ]
        );
    }


    function toggleAll(selectableCorrections) {
        const selectableIds =
            selectableCorrections.map(
                (correction) =>
                    correction.id
            );

        const allSelected =
            selectableIds.length > 0 &&
            selectableIds.every((id) =>
                selectedIds.includes(id)
            );

        if (allSelected) {
            setSelectedIds((currentIds) =>
                currentIds.filter(
                    (id) =>
                        !selectableIds.includes(id)
                )
            );

            return;
        }

        setSelectedIds((currentIds) => [
            ...new Set([
                ...currentIds,
                ...selectableIds
            ])
        ]);
    }


    function clearSelection() {
        setSelectedIds([]);
    }


    async function handleMarkAsSent() {
        if (!selectedPendingCorrections.length) {
            setError(
                "Selecione ao menos uma correção pendente."
            );

            return;
        }

        const confirmed = window.confirm(
            `Marcar ${selectedPendingCorrections.length} correção(ões) como feito/atualizado no sistema interno?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setMarkingSent(true);
            setError("");
            setSuccess("");

            const result =
                await markCorrectionsAsSent(
                    selectedPendingCorrections.map(
                        (correction) =>
                            correction.id
                    )
                );

            setSuccess(
                `${result.updated} correção(ões) marcada(s) como feito/atualizado.`
            );

            clearSelection();

            await loadCorrections();
        } catch (markError) {
            console.error(markError);

            setError(
                markError.message ||
                "Não foi possível atualizar as correções."
            );
        } finally {
            setMarkingSent(false);
        }
    }


    async function handleRevertSelected() {
        if (!selectedDoneCorrections.length) {
            setError(
                "Selecione ao menos uma correção feita para reverter."
            );

            return;
        }

        const confirmed = window.confirm(
            `Reverter ${selectedDoneCorrections.length} correção(ões) para o valor anterior? Elas voltarão para Pendente e poderão ser excluídas depois.`
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeleting(true);
            setError("");
            setSuccess("");

            const result = await revertCorrections(
                selectedDoneCorrections.map(
                    (correction) => correction.id
                )
            );

            setSuccess(
                `${result.updated} correção(ões) revertida(s) para o valor anterior.`
            );

            clearSelection();

            await loadCorrections();
        } catch (revertError) {
            console.error(revertError);

            setError(
                revertError.message ||
                "Não foi possível reverter as correções."
            );
        } finally {
            setDeleting(false);
        }
    }


    async function handleRevert(correction) {
        const fieldLabel =
            FIELD_LABELS[correction.field_name] ||
            correction.field_name;

        const previousValue =
            correction.old_value || "-";

        const confirmed = window.confirm(
            `Reverter a correção de ${fieldLabel} do produto ${correction.code} para o valor anterior "${previousValue}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeleting(true);
            setError("");
            setSuccess("");

            const result = await revertCorrection(
                correction.id
            );

            setSuccess(
                `Correção revertida para "${result.restoredValue || "-"}". Agora ela está pendente e pode ser excluída.`
            );

            clearSelection();

            await loadCorrections();
        } catch (revertError) {
            console.error(revertError);

            setError(
                revertError.message ||
                "Não foi possível reverter a correção."
            );
        } finally {
            setDeleting(false);
        }
    }


    async function handleDeleteSelected() {
        if (!selectedCorrections.length) {
            setError(
                "Selecione ao menos uma correção para excluir."
            );

            return;
        }

        const deletableCorrections =
            selectedCorrections.filter(
                (correction) =>
                    correction.status === "pending_excel"
            );

        if (!deletableCorrections.length) {
            setError(
                "Somente correções pendentes podem ser excluídas. Correções feitas devem ser revertidas antes."
            );

            return;
        }

        const confirmed = window.confirm(
            `Excluir ${deletableCorrections.length} correção(ões) selecionada(s)?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeleting(true);
            setError("");
            setSuccess("");

            const result =
                await cancelCorrections(
                    deletableCorrections.map(
                        (correction) =>
                            correction.id
                    )
                );

            setSuccess(
                `${result.deleted} correção(ões) excluída(s) definitivamente.`
            );

            clearSelection();

            await loadCorrections();
        } catch (deleteError) {
            console.error(deleteError);

            setError(
                deleteError.message ||
                "Não foi possível excluir as correções."
            );
        } finally {
            setDeleting(false);
        }
    }


    async function handleCancel(correction) {
        const confirmed = window.confirm(
            "Excluir a correção de " +
            correction.field_name +
            " para o produto " +
            correction.code +
            "?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await cancelCorrection(
                correction.id
            );

            await loadCorrections();
        } catch (cancelError) {
            console.error(cancelError);

            setError(
                cancelError.message ||
                "Não foi possível excluir a correção."
            );
        }
    }


    async function handleExportCsv() {
        if (!exportBranch) {
            setError(
                "Selecione uma filial ou Todas as filiais para exportar."
            );

            return;
        }

        try {
            setExportingCsv(true);
            setError("");
            setSuccess("");

            const result = exportBranch === "all"
                ? await exportAllCorrectionsCsv()
                : await exportCorrectionsCsv(exportBranch);

            if (result?.cancelled) {
                return;
            }

            const files = Array.isArray(result?.files)
                ? result.files
                : [];

            setSuccess(
                files.length === 1
                    ? `${files[0].totalProducts} produto(s) exportado(s) em ${files[0].fileName}.`
                    : `${files.length} CSV(s) gerados com ${result.totalProducts || 0} produto(s) no total.`
            );

            setExportModalOpen(false);
        } catch (exportError) {
            console.error(exportError);

            setError(
                exportError.message ||
                "Não foi possível exportar os CSVs."
            );
        } finally {
            setExportingCsv(false);
        }
    }


    function clearFilters() {
        setStatus("");
        setBranch("");
        setFieldName("");
        setSearch("");
        clearSelection();
    }


    return (
        <main className="product-corrections-page">
            <header className="product-corrections-header">
                <div className="product-corrections-header-title">
                    <h1>Correções de Produtos</h1>
                </div>

                <div className="corrections-header-actions">
                    <button
                        type="button"
                        className="corrections-filters-toggle"
                        onClick={() =>
                            setFiltersPanelOpen(
                                (current) => !current
                            )
                        }
                    >
                        {filtersPanelOpen
                            ? "Fechar filtros"
                            : "Filtros"}
                    </button>
                </div>
            </header>

            {filtersPanelOpen && (
                <section className="corrections-floating-panel">
                    <div className="corrections-floating-panel-header">
                        <strong>Filtros e Ações</strong>

                        <button
                            type="button"
                            onClick={() =>
                                setFiltersPanelOpen(false)
                            }
                            aria-label="Fechar filtros"
                            title="Fechar"
                        >
                            ×
                        </button>
                    </div>

                    <div className="corrections-panel-actions-bar">
                        <button
                            type="button"
                            className="corrections-panel-action-button"
                            onClick={() =>
                                setExportModalOpen(true)
                            }
                            disabled={loading}
                        >
                            Exportar CSV
                        </button>

                        <button
                            type="button"
                            className="corrections-panel-action-button"
                            onClick={handleMarkAsSent}
                            disabled={
                                markingSent ||
                                selectedPendingCorrections.length === 0
                            }
                        >
                            {markingSent
                                ? "Atualizando..."
                                : "Marcar como Feito"}
                        </button>

                        <button
                            type="button"
                            className="corrections-panel-action-button"
                            onClick={handleRevertSelected}
                            disabled={
                                deleting ||
                                selectedDoneCorrections.length === 0
                            }
                        >
                            {deleting
                                ? "Processando..."
                                : "Reverter Selecionados"}
                        </button>

                        <button
                            type="button"
                            className="corrections-panel-action-button"
                            onClick={handleDeleteSelected}
                            disabled={
                                deleting ||
                                selectedPendingCorrections.length === 0
                            }
                        >
                            {deleting
                                ? "Processando..."
                                : "Excluir Selecionados"}
                        </button>
                    </div>

                    <section className="corrections-summary-inline">
                        <div className="corrections-summary-card">
                            <small>Total visível</small>
                            <strong>{summary.total}</strong>
                        </div>

                        <div className="corrections-summary-card pending">
                            <small>Pendentes</small>
                            <strong>{summary.pending}</strong>
                        </div>

                        <div className="corrections-summary-card sent">
                            <small>Feito / Atualizado</small>
                            <strong>{summary.sent}</strong>
                        </div>

                        <div className="corrections-summary-card confirmed">
                            <small>Confirmadas no Excel</small>
                            <strong>{summary.confirmed}</strong>
                        </div>
                    </section>

                    <section className="corrections-filters">
                        <div className="corrections-search">
                            <label htmlFor="corrections-search">
                                Buscar produto
                            </label>

                            <input
                                id="corrections-search"
                                type="search"
                                value={search}
                                placeholder="EAN, filial, cód., nome, campo ou valor"
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="corrections-filter-field">
                            <label htmlFor="corrections-status">
                                Status
                            </label>

                            <select
                                id="corrections-status"
                                value={status}
                                onChange={(event) =>
                                    setStatus(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Todos os status
                                </option>
                                <option value="pending_excel">
                                    Pendente
                                </option>
                                <option value="sent_internal">
                                    Feito / Atualizado
                                </option>
                                <option value="confirmed_in_excel">
                                    Confirmada no Excel
                                </option>
                                <option value="cancelled">
                                    Excluída
                                </option>
                            </select>
                        </div>

                        <div className="corrections-filter-field">
                            <label htmlFor="corrections-branch">
                                Filial
                            </label>

                            <select
                                id="corrections-branch"
                                value={branch}
                                onChange={(event) =>
                                    setBranch(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Todas as filiais
                                </option>

                                {filterOptions.branches.map(
                                    (item) => (
                                        <option
                                            key={item}
                                            value={item}
                                        >
                                            {item}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="corrections-filter-field">
                            <label htmlFor="corrections-field">
                                Campo corrigido
                            </label>

                            <select
                                id="corrections-field"
                                value={fieldName}
                                onChange={(event) =>
                                    setFieldName(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Todos os campos
                                </option>

                                {filterOptions.fields.map(
                                    (item) => (
                                        <option
                                            key={item}
                                            value={item}
                                        >
                                            {FIELD_LABELS[item] ||
                                                item}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <button
                            type="button"
                            className="corrections-clear-filters-button"
                            onClick={clearFilters}
                        >
                            Limpar filtros
                        </button>
                    </section>
                </section>
            )}

            {error && (
                <div className="corrections-error">
                    <strong>Erro:</strong> {error}
                </div>
            )}

            {success && (
                <div className="corrections-success">
                    {success}
                </div>
            )}

            <section className="corrections-card">
                <div className="corrections-card-header">
                    <strong>
                        Histórico de alterações
                    </strong>

                    <span>
                        {corrections.length} registros
                    </span>
                </div>

                {loading ? (
                    <div className="corrections-loading">
                        Carregando correções...
                    </div>
                ) : (
                    <CorrectionHistoryTable
                        corrections={corrections}
                        selectedIds={selectedIds}
                        onToggleSelection={toggleSelection}
                        onToggleAll={toggleAll}
                    />
                )}
            </section>

            {exportModalOpen && (
                <div
                    className="corrections-export-modal-backdrop"
                    onMouseDown={() => {
                        if (!exportingCsv) {
                            setExportModalOpen(false);
                        }
                    }}
                >
                    <section
                        className="corrections-export-modal"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <header className="corrections-export-modal-header">
                            <div>
                                <span>
                                    Exportação padrão
                                </span>

                                <h2>
                                    Exportar CSV de Correções
                                </h2>

                                <p>
                                    Serão exportados somente produtos
                                    com correções Feito / Atualizado.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setExportModalOpen(false)
                                }
                                disabled={exportingCsv}
                            >
                                Fechar
                            </button>
                        </header>

                        <div className="corrections-export-modal-body">
                            <div className="corrections-export-info">
                                <strong>
                                    Padrão de arquivos
                                </strong>

                                <span>
                                    Os CSVs terão colunas fixas e os
                                    nomes exigidos por cada filial.
                                </span>
                            </div>

                            <label
                                className="corrections-export-field"
                                htmlFor="corrections-export-branch"
                            >
                                <span>Filial para exportar</span>

                                <select
                                    id="corrections-export-branch"
                                    value={exportBranch}
                                    onChange={(event) =>
                                        setExportBranch(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        loadingExportBranches ||
                                        exportingCsv
                                    }
                                >
                                    <option value="">
                                        Selecione uma filial
                                    </option>

                                    <option value="all">
                                        Todas as filiais disponíveis
                                    </option>

                                    {exportBranches.map(
                                        (item) => (
                                            <option
                                                key={item}
                                                value={item}
                                            >
                                                {BRANCH_LABELS[item] ||
                                                    item}
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            {loadingExportBranches ? (
                                <div className="corrections-export-loading">
                                    Carregando filiais disponíveis...
                                </div>
                            ) : (
                                <div className="corrections-export-note">
                                    Após confirmar, será aberta a
                                    seleção da pasta onde os CSVs serão
                                    salvos.
                                </div>
                            )}
                        </div>

                        <footer className="corrections-export-modal-actions">
                            <button
                                type="button"
                                className="corrections-export-cancel-button"
                                onClick={() =>
                                    setExportModalOpen(false)
                                }
                                disabled={exportingCsv}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="corrections-export-confirm-button"
                                onClick={handleExportCsv}
                                disabled={
                                    loadingExportBranches ||
                                    exportingCsv ||
                                    !exportBranch
                                }
                            >
                                {exportingCsv
                                    ? "Gerando CSV..."
                                    : "Escolher pasta e gerar CSV"}
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </main>
    );
}


export default ProductCorrectionsPage;