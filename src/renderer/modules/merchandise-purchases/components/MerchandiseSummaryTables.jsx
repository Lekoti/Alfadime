import {buildMerchandiseReports,formatReportCell} from "../services/merchandiseReport.service";
export default function MerchandiseSummaryTables({rows=[],reports}) {
    const models=reports||buildMerchandiseReports(rows);
    return <div className="mp-report-grid">{models.map(report=><section key={report.id} className={`mp-report-card${report.id==="lab"?" mp-report-last":""}`}>
        <h3>{report.title}</h3><div className="mp-report-scroll"><table><thead><tr>{report.headers.map(h=><th key={h}>{h}</th>)}</tr></thead>
        <tbody>{report.rows.length?report.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{formatReportCell(cell,report.formats[j])}</td>)}</tr>):<tr><td colSpan={report.headers.length}>Sem dados.</td></tr>}</tbody></table></div>
    </section>)}</div>;
}
