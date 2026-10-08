export const EMPTY_INDUSTRY_CONTACT_FORM = {
    id: "",
    laboratory_name: "",
    laboratory_key: "",
    branch: "",
    contact_name: "",
    phone: "",
    email: "",
    notes: "",
    cargo: ""
};

export const INDUSTRY_CONTACT_BRANCHES = [
    "DPR",
    "AMS",
    "DMT",
    "DMS",
    "DSC"
];

export const INDUSTRY_CONTACT_EXPORT_COLUMNS = [
    {
        key: "industry_global_code",
        label: "Código Global",
        width: 18,
        defaultSelected: true
    },
    {
        key: "laboratory_name",
        label: "Indústria",
        width: 30,
        defaultSelected: true
    },
    {
        key: "branch",
        label: "Filial",
        width: 14,
        defaultSelected: true
    },
    {
        key: "contact_name",
        label: "Responsável",
        width: 26,
        defaultSelected: true
    },
    {
        key: "cargo",
        label: "Cargo",
        width: 22,
        defaultSelected: true
    },
    {
        key: "phone",
        label: "Telefone",
        width: 20,
        defaultSelected: true
    },
    {
        key: "email",
        label: "E-mail",
        width: 32,
        defaultSelected: true
    },
    {
        key: "automatic_observation",
        label: "Observação Automática",
        width: 48,
        defaultSelected: true
    },
    {
        key: "status_label",
        label: "Situação",
        width: 34,
        defaultSelected: true
    },
    {
        key: "notes",
        label: "Observação manual",
        width: 42,
        defaultSelected: true
    },
    {
        key: "created_at",
        label: "Criado em",
        width: 22,
        defaultSelected: true
    },
    {
        key: "updated_at",
        label: "Atualizado em",
        width: 22,
        defaultSelected: true
    }
];

export const EMPTY_INDUSTRY_CONTACT_FILTERS = {
    search: "",
    status: "all",
    branch: "",
    cargo: ""
};
