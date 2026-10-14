import {
    NOTIFICATION_PRIORITY_LABELS,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUS_LABELS,
    NOTIFICATION_STATUSES,
    NOTIFICATION_TYPE_LABELS,
    NOTIFICATION_TYPES
} from "../constants/notifications.constants";


const SOURCE_MODULES = [
    { value: "product-audit", label: "Auditoria de Produtos" },
    {
        value: "products",
        label: "Produtos"
    },
    {
        value: "price-pending",
        label: "Preços e Pendências"
    },
    {
        value: "industry-contacts",
        label: "Contatos"
    },
    {
        value: "purchases",
        label: "Compras"
    }
];


function NotificationsFilters({
    filters,
    onChange,
    onClear,
    branches = []
}) {
    function handleChange(event) {
        const { name, value } = event.target;

        onChange({
            [name]: value
        });
    }


    return (
        <section className="notifications-filters">
            <div className="notifications-search-field">
                <label>Buscar</label>
                <input
                    type="search"
                    name="search"
                    value={filters.search || ""}
                    onChange={handleChange}
                    placeholder="Título, mensagem, indústria ou e-mail"
                />
            </div>


            <div className="notifications-filter-field">
                <label>Tipo</label>
                <select
                    name="type"
                    value={filters.type || ""}
                    onChange={handleChange}
                >
                    <option value="">Todos</option>

                    {Object.entries(NOTIFICATION_TYPES).map(([key, value]) => (
                        <option key={value} value={value}>
                            {NOTIFICATION_TYPE_LABELS[value] || key}
                        </option>
                    ))}
                </select>
            </div>


            <div className="notifications-filter-field">
                <label>Situação</label>
                <select
                    name="status"
                    value={filters.status || ""}
                    onChange={handleChange}
                >
                    <option value="">Todas</option>

                    {Object.entries(NOTIFICATION_STATUSES).map(([key, value]) => (
                        <option key={value} value={value}>
                            {NOTIFICATION_STATUS_LABELS[value] || key}
                        </option>
                    ))}
                </select>
            </div>


            <div className="notifications-filter-field">
                <label>Prioridade</label>
                <select
                    name="priority"
                    value={filters.priority || ""}
                    onChange={handleChange}
                >
                    <option value="">Todas</option>

                    {Object.entries(NOTIFICATION_PRIORITIES).map(([key, value]) => (
                        <option key={value} value={value}>
                            {NOTIFICATION_PRIORITY_LABELS[value] || key}
                        </option>
                    ))}
                </select>
            </div>


            <div className="notifications-filter-field">
                <label>Origem</label>
                <select
                    name="source_module"
                    value={filters.source_module || ""}
                    onChange={handleChange}
                >
                    <option value="">Todas</option>

                    {SOURCE_MODULES.map((module) => (
                        <option key={module.value} value={module.value}>
                            {module.label}
                        </option>
                    ))}
                </select>
            </div>


            <div className="notifications-filter-field">
                <label>Filial</label>
                <select
                    name="branch"
                    value={filters.branch || ""}
                    onChange={handleChange}
                >
                    <option value="">Todas</option>

                    {branches.map((branch) => (
                        <option key={branch} value={branch}>
                            {branch}
                        </option>
                    ))}
                </select>
            </div>


            <button
                type="button"
                className="notifications-clear-button"
                onClick={onClear}
            >
                Limpar
            </button>
        </section>
    );
}


export default NotificationsFilters;
