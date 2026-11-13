import {buildMerchandiseReports,formatReportCell,reportValue} from "../services/merchandiseReport.service";

export default function MerchandiseCharts({rows=[],reports,mode="charts"}){
    const models=reports||buildMerchandiseReports(rows);

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
                                            {row.map((cell,cellIndex)=><td key={cellIndex}>{formatReportCell(cell,report.formats[cellIndex])}</td>)}
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
            {models.map(report=>(
                <section key={report.id} className={`mp-chart-card${report.id==="lab"?" mp-lab-chart-card":""}`}>
                    <h3>{report.title}</h3>
                    <div className="mp-chart-scroll">
                        <div className="mp-chart-bars">
                            {report.rows.map((row,index)=>{
                                const label=formatReportCell(row[0],report.formats[0]);
                                const value=Number(reportValue(row[report.chartColumn||1]))||0;
                                const maxValue=Math.max(...models.flatMap(item=>item.rows.map(cell=>Number(reportValue(cell[item.chartColumn||1]))||0)),1);
                                const width=Math.max(2,Math.round(value/maxValue*100));

                                return (
                                    <div key={index} className="mp-chart-bar">
                                        <span className="mp-chart-label">{label}</span>
                                        <div className="mp-chart-track">
                                            <div className="mp-chart-fill" style={{width:`${width}%`}}></div>
                                        </div>
                                        <span className="mp-chart-value">{formatReportCell(row[report.chartColumn||1],report.formats[report.chartColumn||1])}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}