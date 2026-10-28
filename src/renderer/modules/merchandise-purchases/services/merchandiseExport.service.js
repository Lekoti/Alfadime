import ExcelJS from "exceljs";

import {
    PERIOD_REFERENCES,
    PRICE_CRITERIA,
    PRICE_SOURCES,
    buildColumns
} from "../constants/merchandise-purchases.constants";

const SHEET_NAME = "Simulação Compras";
const START_COLUMN = 8;
const HEADER_ROW = 5;
const FIRST_ROW = 6;
const HEADER_COLOR = "FF344B65";
const BORDER_COLOR = "FFDFE4EA";

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

export async function exportMerchandiseExcel({
    rows,
    premises,
    importInfo,
    filtersLabel
}) {
    const columns = buildColumns(premises.closedMonth);
    const letters = {};

    columns.forEach((column, index) => {
        letters[column.key] = columnLetter(START_COLUMN + index);
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(SHEET_NAME);
    const lastRow = FIRST_ROW + rows.length - 1;

    const range = (key) =>
        `$${letters[key]}$${FIRST_ROW}:$${letters[key]}$${Math.max(lastRow, FIRST_ROW)}`;

    sheet.getCell("B2").value = "Simulação de Compra";
    sheet.getCell("B2").font = { bold: true, size: 14, color: { argb: HEADER_COLOR } };
    sheet.getCell("B3").value = filtersLabel || "Sem filtros aplicados";
    sheet.getCell("B3").font = { italic: true, size: 9, color: { argb: "FF6B7785" } };

    const headerStyle = {
        font: { bold: true, color: { argb: "FFFFFFFF" }, size: 9 },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_COLOR } },
        alignment: { horizontal: "center", vertical: "middle", wrapText: true }
    };

    ["B", "C", "D", "E"].forEach((letter) => {
        Object.assign(sheet.getCell(`${letter}${HEADER_ROW}`), headerStyle);
    });

    sheet.getCell(`B${HEADER_ROW}`).value = "Premissas";
    sheet.getCell(`C${HEADER_ROW}`).value = "Dias";
    sheet.getCell(`D${HEADER_ROW}`).value = "Estoque Mês";
    sheet.getCell(`E${HEADER_ROW}`).value = "";

    const curveRows = [
        ["Curva A", premises.curveDays.A],
        ["Curva B", premises.curveDays.B],
        ["Curva C", premises.curveDays.C],
        ["D E F (Outros)", premises.curveDays.OTHER]
    ];

    curveRows.forEach(([label, days], index) => {
        const r = FIRST_ROW + index;

        sheet.getCell(`B${r}`).value = label;
        sheet.getCell(`C${r}`).value = days;
        sheet.getCell(`D${r}`).value = { formula: `C${r}/30`, result: days / 30 };
        sheet.getCell(`C${r}`).font = { color: { argb: "FF0000FF" }, bold: true };
        sheet.getCell(`D${r}`).numFmt = "0.0";
    });

    sheet.getCell("E10").value = "Critério de preço";
    sheet.getCell("F10").value = labelOf(PRICE_CRITERIA, premises.priceCriteria);
    sheet.getCell("E11").value = "Fonte do preço";
    sheet.getCell("F11").value = labelOf(PRICE_SOURCES, premises.priceSource);
    sheet.getCell("E12").value = "Referência do período";
    sheet.getCell("F12").value = labelOf(PERIOD_REFERENCES, premises.periodReference);

    const totalValue = rows.reduce((sum, row) => sum + row.finalValue, 0);
    const periodValue = rows.reduce((sum, row) => sum + row.periodValue, 0);
    const itemsToBuy = rows.filter((row) => row.finalQty > 0).length;

    sheet.getCell("B11").value = "Resultado da Simulação";
    sheet.getCell("B11").font = { bold: true };
    sheet.getCell("B12").value = "Itens a comprar";
    sheet.getCell("C12").value = {
        formula: `COUNTIF(${range("finalQty")},">0")`,
        result: itemsToBuy
    };
    sheet.getCell("B13").value = "Valor total (R$)";
    sheet.getCell("C13").value = {
        formula: `SUM(${range("finalValue")})`,
        result: totalValue
    };
    sheet.getCell("C13").numFmt = NUMBER_FORMATS.currency;
    sheet.getCell("B14").value = "Valor sugestão período (R$)";
    sheet.getCell("C14").value = {
        formula: `SUM(${range("periodValue")})`,
        result: periodValue
    };
    sheet.getCell("C14").numFmt = NUMBER_FORMATS.currency;

    columns.forEach((column, index) => {
        const cell = sheet.getCell(HEADER_ROW, START_COLUMN + index);

        cell.value = column.label;
        Object.assign(cell, headerStyle);
        cell.border = thinBorder();
        sheet.getColumn(START_COLUMN + index).width = column.width;
    });

    sheet.getColumn("B").width = 26;
    sheet.getColumn("C").width = 12;
    sheet.getColumn("D").width = 13;
    sheet.getColumn("E").width = 22;
    sheet.getColumn("F").width = 22;
    sheet.getRow(HEADER_ROW).height = 32;

    rows.forEach((row, rowIndex) => {
        const r = FIRST_ROW + rowIndex;
        const ref = (key) => `${letters[key]}${r}`;
        const box = ref("boxSize");
        const boxExpr = `IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),${box},1)`;
        const suggest = (monthlyRef) =>
            `ROUNDUP(MAX(ROUNDUP(${monthlyRef}/30*${ref("targetDays")},0)-${ref("consolidated")},0)/${boxExpr},0)*${boxExpr}`;

        const formulas = {
            consolidated: {
                formula: `SUM(${ref("pending")}:${ref("transferred")})`,
                result: row.consolidated
            },
            targetDays: {
                formula: `IF(${ref("curve")}="A",$C$6,IF(${ref("curve")}="B",$C$7,IF(${ref("curve")}="C",$C$8,$C$9)))`,
                result: row.targetDays
            },
            finalQty: row.manual
                ? row.finalQty
                : { formula: suggest(ref("avgMonth")), result: row.finalQty },
            finalValue: {
                formula: `${ref("finalQty")}*${ref("selectedPrice")}`,
                result: row.finalValue
            },
            periodSuggestion: {
                formula: suggest(ref("refQty")),
                result: row.periodSuggestion
            },
            periodValue: {
                formula: `${ref("periodSuggestion")}*${ref("selectedPrice")}`,
                result: row.periodValue
            },
            stockMonths: {
                formula: `IFERROR(${ref("consolidated")}/${ref("avgMonth")},0)`,
                result: row.stockMonths
            },
            boxStatus: {
                formula: `IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),"OK","Caixa inválida")`,
                result: row.boxStatus
            }
        };

        columns.forEach((column, columnIndex) => {
            const cell = sheet.getCell(r, START_COLUMN + columnIndex);
            const value = formulas[column.key] ?? row[column.key];

            cell.value = value === undefined || value === null ? "" : value;
            cell.numFmt = NUMBER_FORMATS[column.type] || "General";
            cell.font = { size: 9 };
            cell.border = thinBorder();

            if (column.key === "finalQty" && row.manual) {
                cell.font = { size: 9, bold: true, color: { argb: "FF92400E" } };
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFEF3C7" }
                };
            }
        });
    });

    sheet.views = [{ state: "frozen", xSplit: 0, ySplit: HEADER_ROW }];
    sheet.autoFilter = {
        from: { row: HEADER_ROW, column: START_COLUMN },
        to: { row: HEADER_ROW, column: START_COLUMN + columns.length - 1 }
    };

    const baseSheet = workbook.addWorksheet("Planilha1");

    baseSheet.addRow(importInfo.headers);
    baseSheet.getRow(1).font = { bold: true };
    rows.forEach((row) => baseSheet.addRow(row.raw));

    const rulesSheet = workbook.addWorksheet("Regras da consolidação");
    const rules = [
        ["Regra", "Aplicação"],
        ["Saldo consolidado", "Pendência + estoque + bloqueado + saldo transferido da própria empresa."],
        ["Compra por caixa", "Necessidade arredondada para cima ao múltiplo inteiro positivo de Cx Padrao. Zero de necessidade permanece zero."],
        ["Caixa inválida", "Zero, vazia, fracionária ou negativa: múltiplo 1; sinalização na coluna Validação Cx."],
        ["Qtde a Comprar", "ARREDONDAR.PARA.CIMA(Média Mês / 30 x Dias da curva) - saldo consolidado, em múltiplos da caixa."],
        ["Sugestão Compra Período", "Mesma fórmula, usando a Qtde Ref. Período escolhida nas premissas."],
        ["Preços", "Fonte e critério definidos nas premissas. Sem preço positivo, usa a última compra como estimativa."],
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
