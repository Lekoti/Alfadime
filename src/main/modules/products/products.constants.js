const PRODUCT_CATALOG_FIELDS = [
    "branch",
    "code",
    "sirius_code",
    "ean",
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
    "active",
    "purchase_code",
    "manufacturer_global_code"
];

const PRODUCT_CATALOG_IMPORT_COLUMNS = {
    "Filial": "branch",
    "Cod": "code",
    "Cod Sirius": "sirius_code",
    "EAN": "ean",
    "Codigo SAP": "sap_code",
    "Grupo": "group_code",
    "Principio Ativo": "active_ingredient",
    "Nome Comercial": "commercial_name",
    "Codigo Fabricante": "manufacturer_code",
    "Marca": "brand",
    "Unidade": "unit",
    "Caixa Padrao": "standard_box",
    "Controla Lote": "controls_lot",
    "Registro MS": "ms_registration",
    "Codigo Referencia": "reference_code",
    "Codigo Classe Terapeutica": "therapeutic_class_code",
    "Altura": "height",
    "Largura": "width",
    "Comprimento": "length",
    "Categoria": "category_code",
    "Ativo": "active"
};

const PRODUCT_CATALOG_REQUIRED_HEADERS = [
    "Filial"
];

const PRODUCT_CATALOG_DEFAULT_VISIBLE_COLUMNS = [
    "branch",
    "code",
    "sirius_code",
    "ean",
    "sap_code",
    "active_ingredient",
    "commercial_name",
    "brand",
    "unit",
    "controls_lot",
    "ms_registration",
    "category_code",
    "active"
];

const PRODUCT_CATALOG_BOOLEAN_FIELDS = [
    "controls_lot",
    "active"
];

const PRODUCT_CATALOG_NUMERIC_FIELDS = [
    "standard_box",
    "height",
    "width",
    "length"
];

module.exports = {
    PRODUCT_CATALOG_FIELDS,
    PRODUCT_CATALOG_IMPORT_COLUMNS,
    PRODUCT_CATALOG_REQUIRED_HEADERS,
    PRODUCT_CATALOG_DEFAULT_VISIBLE_COLUMNS,
    PRODUCT_CATALOG_BOOLEAN_FIELDS,
    PRODUCT_CATALOG_NUMERIC_FIELDS
};