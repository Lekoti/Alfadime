const LABELS=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function resolveReferenceDate(referenceDate,now=new Date()){
    if(referenceDate===null||referenceDate===undefined||referenceDate==="")return now;

    const date=referenceDate instanceof Date?referenceDate:new Date(referenceDate);

    if(Number.isNaN(date.getTime()))throw new Error("Data de referência inválida.");

    return date;
}

export function getRollingPeriods(closedMonth,referenceDate,now=new Date()){
    const closed=Number(closedMonth);

    if(!Number.isInteger(closed)||closed<1||closed>12)throw new Error("Mês fechado inválido.");

    const reference=resolveReferenceDate(referenceDate,now);
    const year=reference.getFullYear()-(closed>=reference.getMonth()+1?1:0);

    return Array.from({length:12},(_,position)=>{
        const date=new Date(year,closed-12+position,1);
        const month=date.getMonth()+1;
        const itemYear=date.getFullYear();

        return {month,year:itemYear,index:month-1,label:LABELS[month-1],fullLabel:`${LABELS[month-1]}/${itemYear}`};
    });
}

export function getRollingRange(closedMonth,size,referenceDate,now=new Date()){
    const months=getRollingPeriods(closedMonth,referenceDate,now).slice(-size);

    return `${months[0].fullLabel} a ${months[months.length-1].fullLabel}`;
}
