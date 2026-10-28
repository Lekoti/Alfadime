import {
    DEFAULT_FILTERS,
    STATUS_OPTIONS
} from "../constants/merchandise-purchases.constants";

function SelectField({ label, value, allLabel, items, onChange }) {
    return (
        <div className="mp-filter-field">
            <label>{label}</label>
            <select value={value} onChange={(event) => onChange(event.target.value)}>
                <option value="">{allLabel}</option>
                {items.map((item) => (
                    <option key={item} value={item}>
                        {item}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function MerchandiseFilters({ filters, options, onChange }) {
    function update(key, value) {
        onChange({ ...filters, [key]: value });
    }

    return (
        <section className="mp-filters">
            <div className="mp-search-field">
                <label>Buscar</label>
                <input
                    type="search"
                    value={filters.search}
                    placeholder="Código, barras, descrição ou laboratório"
                    onChange={(event) => update("search", event.target.value)}
                />
            </div>

            <SelectField
                label="Empresa"
                value={filters.company}
                allLabel="Todas"
                items={options.companies}
                onChange={(value) => update("company", value)}
            />

            <SelectField
                label="Laboratório"
                value={filters.laboratory}
                allLabel="Todos"
                items={options.laboratories}
                onChange={(value) => update("laboratory", value)}
            />

            <SelectField
                label="Tipo de produto"
                value={filters.group}
                allLabel="Todos"
                items={options.groups}
                onChange={(value) => update("group", value)}
            />

            <SelectField
                label="Curva"
                value={filters.curve}
                allLabel="Todas"
                items={options.curves}
                onChange={(value) => update("curve", value)}
            />

            <div className="mp-filter-field">
                <label>Situação</label>
                <select
                    value={filters.status}
                    onChange={(event) => update("status", event.target.value)}
                >
                    {STATUS_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>

            <button
                type="button"
                className="mp-clear-button"
                onClick={() => onChange(DEFAULT_FILTERS)}
            >
                Limpar
            </button>
        </section>
    );
}
