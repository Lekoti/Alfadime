import ExcelJS from "exceljs";

import {
    PERIOD_REFERENCES,
    PRICE_CRITERIA,
    PRICE_SOURCES,
    buildColumns
} from "../constants/merchandise-purchases.constants";

const SHEET_NAME = "Simulação Compras";
const DATA_START_COLUMN = 8;
const DATA_HEADER_ROW = 5;
const DATA_FIRST_ROW = 6;
const SUMMARY_START_ROW = 11;
const HEADER_COLOR = "FF344B65";
const BORDER_COLOR = "FFDFE4EA";

const COLUMN_COLORS = {
    identification: "FF3B5F86",
    sales: "FF0E7490",
    period: "FF7C3AED",
    stock: "FF047857",
    price: "FFB45309",
    result: "FFBE123C",
    validation: "FF6B7280"
};

function columnColor(key) {
    if (["company", "productCode", "barcode", "description", "lab", "group"].includes(key)) {
        return COLUMN_COLORS.identification;
    }
    if (["curve", "boxSize", "avgMonth", "avgAll", "avg6", "avg3"].includes(key)) {
        return COLUMN_COLORS.sales;
    }
    if (["maxPeriod", "maxQty", "minPeriod", "minQty", "refQty", "periodSuggestion", "periodValue"].includes(key)) {
        return COLUMN_COLORS.period;
    }
    if (["pending", "stock", "blocked", "transferred", "consolidated", "targetDays", "stockMonths"].includes(key)) {
        return COLUMN_COLORS.stock;
    }
    if (["ownPrice", "lastPurchase", "lowestCompany", "lowestPrice", "selectedPrice", "priceOrigin", "priceViaLast"].includes(key)) {
        return COLUMN_COLORS.price;
    }
    if (["finalQty", "finalValue"].includes(key)) {
        return COLUMN_COLORS.result;
    }
    return COLUMN_COLORS.validation;
}

const NUMBER_FORMATS = {
    currency: '"R$" #,##0.00',
    int: "#,##0",
    dec: "#,##0.0",
    text: "@"
};

function columnLetter(index) {
    let result = "";
    let n = index;
    while (n > 0) {
        const mod = (n - 1) % 26;
        result = String.fromCharCode(65 + mod) + result;
        n = Math.floor((n - 1) / 26);
    }
    return result;
}

function labelOf(list, value) {
    return list.find((item) => item.value === value)?.label || value;
}

function thinBorder() {
    const side = { style: "thin", color: { argb: BORDER_COLOR } };
    return { top: side, left: side, bottom: side, right: side };
}

function summaryTable(sheet, startRow, title, headers, rows, formats = []) {
    const titleCell = sheet.getCell(`B${startRow}`);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 10, color: { argb: HEADER_COLOR } };

    headers.forEach((header, index) => {
        const cell = sheet.getCell(startRow + 1, 2 + index);
        cell.value = header;
        cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_COLOR } };
        cell.border = thinBorder();
    });

    rows.forEach((row, rowIndex) => {
        row.forEach((value, columnIndex) => {
            const cell = sheet.getCell(startRow + 2 + rowIndex, 2 + columnIndex);
            cell.value = value;
            cell.numFmt = formats[columnIndex] || "General";
            cell.font = { size: 9 };
            cell.border = thinBorder();
        });
    });

    return startRow + 2 + rows.length + 1;
}

function uniqueValues(rows, field) {
    return [...new Set(rows.map((row) => String(row[field] || "")).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function exportMerchandiseExcel({
    rows,
    tables,
    premises,
    importInfo,
    filtersLabel
}) {
    const columns = buildColumns(premises.closedMonth);
    const letters = {};
    columns.forEach((column, index) => {
        letters[column.key] = columnLetter(DATA_START_COLUMN + index);
    });

    const companies = uniqueValues(rows, "company");
    const laboratories = uniqueValues(rows, "lab");
    const curves = uniqueValues(rows, "curve");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(SHEET_NAME);
    const lastRow = DATA_FIRST_ROW + rows.length - 1;

    const range = (key) =>
        `$${letters[key]}$${DATA_FIRST_ROW}:$${letters[key]}$${Math.max(lastRow, DATA_FIRST_ROW)}`;

    sheet.getCell("B2").value = "Simulação de Compra";
    sheet.getCell("B2").font = { bold: true, size: 14, color: { argb: HEADER_COLOR } };
    sheet.getCell("B3").value = filtersLabel || "Sem filtros aplicados";
    sheet.getCell("B3").font = { italic: true, size: 9, color: { argb: "FF6B7785" } };

    // Filtro geral destacado no topo esquerdo
    const filterLabels = [
        { cell: "B4", label: "Empresa", values: companies },
        { cell: "C4", label: "Laboratório", values: laboratories },
        { cell: "D4", label: "Curva", values: curves }
    ];

    filterLabels.forEach((field) => {
        const cell = sheet.getCell(field.cell);
        cell.value = "";
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3C7" } };
        cell.border = {
            top: { style: "medium", color: { argb: "FFB45309" } },
            left: { style: "medium", color: { argb: "FFB45309" } },
            bottom: { style: "medium", color: { argb: "FFB45309" } },
            right: { style: "medium", color: { argb: "FFB45309" } }
        };
        cell.font = { bold: true, size: 10, color: { argb: "FF92400E" } };

        if (field.values.length > 0) {
            sheet.dataValidations.add(`${field.cell}:${field.cell}`, {
                type: "list",
                allowBlank: true,
                formulae: [`"${field.values.join(",")}"`]
            });
        }
    });

    sheet.getCell("A4").value = "Filtros:";
    sheet.getCell("A4").font = { bold: true, size: 10, color: { argb: "FF92400E" } };

    const headerStyle = {
        font: { bold: true, color: { argb: "FFFFFFFF" }, size: 9 },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_COLOR } },
        alignment: { horizontal: "center", vertical: "middle", wrapText: true }
    };

    ["B", "C", "D"].forEach((letter) => {
        Object.assign(sheet.getCell(`${letter}${DATA_HEADER_ROW}`), headerStyle);
    });

    sheet.getCell(`B${DATA_HEADER_ROW}`).value = "Premissas";
    sheet.getCell(`C${DATA_HEADER_ROW}`).value = "Dias";
    sheet.getCell(`D${DATA_HEADER_ROW}`).value = "Estoque Mês";

    const curvePremises = [
        ["Curva A", premises.curveDays.A],
        ["Curva B", premises.curveDays.B],
        ["Curva C", premises.curveDays.C],
        ["D E F (Outros)", premises.curveDays.OTHER]
    ];

    curvePremises.forEach(([label, days], index) => {
        const r = DATA_FIRST_ROW + index;
        sheet.getCell(`B${r}`).value = label;
        sheet.getCell(`C${r}`).value = days;
        sheet.getCell(`D${r}`).value = { formula: `C${r}/30`, result: days / 30 };
        sheet.getCell(`C${r}`).font = { color: { argb: "FF0000FF" }, bold: true };
        sheet.getCell(`D${r}`).numFmt = "0.0";
    });

    sheet.getCell("B10").value = "Critério de preço";
    sheet.getCell("C10").value = labelOf(PRICE_CRITERIA, premises.priceCriteria);
    sheet.getCell("B10").font = { bold: true, size: 9 };
    sheet.getCell("C10").font = { size: 9 };

    let summaryRow = SUMMARY_START_ROW;

    summaryRow = summaryTable(
        sheet, summaryRow, "Resultado da simulação",
        ["Indicador", "Valor"],
        [
            ["Itens a comprar", { formula: `COUNTIF(${range("finalQty")},">0")`, result: tables.result.itemsToBuy }],
            ["Qtde total a comprar", { formula: `SUM(${range("finalQty")})`, result: tables.result.totalQty }],
            ["Valor total (R$)", { formula: `SUM(${range("finalValue")})`, result: tables.result.totalValue }],
            ["Valor sugestão período (R$)", { formula: `SUM(${range("periodValue")})`, result: rows.reduce((s, r) => s + r.periodValue, 0) }]
        ],
        [null, NUMBER_FORMATS.currency]
    );

    summaryRow = summaryTable(
        sheet, summaryRow, "Por Curva",
        ["Curva", "Qtde", "Valor"],
        tables.curveRows.map((row) => {
            const criteria = row.label === "D E F (Outros)" ? "<>" : row.label;
            return [
                row.label,
                { formula: `SUMIF(${range("curve")},"${criteria}",${range("finalQty")})`, result: row.qty },
                { formula: `SUMIF(${range("curve")},"${criteria}",${range("finalValue")})`, result: row.value }
            ];
        }),
        [null, NUMBER_FORMATS.int, NUMBER_FORMATS.currency]
    );

    summaryRow = summaryTable(
        sheet, summaryRow, "Por Empresa",
        ["Empresa", "Qtde", "Valor"],
        tables.companyRows.map((row) => [row.label, row.qty, row.value]),
        [null, NUMBER_FORMATS.int, NUMBER_FORMATS.currency]
    );

    summaryRow = summaryTable(
        sheet, summaryRow, "Por Laboratório",
        ["Laboratório", "Qtde", "Valor"],
        tables.labRows.map((row) => [row.label, row.qty, row.value]),
        [null, NUMBER_FORMATS.int, NUMBER_FORMATS.currency]
    );

    summaryRow = summaryTable(
        sheet, summaryRow, "Comparativo de Cenários — Custo Total",
        ["Cenário", "Custo Total", "A mais vs menor preço"],
        tables.scenarioRows.map((row) => [row.label, row.value, row.diff === 0 ? "—" : row.diff]),
        [null, NUMBER_FORMATS.currency, NUMBER_FORMATS.currency]
    );

    summaryRow = summaryTable(
        sheet, summaryRow, "Distribuição por origem do preço",
        ["Origem", "Qtde", "Valor", "Preço médio"],
        tables.originRows.map((row) => [row.label, row.qty, row.value, row.avgPrice]),
        [null, NUMBER_FORMATS.int, NUMBER_FORMATS.currency, NUMBER_FORMATS.currency]
    );

    summaryRow = summaryTable(
        sheet, summaryRow, "Compra via última compra",
        ["Indicador", "Valor"],
        [
            ["Qtde comprada via última compra", tables.viaLast.qty],
            ["Valor via última compra", tables.viaLast.value]
        ],
        [null, NUMBER_FORMATS.currency]
    );

    summaryTable(
        sheet, summaryRow, "Alertas",
        ["Indicador", "Valor"],
        [
            ["Saldo transferido", tables.transferred],
            ["Itens com caixa inválida", tables.invalidBox],
            ["Itens sem preço com compra", tables.noPriceWithBuy]
        ],
        [null, NUMBER_FORMATS.int]
    );

    columns.forEach((column, index) => {
        const cell = sheet.getCell(DATA_HEADER_ROW, DATA_START_COLUMN + index);
        const color = columnColor(column.key);

        cell.value = column.label;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = thinBorder();
        sheet.getColumn(DATA_START_COLUMN + index).width = column.width;
    });

    sheet.getColumn("A").width = 10;
    sheet.getColumn("B").width = 32;
    sheet.getColumn("C").width = 16;
    sheet.getColumn("D").width = 16;
    sheet.getColumn("E").width = 16;
    sheet.getColumn("F").width = 18;
    sheet.getRow(DATA_HEADER_ROW).height = 32;

    rows.forEach((row, rowIndex) => {
        const r = DATA_FIRST_ROW + rowIndex;
        const ref = (key) => `${letters[key]}${r}`;
        const box = ref("boxSize");
        const boxExpr = `IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),${box},1)`;
        const suggest = (monthlyRef) =>
            `ROUNDUP(MAX(ROUNDUP(${monthlyRef}/30*${ref("targetDays")},0)-${ref("consolidated")},0)/${boxExpr},0)*${boxExpr}`;

        const formulas = {
            consolidated: { formula: `SUM(${ref("pending")}:${ref("transferred")})`, result: row.consolidated },
            targetDays: {
                formula: `IF(${ref("curve")}="A",$C$6,IF(${ref("curve")}="B",$C$7,IF(${ref("curve")}="C",$C$8,$C$9)))`,
                result: row.targetDays
            },
            finalQty: row.manual ? row.finalQty : { formula: suggest(ref("avgMonth")), result: row.finalQty },
            finalValue: { formula: `${ref("finalQty")}*${ref("selectedPrice")}`, result: row.finalValue },
            periodSuggestion: { formula: suggest(ref("refQty")), result: row.periodSuggestion },
            periodValue: { formula: `${ref("periodSuggestion")}*${ref("selectedPrice")}`, result: row.periodValue },
            stockMonths: { formula: `IFERROR(${ref("consolidated")}/${ref("avgMonth")},0)`, result: row.stockMonths },
            boxStatus: {
                formula: `IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),"OK","Caixa inválida")`,
                result: row.boxStatus
            }
        };

        columns.forEach((column, columnIndex) => {
            const cell = sheet.getCell(r, DATA_START_COLUMN + columnIndex);
            const value = formulas[column.key] ?? row[column.key];

            cell.value = value === undefined || value === null ? "" : value;
            cell.numFmt = NUMBER_FORMATS[column.type] || "General";
            cell.font = { size: 9 };
            cell.border = thinBorder();

            if (column.key === "finalQty" && row.manual) {
                cell.font = { size: 9, bold: true, color: { argb: "FF92400E" } };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
            }
        });
    });

    const lastDataColumn = DATA_START_COLUMN + columns.length - 1;

    sheet.views = [
        { state: "frozen", xSplit: DATA_START_COLUMN - 1, ySplit: DATA_HEADER_ROW }
    ];

    sheet.autoFilter = {
        from: { row: DATA_HEADER_ROW, column: DATA_START_COLUMN },
        to: { row: DATA_HEADER_ROW, column: DATA_START_COLUMN + columns.length - 1 }
    };

    const baseSheet = workbook.addWorksheet("Planilha1");
    baseSheet.addRow(importInfo.headers);
    baseSheet.getRow(1).font = { bold: true };
    rows.forEach((row) => baseSheet.addRow(row.raw));

    const rulesSheet = workbook.addWorksheet("Regras da consolidação");
    const rules = [
        ["Regra", "Aplicação"],
        ["Filtro geral", "As células destacadas em amarelo no topo esquerdo (B4, C4, D4) mostram Empresa, Laboratório e Curva. A tabela exportada já contém somente os itens filtrados no app."],
        ["Filtro da tabela", "Use as setas de filtro no cabeçalho da tabela principal para refinar Empresa, Laboratório, Curva e demais colunas."],
        ["Saldo consolidado", "Pendência + estoque + bloqueado + saldo transferido da própria empresa."],
        ["Compra por caixa", "Necessidade arredondada para cima ao múltiplo inteiro positivo de Cx Padrao. Zero de necessidade permanece zero."],
        ["Caixa inválida", "Zero, vazia, fracionária ou negativa: múltiplo 1; sinalização na coluna Validação Cx."],
        ["Qtde a Comprar", "ARREDONDAR.PARA.CIMA(Média Mês / 30 x Dias da curva) - saldo consolidado, em múltiplos da caixa."],
        ["Sugestão Compra Período", "Mesma fórmula, usando a Qtde Ref. Período escolhida nas premissas."],
        ["Preços", "Fonte e critério definidos nas premissas. Sem preço positivo, usa a última compra como estimativa."],
        ["Tabelas resumo", "Posicionadas à esquerda, no topo da aba Simulação Compras."],
        ["Base", `Arquivo importado: ${importInfo.fileName}`]
    ];

    rules.forEach((rule) => rulesSheet.addRow(rule));
    rulesSheet.getRow(1).font = { bold: true };
    rulesSheet.getColumn(1).width = 26;
    rulesSheet.getColumn(2).width = 110;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const date = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = `Simulacao-Compra-${date}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
}
