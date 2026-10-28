// Shared report layout used by the application and Excel export.
export const REPORT_FORMATS = { int: "#,##0", dec: "#,##0.00", currency: '"R$" #,##0.00' };
const total = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
const names = (rows, key) => [...new Set(rows.map(r => String(r[key] || "")).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
const metric = (value, op, key, extra = {}) => ({ value, op, key, ...extra });
export function buildMerchandiseReports(rows) {
    const sum = key => metric(total(rows,key), "sum", key);
    const group = (id,title,key,labels=names(rows,key)) => ({ id,title,headers:["Grupo","Qtde","Valor"], formats:[null,"int","currency"], chartColumn:2,
        rows:labels.map(label=>{
            const subset=rows.filter(r=>String(r[key]||"")===label);
            return [label,metric(total(subset,"finalQty"),"group","finalQty",{groupKey:key,label}),metric(total(subset,"finalValue"),"group","finalValue",{groupKey:key,label})];
        }) });
    const via=rows.filter(r=>r.priceViaLast==="Sim");
    const scenario=key=>metric(rows.reduce((s,r)=>s+(Number(r.finalQty)||0)*(Number(r[key])||0),0),"scenario",key);
    const lowest=scenario("lowestPrice").value;
    const result={id:"result",title:"Resultado da simulação",headers:["Indicador","Quantidade"],formats:[null,"int"],chartColumn:1,
        rows:[["Itens a comprar",metric(rows.filter(r=>r.finalQty>0).length,"buyCount","finalQty")],["Qtde total a comprar",sum("finalQty")]]};
    const values={id:"values",title:"Valores da simulação",headers:["Indicador","Valor"],formats:[null,"currency"],chartColumn:1,
        rows:[["Valor selecionado",sum("finalValue")],["Valor sugestão período",sum("periodValue")]]};
    const scenarios={id:"scenarios",title:"Comparativo de cenários",headers:["Cenário","Custo total","A mais vs menor preço"],formats:[null,"currency","currency"],chartColumn:1,
        rows:[["Menor preço","lowestPrice"],["Própria empresa","ownPrice"],["Preço selecionado","selectedPrice"]].map(([label,key])=>[label,scenario(key),metric(scenario(key).value-lowest,"difference",key)])};
    const origins=group("origins","Origem do preço","priceOrigin",[...new Set([...names(rows,"priceOrigin"),...names(rows,"company"),"Última compra","Sem preço"])]);
    origins.headers.push("Preço médio"); origins.formats.push("currency");
    origins.rows=origins.rows.map(row=>[...row,metric(row[1].value>0?row[2].value/row[1].value:0,"groupAverage","selectedPrice",{groupKey:"priceOrigin",label:row[0]})]);
    return [result,values,group("curve","Por curva","curve"),group("company","Por empresa","company"),scenarios,origins,
        {id:"viaQty",title:"Compra via última compra",headers:["Indicador","Quantidade"],formats:[null,"int"],chartColumn:1,rows:[["Quantidade",metric(total(via,"finalQty"),"group","finalQty",{groupKey:"priceViaLast",label:"Sim"})]]},
        {id:"viaValue",title:"Valor via última compra",headers:["Indicador","Valor"],formats:[null,"currency"],chartColumn:1,rows:[["Valor",metric(total(via,"finalValue"),"group","finalValue",{groupKey:"priceViaLast",label:"Sim"})]]},
        {id:"alerts",title:"Alertas",headers:["Indicador","Quantidade"],formats:[null,"int"],chartColumn:1,rows:[
            ["Saldo transferido",sum("transferred")],
            ["Caixa inválida",metric(rows.filter(r=>!r.boxValid).length,"invalidBox","boxStatus")],
            ["Sem preço com compra",metric(rows.filter(r=>r.finalQty>0&&r.selectedPrice<=0).length,"noPriceBuy","selectedPrice")]]},
        group("lab","Por laboratório","lab")];
}
export function reportValue(cell) { return cell && typeof cell === "object" ? Number(cell.value)||0 : cell; }
export function formatReportCell(cell, format) {
    const value=reportValue(cell);
    if(!format)return String(value??"");
    return new Intl.NumberFormat("pt-BR",format==="currency"?{style:"currency",currency:"BRL"}:{maximumFractionDigits:format==="int"?0:2}).format(value||0);
}
