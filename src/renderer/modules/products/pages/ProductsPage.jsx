import React, {
    useState
} from "react";


import ExportAdvancedModal from
    "../../../shared/components/ExportAdvancedModal";


import ProductColumnSelector from
    "../components/ProductColumnSelector";


import ProductFilters from
    "../components/ProductFilters";


import ProductPagination from
    "../components/ProductPagination";


import ProductTable from
    "../components/ProductTable";


import {
    DEFAULT_PRODUCT_COLUMN_ORDER,
    DEFAULT_VISIBLE_PRODUCT_COLUMNS,
    PRODUCT_COLUMNS
} from "../constants/products.constants";


import {
    PRODUCTS_EXPORT_COLUMNS
} from "../constants/products-export.constants";


import {
    useProducts
} from "../hooks/useProducts";


import { useModuleState } from "../../../hooks/useModuleState";


import "../styles/products.css";


const MODULE_ID = 'products';


const INITIAL_STATE = {
    filters: {
        search: "",
        branch: "",
        brand: "",
        group_code: "",
        category_code: "",
        controls_lot: "",
        active: "",
        page: 1,
        pageSize: 50
    },
    visibleColumns: DEFAULT_VISIBLE_PRODUCT_COLUMNS,
    columnOrder: DEFAULT_PRODUCT_COLUMN_ORDER,
    filtersPanelOpen: false
};


function ProductsPage() {
    const [state, setField] = useModuleState(MODULE_ID, INITIAL_STATE);


    const filters = state.filters;
    const visibleColumns = state.visibleColumns;
    const columnOrder = state.columnOrder || DEFAULT_PRODUCT_COLUMN_ORDER;
    const filtersPanelOpen = state.filtersPanelOpen;


    const [
        exportModalOpen,
        setExportModalOpen
    ] = useState(false);


    const [
        filterOptions,
        setFilterOptions
    ] = useState({
        branch: [],
        category_code: [],
        group_code: [],
        brand: []
    });


    const {
        products,
        pagination,
        loading,
        syncing,
        error,
        lastSync,
        synchronize
    } = useProducts(filters);


    function updateFilters(nextFilters) {
        setField('filters', {
            ...nextFilters,
            page: 1,
            pageSize: 50
        });
    }


    function changePage(page) {
        setField('filters', {
            ...filters,
            page,
            pageSize: 50
        });
    }


    function setFiltersPanelOpen(next) {
        setField('filtersPanelOpen', typeof next === 'function' ? next(filtersPanelOpen) : next);
    }


    function setVisibleColumns(next) {
        setField('visibleColumns', typeof next === 'function' ? next(visibleColumns) : next);
    }


    function setColumnOrder(next) {
        setField('columnOrder', typeof next === 'function' ? next(columnOrder) : next);
    }


    async function handleSync() {
    const confirmed = window.confirm(
        "Atualizar Produtos com base na planilha agora?\n\n" +
        "Cadastros novos serão incluídos e cadastros existentes serão " +
        "atualizados conforme os dados disponíveis na planilha.\n\n" +
        "Registros que não estiverem na planilha não serão apagados " +
        "automaticamente."
    );

    if (!confirmed) {
        return;
    }

    try {
        await synchronize();
    } catch (syncError) {
        console.error(syncError);
    }
}


    async function handleExport(exportData) {
        if (exportData?.type === "preview") {
            return window.alfadime.export.productsPreview?.(
                exportData.filters,
                exportData.columns
            );
        }

        if (exportData?.type === "export") {
            return window.alfadime.export.productsAdvanced(
                exportData.filters,
                exportData.columns
            );
        }

        return window.alfadime.export.products(
            filters,
            exportData
        );
    }


    async function loadFilterOptions() {
        try {
            const [
                branchOptions,
                categoryOptions,
                groupOptions,
                brandOptions
            ] = await Promise.all([
                window.alfadime.products.getFilterOptions?.("branch") || [],
                window.alfadime.products.getFilterOptions?.("category_code") || [],
                window.alfadime.products.getFilterOptions?.("group_code") || [],
                window.alfadime.products.getFilterOptions?.("brand") || []
            ]);

            setFilterOptions({
                branch: branchOptions,
                category_code: categoryOptions,
                group_code: groupOptions,
                brand: brandOptions
            });
        } catch (optionsError) {
            console.warn("Erro ao carregar opcoes de filtro", optionsError);
        }
    }


    React.useEffect(() => {
        if (exportModalOpen) {
            loadFilterOptions();
        }
    }, [exportModalOpen]);


    return (
        <main className="products-page">
            <header className="products-header">
                <div className="products-header-title">
                    <h1>Produtos</h1>
                </div>


                <div className="products-header-actions">
                    <button
                        type="button"
                        className="products-filters-toggle"
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
                <section className="products-floating-panel">
                    <div className="products-floating-panel-header">
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


                    <div className="products-panel-actions-bar">
                        <button
                            type="button"
                            className="products-panel-action-button"
                            onClick={() =>
                                setExportModalOpen(true)
                            }
                        >
                            Exportar Excel
                        </button>


                        <ProductColumnSelector
                            columns={PRODUCT_COLUMNS}
                            visibleColumns={visibleColumns}
                            onVisibleColumnsChange={
                                setVisibleColumns
                            }
                            columnOrder={columnOrder}
                            onColumnOrderChange={setColumnOrder}
                            inline
                        />


                        <button
                            type="button"
                            className="products-panel-action-button"
                            onClick={handleSync}
                            disabled={syncing}
                        >
                            {syncing
                                ? "Sincronizando..."
                                : "Atualizar banco de dados"}
                        </button>
                    </div>


                    <ProductFilters
                        filters={filters}
                        onFiltersChange={updateFilters}
                    />
                </section>
            )}


            {error && (
                <div className="products-error">
                    <strong>Erro:</strong> {error}
                </div>
            )}


            <section className="products-card">
                <div className="products-card-header">
                    <div>
                        <strong>
                            Produtos encontrados
                        </strong>


                        <span>
                            {pagination.total} registros
                        </span>
                    </div>


                    {lastSync && (
                        <span className="products-sync-info">
                            Ultima sincronizacao concluida.
                        </span>
                    )}
                </div>


                {loading ? (
                    <div className="products-loading">
                        Carregando produtos...
                    </div>
                ) : (
                    <>
                        <ProductTable
                            products={products}
                            pageSize={pagination.pageSize}
                            columns={PRODUCT_COLUMNS}
                            visibleColumns={visibleColumns}
                            columnOrder={columnOrder}
                        />


                        <ProductPagination
                            pagination={pagination}
                            onPageChange={changePage}
                        />
                    </>
                )}
            </section>


            <ExportAdvancedModal
                open={exportModalOpen}
                title="Exportar Produtos"
                moduleKey="products"
                availableColumns={
                    PRODUCTS_EXPORT_COLUMNS
                }
                filterOptions={filterOptions}
                onClose={() =>
                    setExportModalOpen(false)
                }
                onExport={handleExport}
            />
        </main>
    );
}


export default ProductsPage;