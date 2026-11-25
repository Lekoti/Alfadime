const PRODUCTS_EXCEL_PATH = "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\PRODUTOS\\PRODUTOS.xlsx";

const PRODUCTS_EXCEL_FILE_NAME =
    "PRODUTOS.xlsx";

const PRODUCTS_EXCEL_SHEET_NAME = null;

const PRODUCTS_EXCEL_POLLING_INTERVAL = 5000;

const PRODUCTS_EXCEL_STABILITY_CHECK_DELAY = 1500;

const PRODUCT_CSV_BRANCH_EXPORTS = {
    "DIMEBRAS PR": {
        fileName: "PRODUTOS_0001.csv",
        sheetName: "PRODUTOS_0001"
    },
    "ALFAMED MS": {
        fileName: "PRODUTOS_0002.csv",
        sheetName: "PRODUTOS_0002"
    },
    "DIMEBRAS MT": {
        fileName: "PRODUTOS_0003.csv",
        sheetName: "PRODUTOS_0003"
    },
    "DIMEBRAS MS": {
        fileName: "PRODUTOS_0005.csv",
        sheetName: "PRODUTOS_0005"
    },
    "DIMEBRAS SC": {
        fileName: "PRODUTOS_0006.csv",
        sheetName: "PRODUTOS_0006"
    }
};

module.exports = {
    PRODUCTS_EXCEL_PATH,
    PRODUCTS_EXCEL_FILE_NAME,
    PRODUCTS_EXCEL_SHEET_NAME,
    PRODUCTS_EXCEL_POLLING_INTERVAL,
    PRODUCTS_EXCEL_STABILITY_CHECK_DELAY,
    PRODUCT_CSV_BRANCH_EXPORTS
};