export const PRODUCT_COLUMNS = [
    {
        key: "branch",
        label: "Filial",
        defaultVisible: true
    },
    {
        key: "code",
        label: "Cod",
        defaultVisible: true
    },
    {
        key: "sirius_code",
        label: "Cod Sirius",
        defaultVisible: true
    },
    {
        key: "ean",
        label: "EAN",
        defaultVisible: true
    },
    {
        key: "sap_code",
        label: "Codigo SAP",
        defaultVisible: true
    },
    {
        key: "group_code",
        label: "Grupo",
        defaultVisible: false
    },
    {
        key: "active_ingredient",
        label: "Principio Ativo",
        defaultVisible: true
    },
    {
        key: "commercial_name",
        label: "Nome Comercial",
        defaultVisible: true
    },
    {
        key: "manufacturer_code",
        label: "Codigo Fabricante",
        defaultVisible: false
    },
    {
        key: "brand",
        label: "Marca",
        defaultVisible: true
    },
    {
        key: "unit",
        label: "Unidade",
        defaultVisible: true
    },
    {
        key: "standard_box",
        label: "Caixa Padrao",
        defaultVisible: false
    },
    {
        key: "controls_lot",
        label: "Controla Lote",
        defaultVisible: true,
        type: "boolean"
    },
    {
        key: "ms_registration",
        label: "Registro MS",
        defaultVisible: true
    },
    {
        key: "reference_code",
        label: "Codigo Referencia",
        defaultVisible: false
    },
    {
        key: "therapeutic_class_code",
        label: "Classe Terapeutica",
        defaultVisible: false
    },
    {
        key: "height",
        label: "Altura",
        defaultVisible: false
    },
    {
        key: "width",
        label: "Largura",
        defaultVisible: false
    },
    {
        key: "length",
        label: "Comprimento",
        defaultVisible: false
    },
    {
        key: "category_code",
        label: "Categoria",
        defaultVisible: true
    },
    {
        key: "active",
        label: "Ativo",
        defaultVisible: true,
        type: "boolean"
    }
];


export const DEFAULT_VISIBLE_PRODUCT_COLUMNS =
    PRODUCT_COLUMNS
        .filter((column) => column.defaultVisible)
        .map((column) => column.key);


export const DEFAULT_PRODUCT_COLUMN_ORDER =
    PRODUCT_COLUMNS.map((column) => column.key);


export const FILTER_FIELDS = [
    {
        key: "branch",
        label: "Filial"
    },
    {
        key: "brand",
        label: "Marca"
    },
    {
        key: "group_code",
        label: "Grupo"
    },
    {
        key: "category_code",
        label: "Categoria"
    }
];