export default function PricePendingToolbar({
    filtersPanelOpen,
    ignoredFilesCount,
    canRefresh,
    canViewIgnoredFiles,
    refreshing,
    readOnly,
    onToggleFilters,
    onRefresh,
    onShowIgnoredFiles
}) {
    return (
        <header className="price-pending-toolbar">
            <div className="price-pending-title">
                <span>Gestão comercial</span>

                <h1>Preços e Pendências</h1>
            </div>


            <div className="price-pending-toolbar-actions">
                <button
                    type="button"
                    className="price-pending-filters-toggle"
                    onClick={onToggleFilters}
                >
                    {filtersPanelOpen ? "Fechar filtros" : "Filtros"}
                </button>


                {canRefresh && (
                    <button
                        type="button"
                        className="price-pending-refresh-button"
                        onClick={onRefresh}
                        disabled={refreshing || readOnly}
                    >
                        {refreshing ? "Atualizando..." : "Atualizar"}
                    </button>
                )}


                {canViewIgnoredFiles && ignoredFilesCount > 0 && (
                    <button
                        type="button"
                        className="price-pending-ignored-button"
                        onClick={onShowIgnoredFiles}
                        title="Ver arquivos ignorados"
                    >
                        Ignorados ({ignoredFilesCount})
                    </button>
                )}
            </div>
        </header>
    );
}
