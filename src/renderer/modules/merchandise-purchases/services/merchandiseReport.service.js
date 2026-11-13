import {PRICE_SOURCES} from "../constants/merchandise-purchases.constants";

export const REPORT_FORMATS={
    int:"#,##0",
    dec:"#,##0.00",
    currency:'"R$" #,##0.00'
};

const total=(rows,key)=>rows.reduce((sum,row)=>sum+(Number(row[key])||0),0);
const names=(rows,key)=>[...new Set(rows.map(row=>String(row[key]||"")).filter(Boolean))].sort((first,second)=>first.localeCompare(second,"pt-BR"));
const metric=(value,operation,key,extra={})=>({value,operation,key,...extra});

export function buildMerchandiseReports(rows){
    const sum=key=>metric(total(rows,key),"sum",key);

    const group=(id,title,key,labels=names(rows,key))=>({
        id,
        title,
        headers:["Grupo","Qtde","Valor"],
        formats:[null,"int","currency"],
        chartColumn:2,
        rows:labels.map(label=>{
            const subset=rows.filter(row=>String(row[key]||"")===label);

            return [
                label,
                metric(total(subset,"finalQty"),"group","finalQty",{groupKey:key,label}),
                metric(total(subset,"finalValue"),"group","finalValue",{groupKey:key,label})
            ];
        })
    });

    const origins=group("origins","Origem do preço","priceOrigin",[
        ...new Set([
            ...names(rows,"priceOrigin"),
            ...PRICE_SOURCES.map(source=>source.label),
            "Sem preço"
        ])
    ]);

    origins.headers.push("Preço médio");
    origins.formats.push("currency");
    origins.rows=origins.rows.map(row=>[
        ...row,
        metric(row[1].value>0?row[2].value/row[1].value:0,"groupAverage","selectedPrice",{groupKey:"priceOrigin",label:row[0]})
    ]);

    const laboratories=group("lab","Por laboratório (Fabr_Global)","lab");
    laboratories.chartColumn=2;
    laboratories.chartMode="value";

    return [
        {
            id:"result",
            title:"Resultado da simulação",
            headers:["Indicador","Quantidade"],
            formats:[null,"int"],
            chartColumn:1,
            rows:[
                ["Itens a comprar",metric(rows.filter(row=>row.finalQty>0).length,"buyCount","finalQty")],
                ["Qtde total a comprar",sum("finalQty")]
            ]
        },
        {
            id:"values",
            title:"Valores da simulação",
            headers:["Indicador","Valor"],
            formats:[null,"currency"],
            chartColumn:1,
            chartMode:"value",
            rows:[
                ["Valor selecionado",metric(rows.filter(row=>row.finalQty>0).reduce((sum,row)=>sum+row.finalValue,0),"sum","finalValue")],
                ["Valor sugestão período",metric(rows.filter(row=>row.periodSuggestion>0).reduce((sum,row)=>sum+row.periodValue,0),"sum","periodValue")]
            ]
        },
        group("curve","Por curva","curve"),
        group("company","Por empresa","company"),
        origins,
        {
            id:"alerts",
            title:"Alertas",
            headers:["Indicador","Quantidade"],
            formats:[null,"int"],
            chartColumn:1,
            rows:[
                ["Saldo transferido",sum("transferred")],
                ["Caixa inválida",metric(rows.filter(row=>!row.boxValid).length,"invalidBox","boxStatus")],
                ["Sem preço com compra",metric(rows.filter(row=>row.finalQty>0&&row.selectedPrice<=0).length,"noPriceBuy","selectedPrice")]
            ]
        },
        {
            id:"policy",
            title:"Política Comercial — cobertura",
            headers:["Indicador","Quantidade"],
            formats:[null,"int"],
            chartColumn:1,
            rows:[
                ["Com Política Comercial",metric(rows.filter(row=>row.policyPrice>0).length,"withPolicy","policyPrice")],
                ["Sem Política Comercial",metric(rows.filter(row=>!(row.policyPrice>0)).length,"withoutPolicy","policyPrice")],
                ["Políticas vencidas (usadas com aviso)",metric(rows.filter(row=>row.policyExpired).length,"expiredPolicy","policyStatus")]
            ]
        },
        laboratories
    ];
}

export function reportValue(cell){
    return cell&&typeof cell==="object"?Number(cell.value)||0:cell;
}

export function formatReportCell(cell,format){
    const value=reportValue(cell);

    if(!format)return String(value??"");

    return new Intl.NumberFormat("pt-BR",format==="currency"?{style:"currency",currency:"BRL"}:{maximumFractionDigits:format==="int"?0:2}).format(value||0);
}
