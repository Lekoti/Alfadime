const LABELS=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
export function getRollingPeriods(closedMonth,now=new Date()){
    const closed=Number(closedMonth);
    if(!Number.isInteger(closed)||closed<1||closed>12)throw new Error("Mês fechado inválido.");
    const year=now.getFullYear()-(closed>=now.getMonth()+1?1:0);
    return Array.from({length:12},(_,position)=>{
        const date=new Date(year,closed-12+position,1);
        const month=date.getMonth()+1;
        const itemYear=date.getFullYear();
        return {month,year:itemYear,index:month-1,label:`${LABELS[month-1]}/${itemYear}`};
    });
}
export function getRollingRange(closedMonth,size,now=new Date()){
    const months=getRollingPeriods(closedMonth,now).slice(-size);
    return `${months[0].label} a ${months[months.length-1].label}`;
}
