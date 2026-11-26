const HIDDEN=new Set(["viaQty","viaValue","policyValue","scenarios","policy","alerts"]);
export const CHART_COLORS=["#344B65","#B45309","#047857","#7C3AED","#0E7490","#BE123C","#1D4ED8","#CA8A04","#15803D","#9333EA","#0891B2","#DC2626"];
export const CHART_REPORT_IDS=new Set(["result","values","curve","company","origins","lab"]);
export function visibleReports(reports){return reports.filter(report=>!HIDDEN.has(report.id));}
export function chartReports(reports){return visibleReports(reports).filter(report=>CHART_REPORT_IDS.has(report.id));}
export function chartRows(report){
    const index=report.chartColumn||1;
    return report.rows.map((cells,position)=>{
        const cell=cells[index];
        const value=Number(cell&&typeof cell==="object"?cell.value:cell)||0;
        return {cells,label:String(cells[0]??""),value,format:report.formats?.[index],color:CHART_COLORS[position%CHART_COLORS.length]};
    }).filter(item=>item.value>0).sort((a,b)=>b.value-a.value);
}
