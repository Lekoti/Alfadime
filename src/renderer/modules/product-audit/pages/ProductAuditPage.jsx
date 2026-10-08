import {
    useState
} from "react";


import ExportExcelModal from
    "../../../shared/components/ExportExcelModal";


import AuditDetailsModal from
    "../components/AuditDetailsModal";


import AuditFilters from
    "../components/AuditFilters";


import AuditPagination from
    "../components/AuditPagination";


import AuditTable from
    "../components/AuditTable";


import CorrectionFormModal from
    "../components/CorrectionFormModal";


import {
    AUDIT_EXPORT_COLUMNS
} from "../constants/audit-export.constants";


import {
    useProductAudit
} from "../hooks/useProductAudit";


import {
    useModuleState
} from "../../../hooks/useModuleState";


import "../styles/product-audit.css";


const MODULE_ID = "product-audit";


const INITIAL_STATE = {
    filters: {
        search: "",
        types: [],
        severities: [],
        branches: [],
        brands: [],
        manufacturerCodes: [],
        groupCodes: [],
        categoryCodes: [],
        units: [],
        therapeuticClasses: [],
        divergentFields: [],
        missingFields: [],
        controlsLot: "",
        productActive: "",
        minBranches: "",
        page: 1,
        pageSize: 50
    },
    filtersPanelOpen: false
};


function ProductAuditPage() {
    const [state, setField] = useModuleState(
        MODULE_ID,
        INITIAL_STATE
    );


    const filters = state.filters;
    const filtersPanelOpen = state.filtersPanelOpen;


    const [
        selectedIssue,
        setSelectedIssue
    ] = useState(null);


    const [
        correctionTarget,
        setCorrectionTarget
    ] = useState(null);


    const [
        exportModalOpen,
        setExportModalOpen
    ] = useState(false);


    const {
        issues,
        summary,
        pagination,
        loading,
        error,
        filtersApplied,
        loadAudit
    } = useProductAudit(filters);


    function updateFilters(nextFilters) {
        setField("filters", {
            ...nextFilters,
            page: 1,
            pageSize: 50
        });

        setSelectedIssue(null);
    }


    function changePage(page) {
        setField("filters", {
            ...filters,
            page,
            pageSize: 50
        });
    }


    function setFiltersPanelOpen(next) {
        setField(
            "filtersPanelOpen",
            typeof next === "function"
                ? next(filtersPanelOpen)
                : next
        );
    }


    async function handleCorrectionSaved() {
        await loadAudit();
    }


    async function handleExport(columns) {
        return window.alfadime.export.productAudit(
            filters,
            columns
        );
    }


    return (
        <main className="product-audit-page">
            <header className="product-audit-header">
                <div className="product-audit-header-title">
                    <h1>Auditoria de Produtos</h1>
                </div>

                <div className="audit-header-actions">
                    <button
                        type="button"
                        className="audit-filters-toggle"
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
                <section className="audit-floating-panel">
                    <div className="audit-floating-panel-header">
                        <strong>Filtros e ações</strong>

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

                    <div className="audit-panel-actions-bar">
                        <button
                            type="button"
                            className="audit-panel-action-button"
                            onClick={() =>
                                setExportModalOpen(true)
                            }
                            disabled={!filtersApplied}
                        >
                            Exportar Excel
                        </button>
                    </div>

                    {filtersApplied && (
                        <section className="audit-summary-inline">
                            <div className="audit-summary-card">
                                <small>
                                    Pendências encontradas
                                </small>

                                <strong>
                                    {summary.total}
                                </strong>
                            </div>

                            <div className="audit-summary-card error">
                                <small>
                                    Alta prioridade
                                </small>

                                <strong>
                                    {summary.errors}
                                </strong>
                            </div>

                            <div className="audit-summary-card warning">
                                <small>
                                    Pendências para conferir
                                </small>

                                <strong>
                                    {summary.warnings}
                                </strong>
                            </div>
                        </section>
                    )}

                    <AuditFilters
                        filters={filters}
                        onFiltersChange={updateFilters}
                    />
                </section>
            )}

            {error && (
                <div className="audit-error">
                    <strong>Erro:</strong> {error}
                </div>
            )}

            {!filtersApplied && (
                <section className="audit-empty-state">
                    <div className="audit-empty-state-icon">!</div>

                    <h2>
                        Selecione um filtro para iniciar a auditoria
                    </h2>

                    <p>
                        Escolha um tipo de pendência, filial, indústria,
                        campo divergente, campo ausente ou utilize a
                        busca geral para localizar somente os produtos
                        que deseja conferir.
                    </p>

                    <div className="audit-empty-state-examples">
                        <span>Exemplos:</span>
                        <span>Nome comercial diferente</span>
                        <span>Princípio ativo diferente</span>
                        <span>Marca diferente</span>
                        <span>Cód. Sirius diferente</span>
                    </div>
                </section>
            )}

            {filtersApplied && (
                <section className="audit-card">
                    <div className="audit-card-header">
                        <div>
                            <strong>
                                Divergências encontradas
                            </strong>

                            <span>
                                Valores exibidos seguem a planilha.
                                Correções locais ficam registradas
                                no histórico.
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="audit-loading">
                            Analisando cadastros de produtos...
                        </div>
                    ) : (
                        <>
                            <AuditTable
                                issues={issues}
                                onOpenDetails={
                                    setSelectedIssue
                                }
                            />

                            <AuditPagination
                                pagination={pagination}
                                onPageChange={changePage}
                            />
                        </>
                    )}
                </section>
            )}

            <AuditDetailsModal
                issue={selectedIssue}
                onClose={() =>
                    setSelectedIssue(null)
                }
                onCorrectionsSaved={
                    handleCorrectionSaved
                }
            />

            <CorrectionFormModal
                product={
                    correctionTarget?.product
                }
                preselectedField={
                    correctionTarget?.fieldName
                }
                onClose={() =>
                    setCorrectionTarget(null)
                }
                onSaved={handleCorrectionSaved}
            />

            <ExportExcelModal
                open={exportModalOpen}
                title="Exportar Auditoria de Produtos"
                moduleKey="product-audit"
                availableColumns={
                    AUDIT_EXPORT_COLUMNS
                }
                onClose={() =>
                    setExportModalOpen(false)
                }
                onExport={handleExport}
            />
        </main>
    );
}


export default ProductAuditPage;