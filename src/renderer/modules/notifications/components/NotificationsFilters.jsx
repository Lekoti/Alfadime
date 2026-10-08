import {
    NOTIFICATION_PRIORITY_LABELS,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUS_LABELS,
    NOTIFICATION_STATUSES,
    NOTIFICATION_TYPE_LABELS,
    NOTIFICATION_TYPES
} from "../constants/notifications.constants";

function NotificationsFilters({
    filters,
    onChange,
    onClear,
    branches = []
}) {
    function handleChange(event) {
        const {
            name,
            value
        } = event.target;

        onChange({
            ...filters,
            [name]: value
        });
    }

    return (
        <section className="notifications-filter-panel">
            <div className="notifications-filter-fields">
                <label>
                    <span>
                        Buscar
                    </span>

                    <input
                        type="search"
                        name="search"
                        value={
                            filters.search || ""
                        }
                        onChange={
                            handleChange
                        }
                        placeholder={
                            "Título, mensagem, indústria ou e-mail"
                        }
                    />
                </label>

                <label>
                    <span>
                        Tipo
                    </span>

                    <select
                        name="type"
                        value={
                            filters.type || ""
                        }
                        onChange={
                            handleChange
                        }
                    >
                        <option value="">
                            Todos
                        </option>

                        {Object.entries(
                            NOTIFICATION_TYPES
                        ).map(
                            ([
                                key,
                                value
                            ]) => (
                                <option
                                    key={value}
                                    value={value}
                                >
                                    {
                                        NOTIFICATION_TYPE_LABELS[
                                            value
                                        ] ||
                                        key
                                    }
                                </option>
                            )
                        )}
                    </select>
                </label>

                <label>
                    <span>
                        Situação
                    </span>

                    <select
                        name="status"
                        value={
                            filters.status || ""
                        }
                        onChange={
                            handleChange
                        }
                    >
                        <option value="">
                            Todas
                        </option>

                        {Object.entries(
                            NOTIFICATION_STATUSES
                        ).map(
                            ([
                                key,
                                value
                            ]) => (
                                <option
                                    key={value}
                                    value={value}
                                >
                                    {
                                        NOTIFICATION_STATUS_LABELS[
                                            value
                                        ] ||
                                        key
                                    }
                                </option>
                            )
                        )}
                    </select>
                </label>

                <label>
                    <span>
                        Prioridade
                    </span>

                    <select
                        name="priority"
                        value={
                            filters.priority || ""
                        }
                        onChange={
                            handleChange
                        }
                    >
                        <option value="">
                            Todas
                        </option>

                        {Object.entries(
                            NOTIFICATION_PRIORITIES
                        ).map(
                            ([
                                key,
                                value
                            ]) => (
                                <option
                                    key={value}
                                    value={value}
                                >
                                    {
                                        NOTIFICATION_PRIORITY_LABELS[
                                            value
                                        ] ||
                                        key
                                    }
                                </option>
                            )
                        )}
                    </select>
                </label>

                <label>
                    <span>
                        Filial
                    </span>

                    <select
                        name="branch"
                        value={
                            filters.branch || ""
                        }
                        onChange={
                            handleChange
                        }
                    >
                        <option value="">
                            Todas
                        </option>

                        {branches.map(
                            (branch) => (
                                <option
                                    key={branch}
                                    value={branch}
                                >
                                    {branch}
                                </option>
                            )
                        )}
                    </select>
                </label>

                <button
                    type="button"
                    className={
                        "notifications-clear-button"
                    }
                    onClick={onClear}
                >
                    Limpar filtros
                </button>
            </div>
        </section>
    );
}

export default NotificationsFilters;