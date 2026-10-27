import { Download, Plus, Star, Factory, Users } from "lucide-react";

export default function IndustryContactsFilters({
    filters,
    branches = [],
    cargos = [],
    summary,
    canEdit = false,
    canExport = false,
    canCharge = false,
    loading = false,
    saving = false,
    deleting = false,
    exporting = false,
    charging = false,
    hasRows = false,
    hasFilteredRows = false,
    onFiltersChange,
    onClear,
    onCreate,
    onExport,
    onOpenChargeFavorites
}) {
    function updateFilter(field, value) {
        onFiltersChange({ ...filters, [field]: value });
    }

    return (
        <section className="industry-contacts-filter-panel">
            <div className="industry-contacts-filter-summary">
                <div className="industry-contacts-summary-card">
                    <span className="industry-contacts-summary-icon">
                        <Factory size={16} strokeWidth={1.8} />
                    </span>

                    <span>Total</span>

                    <strong>{summary.total}</strong>
                </div>

                <div className="industry-contacts-summary-card">
                    <span className="industry-contacts-summary-icon">
                        <Users size={16} strokeWidth={1.8} />
                    </span>

                    <span>Com contato</span>

                    <strong>{summary.withContact}</strong>
                </div>

                <div className="industry-contacts-summary-card">
                    <span className="industry-contacts-summary-icon warning">
                        <Users size={16} strokeWidth={1.8} />
                    </span>

                    <span>Sem contato</span>

                    <strong>{summary.withoutContact}</strong>
                </div>
            </div>

            <div className="industry-contacts-filter-fields">
                <label className="industry-contacts-search">
                    <span>Buscar</span>

                    <input
                        type="search"
                        placeholder="Indústria, responsável ou e-mail"
                        value={filters.search || ""}
                        onChange={(event) => updateFilter("search", event.target.value)}
                    />
                </label>

                <label>
                    <span>Filial</span>

                    <select
                        value={filters.branch || ""}
                        onChange={(event) => updateFilter("branch", event.target.value)}
                    >
                        <option value="">Todas</option>

                        {branches.map((branch) => (
                            <option key={branch} value={branch}>
                                {branch}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Cargo</span>

                    <select
                        value={filters.cargo || ""}
                        onChange={(event) => updateFilter("cargo", event.target.value)}
                    >
                        <option value="">Todos</option>

                        {cargos.map((cargo) => (
                            <option key={cargo} value={cargo}>
                                {cargo}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Situação</span>

                    <select
                        value={filters.status || "all"}
                        onChange={(event) => updateFilter("status", event.target.value)}
                    >
                        <option value="all">Todos</option>
                        <option value="with-contact">Com contato</option>
                        <option value="without-contact">Sem contato</option>
                    </select>
                </label>

                <label>
                    <span>Atualização de preços e pendências</span>

                    <select
                        value={filters.charge_update || ""}
                        onChange={(event) => updateFilter("charge_update", event.target.value)}
                    >
                        <option value="">Todos</option>
                        <option value="prices_missing">Precisa atualizar preços</option>
                        <option value="pending_missing">Precisa atualizar pendências</option>
                        <option value="both_missing">Precisa atualizar ambos</option>
                        <option value="updated">Preços e pendências atualizados</option>
                    </select>
                </label>
            </div>

            <div className="industry-contacts-filter-actions">
                {canEdit && (
                    <button
                        type="button"
                        className="industry-contacts-action-button"
                        onClick={onCreate}
                        disabled={loading || saving || deleting}
                    >
                        <Plus size={15} strokeWidth={1.9} />

                        Novo contato
                    </button>
                )}

                {canExport && (
                    <button
                        type="button"
                        className="industry-contacts-action-button primary"
                        onClick={onExport}
                        disabled={loading || exporting || !hasRows}
                    >
                        <Download size={15} strokeWidth={1.9} />

                        {exporting ? "Exportando..." : "Exportar Excel"}
                    </button>
                )}

                {canCharge && (
                    <button
                        type="button"
                        className="industry-contacts-action-button primary"
                        onClick={onOpenChargeFavorites}
                        disabled={loading || charging || saving || deleting}
                    >
                        <Star size={15} strokeWidth={1.9} />

                        Favoritos de cobrança
                    </button>
                )}

                <button
                    type="button"
                    className="industry-contacts-clear-button"
                    onClick={onClear}
                >
                    Limpar filtros
                </button>
            </div>
        </section>
    );
}