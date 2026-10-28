import {formatReportCell,reportValue} from "../services/merchandiseReport.service";
const PALETTE=["#3b5f86","#0e7490","#047857","#7c3aed","#b45309","#be123c"];
export default function MerchandiseCharts({reports=[]}) {
    return <div className="mp-report-grid">{reports.map((report,i)=>{
        const laboratory=report.id==="lab",count=report.rows.length;
        const max=report.rows.reduce((m,r)=>Math.max(m,Math.abs(Number(reportValue(r[report.chartColumn]))||0)),1);
        const step=laboratory?25:32,height=Math.max(70,count*step+15);
        return <section key={report.id} className={`mp-report-card${laboratory?" mp-report-last mp-lab-chart-card":""}`}>
            <h3>{report.title} — {report.headers[report.chartColumn]}</h3>
            <div className="mp-chart-scroll"><svg role="img" aria-label={report.title} viewBox={`0 0 700 ${height}`} style={{width:"100%",minWidth:laboratory?550:400}}>
                {report.rows.map((r,j)=>{const value=Number(reportValue(r[report.chartColumn]))||0,width=Math.max(0,value)/max*260;
                    return <g key={j}><title>{`${r[0]}: ${formatReportCell(r[report.chartColumn],report.formats[report.chartColumn])}`}</title>
                        <text x="2" y={j*step+19} fill="#344b65" fontSize={laboratory?10:11}>{String(r[0]).length>29?`${String(r[0]).slice(0,27)}…`:r[0]}</text>
                        <rect x="225" y={j*step+5} height={laboratory?16:20} width={width} rx="2" fill={PALETTE[i%PALETTE.length]}/>
                        <text x={235+width} y={j*step+19} fill="#263241" fontSize="10">{formatReportCell(r[report.chartColumn],report.formats[report.chartColumn])}</text>
                    </g>;})}
                {!count&&<text x="10" y="25" fontSize="12">Sem dados para os filtros atuais.</text>}
            </svg></div>
            <div className="mp-report-scroll"><table><thead><tr>{report.headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{report.rows.map((r,j)=><tr key={j}>{r.map((c,k)=><td key={k}>{formatReportCell(c,report.formats[k])}</td>)}</tr>)}</tbody></table></div>
        </section>;
    })}</div>;
}
