import { NOTIFICATION_TYPE_LABELS } from "../constants/notifications.constants";

const SOURCE_MODULE_LABELS = {
    products: "Produtos",
    "product-audit": "Auditoria de Produtos",
    "product-corrections": "Correções de Produtos",
    "price-pending": "Preços e Pendências",
    "industry-contacts": "Contatos",
    purchases: "Compras"
};

function text(value) {
    return value === null || value === undefined ? "" : String(value).trim();
}

function getValue(item, keys) {
    for (const key of keys) {
        const value = text(item?.[key]);
        if (value) return value;
    }
    return "";
}

function getMetadata(value) {
    if (!value) return {};
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : {};
    } catch {
        return {};
    }
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? text(value) : date.toLocaleString("pt-BR");
}

function describeNotification(notification) {
    const type = getValue(notification, ["type", "notification_type"]);
    const metadata = getMetadata(notification.metadata);
    const laboratory = getValue(notification, ["laboratory_name"]);
    const originalMessage = getValue(notification, ["message", "description"]);
    const fallback = {
        problem: getValue(notification, ["title", "subject"]) ||
            NOTIFICATION_TYPE_LABELS[type] || "Verificar ocorrência",
        details: originalMessage || laboratory || "Detalhes não informados."
    };

    if (type === "INCOMPLETE_CONTACT") {
        const status = text(metadata.contact_status);
        return {
            problem: "Cadastro incompleto",
            details: status
                ? `${laboratory || "Contato"} — ${status}.`
                : fallback.details
        };
    }

    if (type === "PRICE_PENDING_STATUS") {
        const hasPricesFlag = typeof metadata.prices_updated === "boolean";
        const hasPendingFlag = typeof metadata.pending_updated === "boolean";
        if (!hasPricesFlag || !hasPendingFlag) {
            return { problem: "Verificar atualização", details: fallback.details };
        }
        const pricesMissing = !metadata.prices_updated;
        const pendingMissing = !metadata.pending_updated;
        const problem = pricesMissing && pendingMissing
            ? "Atualizar preços e pendências"
            : pricesMissing
                ? "Atualizar preços"
                : pendingMissing
                    ? "Atualizar pendências"
                    : "Atualização registrada";
        const prices = text(metadata.prices_value) || "sem data informada";
        const pending = text(metadata.pending_value) || "sem data informada";
        return {
            problem,
            details: `${laboratory || "Laboratório não informado"} — Preços: ${prices}; pendências: ${pending}.`
        };
    }

    if (type === "PRODUCT_DIVERGENCE") {
        return { problem: "Conferir divergência de produto", details: fallback.details };
    }
    if (type === "SIRS_ERROR") {
        return { problem: "Conferir código Sirius", details: fallback.details };
    }
    return fallback;
}

export default function NotificationsTable({ notifications = [] }) {
    const safeNotifications = Array.isArray(notifications) ? notifications : [];

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
                        <th scope="col">Origem</th>
                        <th scope="col">Problema</th>
                        <th scope="col">Detalhes</th>
                        <th scope="col">Filial</th>
                        <th scope="col">Data de identificação</th>
                    </tr>
                </thead>
                <tbody>
                    {safeNotifications.map((notification) => {
                        const source = getValue(notification, ["source_module"]);
                        const branch = getValue(notification, ["branch"]);
                        const createdAt = getValue(notification, [
                            "created_at", "createdAt", "date"
                        ]);
                        const presentation = describeNotification(notification);

                        return (
                            <tr key={notification.id}>
                                <td>{SOURCE_MODULE_LABELS[source] || source || "-"}</td>
                                <td>{presentation.problem}</td>
                                <td className="notifications-message-cell">
                                    {presentation.details}
                                </td>
                                <td>{branch || "-"}</td>
                                <td>{formatDate(createdAt)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
