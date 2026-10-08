import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import PurchaseColumnSelector from
    "../components/PurchaseColumnSelector";

import PurchaseCurveTargets from
    "../components/PurchaseCurveTargets";

import PurchaseFilters from
    "../components/PurchaseFilters";

import PurchaseTable from
    "../components/PurchaseTable";

import {
    DEFAULT_VISIBLE_PURCHASE_COLUMNS,
    PURCHASE_COLUMNS
} from "../constants/purchases.constants";

import {
    listPurchaseSuggestions,
    subscribePurchasesChanged,
    syncPurchasesCurveExcel
} from "../services/purchases.service";

import {
    loadModuleState,
    saveModuleState
} from "../../state/modulesState";

import "../styles/purchases.css";

const PAGE_SIZE = 50;

const DEFAULT_CURVE_DAYS = {
    A: 90,
    B: 60,
    C: 30,
    D: 30,
    E: 30,
    F: 30,
    G: 30
};

const MODULE_ID = 'purchases';

function PurchasesPage() {
    const persisted = useMemo(
        () => loadModuleState(MODULE_ID, {
            filters: {
                search: "",
                company: "",
                laboratoryname: "",
                effectivecurve: "",
                status: ""
            },
            curveDays: { ...DEFAULT_CURVE_DAYS },
            visibleColumns: [...DEFAULT_VISIBLE_PURCHASE_COLUMNS],
            page: 1,
            filtersPanelOpen: false
        }),
        []
    );

    const [filters, setFilters] = useState(persisted.filters);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(
        persisted.filtersPanelOpen
    );
    const [curveDays, setCurveDays] = useState(
        persisted.curveDays
    );
    const [
        visibleColumns,
        setVisibleColumns
    ] = useState(
        persisted.visibleColumns
    );

    const [rows, setRows] = useState([]);

    const [summary, setSummary] = useState({
        products: 0,
        suggestedQuantity: 0,
        suggestedValue: 0,
        criticalProducts: 0
    });

    const [editedTotals, setEditedTotals] = useState({
        quantity: 0,
        value: 0
    });

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState("");
    const [page, setPage] = useState(persisted.page);

    const requestFilters = useMemo(
        () => ({
            ...filters,
            curveDays
        }),
        [filters, curveDays]
    );

    const loadSuggestions = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const result = await listPurchaseSuggestions(
                requestFilters
            );

            setRows(result?.rows || []);

            setSummary(
                result?.summary || {
                    products: 0,
                    suggestedQuantity: 0,
                    suggestedValue: 0,
                    criticalProducts: 0
                }
            );
        } catch (loadError) {
            console.error(loadError);

            setRows([]);

            setError(
                loadError.message ||
                " Não foi possível carregar as sugestoes."
            );
        } finally {
            setLoading(false);
        }
    }, [requestFilters]);

    useEffect(() => {
        loadSuggestions();
    }, [loadSuggestions]);

    useEffect(() => {
        setPage(1);
    }, [filters, curveDays, rows.length]);

    useEffect(() => {
        const unsubscribe = subscribePurchasesChanged(
            loadSuggestions
        );

        return typeof unsubscribe === "function"
            ? unsubscribe
            : undefined;
    }, [loadSuggestions]);

    useEffect(() => {
        saveModuleState(MODULE_ID, {
            filters,
            curveDays,
            visibleColumns,
            page,
            filtersPanelOpen
        });
    }, [filters, curveDays, visibleColumns, page, filtersPanelOpen]);

    const totalPages = Math.max(
        1,
        Math.ceil(rows.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const pageRows = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = currentPage * PAGE_SIZE;

        return rows.slice(start, end);
    }, [rows, currentPage]);

    async function synchronize() {
        try {
            setSyncing(true);
            setError("");

            await syncPurchasesCurveExcel();
            await loadSuggestions();

            setPage(1);
        } catch (syncError) {
            console.error(syncError);

            setError(
                syncError.message ||
                " Não foi possível sincronizar a Curva Compras."
            );
        } finally {
            setSyncing(false);
        }
    }

    return (
        <main className="purchases-page">
            <header className="purchases-header">
                <div>
                    <span className="purchases-eyebrow">
                        Alfadime Planejamento
                    </span>

                    <h1>Compras</h1>

                    <p>
                        Sugestoes por produto, filial, curva de
                        venda e cobertura de estoque.
                    </p>
                </div>

                <div className="purchases-header-actions">
                    <PurchaseColumnSelector
                        columns={PURCHASE_COLUMNS}
                        visibleColumns={visibleColumns}
                        onVisibleColumnsChange={
                            setVisibleColumns
                        }
                    />

                    <button
                        type="button"
                        className="purchases-sync-button"
                        onClick={synchronize}
                        disabled={syncing}
                    >
                        {syncing
                            ? "Sincronizando..."
                            : "Atualizar Curva"}
                    </button>
                </div>
            </header>

            <section className="purchases-summary">
                <div>
                    <small>Produtos exibidos</small>

                    <strong>{summary.products}</strong>
                </div>

                <div>
                    <small>Itens críticos</small>

                    <strong>{summary.criticalProducts}</strong>
                </div>

                <div>
                    <small>Quantidade selecionada</small>

                    <strong>
                        {new Intl.NumberFormat("pt-BR").format(
                            editedTotals.quantity
                        )}
                    </strong>
                </div>

                <div>
                    <small>Valor total selecionado</small>

                    <strong>
                        {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                        }).format(editedTotals.value)}
                    </strong>
                </div>
            </section>

            <div className="purchases-workspace-toolbar">
                <button
                    type="button"
                    className="purchases-filters-toggle"
                    onClick={() =>
                        setFiltersPanelOpen(
                            (current) => !current
                        )
                    }
                >
                    {filtersPanelOpen
                        ? "Fechar filtros e metas"
                        : "Filtros e metas"}
                </button>

                <span>
                    Use este painel para filtrar a lista e
                    definir os dias de cobertura por curva.
                </span>
            </div>

            {filtersPanelOpen && (
                <section className="purchases-floating-panel">
                    <div className="purchases-floating-panel-header">
                        <strong>Filtros e metas de estoque</strong>

                        <button
                            type="button"
                            onClick={() =>
                                setFiltersPanelOpen(false)
                            }
                            aria-label="Fechar filtros e metas"
                            title="Fechar"
                        >
                            ×
                        </button>
                    </div>

                    <PurchaseFilters
                        filters={filters}
                        onFiltersChange={setFilters}
                    />

                    <PurchaseCurveTargets
                        curveDays={curveDays}
                        rows={rows}
                        onCurveDaysChange={setCurveDays}
                    />
                </section>
            )}

            {error && (
                <div className="purchases-error">
                    <strong>Erro:</strong> {error}
                </div>
            )}

            <section className="purchases-card">
                <div className="purchases-card-header">
                    <div>
                        <strong>Sugestoes de compras</strong>

                        <span>
                            Exibindo {pageRows.length} de{" "}
                            {rows.length} produtos. Quantidade e
                            valor unitario podem ser alterados
                            manualmente.
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="purchases-loading">
                        Calculando sugestoes de compra...
                    </div>
                ) : (
                    <PurchaseTable
                        rows={pageRows}
                        columns={PURCHASE_COLUMNS}
                        visibleColumns={visibleColumns}
                        onTotalsChange={setEditedTotals}
                    />
                )}

                <div className="purchases-pagination">
                    <button
                        type="button"
                        onClick={() =>
                            setPage((current) =>
                                Math.max(1, current - 1)
                            )
                        }
                        disabled={currentPage <= 1}
                    >
                        Anterior
                    </button>

                    <span>
                        Pagina {currentPage} de {totalPages} · 50
                        produtos por pagina
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setPage((current) =>
                                Math.min(
                                    totalPages,
                                    current + 1
                                )
                            )
                        }
                        disabled={currentPage >= totalPages}
                    >
                        Proxima
                    </button>
                </div>
            </section>
        </main>
    );
}

export default PurchasesPage;