import {
    NOTIFICATION_PRIORITY_LABELS,
    NOTIFICATION_STATUS_LABELS,
    NOTIFICATION_TYPE_LABELS
} from "../constants/notifications.constants";


const SOURCE_MODULE_LABELS = {
    products: "Produtos",
    "price-pending": "Preços e Pendências",
    "industry-contacts": "Contatos",
    purchases: "Compras"
};


function formatDate(value) {
    if (!value) {
        return "-";
    }


    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }


    return date.toLocaleString("pt-BR");
}


function getValue(item, keys) {
    for (const key of keys) {
        const value = item?.[key];

        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }


    return "-";
}


export default function NotificationsTable({
    notifications = []
}) {
    const safeNotifications = Array.isArray(notifications)
        ? notifications
        : [];


    if (safeNotifications.length === 0) {
        return (
            <div className="notifications-empty">
                Nenhuma notificação encontrada.
            </div>
        );
    }


    return (
        <div className="notifications-table-wrapper">
            <table className="notifications-table">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Título</th>
                        <th>Mensagem</th>
                        <th>Prioridade</th>
                        <th>Situação</th>
                        <th>Filial</th>
                        <th>Origem</th>
                        <th>Data</th>
                    </tr>
                </thead>


                <tbody>
                    {safeNotifications.map((notification) => {
                        const type = getValue(notification, [
                            "type",
                            "notification_type"
                        ]);

                        const priority = getValue(notification, ["priority"]);
                        const status = getValue(notification, ["status"]);
                        const title = getValue(notification, ["title", "subject"]);
                        const message = getValue(notification, ["message", "description"]);
                        const branch = getValue(notification, ["branch"]);
                        const sourceModule = getValue(notification, ["source_module"]);
                        const createdAt = getValue(notification, [
                            "created_at",
                            "createdAt",
                            "date"
                        ]);


                        return (
                            <tr key={notification.id}>
                                <td>
                                    {NOTIFICATION_TYPE_LABELS[type] || type}
                                </td>

                                <td>{title}</td>

                                <td className="notifications-message-cell">
                                    {message}
                                </td>

                                <td>
                                    <span
                                        className={`notification-priority notification-priority-${priority}`}
                                    >
                                        {NOTIFICATION_PRIORITY_LABELS[priority] || priority}
                                    </span>
                                </td>

                                <td>
                                    {NOTIFICATION_STATUS_LABELS[status] || status}
                                </td>

                                <td>{branch}</td>

                                <td>
                                    {SOURCE_MODULE_LABELS[sourceModule] || sourceModule}
                                </td>

                                <td>{formatDate(createdAt)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
