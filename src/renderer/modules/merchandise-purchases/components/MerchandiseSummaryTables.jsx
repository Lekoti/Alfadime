import { useMemo } from "react";

const INT = new Intl.NumberFormat("pt-BR");
const BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});
const DEC = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function MiniTable({ title, headers, rows, emptyLabel = "Sem dados." }) {
    return (
        <div className="mp-mini-table">
            <strong>{title}</strong>

            <table>
                <thead>
                    <tr>
                        {headers.map((header) => (
                            <th key={header}>{header}</th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={headers.length}>{emptyLabel}</td>
                        </tr>
                    ) : (
                        rows.map((row, index) => (
                            <tr key={`${row.label}-${index}`}>
                                {row.cells.map((cell, cellIndex) => (
                                    <td key={cellIndex}>{cell}</td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default function MerchandiseSummaryTables({ tables }) {
    const tablesData = useMemo(() => tables, [tables]);

    if (!tablesData) {
        return null;
    }

    const { result, curveRows, companyRows, labRows, scenarioRows, originRows, viaLast } =
        tablesData;

    return (
        <div className="mp-summary-tables">
            <div className="mp-mini-tables-grid">
                <MiniTable
                    title="Resultado da simulação"
                    headers={["Indicador", "Valor"]}
                    rows={[
                        { label: "Itens a comprar", cells: [INT.format(result.itemsToBuy)] },
                        { label: "Qtde total a comprar", cells: [INT.format(result.totalQty)] },
                        { label: "Valor total", cells: [BRL.format(result.totalValue)] }
                    ]}
                />

                <MiniTable
                    title="Por curva"
                    headers={["Curva", "Qtde", "Valor"]}
                    rows={curveRows.map((row) => ({
                        label: row.label,
                        cells: [row.label, INT.format(row.qty), BRL.format(row.value)]
                    }))}
                />

                <MiniTable
                    title="Por empresa"
                    headers={["Empresa", "Qtde", "Valor"]}
                    rows={companyRows.map((row) => ({
                        label: row.label,
                        cells: [row.label, INT.format(row.qty), BRL.format(row.value)]
                    }))}
                />

                <MiniTable
                    title="Por laboratório"
                    headers={["Laboratório", "Qtde", "Valor"]}
                    rows={labRows.map((row) => ({
                        label: row.label,
                        cells: [row.label, INT.format(row.qty), BRL.format(row.value)]
                    }))}
                />

                <MiniTable
                    title="Comparativo de cenários — custo total"
                    headers={["Cenário", "Custo total", "A mais vs menor preço"]}
                    rows={scenarioRows.map((row) => ({
                        label: row.label,
                        cells: [
                            row.label,
                            BRL.format(row.value),
                            row.diff === 0 ? "—" : BRL.format(row.diff)
                        ]
                    }))}
                />

                <MiniTable
                    title="Distribuição por origem do preço"
                    headers={["Origem", "Qtde", "Valor", "Preço médio"]}
                    rows={originRows.map((row) => ({
                        label: row.label,
                        cells: [
                            row.label,
                            INT.format(row.qty),
                            BRL.format(row.value),
                            DEC.format(row.avgPrice)
                        ]
                    }))}
                />

                <MiniTable
                    title="Compra via última compra"
                    headers={["Indicador", "Valor"]}
                    rows={[
                        {
                            label: "Qtde comprada via última compra",
                            cells: [INT.format(viaLast.qty)]
                        },
                        {
                            label: "Valor via última compra",
                            cells: [BRL.format(viaLast.value)]
                        }
                    ]}
                />
            </div>
        </div>
    );
}
