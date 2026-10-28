export const MODULE_ID = "merchandise-purchases";

export const MONTH_LABELS = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export function getDefaultClosedMonth() {
    const month = new Date().getMonth();

    return month === 0 ? 12 : month;
}

export const PRICE_SOURCES = [
    { value: "lastPurchase", label: "Última compra" },
    { value: "recompCost", label: "Custo Recomp." },
    { value: "dpcCost", label: "Custo DPC" },
    { value: "avgCost", label: "Custo Med Atual" },
    { value: "suggestedPrice", label: "P Sug Atual" },
    { value: "avgPrice", label: "P Medio" },
    { value: "pf", label: "PF" }
];

export const PRICE_CRITERIA = [
    { value: "own", label: "Própria empresa" },
    { value: "lowest", label: "Menor preço" }
];

export const PERIOD_REFERENCES = [
    { value: "max", label: "Período de maior venda" },
    { value: "min", label: "Período de menor venda" },
    { value: "avgMonth", label: "Média Mês" },
    { value: "avg3", label: "Média 3M" },
    { value: "avg6", label: "Média 6M" },
    { value: "avgAll", label: "Média do período fechado" }
];

export const STATUS_OPTIONS = [
    { value: "", label: "Todas" },
    { value: "tobuy", label: "Com quantidade a comprar" },
    { value: "nobuy", label: "Sem compra" },
    { value: "noprice", label: "Sem preço" },
    { value: "invalidbox", label: "Caixa inválida" },
    { value: "nohistory", label: "Sem histórico de venda" },
    { value: "manual", label: "Quantidade manual" }
];

export const DEFAULT_FILTERS = {
    search: "",
    company: "",
    laboratory: "",
    group: "",
    curve: "",
    status: ""
};

export function createDefaultPremises() {
    return {
        curveDays: { A: 75, B: 75, C: 75, OTHER: 75 },
        priceSource: "lastPurchase",
        priceCriteria: "own",
        periodReference: "max",
        closedMonth: getDefaultClosedMonth()
    };
}

export const REQUIRED_FIELDS = [
    "company", "productCode", "barcode", "description", "boxSize",
    "lab", "stock", "lastPurchase", "curve"
];

export const FIELD_HEADERS = {
    company: "Empresa",
    productCode: "Cod Prod",
    supplierCode: "Cod Fornec",
    barcode: "Cod Barras",
    description: "Descricao",
    boxSize: "Cx Padrao",
    labCode: "Cod Lab",
    lab: "Lab.",
    group: "Grupo",
    stock: "Estoque",
    blocked: "Estoque Bloq.",
    pf: "PF",
    pmc: "PMC",
    avgCost: "Custo Med Atual",
    lastPurchase: "Ult.Comp.",
    penultPurchase: "Penult.Comp.",
    antePenultPurchase: "Antepenult.Comp.",
    suggestedPrice: "P Sug Atual",
    avgPrice: "P Medio",
    recompCost: "Custo Recomp.",
    dpcCost: "Custo DPC",
    avgMonthSheet: "Media Mes",
    curve: "Curva Unidade"
};

export function buildColumns(closedMonth) {
    const c = Math.min(12, Math.max(1, Number(closedMonth) || 12));
    const m = (index) => MONTH_LABELS[index - 1].toLowerCase();
    const range = (size) => {
        const from = Math.max(1, c - size + 1);

        return `${m(from)}-${m(c)}`;
    };

    return [
        { key: "company", label: "Empresa", type: "text", width: 18 },
        { key: "productCode", label: "Cód Prod", type: "text", width: 11 },
        { key: "barcode", label: "Código EAN", type: "text", width: 16 },
        { key: "description", label: "Descrição", type: "text", width: 42 },
        { key: "lab", label: "Laboratório", type: "text", width: 28 },
        { key: "group", label: "Tipo de produto", type: "text", width: 20 },
        { key: "curve", label: "Curva", type: "text", width: 8 },
        { key: "boxSize", label: "Cx Padrao", type: "int", width: 10 },
        { key: "avgMonth", label: "Média Mês", type: "dec", width: 11 },
        { key: "avgAll", label: `Média ${c}M (jan-${m(c)})`, type: "dec", width: 16 },
        { key: "avg6", label: `Média ${Math.min(6, c)}M (${range(6)})`, type: "dec", width: 16 },
        { key: "avg3", label: `Média ${Math.min(3, c)}M (${range(3)})`, type: "dec", width: 16 },
        { key: "maxPeriod", label: "Período Maior Venda", type: "text", width: 14 },
        { key: "maxQty", label: "Qtde Maior Venda", type: "int", width: 13 },
        { key: "minPeriod", label: "Período Menor Venda", type: "text", width: 14 },
        { key: "minQty", label: "Qtde Menor Venda", type: "int", width: 13 },
        { key: "pending", label: "PENDECIA", type: "int", width: 11 },
        { key: "stock", label: "Estoque filial", type: "int", width: 12 },
        { key: "blocked", label: "Bloqueado filial", type: "int", width: 13 },
        { key: "transferred", label: "Saldo transferido", type: "int", width: 14 },
        { key: "consolidated", label: "Estoque consolidado", type: "int", width: 15 },
        { key: "targetDays", label: "Dias Cob.", type: "int", width: 10 },
        { key: "ownPrice", label: "Preço da Empresa (R$)", type: "currency", width: 16 },
        { key: "lastPurchase", label: "Última Compra (R$)", type: "currency", width: 16 },
        { key: "lowestCompany", label: "Filial + Barata", type: "text", width: 18 },
        { key: "lowestPrice", label: "Preço menor (R$)", type: "currency", width: 15 },
        { key: "selectedPrice", label: "Preço selecionado (R$)", type: "currency", width: 17 },
        { key: "finalQty", label: "Qtde a Comprar", type: "int", width: 14, editable: true },
        { key: "finalValue", label: "Valor selecionado (R$)", type: "currency", width: 17 },
        { key: "refQty", label: "Qtde Ref. Período", type: "dec", width: 15 },
        { key: "periodSuggestion", label: "Sugestão Compra Período", type: "int", width: 18 },
        { key: "periodValue", label: "Valor Sugestão Período (R$)", type: "currency", width: 20 },
        { key: "priceOrigin", label: "Origem Preço", type: "text", width: 18 },
        { key: "priceViaLast", label: "Preço via ÚltC?", type: "text", width: 13 },
        { key: "stockMonths", label: "Estoque Mês", type: "dec", width: 11 },
        { key: "boxStatus", label: "Validação Cx", type: "text", width: 14 }
    ];
}
