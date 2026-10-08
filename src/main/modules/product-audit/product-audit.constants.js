const AUDITABLE_FIELDS = [
    {
        key: "sirius_code",
        label: "Cod Sirius",
        type: "text"
    },
    {
        key: "sap_code",
        label: "Codigo SAP",
        type: "text"
    },
    {
        key: "group_code",
        label: "Grupo",
        type: "text"
    },
    {
        key: "active_ingredient",
        label: "Principio Ativo",
        type: "text"
    },
    {
        key: "commercial_name",
        label: "Nome Comercial",
        type: "text"
    },
    {
        key: "manufacturer_code",
        label: "Codigo Fabricante",
        type: "text"
    },
    {
        key: "brand",
        label: "Marca",
        type: "text"
    },
    {
        key: "unit",
        label: "Unidade",
        type: "text"
    },
    {
        key: "standard_box",
        label: "Caixa Padrao",
        type: "number"
    },
    {
        key: "controls_lot",
        label: "Controla Lote",
        type: "boolean"
    },
    {
        key: "ms_registration",
        label: "Registro MS",
        type: "text"
    },
    {
        key: "reference_code",
        label: "Codigo Referencia",
        type: "text"
    },
    {
        key: "therapeutic_class_code",
        label: "Codigo Classe Terapeutica",
        type: "text"
    },
    {
        key: "height",
        label: "Altura",
        type: "number"
    },
    {
        key: "width",
        label: "Largura",
        type: "number"
    },
    {
        key: "length",
        label: "Comprimento",
        type: "number"
    },
    {
        key: "category_code",
        label: "Categoria",
        type: "text"
    },
    {
        key: "active",
        label: "Ativo",
        type: "boolean"
    }
];

const HIGH_PRIORITY_DIVERGENT_FIELDS = [
    "sirius_code",
    "active_ingredient",
    "commercial_name"
];

module.exports = {
    AUDITABLE_FIELDS,
    HIGH_PRIORITY_DIVERGENT_FIELDS
};
