function getApi() {
    if (
        !window.alfadime ||
        !window.alfadime.notifications
    ) {
        throw new Error(
            "API de notificações não disponível."
        );
    }

    return window.alfadime.notifications;
}

export async function listNotifications(
    filters = {}
) {
    return getApi().list(
        filters
    );
}

export async function getNotificationById(
    id
) {
    return getApi().getById(
        id
    );
}

export async function createNotification(
    data
) {
    return getApi().create(
        data
    );
}

export async function markNotificationAsRead(
    id
) {
    return getApi().markAsRead(
        id
    );
}

export async function dismissNotification(
    id
) {
    return getApi().dismiss(
        id
    );
}

export async function updateNotificationStatus(
    payload
) {
    return getApi().updateStatus(
        payload
    );
}

export async function deleteNotification(
    id
) {
    return getApi().delete(
        id
    );
}

export async function getNotificationSummary(
    filters = {}
) {
    return getApi().summary(
        filters
    );
}