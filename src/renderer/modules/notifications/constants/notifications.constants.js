export const NOTIFICATION_TYPES = {
    PRICE_PENDING_STATUS:
        "PRICE_PENDING_STATUS",

    PRODUCT_DIVERGENCE:
        "PRODUCT_DIVERGENCE",

    SIRS_ERROR:
        "SIRS_ERROR",

    INCOMPLETE_CONTACT:
        "INCOMPLETE_CONTACT"
};

export const NOTIFICATION_STATUSES = {
    PENDING: "pending",
    READ: "read",
    SENT: "sent",
    ERROR: "error",
    DISMISSED: "dismissed"
};

export const NOTIFICATION_PRIORITIES = {
    LOW: "low",
    NORMAL: "normal",
    HIGH: "high",
    CRITICAL: "critical"
};

export const NOTIFICATION_TYPE_LABELS = {
    PRICE_PENDING_STATUS:
        "Preços e pendências",

    PRODUCT_DIVERGENCE:
        "Divergência de produto",

    SIRS_ERROR:
        "Código SIRS incorreto",

    INCOMPLETE_CONTACT:
        "Contato incompleto"
};

export const NOTIFICATION_STATUS_LABELS = {
    pending: "Pendente",
    read: "Lida",
    sent: "Enviada",
    error: "Erro",
    dismissed: "Dispensada"
};

export const NOTIFICATION_PRIORITY_LABELS = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    critical: "Crítica"
};

export const NOTIFICATION_FILTER_DEFAULTS = {
    search: "",
    type: "",
    status: "",
    priority: "",
    source_module: "",
    branch: ""
};