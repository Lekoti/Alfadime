import {resolvePrice,productPriceKey} from "./merchandisePolicy.service";

const MONTHS=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const curveKey=value=>["A","B","C"].includes(value)?value:"OTHER";

export function getBoxMultiple(box){
    return Number.isInteger(box)&&box>0?box:1;
}

export function suggestQuantity(monthly,days,balance,box){
    const multiple=getBoxMultiple(box);
    return Math.ceil(Math.max(Math.ceil(monthly/30*days-1e-9)-balance,0)/multiple)*multiple;
}

export function computeRows(rows,premises){
    const closed=Math.min(12,Math.max(1,Number(premises.closedMonth)||12));
    const prices=rows.map(row=>resolvePrice(row,premises.priceSource));
    const cheapest=new Map();

    rows.forEach((row,index)=>{
        const price=prices[index];
        const key=productPriceKey(row);

        if(price.price>0&&(!cheapest.has(key)||price.price<cheapest.get(key).price)){
            cheapest.set(key,price);
        }
    });

    return rows.map((row,index)=>{
        const months=Array.from({length:closed},(_,position)=>Number(row.months?.[position])||0);
        const average=size=>{
            const values=months.slice(-Math.min(size,closed));
            return values.reduce((total,value)=>total+value,0)/values.length;
        };

        const avgAll=average(closed);
        const avg6=average(6);
        const avg3=average(3);
        const avgMonth=row.avgMonthSheet==null?avgAll:row.avgMonthSheet;
        const hasHistory=months.some(value=>value>0);
        const maxQty=hasHistory?Math.max(...months):0;
        const minQty=hasHistory?Math.min(...months):0;
        const select=test=>months.map((value,position)=>test(value)?MONTHS[position]:null).filter(Boolean);
        const highMonths=hasHistory?select(value=>value>avgAll):[];
        const peak=select(value=>value===maxQty);
        const lowMonths=select(value=>value===minQty);
        const maxPeriod=hasHistory
            ?`${peak.join(", ")} | ${highMonths.length?`Alta: ${highMonths.join(", ")}`:"Sem meses acima da média"}`
            :"Sem histórico";

        const base=prices[index];
        const low=cheapest.get(productPriceKey(row));
        const chosen=premises.priceCriteria==="lowest"?low:base;
        const selectedPrice=chosen?.price||0;
        const pending=0;
        const transferred=0;
        const consolidated=row.stock+row.blocked;
        const targetDays=premises.curveDays[curveKey(row.curve)]??0;
        const references={max:maxQty,min:minQty,avgMonth,avg3,avg6,avgAll};
        const refQty=references[premises.periodReference]??maxQty;
        const suggestedQty=suggestQuantity(avgMonth,targetDays,consolidated,row.boxSize);
        const periodSuggestion=suggestQuantity(refQty,targetDays,consolidated,row.boxSize);
        const boxValid=Number.isInteger(row.boxSize)&&row.boxSize>0;

        return {
            ...row,
            id:index,
            avgMonth,
            avgAll,
            avg6,
            avg3,
            hasHistory,
            maxPeriod,
            maxQty,
            minPeriod:hasHistory?lowMonths.join(", "):"Sem histórico",
            minQty,
            highMonths,
            pending,
            transferred,
            consolidated,
            targetDays,
            ownPrice:base.price,
            lowestPrice:low?.price||0,
            lowestCompany:low?(low.price===base.price?"Igual":low.company):"Sem preço",
            selectedPrice,
            priceOrigin:selectedPrice>0?chosen.label:"Sem preço",
            priceCompany:selectedPrice>0?chosen.company:"",
            selectedPriceWarning:chosen?.warning||(!selectedPrice?"Sem preço disponível":""),
            priceViaLast:selectedPrice>0?(chosen.key==="lastPurchase"?"Sim":"Não"):"",
            boxValid,
            boxStatus:boxValid?"OK":"Caixa inválida",
            stockMonths:avgMonth>0?consolidated/avgMonth:0,
            refQty,
            suggestedQty,
            periodSuggestion,
            periodValue:periodSuggestion*selectedPrice
        };
    });
}

export function applyOverrides(rows,overrides){
    return rows.map(row=>{
        const manual=overrides[row.id]!==undefined;
        const finalQty=manual?overrides[row.id]:row.suggestedQty;

        return {
            ...row,
            manual,
            finalQty,
            finalValue:finalQty*row.selectedPrice
        };
    });
}

const normalize=value=>String(value??"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase();

function matchesMultiple(value,selected){
    const options=Array.isArray(selected)?selected:[];

    return !options.length||options.includes(value);
}

export function filterRows(rows,filters){
    const search=normalize(filters.search).trim();

    return rows.filter(row=>{
        if(!matchesMultiple(row.company,filters.company))return false;
        if(!matchesMultiple(row.lab,filters.laboratory))return false;
        if(filters.group&&row.group!==filters.group)return false;
        if(!matchesMultiple(row.curve,filters.curve))return false;
        if(filters.priceOrigin&&row.priceOrigin!==filters.priceOrigin)return false;

        const tests={
            tobuy:row.finalQty>0,
            nobuy:!(row.finalQty>0),
            noprice:!(row.selectedPrice>0),
            invalidbox:!row.boxValid,
            nohistory:!row.hasHistory,
            manual:row.manual,
            expiredpolicy:row.policyExpired,
            withpolicy:row.policyPrice>0,
            withoutpolicy:!(row.policyPrice>0)
        };

        if(filters.status&&Object.hasOwn(tests,filters.status)&&!tests[filters.status]){
            return false;
        }

        return !search||normalize(`${row.company} ${row.productCode} ${row.barcode} ${row.description} ${row.lab}`).includes(search);
    });
}

export function summarizeRows(rows){
    return rows.reduce((summary,row)=>{
        summary.products++;

        if(row.finalQty>0){
            summary.itemsToBuy++;
            summary.totalQty+=row.finalQty;
        }

        summary.totalValue+=row.finalValue;
        summary.periodValue+=row.periodValue;

        if(row.selectedPrice<=0){
            summary.noPrice++;
        }

        if(!row.boxValid){
            summary.invalidBox++;
        }

        return summary;
    },{
        products:0,
        itemsToBuy:0,
        totalQty:0,
        totalValue:0,
        periodValue:0,
        noPrice:0,
        invalidBox:0
    });
}

function groupBy(rows,key){
    const map=new Map();

    rows.forEach(row=>{
        const label=String(row[key]||"Não informado");

        if(!map.has(label)){
            map.set(label,{label,qty:0,value:0,count:0});
        }

        const group=map.get(label);
        group.qty+=row.finalQty;
        group.value+=row.finalValue;
        group.count++;
    });

    return [...map.values()]
        .map(group=>({
            ...group,
            avgPrice:group.qty>0?group.value/group.qty:0
        }))
        .sort((first,second)=>first.label.localeCompare(second.label,"pt-BR"));
}

export function buildSummaryTables(rows){
    const curveRows=["A","B","C","D E F (Outros)"].map(label=>({
        label,
        qty:0,
        value:0,
        count:0
    }));

    rows.forEach(row=>{
        const index=["A","B","C"].indexOf(row.curve);
        const group=curveRows[index<0?3:index];
        group.qty+=row.finalQty;
        group.value+=row.finalValue;
        group.count++;
    });

    const scenarioRows=[
        ["Menor preço","lowestPrice"],
        ["Própria empresa","ownPrice"],
        ["Preço selecionado","selectedPrice"]
    ].map(([label,key])=>({
        label,
        value:rows.reduce((total,row)=>total+row.finalQty*row[key],0),
        extra:null
    }));

    scenarioRows.forEach(row=>{
        row.diff=row.value-scenarioRows[0].value;
    });

    const via=rows.filter(row=>row.priceViaLast==="Sim");

    return {
        result:{
            itemsToBuy:rows.filter(row=>row.finalQty>0).length,
            totalQty:rows.reduce((total,row)=>total+row.finalQty,0),
            totalValue:rows.reduce((total,row)=>total+row.finalValue,0)
        },
        curveRows,
        companyRows:groupBy(rows,"company"),
        labRows:groupBy(rows,"lab"),
        scenarioRows,
        originRows:groupBy(rows,"priceOrigin"),
        viaLast:{
            qty:via.reduce((total,row)=>total+row.finalQty,0),
            value:via.reduce((total,row)=>total+row.finalValue,0)
        },
        transferred:rows.reduce((total,row)=>total+row.transferred,0),
        invalidBox:rows.filter(row=>!row.boxValid).length,
        noPriceWithBuy:rows.filter(row=>row.finalQty>0&&row.selectedPrice<=0).length
    };
}

export function uniqueSorted(rows,key){
    return [...new Set(rows.map(row=>row[key]).filter(Boolean))]
        .sort((first,second)=>String(first).localeCompare(String(second),"pt-BR"));
}
