import {buildMerchandiseReports,formatReportCell,reportValue} from "../services/merchandiseReport.service";

const CHART_COLORS=[
    "#344B65",
    "#B45309",
    "#047857",
    "#7C3AED",
    "#0E7490",
    "#BE123C",
    "#1D4ED8",
    "#CA8A04",
    "#15803D",
    "#9333EA",
    "#0891B2",
    "#DC2626"
];

const REMOVED_CHARTS=new Set([
    "viaQty",
    "viaValue",
    "policyValue",
    "origins",
    "scenarios",
    "policy",
    "alerts"
]);

function chartData(report){
    const categoryIndex=0;
    const valueIndex=report.chartColumn||1;

    return report.rows
        .map((row,index)=>({
            label:String(row[categoryIndex]??""),
            value:Number(reportValue(row[valueIndex]))||0,
            format:report.formats[valueIndex],
            color:CHART_COLORS[index%CHART_COLORS.length]
        }))
        .filter(item=>item.value>0)
        .sort((first,second)=>second.value-first.value);
}

export default function MerchandiseCharts({rows=[],reports,mode="charts"}){
    const models=(reports||buildMerchandiseReports(rows)).filter(report=>!REMOVED_CHARTS.has(report.id));

    if(mode==="tables"){
        return (
            <div className="mp-report-grid">
                {models.map(report=>(
                    <section key={report.id} className={`mp-report-card${report.id==="lab"?" mp-report-last":""}`}>
                        <h3>{report.title}</h3>
                        <div className="mp-report-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        {report.headers.map(header=><th key={header}>{header}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.rows.length?report.rows.map((row,index)=>(
                                        <tr key={index}>
                                            {report.id==="lab"?(
                                                <>
                                                    <td>{row[0]}</td>
                                                    <td>{formatReportCell(row[1],report.formats[1])}</td>
                                                    <td>{formatReportCell(row[2],report.formats[2])}</td>
                                                </>
                                            ):row.map((cell,cellIndex)=><td key={cellIndex}>{formatReportCell(cell,report.formats[cellIndex])}</td>)}
                                        </tr>
                                    )):(
                                        <tr><td colSpan={report.headers.length}>Sem dados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))}
            </div>
        );
    }

    return (
        <div className="mp-chart-grid">
            {models.map(report=>{
                const data=chartData(report);
                const maxValue=Math.max(...data.map(item=>Math.abs(item.value)),1);

                return (
                    <section key={report.id} className={`mp-chart-card${report.id==="lab"?" mp-lab-chart-card":""}`}>
                        <h3>{report.title}</h3>
                        <div className="mp-chart-scroll">
                            {data.length?(
                                <div className="mp-chart-bars">
                                    {data.map((item,index)=>{
                                        const percentage=Math.max(1,Math.round(item.value/maxValue*100));

                                        return (
                                            <div key={`${report.id}-${index}`} className="mp-chart-bar">
                                                <span className="mp-chart-label">{item.label||"Não informado"}</span>
                                                <div className="mp-chart-track">
                                                    <div
                                                        className="mp-chart-fill"
                                                        style={{
                                                            width:`${percentage}%`,
                                                            backgroundColor:item.color
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className="mp-chart-value">{formatReportCell(item.value,item.format)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ):(
                                <p className="mp-chart-empty">Sem dados para exibir.</p>
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
