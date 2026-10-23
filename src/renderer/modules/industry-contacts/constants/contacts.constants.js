export const CONTACT_CHARGE_TYPES = {
    PRICES: "prices",
    PENDING: "pending",
    DOCUMENTS: "documents",
    CUSTOM: "custom"
};


export const CONTACT_CHARGE_TYPE_LABELS = {
    [CONTACT_CHARGE_TYPES.PRICES]: "Preços",
    [CONTACT_CHARGE_TYPES.PENDING]: "Pendências",
    [CONTACT_CHARGE_TYPES.DOCUMENTS]: "Documentos",
    [CONTACT_CHARGE_TYPES.CUSTOM]: "Outros"
};


export const CONTACT_CHARGE_RUN_STATUS = {
    PENDING: "pending",
    RUNNING: "running",
    COMPLETED: "completed",
    COMPLETED_WITH_ERRORS: "completed_with_errors",
    CANCELLED: "cancelled"
};


export const CONTACT_CHARGE_RUN_STATUS_LABELS = {
    [CONTACT_CHARGE_RUN_STATUS.PENDING]: "Pendente",
    [CONTACT_CHARGE_RUN_STATUS.RUNNING]: "Enviando",
    [CONTACT_CHARGE_RUN_STATUS.COMPLETED]: "Concluído",
    [CONTACT_CHARGE_RUN_STATUS.COMPLETED_WITH_ERRORS]: "Concluído com erros",
    [CONTACT_CHARGE_RUN_STATUS.CANCELLED]: "Cancelado"
};


export const CONTACT_CHARGE_ITEM_STATUS = {
    PENDING: "pending",
    SENDING: "sending",
    SENT: "sent",
    FAILED: "failed",
    IGNORED: "ignored",
    CANCELLED: "cancelled"
};


export const CONTACT_CHARGE_ITEM_STATUS_LABELS = {
    [CONTACT_CHARGE_ITEM_STATUS.PENDING]: "Pendente",
    [CONTACT_CHARGE_ITEM_STATUS.SENDING]: "Enviando",
    [CONTACT_CHARGE_ITEM_STATUS.SENT]: "Enviado",
    [CONTACT_CHARGE_ITEM_STATUS.FAILED]: "Erro",
    [CONTACT_CHARGE_ITEM_STATUS.IGNORED]: "Ignorado",
    [CONTACT_CHARGE_ITEM_STATUS.CANCELLED]: "Cancelado"
};


export const EMPTY_CONTACT_CHARGE_FAVORITE = {
    id: "",
    name: "",
    charge_type: CONTACT_CHARGE_TYPES.CUSTOM,
    subject: "",
    body: "",
    save_recipients: false,
    notes: "",
    recipients: [],
    industries: [],
    attachments: []
};


export const CONTACT_CHARGE_EXPORT_COLUMNS = [
    { key: "name", label: "Favorito" },
    { key: "charge_type", label: "Tipo" },
    { key: "subject", label: "Assunto" },
    { key: "total", label: "Total" },
    { key: "sent", label: "Enviados" },
    { key: "failed", label: "Erros" },
    { key: "ignored", label: "Ignorados" },
    { key: "cancelled", label: "Cancelados" },
    { key: "started_at", label: "Início" },
    { key: "finished_at", label: "Término" }
];
