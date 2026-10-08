import {
    NOTIFICATION_PRIORITY_LABELS,
    NOTIFICATION_STATUS_LABELS,
    NOTIFICATION_TYPE_LABELS
} from "../constants/notifications.constants";

function formatDate(
    value
) {
    if (!value) {
        return "-";
    }

    const date = new Date(
        value
    );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date.toLocaleString(
        "pt-BR"
    );
}

function getNotificationValue(
    notification,
    keys
) {
    for (const key of keys) {
        if (
            notification?.[key] !==
                undefined &&
            notification?.[key] !==
                null &&
            notification?.[key] !== ""
        ) {
            return notification[key];
        }
    }

    return "-";
}

function NotificationsTable({
    notifications = []
}) {
    return (
        <div className="notifications-table-wrapper">
            <table className="notifications-table">
                <thead>
                    <tr>
                        <th>
                            Tipo
                        </th>

                        <th>
                            Título
                        </th>

                        <th>
                            Mensagem
                        </th>

                        <th>
                            Prioridade
                        </th>

                        <th>
                            Situação
                        </th>

                        <th>
                            Filial
                        </th>

                        <th>
                            Origem
                        </th>

                        <th>
                            Data
                        </th>

                        <th>
                            Estado
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {notifications.map(
                        (notification) => {
                            const id =
                                notification.id;

                            const type =
                                getNotificationValue(
                                    notification,
                                    [
                                        "type",
                                        "notification_type"
                                    ]
                                );

                            const priority =
                                getNotificationValue(
                                    notification,
                                    [
                                        "priority"
                                    ]
                                );

                            const status =
                                getNotificationValue(
                                    notification,
                                    [
                                        "status"
                                    ]
                                );

                            const title =
                                getNotificationValue(
                                    notification,
                                    [
                                        "title",
                                        "subject"
                                    ]
                                );

                            const message =
                                getNotificationValue(
                                    notification,
                                    [
                                        "message",
                                        "description"
                                    ]
                                );

                            const branch =
                                getNotificationValue(
                                    notification,
                                    [
                                        "branch"
                                    ]
                                );

                            const sourceModule =
                                getNotificationValue(
                                    notification,
                                    [
                                        "source_module"
                                    ]
                                );

                            const createdAt =
                                getNotificationValue(
                                    notification,
                                    [
                                        "created_at",
                                        "createdAt",
                                        "date"
                                    ]
                                );

                            return (
                                <tr
                                    key={id}
                                >
                                    <td>
                                        {
                                            NOTIFICATION_TYPE_LABELS[
                                                type
                                            ] ||
                                                type
                                        }
                                    </td>

                                    <td>
                                        {title}
                                    </td>

                                    <td className="notifications-message-cell">
                                        {message}
                                    </td>

                                    <td>
                                        <span
                                            className={`notification-priority notification-priority-${priority}`}
                                        >
                                            {
                                                NOTIFICATION_PRIORITY_LABELS[
                                                    priority
                                                ] ||
                                                    priority
                                            }
                                        </span>
                                    </td>

                                    <td>
                                        {
                                            NOTIFICATION_STATUS_LABELS[
                                                status
                                            ] ||
                                                status
                                        }
                                    </td>

                                    <td>
                                        {branch}
                                    </td>

                                    <td className="notifications-source-cell">
                                        {sourceModule}
                                    </td>

                                    <td>
                                        {formatDate(
                                            createdAt
                                        )}
                                    </td>

                                    <td>
                                        <span className="notifications-automatic-label">
                                            Automática
                                        </span>
                                    </td>
                                </tr>
                            );
                        }
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default NotificationsTable;