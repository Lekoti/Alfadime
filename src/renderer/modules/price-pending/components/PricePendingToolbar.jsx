export default function PricePendingToolbar({
    filtersPanelOpen,
    onToggleFilters
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
                    {filtersPanelOpen
                        ? "Fechar filtros e ações"
                        : "Filtros e Ações"}
                </button>
            </div>
        </header>
    );
}
