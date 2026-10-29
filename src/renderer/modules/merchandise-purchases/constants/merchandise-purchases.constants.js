export const MODULE_ID="merchandise-purchases";
export const MONTH_LABELS=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
export const PRICE_SOURCES=[
    {value:"policyPrice",label:"Política Comercial"},{value:"lastPurchase",label:"Última compra"},
    {value:"penultPurchase",label:"Penúltima compra"},{value:"antePenultPurchase",label:"Antepenúltima compra"},
    {value:"recompCost",label:"Custo Recomp."},{value:"dpcCost",label:"Custo DPC"},{value:"avgCost",label:"Custo Med Atual"},
    {value:"suggestedPrice",label:"P Sug Atual"},{value:"avgPrice",label:"P Medio"},{value:"pf",label:"PF"}
];
export const PRICE_CRITERIA=[{value:"own",label:"Própria empresa"},{value:"lowest",label:"Menor preço"}];
export const PERIOD_REFERENCES=[{value:"max",label:"Mês de maior venda"},{value:"min",label:"Mês de menor venda"},{value:"avgMonth",label:"Média Mês"},{value:"avg3",label:"Média 3M"},{value:"avg6",label:"Média 6M"},{value:"avgAll",label:"Média do período fechado"}];
export const STATUS_OPTIONS=[{value:"",label:"Todas"},{value:"tobuy",label:"Com quantidade a comprar"},{value:"nobuy",label:"Sem compra"},{value:"noprice",label:"Sem preço"},{value:"invalidbox",label:"Caixa inválida"},{value:"nohistory",label:"Sem histórico de venda"},{value:"manual",label:"Quantidade manual"},{value:"expiredpolicy",label:"Política Comercial vencida"},{value:"withpolicy",label:"Com Política Comercial"},{value:"withoutpolicy",label:"Sem Política Comercial"}];
export const DEFAULT_FILTERS={search:"",company:"",laboratory:"",group:"",curve:"",status:"",priceOrigin:""};
export function getDefaultClosedMonth(){const month=new Date().getMonth();return month===0?12:month;}
export function createDefaultPremises(){return {curveDays:{A:75,B:75,C:75,OTHER:75},priceSource:"policyPrice",priceCriteria:"own",periodReference:"max",closedMonth:getDefaultClosedMonth()};}
export const REQUIRED_FIELDS=["company","productCode","barcode","description","boxSize","lab","globalLabCode","stock","lastPurchase","curve"];
export const FIELD_HEADERS={company:"Empresa",productCode:"Cod Prod",supplierCode:"Cod Fornec",barcode:"Cod Barras",description:"Descricao",boxSize:"Cx Padrao",labCode:"Cod Lab",localLab:"Lab.",lab:"Fabr_Global",globalLabCode:"Cod_Fabr_Global",group:"Grupo",stock:"Estoque",blocked:"Estoque Bloq.",pf:"PF",pmc:"PMC",avgCost:"Custo Med Atual",lastPurchase:"Ult.Comp.",penultPurchase:"Penult.Comp.",antePenultPurchase:"Antepenult.Comp.",suggestedPrice:"P Sug Atual",avgPrice:"P Medio",recompCost:"Custo Recomp.",dpcCost:"Custo DPC",avgMonthSheet:"Media Mes",curve:"Curva Unidade"};
export function buildColumns(closedMonth){
    const c=Math.min(12,Math.max(1,Number(closedMonth)||12)),m=i=>MONTH_LABELS[i-1].toLowerCase(),range=size=>`${m(Math.max(1,c-size+1))}-${m(c)}`;
    const column=(key,label,type="text",width=18,extra={})=>({key,label,type,width,...extra});
    return [column("company","Empresa"),column("productCode","Cód Prod","text",11),column("barcode","Código EAN","text",16),column("description","Descrição","text",42),
        column("lab","Laboratório (Fabr_Global)","text",28),column("globalLabCode","Cód. Fabricante Global","text",17),column("group","Tipo de produto","text",20),column("curve","Curva","text",8),column("boxSize","Cx Padrao","int",10),
        column("avgMonth","Média Mês","dec",11),column("avgAll",`Média ${c}M (jan-${m(c)})`,"dec",16),column("avg6",`Média ${Math.min(6,c)}M (${range(6)})`,"dec",16),column("avg3",`Média ${Math.min(3,c)}M (${range(3)})`,"dec",16),
        column("maxPeriod","Período Maior Venda","text",50),column("maxQty","Qtde Maior Venda","int",13),column("minPeriod","Período Menor Venda","text",35),column("minQty","Qtde Menor Venda","int",13),
        column("pending","PENDECIA","int",11),column("stock","Estoque filial","int",12),column("blocked","Bloqueado filial","int",13),column("transferred","Saldo transferido","int",14),column("consolidated","Estoque consolidado","int",15),column("targetDays","Dias Cob.","int",10),
        column("policyPrice","Política Comercial","currency",18),column("policyStatus","Situação Política","text",27),column("policyValidity","Validade Política","date",16),column("policyModifiedAt","Data da Planilha","datetime",22),column("policyReadAt","Última Leitura","datetime",22),column("policyFile","Arquivo Política","text",40),
        column("lastPurchase","Última Compra (R$)","currency",16),column("penultPurchase","Penúltima Compra (R$)","currency",18),column("antePenultPurchase","Antepenúltima Compra (R$)","currency",20),
        column("ownPrice","Preço da Empresa (R$)","currency",18),column("lowestCompany","Empresa + Barata","text",20),column("lowestPrice","Preço menor (R$)","currency",16),column("selectedPrice","Preço Utilizado (R$)","currency",18),
        column("priceOrigin","Origem Preço","text",23),column("priceCompany","Empresa do Preço","text",20),column("selectedPriceWarning","Aviso Preço Utilizado","text",30),
        column("finalQty","Qtde a Comprar","int",14,{editable:true}),column("finalValue","Valor selecionado (R$)","currency",18),column("refQty","Qtde Ref. Período","dec",15),column("periodSuggestion","Sugestão Compra Período","int",20),column("periodValue","Valor Sugestão Período (R$)","currency",22),
        column("priceViaLast","Preço via ÚltC?","text",13),column("stockMonths","Estoque Mês","dec",11),column("boxStatus","Validação Cx","text",16)];
}
