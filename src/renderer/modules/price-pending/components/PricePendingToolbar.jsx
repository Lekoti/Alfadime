export default function PricePendingToolbar({
    filtersPanelOpen,
    ignoredFilesCount,
    policyIssuesCount,
    policyIssuesLoading,
    canRefresh,
    canViewIgnoredFiles,
    refreshing,
    readOnly,
    onToggleFilters,
    onRefresh,
    onShowIgnoredFiles,
    onShowPolicyIssues,
    onReloadPolicyIssues
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


                {policyIssuesCount > 0 && (
                    <button
                        type="button"
                        className="price-pending-policy-button"
                        onClick={onShowPolicyIssues}
                        disabled={policyIssuesLoading}
                        title="Ver arquivos de preços fora do padrão"
                    >
                        Fora do padrão ({policyIssuesCount})
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


                <button
                    type="button"
                    className="price-pending-filters-toggle"
                    onClick={onReloadPolicyIssues}
                    disabled={policyIssuesLoading}
                    title="Verificar novamente os arquivos de preços"
                >
                    {policyIssuesLoading
                        ? "Verificando..."
                        : "Verificar padrão"}
                </button>
            </div>
        </header>
    );
}
