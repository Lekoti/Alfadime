export const BRANCHES = [
    "DPR",
    "AMS",
    "DMT",
    "DMS",
    "DSC"
];

export const COLUMN_GROUPS = [
    {
        key: "env_precos",
        label: "Env Preços"
    },
    {
        key: "env_pend",
        label: "Env Pend"
    },
    {
        key: "precos_ok",
        label: "Preços Ok"
    },
    {
        key: "pendencias_ok",
        label: "Pendências Ok"
    }
];

export const PRICE_PENDING_COLUMNS = [
    {
        key: "laboratory",
        label: "Laboratórios",
        group: null
    },

    {
        key: "env_precos_dpr",
        label: "DPR",
        group: "env_precos"
    },
    {
        key: "env_precos_ams",
        label: "AMS",
        group: "env_precos"
    },
    {
        key: "env_precos_dmt",
        label: "DMT",
        group: "env_precos"
    },
    {
        key: "env_precos_dms",
        label: "DMS",
        group: "env_precos"
    },
    {
        key: "env_precos_dsc",
        label: "DSC",
        group: "env_precos"
    },

    {
        key: "env_pend_dpr",
        label: "DPR",
        group: "env_pend"
    },
    {
        key: "env_pend_ams",
        label: "AMS",
        group: "env_pend"
    },
    {
        key: "env_pend_dmt",
        label: "DMT",
        group: "env_pend"
    },
    {
        key: "env_pend_dms",
        label: "DMS",
        group: "env_pend"
    },
    {
        key: "env_pend_dsc",
        label: "DSC",
        group: "env_pend"
    },

    {
        key: "precos_ok_dpr",
        label: "DPR",
        group: "precos_ok"
    },
    {
        key: "precos_ok_ams",
        label: "AMS",
        group: "precos_ok"
    },
    {
        key: "precos_ok_dmt",
        label: "DMT",
        group: "precos_ok"
    },
    {
        key: "precos_ok_dms",
        label: "DMS",
        group: "precos_ok"
    },
    {
        key: "precos_ok_dsc",
        label: "DSC",
        group: "precos_ok"
    },

    {
        key: "pendencias_ok_dpr",
        label: "DPR",
        group: "pendencias_ok"
    },
    {
        key: "pendencias_ok_ams",
        label: "AMS",
        group: "pendencias_ok"
    },
    {
        key: "pendencias_ok_dmt",
        label: "DMT",
        group: "pendencias_ok"
    },
    {
        key: "pendencias_ok_dms",
        label: "DMS",
        group: "pendencias_ok"
    },
    {
        key: "pendencias_ok_dsc",
        label: "DSC",
        group: "pendencias_ok"
    }
];

export const EMPTY_PRICE_PENDING_ROW = {
    laboratory: "",

    env_precos_dpr: "",
    env_precos_ams: "",
    env_precos_dmt: "",
    env_precos_dms: "",
    env_precos_dsc: "",

    env_pend_dpr: "",
    env_pend_ams: "",
    env_pend_dmt: "",
    env_pend_dms: "",
    env_pend_dsc: "",

    precos_ok_dpr: "",
    precos_ok_ams: "",
    precos_ok_dmt: "",
    precos_ok_dms: "",
    precos_ok_dsc: "",

    pendencias_ok_dpr: "",
    pendencias_ok_ams: "",
    pendencias_ok_dmt: "",
    pendencias_ok_dms: "",
    pendencias_ok_dsc: ""
};

export const PRICE_PENDING_EXPORT_COLUMNS = [
    { key: "env_precos_dpr", label: "Preços DPR" },
    { key: "env_precos_ams", label: "Preços AMS" },
    { key: "env_precos_dmt", label: "Preços DMT" },
    { key: "env_precos_dms", label: "Preços DMS" },
    { key: "env_precos_dsc", label: "Preços DSC" },

    { key: "env_pend_dpr", label: "Pendências DPR" },
    { key: "env_pend_ams", label: "Pendências AMS" },
    { key: "env_pend_dmt", label: "Pendências DMT" },
    { key: "env_pend_dms", label: "Pendências DMS" },
    { key: "env_pend_dsc", label: "Pendências DSC" },

    { key: "precos_ok_dpr", label: "OK Preços DPR" },
    { key: "precos_ok_ams", label: "OK Preços AMS" },
    { key: "precos_ok_dmt", label: "OK Preços DMT" },
    { key: "precos_ok_dms", label: "OK Preços DMS" },
    { key: "precos_ok_dsc", label: "OK Preços DSC" },

    { key: "pendencias_ok_dpr", label: "OK Pendências DPR" },
    { key: "pendencias_ok_ams", label: "OK Pendências AMS" },
    { key: "pendencias_ok_dmt", label: "OK Pendências DMT" },
    { key: "pendencias_ok_dms", label: "OK Pendências DMS" },
    { key: "pendencias_ok_dsc", label: "OK Pendências DSC" }
];

