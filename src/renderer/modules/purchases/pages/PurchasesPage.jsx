import React, { useEffect, useState, useMemo } from "react";
import PurchaseFilters from "../components/PurchaseFilters";
import PurchaseTable from "../components/PurchaseTable";
import PurchaseCurveTargets from "../components/PurchaseCurveTargets";
import PurchaseColumnSelector from "../components/PurchaseColumnSelector";
import ProductPagination from "../../products/components/ProductPagination";
import {
    PURCHASE_COLUMNS,
    DEFAULT_VISIBLE_PURCHASE_COLUMNS,
    DEFAULT_PURCHASE_COLUMN_ORDER
} from "../constants/purchases.constants";
import { usePurchases } from "../hooks/usePurchases";
import { useModuleArrayState } from "../../../hooks/useModuleArrayState";
import "../styles/purchases.css";

const DEFAULT_CURVE_DAYS = {
    A: 90,
    B: 60,
    C: 30,
    D: 30,
    E: 30,
    F: 30,
    G: 30
};

const DEFAULT_FILTERS = {
    search: "",
    company: "",
    laboratoryname: "",
    effectivecurve: "",
    status: "",
    page: 1,
    pageSize: 50,
    curveDays: DEFAULT_CURVE_DAYS
};

export default function PurchasesPage() {
    // Filtros com useState simples (sem persistência)
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    
    // Colunas e ordem com persistência
    const [visibleColumns, setVisibleColumns] = useModuleArrayState(
        "purchases-visible-columns",
        DEFAULT_VISIBLE_PURCHASE_COLUMNS
    );
    
    const [columnOrder, setColumnOrder] = useModuleArrayState(
        "purchases-column-order",
        DEFAULT_PURCHASE_COLUMN_ORDER
    );
    
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAllFiltered, setSelectAllFiltered] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState(null);

    // Remover limite de 50 linhas ao filtrar por indústria
    const hasIndustryFilter = filters.laboratoryname && filters.laboratoryname !== "";
    const currentPageSize = hasIndustryFilter ? 10000 : 50;

    const {
        rows,
        summary,
        pagination,
        loading,
        error,
        syncing,
        synchronize
    } = usePurchases({
        ...filters,
        pageSize: currentPageSize
    });

    useEffect(() => {
        setSelectedIds([]);
        setSelectAllFiltered(false);
        setExportError(null);
    }, [filters.search, filters.company, filters.laboratoryname, filters.effectivecurve, filters.status]);

    function updateFilters(nextFilters) {
        setFilters((current) => ({
            ...current,
            ...nextFilters,
            page: 1
        }));
        setSelectedIds([]);
        setSelectAllFiltered(false);
    }

    function updateCurveDays(nextCurveDays) {
        setFilters((current) => ({
            ...current,
            curveDays: nextCurveDays,
            page: 1
        }));
    }

    function changePage(page) {
        setFilters((current) => ({ ...current, page }));
    }

    async function handleSync() {
        const confirmed = window.confirm(
            "Atualizar Curva Compras com base na planilha agora? " +
            "Novos produtos serao incluidos e produtos existentes serao atualizados conforme os dados disponiveis na planilha."
        );
        if (!confirmed) return;
        try {
            await synchronize();
        } catch (syncError) {
            console.error(syncError);
        }
    }

    function toggleSelected(id) {
        setSelectAllFiltered(false);
        setSelectedIds((current) => {
            if (current.includes(id)) {
                return current.filter((selectedId) => selectedId !== id);
            }
            return [...current, id];
        });
    }

    function toggleSelectAll() {
        if (selectAllFiltered) {
            setSelectAllFiltered(false);
            setSelectedIds([]);
            return;
        }
        setSelectAllFiltered(true);
        setSelectedIds(rows.map((row) => row.id));
    }

    async function handleExportStandard() {
        if (selectedIds.length === 0 && !selectAllFiltered) {
            setExportError("Selecione ao menos um produto para exportar.");
            return;
        }
        try {
            setExporting(true);
            setExportError(null);
            await window.alfadime.purchases.exportExcel({
                selectedIds: selectAllFiltered ? null : selectedIds,
                selectAllFiltered,
                filters: { ...filters, pageSize: currentPageSize },
                visibleColumns,
                columnOrder
            });
        } catch (exportErr) {
            console.error(exportErr);
            setExportError(exportErr.message || "Erro ao exportar.");
        } finally {
            setExporting(false);
        }
    }

    function handleVisibleColumnsChange(newColumns) {
        setVisibleColumns(newColumns);
    }

    function handleColumnOrderChange(newOrder) {
        setColumnOrder(newOrder);
    }

    return (
        <main className="purchases-page">
            <div className="purchases-title-bar">
                <h1>Compras</h1>
                <button
                    type="button"
                    className="purchases-filters-toggle"
                    onClick={() => setFiltersPanelOpen((current) => !current)}
                >
                    {filtersPanelOpen ? "Fechar filtros e ações" : "Filtros e ações"}
                </button>
            </div>

            {filtersPanelOpen && (
                <section className="purchases-floating-panel">
                    <div className="purchases-floating-panel-header">
                        <strong>Filtros e ações</strong>
                        <button
                            type="button"
                            onClick={() => setFiltersPanelOpen(false)}
                            aria-label="Fechar filtros e ações"
                            title="Fechar"
                        >
                            ×
                        </button>
                    </div>

                    <div className="purchases-panel-section">
                        <div className="purchases-panel-section-title">Filtros</div>
                        <PurchaseFilters
                            filters={filters}
                            onFiltersChange={updateFilters}
                        />
                    </div>

                    <div className="purchases-panel-section">
                        <div className="purchases-panel-section-title">Metas de estoque por curva</div>
                        <PurchaseCurveTargets
                            curveDays={filters.curveDays}
                            rows={rows}
                            onCurveDaysChange={updateCurveDays}
                        />
                    </div>

                    <div className="purchases-panel-section">
                        <div className="purchases-panel-section-title">Resumo</div>
                        <div className="purchases-panel-summary-grid">
                            <div className="purchases-panel-summary-item">
                                <small>Produtos exibidos</small>
                                <strong>{summary.products}</strong>
                            </div>
                            <div className="purchases-panel-summary-item">
                                <small>Itens críticos</small>
                                <strong>{summary.criticalProducts}</strong>
                            </div>
                            <div className="purchases-panel-summary-item">
                                <small>Qtde. com sugestão</small>
                                <strong>{new Intl.NumberFormat("pt-BR").format(summary.suggestedQuantity)}</strong>
                            </div>
                            <div className="purchases-panel-summary-item">
                                <small>Valor sugerido</small>
                                <strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(summary.suggestedValue || 0)}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="purchases-panel-section">
                        <div className="purchases-panel-section-title">Ações</div>
                        <div className="purchases-panel-actions">
                            <button
                                type="button"
                                className="purchases-panel-action-button"
                                onClick={handleExportStandard}
                                disabled={exporting || (selectedIds.length === 0 && !selectAllFiltered)}
                            >
                                {exporting ? "Exportando..." : "Exportar Excel"}
                            </button>

                            <div className="purchases-panel-column-selector-wrapper">
                                <PurchaseColumnSelector
                                    columns={PURCHASE_COLUMNS}
                                    visibleColumns={visibleColumns}
                                    columnOrder={columnOrder}
                                    onVisibleColumnsChange={handleVisibleColumnsChange}
                                    onColumnOrderChange={handleColumnOrderChange}
                                />
                            </div>

                            <button
                                type="button"
                                className="purchases-panel-action-button primary"
                                onClick={handleSync}
                                disabled={syncing}
                            >
                                {syncing ? "Sincronizando..." : "Atualizar banco de dados"}
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {error && (
                <div className="purchases-error">
                    <strong>Erro:</strong> {error}
                </div>
            )}

            {exportError && (
                <div className="purchases-error">
                    <strong>Erro:</strong> {exportError}
                </div>
            )}

            <section className="purchases-card">
                <div className="purchases-card-header">
                    <div>
                        <strong>Sugestões de compras</strong>
                        <span>
                            Exibindo {rows.length} de {pagination.total} produtos.
                            Quantidade e valor unitário podem ser alterados manualmente.
                        </span>
                    </div>

                    <div className="purchases-selection-info">
                        <strong>{selectedIds.length}</strong> selecionados
                        {selectAllFiltered && " (todos os filtrados)"}
                    </div>
                </div>

                {loading ? (
                    <div className="purchases-loading">
                        Calculando sugestões de compra...
                    </div>
                ) : (
                    <PurchaseTable
                        rows={rows}
                        columns={PURCHASE_COLUMNS}
                        visibleColumns={visibleColumns}
                        columnOrder={columnOrder}
                        selectedIds={selectedIds}
                        selectAllFiltered={selectAllFiltered}
                        onToggleSelection={toggleSelected}
                        onToggleAll={toggleSelectAll}
                    />
                )}

                <ProductPagination
                    pagination={pagination}
                    onPageChange={changePage}
                />
            </section>
        </main>
    );
}