import { useState } from "react";


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
    const [actionsMenuOpen, setActionsMenuOpen] = useState(false);


    function closeActionsMenu() {
        setActionsMenuOpen(false);
    }


    return (
        <header className="price-pending-toolbar">
            <div className="price-pending-title">
                <span>Gestão comercial</span>


                <h1>Preços e Pendências</h1>
            </div>


            <div className="price-pending-toolbar-actions">
                <div className="price-pending-actions-menu">
                    <button
                        type="button"
                        className="price-pending-filters-toggle"
                        onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                    >
                        Filtros e Ações
                    </button>


                    {actionsMenuOpen && (
                        <div className="price-pending-actions-dropdown">
                            <button
                                type="button"
                                className="price-pending-filters-toggle"
                                onClick={() => {
                                    onToggleFilters();
                                    closeActionsMenu();
                                }}
                            >
                                {filtersPanelOpen ? "Fechar filtros" : "Filtros"}
                            </button>


                            {canRefresh && (
                                <button
                                    type="button"
                                    className="price-pending-filters-toggle"
                                    onClick={() => {
                                        onRefresh();
                                        closeActionsMenu();
                                    }}
                                    disabled={refreshing || readOnly}
                                >
                                    {refreshing ? "Atualizando..." : "Atualizar"}
                                </button>
                            )}


                            {policyIssuesCount > 0 && (
                                <button
                                    type="button"
                                    className="price-pending-filters-toggle"
                                    onClick={() => {
                                        onShowPolicyIssues();
                                        closeActionsMenu();
                                    }}
                                    disabled={policyIssuesLoading}
                                    title="Ver arquivos de preços fora do padrão"
                                >
                                    Fora do padrão ({policyIssuesCount})
                                </button>
                            )}


                            {canViewIgnoredFiles && ignoredFilesCount > 0 && (
                                <button
                                    type="button"
                                    className="price-pending-filters-toggle"
                                    onClick={() => {
                                        onShowIgnoredFiles();
                                        closeActionsMenu();
                                    }}
                                    title="Ver arquivos ignorados"
                                >
                                    Ignorados ({ignoredFilesCount})
                                </button>
                            )}


                            <button
                                type="button"
                                className="price-pending-filters-toggle"
                                onClick={() => {
                                    onReloadPolicyIssues();
                                    closeActionsMenu();
                                }}
                                disabled={policyIssuesLoading}
                                title="Verificar novamente os arquivos de preços"
                            >
                                {policyIssuesLoading
                                    ? "Verificando..."
                                    : "Verificar padrão"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
