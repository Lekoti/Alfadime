const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const curveKey = value => ["A","B","C"].includes(value) ? value : "OTHER";
export function getBoxMultiple(box) { return Number.isInteger(box) && box > 0 ? box : 1; }
export function suggestQuantity(monthly, days, balance, box) {
    const m = getBoxMultiple(box);
    return Math.ceil(Math.max(Math.ceil(monthly / 30 * days - 1e-9) - balance, 0) / m) * m;
}
export function computeRows(rows, premises) {
    const closed = Math.min(12,Math.max(1,Number(premises.closedMonth)||12));
    const key = r => r.barcode || `cod:${r.productCode}`;
    const prices = rows.map(r => {
        const p = Number(r[premises.priceSource]) || 0;
        return p > 0 ? {price:p,viaLast:false} : {price:Math.max(0,Number(r.lastPurchase)||0),viaLast:(Number(r.lastPurchase)||0)>0};
    });
    const cheapest = new Map();
    rows.forEach((r,i) => {
        const p=prices[i];
        if(p.price>0 && (!cheapest.has(key(r)) || p.price<cheapest.get(key(r)).price)) cheapest.set(key(r),{...p,company:r.company});
    });
    return rows.map((r,i) => {
        const months = Array.from({length:closed},(_,j)=>Number(r.months?.[j])||0);
        const avg = size => {const values=months.slice(-Math.min(size,closed));return values.reduce((s,v)=>s+v,0)/values.length;};
        const avgAll=avg(closed), avg6=avg(6), avg3=avg(3);
        const avgMonth=r.avgMonthSheet==null ? avgAll : r.avgMonthSheet;
        const hasHistory=months.some(v=>v>0);
        const maxQty=hasHistory?Math.max(...months):0, minQty=hasHistory?Math.min(...months):0;
        const peakMonths=hasHistory?months.map((v,j)=>v===maxQty?MONTHS[j]:null).filter(Boolean):[];
        const lowMonths=hasHistory?months.map((v,j)=>v===minQty?MONTHS[j]:null).filter(Boolean):[];
        const highMonths=hasHistory?months.map((v,j)=>v>avgAll?MONTHS[j]:null).filter(Boolean):[];
        const highInfo=highMonths.length ? `Alta: ${highMonths.join(", ")}` : "Sem meses acima da média";
        const maxPeriod=hasHistory?`${peakMonths.join(", ")} | ${highInfo}`:"Sem histórico";
        const minPeriod=hasHistory?lowMonths.join(", "):"Sem histórico";
        const base=prices[i], low=cheapest.get(key(r));
        const chosen=premises.priceCriteria==="lowest" ? low : {...base,company:r.company};
        const selectedPrice=chosen?.price||0;
        const viaLast=Boolean(chosen?.viaLast);
        const pending=0, transferred=0, consolidated=r.stock+r.blocked;
        const targetDays=premises.curveDays[curveKey(r.curve)]??0;
        const refs={max:maxQty,min:minQty,avgMonth,avg3,avg6,avgAll};
        const refQty=refs[premises.periodReference]??maxQty;
        const suggestedQty=suggestQuantity(avgMonth,targetDays,consolidated,r.boxSize);
        const periodSuggestion=suggestQuantity(refQty,targetDays,consolidated,r.boxSize);
        const boxValid=Number.isInteger(r.boxSize)&&r.boxSize>0;
        return {...r,id:i,avgMonth,avgAll,avg6,avg3,hasHistory,maxPeriod,maxQty,minPeriod,minQty,highMonths,
            pending,transferred,consolidated,targetDays,ownPrice:base.price,lowestPrice:low?.price||0,
            lowestCompany:low?(low.price===base.price?"Igual":low.company):"Sem preço",
            selectedPrice,priceOrigin:selectedPrice>0?(viaLast?"Última compra":chosen.company):"Sem preço",
            priceViaLast:selectedPrice>0?(viaLast?"Sim":"Não"):"",boxValid,boxStatus:boxValid?"OK":"Caixa inválida",
            stockMonths:avgMonth>0?consolidated/avgMonth:0,refQty,suggestedQty,periodSuggestion,periodValue:periodSuggestion*selectedPrice};
    });
}
export function applyOverrides(rows,overrides) {
    return rows.map(r=>{const manual=overrides[r.id]!==undefined;const finalQty=manual?overrides[r.id]:r.suggestedQty;return {...r,manual,finalQty,finalValue:finalQty*r.selectedPrice};});
}
const normalize = value => String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export function filterRows(rows,f) {
    const search=normalize(f.search).trim();
    return rows.filter(r=>{
        if(f.company&&r.company!==f.company || f.laboratory&&r.lab!==f.laboratory || f.group&&r.group!==f.group || f.curve&&r.curve!==f.curve) return false;
        const tests={tobuy:r.finalQty>0,nobuy:!(r.finalQty>0),noprice:!(r.selectedPrice>0),invalidbox:!r.boxValid,nohistory:!r.hasHistory,manual:r.manual};
        if(f.status&&Object.hasOwn(tests,f.status)&&!tests[f.status])return false;
        return !search||normalize(`${r.company} ${r.productCode} ${r.barcode} ${r.description} ${r.lab}`).includes(search);
    });
}
export function summarizeRows(rows) {
    return rows.reduce((s,r)=>{s.products++;if(r.finalQty>0){s.itemsToBuy++;s.totalQty+=r.finalQty;}s.totalValue+=r.finalValue;s.periodValue+=r.periodValue;if(r.selectedPrice<=0)s.noPrice++;if(!r.boxValid)s.invalidBox++;return s;},
        {products:0,itemsToBuy:0,totalQty:0,totalValue:0,periodValue:0,noPrice:0,invalidBox:0});
}
function groupBy(rows,field) {
    const map=new Map();
    rows.forEach(r=>{const label=String(r[field]||"Não informado");if(!map.has(label))map.set(label,{label,qty:0,value:0,count:0});const g=map.get(label);g.qty+=r.finalQty;g.value+=r.finalValue;g.count++;});
    return [...map.values()].map(g=>({...g,avgPrice:g.qty>0?g.value/g.qty:0})).sort((a,b)=>a.label.localeCompare(b.label,"pt-BR"));
}
export function buildSummaryTables(rows) {
    const curveRows=["A","B","C","D E F (Outros)"].map(label=>({label,qty:0,value:0,count:0}));
    rows.forEach(r=>{const i=["A","B","C"].indexOf(r.curve);const g=curveRows[i<0?3:i];g.qty+=r.finalQty;g.value+=r.finalValue;g.count++;});
    const scenarioRows=[["Menor preço","lowestPrice"],["Própria empresa","ownPrice"],["Preço selecionado","selectedPrice"]].map(([label,key])=>({label,value:rows.reduce((s,r)=>s+r.finalQty*r[key],0),extra:null}));
    scenarioRows.forEach(r=>r.diff=r.value-scenarioRows[0].value);
    const via=rows.filter(r=>r.priceViaLast==="Sim");
    return {result:{itemsToBuy:rows.filter(r=>r.finalQty>0).length,totalQty:rows.reduce((s,r)=>s+r.finalQty,0),totalValue:rows.reduce((s,r)=>s+r.finalValue,0)},curveRows,
        companyRows:groupBy(rows,"company"),labRows:groupBy(rows,"lab"),scenarioRows,originRows:groupBy(rows,"priceOrigin"),
        viaLast:{qty:via.reduce((s,r)=>s+r.finalQty,0),value:via.reduce((s,r)=>s+r.finalValue,0)},
        transferred:rows.reduce((s,r)=>s+r.transferred,0),invalidBox:rows.filter(r=>!r.boxValid).length,noPriceWithBuy:rows.filter(r=>r.finalQty>0&&r.selectedPrice<=0).length};
}
export function uniqueSorted(rows,field){return [...new Set(rows.map(r=>r[field]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"pt-BR"));}
