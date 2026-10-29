import {PRICE_SOURCES} from "../constants/merchandise-purchases.constants";
export const REPORT_FORMATS={int:"#,##0",dec:"#,##0.00",currency:'"R$" #,##0.00'};
const total=(rows,key)=>rows.reduce((s,r)=>s+(Number(r[key])||0),0);
const names=(rows,key)=>[...new Set(rows.map(r=>String(r[key]||"")).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
const metric=(value,op,key,extra={})=>({value,op,key,...extra});
export function buildMerchandiseReports(rows){
    const sum=key=>metric(total(rows,key),"sum",key);
    const group=(id,title,key,labels=names(rows,key))=>({id,title,headers:["Grupo","Qtde","Valor"],formats:[null,"int","currency"],chartColumn:2,rows:labels.map(label=>{const subset=rows.filter(r=>String(r[key]||"")===label);return [label,metric(total(subset,"finalQty"),"group","finalQty",{groupKey:key,label}),metric(total(subset,"finalValue"),"group","finalValue",{groupKey:key,label})];})});
    const via=rows.filter(r=>r.priceViaLast==="Sim"),scenario=key=>metric(rows.reduce((s,r)=>s+r.finalQty*r[key],0),"scenario",key),lowest=scenario("lowestPrice").value;
    const origins=group("origins","Origem do preço","priceOrigin",[...new Set([...names(rows,"priceOrigin"),...PRICE_SOURCES.map(s=>s.label),"Sem preço"])]);
    origins.headers.push("Preço médio");origins.formats.push("currency");origins.rows=origins.rows.map(r=>[...r,metric(r[1].value>0?r[2].value/r[1].value:0,"groupAverage","selectedPrice",{groupKey:"priceOrigin",label:r[0]})]);
    return [
        {id:"result",title:"Resultado da simulação",headers:["Indicador","Quantidade"],formats:[null,"int"],chartColumn:1,rows:[["Itens a comprar",metric(rows.filter(r=>r.finalQty>0).length,"buyCount","finalQty")],["Qtde total a comprar",sum("finalQty")]]},
        {id:"values",title:"Valores da simulação",headers:["Indicador","Valor"],formats:[null,"currency"],chartColumn:1,rows:[["Valor selecionado",sum("finalValue")],["Valor sugestão período",sum("periodValue")]]},
        group("curve","Por curva","curve"),group("company","Por empresa","company"),
        {id:"scenarios",title:"Comparativo de cenários",headers:["Cenário","Custo total","A mais vs menor preço"],formats:[null,"currency","currency"],chartColumn:1,rows:[["Menor preço","lowestPrice"],["Própria empresa","ownPrice"],["Preço selecionado","selectedPrice"]].map(([label,key])=>[label,scenario(key),metric(scenario(key).value-lowest,"difference",key)])},origins,
        {id:"viaQty",title:"Compra via última compra",headers:["Indicador","Quantidade"],formats:[null,"int"],chartColumn:1,rows:[["Quantidade",metric(total(via,"finalQty"),"group","finalQty",{groupKey:"priceViaLast",label:"Sim"})]]},
        {id:"viaValue",title:"Valor via última compra",headers:["Indicador","Valor"],formats:[null,"currency"],chartColumn:1,rows:[["Valor",metric(total(via,"finalValue"),"group","finalValue",{groupKey:"priceViaLast",label:"Sim"})]]},
        {id:"alerts",title:"Alertas",headers:["Indicador","Quantidade"],formats:[null,"int"],chartColumn:1,rows:[["Saldo transferido",sum("transferred")],["Caixa inválida",metric(rows.filter(r=>!r.boxValid).length,"invalidBox","boxStatus")],["Sem preço com compra",metric(rows.filter(r=>r.finalQty>0&&r.selectedPrice<=0).length,"noPriceBuy","selectedPrice")]]},
        {id:"policy",title:"Política Comercial — cobertura",headers:["Indicador","Quantidade"],formats:[null,"int"],chartColumn:1,rows:[["Com Política Comercial",metric(rows.filter(r=>r.policyPrice>0).length,"withPolicy","policyPrice")],["Sem Política Comercial",metric(rows.filter(r=>!(r.policyPrice>0)).length,"withoutPolicy","policyPrice")],["Políticas vencidas (usadas com aviso)",metric(rows.filter(r=>r.policyExpired).length,"expiredPolicy","policyStatus")]]},
        {id:"policyValue",title:"Política Comercial — valor de referência",headers:["Indicador","Valor"],formats:[null,"currency"],chartColumn:1,rows:[["Quantidade a comprar × Política Comercial",metric(rows.reduce((s,r)=>s+r.finalQty*(r.policyPrice||0),0),"scenario","policyPrice")]]},
        group("lab","Por laboratório (Fabr_Global)","lab")
    ];
}
export function reportValue(cell){return cell&&typeof cell==="object"?Number(cell.value)||0:cell;}
export function formatReportCell(cell,format){const v=reportValue(cell);if(!format)return String(v??"");return new Intl.NumberFormat("pt-BR",format==="currency"?{style:"currency",currency:"BRL"}:{maximumFractionDigits:format==="int"?0:2}).format(v||0);}
