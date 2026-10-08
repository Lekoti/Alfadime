const CORRECTABLE_PRODUCT_FIELDS = [
    "sirius_code",
    "sap_code",
    "group_code",
    "active_ingredient",
    "commercial_name",
    "manufacturer_code",
    "brand",
    "unit",
    "standard_box",
    "controls_lot",
    "ms_registration",
    "reference_code",
    "therapeutic_class_code",
    "height",
    "width",
    "length",
    "category_code",
    "active"
];

const PRODUCT_FIELD_LABELS = {
    sirius_code: "Cod Sirius",
    sap_code: "Codigo SAP",
    group_code: "Grupo",
    active_ingredient: "Principio Ativo",
    commercial_name: "Nome Comercial",
    manufacturer_code: "Codigo Fabricante",
    brand: "Marca / Industria",
    unit: "Unidade",
    standard_box: "Caixa Padrao",
    controls_lot: "Controla Lote",
    ms_registration: "Registro MS",
    reference_code: "Codigo Referencia",
    therapeutic_class_code: "Codigo Classe Terapeutica",
    height: "Altura",
    width: "Largura",
    length: "Comprimento",
    category_code: "Categoria",
    active: "Ativo"
};

const CORRECTION_STATUS = {
    PENDING_EXCEL: "pending_excel",
    CONFIRMED_IN_EXCEL: "confirmed_in_excel",
    CANCELLED: "cancelled"
};

module.exports = {
    CORRECTABLE_PRODUCT_FIELDS,
    PRODUCT_FIELD_LABELS,
    CORRECTION_STATUS
};
