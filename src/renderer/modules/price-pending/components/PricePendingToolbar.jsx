

export default function PricePendingToolbar({
    filtersPanelOpen,
    onToggleFilters
}) {
    return (
        <header className="price-pending-toolbar">
            <div className="price-pending-title">
                <span>GestÃ£o comercial</span>


                <h1>PreÃ§os e PendÃªncias</h1>
            </div>


            <div className="price-pending-toolbar-actions">
                <button
                    type="button"
                    className="price-pending-filters-toggle"
                    onClick={onToggleFilters}
                >
                    {filtersPanelOpen
                        ? "Fechar filtros e aÃ§Ãµes"
                        : "Filtros e AÃ§Ãµes"}
                </button>
            </div>
        </header>
    );
}

