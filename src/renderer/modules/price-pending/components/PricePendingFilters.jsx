import { useState } from "react";


import { BRANCHES, COLUMN_GROUPS } from "../constants/price-pending.constants";


export default function PricePendingFilters({
    searchTerm,
    visibleColumns,
    filterUpdated,
    filterOutdated,
    filterBranch,
    newLaboratory,
    hasActiveFilters,
    permissions,
    onSearchTermChange,
    onVisibleColumnsChange,
    onFilterUpdatedChange,
    onFilterOutdatedChange,
    onFilterBranchChange,
    onNewLaboratoryChange,
    onAddLaboratory,
    onClearFilters,
    onClose,
    onExport
}) {
    const [isAdding, setIsAdding] = useState(false);


    async function handleSubmit(event) {
        event.preventDefault();

        setIsAdding(true);

        try {
            const created = await onAddLaboratory(newLaboratory);

            if (created) {
                onNewLaboratoryChange("");
            }
        } finally {
            setIsAdding(false);
        }
    }


    return (
        <section className="price-pending-floating-panel">
            <div className="price-pending-floating-panel-header">
                <strong>Filtros e ações</strong>


                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar filtros"
                    title="Fechar"
                >
                    ×
                </button>
            </div>


            <div className="price-pending-panel-content">
                <div className="price-pending-panel-left">
                    <div className="price-pending-filters-section">
                        <h3>Buscar laboratório</h3>


                        <input
                            type="text"
                            value={searchTerm}
                            disabled={!permissions.canSearch}
                            onChange={(event) =>
                                onSearchTermChange(event.target.value)
                            }
                            placeholder="Buscar laboratório..."
                        />
                    </div>


                    {(permissions.canFilterUpdated ||
                        permissions.canFilterOutdated) && (
                        <div className="price-pending-filters-section">
                            <h3>Situação</h3>


                            <div className="price-pending-filter-options">
                                {permissions.canFilterUpdated && (
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={filterUpdated}
                                            onChange={(event) => {
                                                onFilterUpdatedChange(
                                                    event.target.checked
                                                );


                                                if (event.target.checked) {
                                                    onFilterOutdatedChange(false);
                                                }
                                            }}
                                        />

                                        Atualizados
                                    </label>
                                )}


                                {permissions.canFilterOutdated && (
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={filterOutdated}
                                            onChange={(event) => {
                                                onFilterOutdatedChange(
                                                    event.target.checked
                                                );


                                                if (event.target.checked) {
                                                    onFilterUpdatedChange(false);
                                                }
                                            }}
                                        />

                                        Desatualizados
                                    </label>
                                )}
                            </div>
                        </div>
                    )}


                    {permissions.canFilterBranch && (
                        <div className="price-pending-filters-section">
                            <h3>Filial</h3>


                            <select
                                value={filterBranch}
                                onChange={(event) =>
                                    onFilterBranchChange(event.target.value)
                                }
                            >
                                <option value="">Todas as filiais</option>


                                {BRANCHES.map((branch) => (
                                    <option key={branch} value={branch}>
                                        {branch}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}


                    <div className="price-pending-filters-section">
                        <h3>Colunas visíveis</h3>


                        <div className="price-pending-column-toggles">
                            {COLUMN_GROUPS.map((group) => (
                                <label key={group.key}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(
                                            visibleColumns[group.key]
                                        )}
                                        disabled={
                                            !permissions.canViewFunction(
                                                permissions.moduleKey,
                                                group.key
                                            )
                                        }
                                        onChange={(event) => {
                                            onVisibleColumnsChange({
                                                ...visibleColumns,
                                                [group.key]:
                                                    event.target.checked
                                            });
                                        }}
                                    />

                                    {group.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>


                <div className="price-pending-panel-right">
                    {permissions.canAddLaboratory && (
                        <div className="price-pending-filters-section">
                            <h3>Adicionar laboratório</h3>


                            <form
                                className="price-pending-add-form-inline"
                                onSubmit={handleSubmit}
                            >
                                <input
                                    type="text"
                                    value={newLaboratory}
                                    disabled={isAdding}
                                    onChange={(event) =>
                                        onNewLaboratoryChange(event.target.value)
                                    }
                                    placeholder="Laboratório - código"
                                />


                                <button
                                    type="submit"
                                    disabled={isAdding}
                                >
                                    {isAdding ? "Salvando..." : "Adicionar"}
                                </button>
                            </form>
                        </div>
                    )}


                    {permissions.canExport && (
                        <div className="price-pending-filters-section">
                            <h3>Exportar</h3>


                            <button
                                type="button"
                                className="price-pending-button"
                                onClick={onExport}
                            >
                                Exportar Excel
                            </button>
                        </div>
                    )}


                    <div className="price-pending-filters-section">
                        <h3>Filtros</h3>


                        <button
                            type="button"
                            className="price-pending-clear-button"
                            onClick={onClearFilters}
                            disabled={!hasActiveFilters}
                        >
                            Limpar filtros
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
