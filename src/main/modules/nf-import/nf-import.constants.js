const BRANCHES = [
    { folder: "0001", code: "1", key: "DPR", name: "DIMEBRAS PR", cnpj: "76472349000198" },
    { folder: "0002", code: "2", key: "AMS", name: "ALFAMED MS", cnpj: "04245066000100" },
    { folder: "0003", code: "3", key: "DMT", name: "DIMEBRAS MT", cnpj: "76472349000430" },
    { folder: "0005", code: "5", key: "DMS", name: "DIMEBRAS MS", cnpj: "37174107000166" },
    { folder: "0006", code: "6", key: "DSC", name: "DIMEBRAS SC", cnpj: "42545039000134" }
];
module.exports = {
    BRANCHES,
    DEFAULT_ROOT: String.raw`U:\unico\importa\Xml\IMPORTACAO_AUTOMATICA`,
    MAX_BYTES: 10 * 1024 * 1024,
    MAX_FILES: 2000
};
