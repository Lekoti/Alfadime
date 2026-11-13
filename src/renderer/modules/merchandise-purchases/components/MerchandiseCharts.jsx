import {buildMerchandiseReports,formatReportCell} from "../services/merchandiseReport.service";

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
                <section key={report.id} className="mp-chart-card">
                    <h3>{report.title}</h3>
                    <div className="mp-chart-scroll">
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
