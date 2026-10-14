import {
    Factory,
    Users
} from "lucide-react";



function IndustryContactsFilters({
    filters,
    branches,
    cargos,
    summary,
    onFiltersChange,
    onClear
}) {
    function updateFilter(field, value) {
        onFiltersChange({
            ...filters,
            [field]: value
        });
    }



    return (
        <section className="industry-contacts-filter-panel">
            <div className="industry-contacts-filter-summary">
                <div className="industry-contacts-summary-card">
                    <span className="industry-contacts-summary-icon">
                        <Factory
                            size={16}
                            strokeWidth={1.8}
                        />
                    </span>

                    <span>Total</span>

                    <strong>
                        {summary.total}
                    </strong>
                </div>

                <div className="industry-contacts-summary-card">
                    <span className="industry-contacts-summary-icon">
                        <Users
                            size={16}
                            strokeWidth={1.8}
                        />
                    </span>

                    <span>Com contato</span>

                    <strong>
                        {summary.withContact}
                    </strong>
                </div>

                <div className="industry-contacts-summary-card">
                    <span className="industry-contacts-summary-icon warning">
                        <Users
                            size={16}
                            strokeWidth={1.8}
                        />
                    </span>

                    <span>Sem contato</span>

                    <strong>
                        {summary.withoutContact}
                    </strong>
                </div>
            </div>

            <div className="industry-contacts-filter-fields">
                <label className="industry-contacts-search">
                    <span>Buscar</span>

                    <input
                        type="search"
                        placeholder="Indústria, responsável ou e-mail"
                        value={filters.search}
                        onChange={(event) =>
                            updateFilter(
                                "search",
                                event.target.value
                            )
                        }
                    />
                </label>

                <label>
                    <span>Filial</span>

                    <select
                        value={filters.branch}
                        onChange={(event) =>
                            updateFilter(
                                "branch",
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            Todas
                        </option>

                        {branches.map((branch) => (
                            <option
                                key={branch}
                                value={branch}
                            >
                                {branch}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Cargo</span>

                    <select
                        value={filters.cargo}
                        onChange={(event) =>
                            updateFilter(
                                "cargo",
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            Todos
                        </option>

                        {cargos.map((cargo) => (
                            <option
                                key={cargo}
                                value={cargo}
                            >
                                {cargo}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>Situação</span>

                    <select
                        value={filters.status}
                        onChange={(event) =>
                            updateFilter(
                                "status",
                                event.target.value
                            )
                        }
                    >
                        <option value="all">
                            Todos
                        </option>

                        <option value="with-contact">
                            Com contato
                        </option>

                        <option value="without-contact">
                            Sem contato
                        </option>
                    </select>
                </label>

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



export default IndustryContactsFilters;