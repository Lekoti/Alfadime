import ExcelJS from "exceljs";
import { buildColumns, PRICE_CRITERIA } from "../constants/merchandise-purchases.constants";

const BLUE = "FF344B65";
const FMT = { text: "@", int: "#,##0", dec: "#,##0.0", currency: '"R$" #,##0.00' };
function letter(n) {
    let s = "";
    while (n) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); }
    return s;
}
function color(key) {
    if (/Period|Qty$|period|refQty/.test(key) && !["finalQty"].includes(key)) return "FF7C3AED";
    if (/stock|blocked|pending|transferred|consolidated|targetDays/i.test(key)) return "FF047857";
    if (/price|Purchase|Company/i.test(key) && key !== "company") return "FFB45309";
    if (["finalQty", "finalValue"].includes(key)) return "FFBE123C";
    if (/avg|curve|boxSize/i.test(key)) return "FF0E7490";
    return BLUE;
}
function head(cell, value, fill = BLUE) {
    cell.value = value;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.alignment = { vertical: "middle", wrapText: true };
}
function clean(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
    return value ?? "";
}
function formula(cell, text, result) {
    cell.value = { formula: text, result: clean(result) };
}

export async function exportMerchandiseExcel({ rows, premises, importInfo, filtersLabel }) {
    if (!rows?.length) throw new Error("Nenhum produto para exportar.");
    const wb = new ExcelJS.Workbook();
    wb.calcProperties.fullCalcOnLoad = true;
    const ws = wb.addWorksheet("Simulação Compras");
    const cols = buildColumns(premises.closedMonth);
    const n = rows.length, end = n + 5;
    const pos = Object.fromEntries(cols.map((c, i) => [c.key, i]));
    const vr = key => `$${letter(8 + pos[key])}$6:$${letter(8 + pos[key])}$${end}`;
    const sr = key => `$${letter(60 + pos[key])}$6:$${letter(60 + pos[key])}$${end}`;
    const source = (key, r) => `${letter(60 + pos[key])}${r}`;
    const visible = (key, r) => `${letter(8 + pos[key])}${r}`;
    const unique = key => [...new Set(rows.map(r => String(r[key] || "")).filter(Boolean))].sort((a,b) => a.localeCompare(b,"pt-BR"));
    ws.getCell("B2").value = "Simulação de Compra";
    ws.getCell("B2").font = { size: 16, bold: true, color: { argb: BLUE } };
    ws.mergeCells("B3:F3");
    ws.getCell("B3").value = filtersLabel || "Todas as empresas e laboratórios exportados";
    head(ws.getCell("B4"), "FILTROS GERAIS — combinados", "FFB45309");
    ws.mergeCells("B4:F4");
    const filters = [ ["Empresa", "company", 5], ["Laboratório", "lab", 6], ["Curva", "curve", 7] ];
    filters.forEach(([label,key,r],i) => {
        ws.getCell(`B${r}`).value = label;
        ws.getCell(`B${r}`).font = { bold: true, size: 11 };
        ws.mergeCells(`C${r}:F${r}`);
        const cell = ws.getCell(`C${r}`);
        cell.value = "Todos";
        cell.fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FFFFF3C7"} };
        const values = ["Todos", ...unique(key)];
        const lc = letter(100 + i);
        values.forEach((v,j) => { ws.getCell(`${lc}${j+1}`).value = clean(v); });
        cell.dataValidation = { type:"list", allowBlank:true, showErrorMessage:true,
            errorTitle:"Seleção inválida", error:"Escolha uma opção da lista.",
            formulae:[`$${lc}$1:$${lc}$${values.length}`] };
    });
    ws.mergeCells("B8:F8");
    ws.getCell("B8").value = "Todos ou vazio = sem restrição. Os 3 filtros atuam juntos.";
    ws.getCell("B8").font = { size:9, italic:true };
    ws.getCell("B9").value = "Produtos encontrados";
    formula(ws.getCell("C9"), `$BF$${end}`, n);

    head(ws.getCell("B11"), "Premissas"); head(ws.getCell("C11"), "Dias"); head(ws.getCell("D11"), "Estoque Mês");
    [["A",12],["B",13],["C",14],["OTHER",15]].forEach(([key,r]) => {
        ws.getCell(`B${r}`).value = key === "OTHER" ? "D E F (Outros)" : `Curva ${key}`;
        ws.getCell(`C${r}`).value = premises.curveDays[key] || 0;
        formula(ws.getCell(`D${r}`), `C${r}/30`, (premises.curveDays[key] || 0)/30);
        ws.getCell(`D${r}`).numFmt = "0.0";
    });
    ws.getCell("B16").value = "Critério de preço";
    ws.getCell("C16").value = PRICE_CRITERIA.find(x => x.value === premises.priceCriteria)?.label || premises.priceCriteria;

    // BF: contador cumulativo de correspondências. BG: índice do resultado.
    ws.getCell("BF5").value = 0;
    for (let i=0;i<n;i++) {
        const r = i+6;
        const conditions = filters.map(([,key,fr]) => `OR($C$${fr}="Todos",$C$${fr}="",${source(key,r)}=$C$${fr})`).join(",");
        formula(ws.getCell(`BF${r}`), `BF${r-1}+IF(AND(${conditions}),1,0)`, i+1);
        formula(ws.getCell(`BG${r}`), `IF(${i+1}<=$BF$${end},MATCH(${i+1},$BF$6:$BF$${end},0),0)`, i+1);
        cols.forEach((c,j) => {
            const cell = ws.getCell(r,60+j);
            let value = clean(rows[i][c.key]);
            const ref = key => source(key,r);
            const box = ref("boxSize");
            const mult = `IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),${box},1)`;
            const qty = base => `ROUNDUP(MAX(ROUNDUP(${base}/30*${ref("targetDays")},0)-${ref("consolidated")},0)/${mult},0)*${mult}`;
            const expressions = {
                consolidated: `SUM(${ref("pending")}:${ref("transferred")})`,
                targetDays: `IF(${ref("curve")}="A",$C$12,IF(${ref("curve")}="B",$C$13,IF(${ref("curve")}="C",$C$14,$C$15)))`,
                finalValue: `${ref("finalQty")}*${ref("selectedPrice")}`,
                periodSuggestion: qty(ref("refQty")),
                periodValue: `${ref("periodSuggestion")}*${ref("selectedPrice")}`,
                stockMonths: `IFERROR(${ref("consolidated")}/${ref("avgMonth")},0)`,
                boxStatus: `IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),"OK","Caixa inválida")`
            };
            if (!rows[i].manual) expressions.finalQty = qty(ref("avgMonth"));
            if (expressions[c.key]) formula(cell,expressions[c.key],value); else cell.value=value;
            const out = ws.getCell(r,8+j);
            formula(out, `IF($BG${r}=0,"",INDEX(${sr(c.key)},$BG${r}))`,value);
            out.numFmt = FMT[c.type] || "General";
            out.font = { name:"Calibri", size:10 };
        });
    }
    cols.forEach((c,j) => {
        head(ws.getCell(5,8+j),c.label,color(c.key));
        ws.getColumn(8+j).width = c.width;
    });
    // Resumos referenciam exclusivamente a tabela de resultados filtrados.
    let at = 18;
    function table(title, headers, items, formats) {
        ws.mergeCells(`B${at}:F${at}`); head(ws.getCell(`B${at}`), title); at++;
        headers.forEach((h,j) => head(ws.getCell(at,j+2),h)); at++;
        for (const item of items) {
            item.forEach((v,j) => {
                const cell=ws.getCell(at,j+2);
                if (v && typeof v === "object") formula(cell,v.f,v.v); else cell.value=clean(v);
                cell.numFmt=formats[j] || "General";
                cell.font={name:"Calibri",size:10};
            }); at++;
        } at+=2;
    }
    const sum = key => ({f:`SUM(${vr(key)})`,v:rows.reduce((s,r)=>s+(Number(r[key])||0),0)});
    table("Resultado da simulação",["Indicador","Valor"],[
        ["Itens a comprar",{f:`COUNTIF(${vr("finalQty")},">0")`,v:rows.filter(r=>r.finalQty>0).length}],
        ["Qtde total a comprar",sum("finalQty")]
    ],[null,FMT.int]);
    table("Valores da simulação",["Indicador","Valor"],[
        ["Valor selecionado",sum("finalValue")],["Valor sugestão período",sum("periodValue")]
    ],[null,FMT.currency]);
    function group(title,key,values) {
        table(title,["Grupo","Qtde","Valor"],values.map(label=>{
            const matching=rows.filter(r=>String(r[key]||"")===label);
            const criterion='"'+label.replace(/~/g,"~~").replace(/\*/g,"~*").replace(/\?/g,"~?").replace(/"/g,'""')+'"';
            return [label,{f:`SUMIF(${vr(key)},${criterion},${vr("finalQty")})`,v:matching.reduce((s,r)=>s+r.finalQty,0)},
                {f:`SUMIF(${vr(key)},${criterion},${vr("finalValue")})`,v:matching.reduce((s,r)=>s+r.finalValue,0)}];
        }),[null,FMT.int,FMT.currency]);
    }
    group("Por curva (cada curva separada)","curve",unique("curve"));
    group("Por empresa","company",unique("company"));
    group("Por laboratório","lab",unique("lab"));
    const scenario = key => ({f:`SUMPRODUCT(${vr("finalQty")},${vr(key)})`,v:rows.reduce((s,r)=>s+r.finalQty*r[key],0)});
    table("Comparativo de cenários",["Cenário","Custo total"],[
        ["Menor preço",scenario("lowestPrice")],["Própria empresa",scenario("ownPrice")],
        ["Preço selecionado",scenario("selectedPrice")]
    ],[null,FMT.currency]);
    group("Distribuição por origem do preço","priceOrigin",unique("priceOrigin"));
    table("Compra via última compra",["Indicador","Quantidade"],[
        ["Quantidade",{f:`SUMIF(${vr("priceViaLast")},"Sim",${vr("finalQty")})`,v:rows.filter(r=>r.priceViaLast==="Sim").reduce((s,r)=>s+r.finalQty,0)}]
    ],[null,FMT.int]);
    table("Valor via última compra",["Indicador","Valor"],[
        ["Valor",{f:`SUMIF(${vr("priceViaLast")},"Sim",${vr("finalValue")})`,v:rows.filter(r=>r.priceViaLast==="Sim").reduce((s,r)=>s+r.finalValue,0)}]
    ],[null,FMT.currency]);
    table("Alertas",["Indicador","Quantidade"],[
        ["Saldo transferido",sum("transferred")],
        ["Caixa inválida",{f:`COUNTIF(${vr("boxStatus")},"Caixa inválida")`,v:rows.filter(r=>!r.boxValid).length}],
        ["Sem preço com compra",{f:`COUNTIFS(${vr("finalQty")},">0",${vr("selectedPrice")},"<=0")`,v:rows.filter(r=>r.finalQty>0 && r.selectedPrice<=0).length}]
    ],[null,FMT.int]);
    ws.getColumn(2).width=36;
    ws.getColumn(3).width=22;
    [4,5,6].forEach(c=>ws.getColumn(c).width=18);
    for (let c=58;c<=102;c++) ws.getColumn(c).hidden=true;
    ws.getRow(5).height=38;
    ws.views=[{state:"frozen",xSplit:7,ySplit:5,topLeftCell:"H6"}];
    ws.autoFilter={from:{row:5,column:8},to:{row:end,column:7+cols.length}};
    const base=wb.addWorksheet("Planilha1");
    base.addRow((importInfo.headers||[]).map(clean));
    rows.forEach(r=>base.addRow((r.raw||[]).map(clean)));
    const rules=wb.addWorksheet("Regras da consolidação");
    [ ["Regra","Aplicação"],
      ["Filtros","Empresa, laboratório e curva combinam-se por E. Todos ou vazio desativa o critério."],
      ["Listas","As listas contêm os valores exportados. Não são listas dependentes; combinações sem correspondência resultam em zero produtos."],
      ["Resultados","A tabela à direita compacta os produtos encontrados. As linhas restantes ficam vazias, não ocultas."],
      ["Quantidade","Edite as premissas C12:C15 para recalcular. Quantidades manuais previamente definidas no app são preservadas."],
      ["Exportação","Somente produtos enviados pelo app estão disponíveis; um filtro aplicado antes de exportar limita a base deste arquivo."],
      ["Desempenho","Grandes exportações exigem recálculo de muitas fórmulas."],
      ["Base",importInfo.fileName || ""] ].forEach(r=>rules.addRow(r));
    rules.getColumn(1).width=25; rules.getColumn(2).width=110;
    const buffer=await wb.xlsx.writeBuffer();
    const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url; a.download=`Simulacao-Compra-${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
}
