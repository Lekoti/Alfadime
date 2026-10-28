import ExcelJS from "exceljs";
import {buildColumns,PRICE_CRITERIA} from "../constants/merchandise-purchases.constants";
import {buildMerchandiseReports,reportValue,REPORT_FORMATS} from "./merchandiseReport.service";
import {addNativeExcelCharts} from "./merchandiseNativeCharts.service";
const PANEL="Filtros e Tabelas",PRODUCTS="Simulação Compras",BLUE="FF344B65";
const FMT={text:"@",int:"#,##0",dec:"#,##0.0",currency:'"R$" #,##0.00'};
function L(n){let s="";while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
function clean(v){if(typeof v==="number")return Number.isFinite(v)?v:0;return typeof v==="string"?v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,""):v??"";}
function f(cell,formula,result){cell.value={formula,result:clean(result)};}
function quote(v){return '"'+String(v).replace(/~/g,"~~").replace(/\*/g,"~*").replace(/\?/g,"~?").replace(/"/g,'""')+'"';}
function head(cell,value,color=BLUE){cell.value=clean(value);cell.font={name:"Calibri",size:10,bold:true,color:{argb:"FFFFFFFF"}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:color}};cell.alignment={wrapText:true,vertical:"middle"};}
function color(k){if(k==="maxPeriod"||k==="maxQty")return "FF047857";if(k==="minPeriod"||k==="minQty")return "FFBE123C";if(/price|Purchase|Company/i.test(k)&&k!=="company")return "FFB45309";if(/stock|blocked|pending|consolidated|transferred/i.test(k))return "FF047857";if(/avg|curve/i.test(k))return "FF0E7490";return BLUE;}
export async function exportMerchandiseExcel({rows,premises,importInfo,filtersLabel}){
    if(!rows?.length)throw new Error("Nenhum produto para exportar.");
    const wb=new ExcelJS.Workbook();wb.calcProperties.fullCalcOnLoad=true;
    const ws=wb.addWorksheet(PRODUCTS),panel=wb.addWorksheet(PANEL),graphs=wb.addWorksheet("Gráficos"),aux=wb.addWorksheet("Apoio");
    const cols=buildColumns(premises.closedMonth),pos=Object.fromEntries(cols.map((c,i)=>[c.key,i]));
    const n=rows.length,ae=n+5,ve=n+1;
    const a=(key,r)=>`${L(3+pos[key])}${r}`;
    const ar=key=>`'Apoio'!$${L(3+pos[key])}$6:$${L(3+pos[key])}$${ae}`;
    const vr=key=>`'${PRODUCTS}'!$${L(1+pos[key])}$2:$${L(1+pos[key])}$${ve}`;
    const unique=key=>[...new Set(rows.map(r=>String(r[key]||"")).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
    panel.mergeCells("B2:O2");head(panel.getCell("B2"),"FILTROS E TABELAS — Compras de Mercadorias");panel.getRow(2).height=28;
    panel.mergeCells("B3:O3");panel.getCell("B3").value=filtersLabel||"Todas as empresas e laboratórios exportados";
    panel.mergeCells("B4:F4");head(panel.getCell("B4"),"Filtros gerais","FFB45309");
    const filters=[["Empresa","company",5],["Laboratório","lab",6],["Curva","curve",7]];
    filters.forEach(([label,key,r],i)=>{
        panel.getCell(`B${r}`).value=label;panel.mergeCells(`C${r}:F${r}`);const cell=panel.getCell(`C${r}`);cell.value="Todos";
        cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF3C7"}};
        const values=["Todos",...unique(key)],col=L(50+i),name=`MP_Filtro_${i}`;
        values.forEach((v,j)=>aux.getCell(`${col}${j+1}`).value=clean(v));wb.definedNames.add(`'Apoio'!$${col}$1:$${col}$${values.length}`,name);
        cell.dataValidation={type:"list",allowBlank:true,showErrorMessage:true,formulae:[name],error:"Escolha uma opção da lista."};
    });
    panel.mergeCells("B8:F8");panel.getCell("B8").value="Todos ou vazio = sem restrição. Os três filtros atuam juntos.";panel.getCell("B8").alignment={wrapText:true};panel.getRow(8).height=30;
    panel.getCell("B9").value="Produtos encontrados";f(panel.getCell("C9"),`'Apoio'!A${ae}`,n);
    ["Premissas","Dias","Estoque Mês"].forEach((h,i)=>head(panel.getCell(11,2+i),h));
    [["A",12],["B",13],["C",14],["OTHER",15]].forEach(([k,r])=>{
        panel.getCell(`B${r}`).value=k==="OTHER"?"D E F (Outros)":`Curva ${k}`;
        panel.getCell(`C${r}`).value=premises.curveDays[k]||0;f(panel.getCell(`D${r}`),`C${r}/30`,(premises.curveDays[k]||0)/30);panel.getCell(`D${r}`).numFmt="0.0";
        panel.getCell(`C${r}`).dataValidation={type:"decimal",operator:"greaterThanOrEqual",formulae:[0],showErrorMessage:true,error:"Informe dias maiores ou iguais a zero."};
    });
    panel.getCell("B16").value="Critério de preço";panel.mergeCells("C16:F16");const criterion=panel.getCell("C16");
    criterion.value=PRICE_CRITERIA.find(c=>c.value===premises.priceCriteria)?.label||"Própria empresa";
    criterion.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF3C7"}};
    PRICE_CRITERIA.forEach((v,i)=>aux.getCell(`BA${i+1}`).value=v.label);wb.definedNames.add(`'Apoio'!$BA$1:$BA$${PRICE_CRITERIA.length}`,"MP_Criterios");criterion.dataValidation={type:"list",allowBlank:false,showErrorMessage:true,formulae:["MP_Criterios"]};
    const lowestRecords=new Map();rows.forEach(row=>{const k=row.barcode||`cod:${row.productCode}`,old=lowestRecords.get(k);if(row.ownPrice>0&&(!old||row.ownPrice<old.ownPrice))lowestRecords.set(k,row);});
    aux.getCell("A5").value=0;
    for(let i=0;i<n;i++){
        const r=i+6,pr=i+2,ref=key=>a(key,r),input=rows[i];
        const conditions=filters.map(([,key,fr])=>`OR('${PANEL}'!$C$${fr}="Todos",'${PANEL}'!$C$${fr}="",${ref(key)}='${PANEL}'!$C$${fr})`).join(",");
        f(aux.getCell(`A${r}`),`A${r-1}+IF(AND(${conditions}),1,0)`,i+1);
        f(aux.getCell(`B${r}`),`IF(${i+1}<=$A$${ae},MATCH(${i+1},$A$6:$A$${ae},0),0)`,i+1);
        const box=ref("boxSize"),multiple=`IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),${box},1)`;
        const qty=base=>`ROUNDUP(MAX(ROUNDUP(${base}/30*${ref("targetDays")},0)-${ref("consolidated")},0)/${multiple},0)*${multiple}`;
        const low=lowestRecords.get(input.barcode||`cod:${input.productCode}`);
        const ownVia=premises.priceSource!=="lastPurchase"&&!(Number(input[premises.priceSource])>0)&&input.ownPrice>0;
        const lowVia=low&&premises.priceSource!=="lastPurchase"&&!(Number(low[premises.priceSource])>0)&&low.ownPrice>0;
        aux.getCell(`BD${r}`).value=ownVia?"Sim":"Não";aux.getCell(`BE${r}`).value=low?.company||input.company||"Sem preço";aux.getCell(`BF${r}`).value=lowVia?"Sim":"Não";
        const expressions={
            consolidated:`SUM(${ref("pending")}:${ref("transferred")})`,
            targetDays:`IF(${ref("curve")}="A",'${PANEL}'!$C$12,IF(${ref("curve")}="B",'${PANEL}'!$C$13,IF(${ref("curve")}="C",'${PANEL}'!$C$14,'${PANEL}'!$C$15)))`,
            selectedPrice:`IF('${PANEL}'!$C$16="Menor preço",${ref("lowestPrice")},${ref("ownPrice")})`,
            priceViaLast:`IF(${ref("selectedPrice")}<=0,"",IF('${PANEL}'!$C$16="Menor preço",BF${r},BD${r}))`,
            priceOrigin:`IF(${ref("selectedPrice")}<=0,"Sem preço",IF(${ref("priceViaLast")}="Sim","Última compra",IF('${PANEL}'!$C$16="Menor preço",BE${r},${ref("company")})))`,
            finalValue:`${ref("finalQty")}*${ref("selectedPrice")}`,periodSuggestion:qty(ref("refQty")),periodValue:`${ref("periodSuggestion")}*${ref("selectedPrice")}`,
            stockMonths:`IFERROR(${ref("consolidated")}/${ref("avgMonth")},0)`,boxStatus:`IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),"OK","Caixa inválida")`
        };
        if(!input.manual)expressions.finalQty=qty(ref("avgMonth"));
        cols.forEach((c,j)=>{
            const value=clean(input[c.key]),cell=aux.getCell(r,3+j);if(expressions[c.key])f(cell,expressions[c.key],value);else cell.value=value;
            const out=ws.getCell(pr,j+1);let expression=`IF('Apoio'!$B${r}=0,"",INDEX(${ar(c.key)},'Apoio'!$B${r}))`;
            // Derived visible values also follow manual changes to quantity or price on this row.
            const v=key=>`${L(1+pos[key])}${pr}`;
            if(c.key==="finalValue")expression=`IF(${v("company")}="","",${v("finalQty")}*${v("selectedPrice")})`;
            if(c.key==="periodValue")expression=`IF(${v("company")}="","",${v("periodSuggestion")}*${v("selectedPrice")})`;
            f(out,expression,value);out.numFmt=FMT[c.type]||"General";out.font={name:"Calibri",size:10};
            if(c.key==="maxPeriod"||c.key==="minPeriod"){out.fill={type:"pattern",pattern:"solid",fgColor:{argb:c.key==="maxPeriod"?"FFDCFCE7":"FFFEE2E2"}};out.alignment={wrapText:true,vertical:"top"};}
        });
    }
    cols.forEach((c,j)=>{head(ws.getCell(1,j+1),c.label,color(c.key));ws.getColumn(j+1).width=c.key==="maxPeriod"?50:c.key==="minPeriod"?35:c.width;});ws.getRow(1).height=38;
    ws.views=[{state:"frozen",ySplit:1,topLeftCell:"A2"}];ws.autoFilter={from:{row:1,column:1},to:{row:ve,column:cols.length}};
    const reports=buildMerchandiseReports(rows),placements=[];
    function expression(m){
        if(m.op==="sum")return `SUM(${vr(m.key)})`;
        if(m.op==="buyCount")return `COUNTIF(${vr("finalQty")},">0")`;
        if(m.op==="scenario")return `SUMPRODUCT(${vr("finalQty")},${vr(m.key)})`;
        if(m.op==="difference")return `SUMPRODUCT(${vr("finalQty")},${vr(m.key)})-SUMPRODUCT(${vr("finalQty")},${vr("lowestPrice")})`;
        if(m.op==="group")return `SUMIF(${vr(m.groupKey)},${quote(m.label)},${vr(m.key)})`;
        if(m.op==="groupAverage")return `IFERROR(SUMIF(${vr(m.groupKey)},${quote(m.label)},${vr("finalValue")})/SUMIF(${vr(m.groupKey)},${quote(m.label)},${vr("finalQty")}),0)`;
        if(m.op==="invalidBox")return `COUNTIF(${vr("boxStatus")},"Caixa inválida")`;
        if(m.op==="noPriceBuy")return `COUNTIFS(${vr("finalQty")},">0",${vr("selectedPrice")},"<=0")`;
        throw new Error(`Indicador desconhecido: ${m.op}`);
    }
    function writeReport(report,row,col){
        panel.mergeCells(row,col,row,col+3);head(panel.getCell(row,col),report.title);
        report.headers.forEach((h,j)=>head(panel.getCell(row+1,col+j),h));
        report.rows.forEach((cells,i)=>cells.forEach((cell,j)=>{const target=panel.getCell(row+2+i,col+j);if(cell&&typeof cell==="object")f(target,expression(cell),cell.value);else target.value=clean(cell);target.numFmt=REPORT_FORMATS[report.formats[j]]||"General";}));
        placements.push({report,row,col});
    }
    const main=reports.filter(r=>r.id!=="lab");let nextRow=19;
    for(let i=0;i<main.length;i+=3){const band=main.slice(i,i+3);band.forEach((r,j)=>writeReport(r,nextRow,2+j*5));nextRow+=Math.max(...band.map(r=>r.rows.length))+5;}
    writeReport(reports.find(r=>r.id==="lab"),nextRow,2);
    panel.getColumn(2).width=36;panel.getColumn(7).width=36;panel.getColumn(12).width=36;
    [3,4,5,8,9,10,13,14,15].forEach(c=>panel.getColumn(c).width=19);[6,11].forEach(c=>panel.getColumn(c).width=3);
    panel.views=[{state:"frozen",ySplit:3}];
    graphs.mergeCells("B1:U1");head(graphs.getCell("B1"),"GRÁFICOS E TABELAS — resultados vinculados");graphs.getRow(1).height=28;
    graphs.mergeCells("B2:U2");graphs.getCell("B2").value="Atualize filtros e premissas na aba Filtros e Tabelas. Os gráficos usam as células abaixo.";
    for(let c=1;c<=25;c++)graphs.getColumn(c).width=13;
    const chartSpecs=[];let graphRow=4;
    const graphBands=[];
    const regular=placements.filter(p=>p.report.id!=="lab");
    for(let i=0;i<regular.length;i+=2)graphBands.push(regular.slice(i,i+2));
    graphBands.push(placements.filter(p=>p.report.id==="lab"));
    for(const band of graphBands){let height=24;
        band.forEach((p,k)=>{
            const start=2+k*12,report=p.report,tableRow=graphRow+19,first=tableRow+1,count=Math.max(1,report.rows.length);
            graphs.mergeCells(graphRow,start,graphRow,start+9);head(graphs.getCell(graphRow,start),report.title);
            report.headers.forEach((h,j)=>head(graphs.getCell(tableRow,start+j),h));
            if(report.rows.length){report.rows.forEach((cells,ri)=>cells.forEach((cell,cj)=>{
                f(graphs.getCell(first+ri,start+cj),`'${PANEL}'!${L(p.col+cj)}${p.row+2+ri}`,reportValue(cell));graphs.getCell(first+ri,start+cj).numFmt=REPORT_FORMATS[report.formats[cj]]||"General";
            }));}else{graphs.getCell(first,start).value="Sem dados";graphs.getCell(first,start+report.chartColumn).value=0;}
            chartSpecs.push({title:`${report.title} — ${report.headers[report.chartColumn]}`,seriesName:report.headers[report.chartColumn],
                categoryFormula:`'Gráficos'!$${L(start)}$${first}:$${L(start)}$${first+count-1}`,
                valueFormula:`'Gráficos'!$${L(start+report.chartColumn)}$${first}:$${L(start+report.chartColumn)}$${first+count-1}`,
                labels:report.rows.length?report.rows.map(r=>r[0]):["Sem dados"],values:report.rows.length?report.rows.map(r=>reportValue(r[report.chartColumn])):[0],
                format:REPORT_FORMATS[report.formats[report.chartColumn]]||"General",fromCol:start-1,toCol:start+9,fromRow:graphRow,toRow:graphRow+18,
                color:["3B5F86","0E7490","047857","7C3AED","B45309"][chartSpecs.length%5]});
            height=Math.max(height,report.rows.length+23);
        });graphRow+=height;
    }
    graphs.views=[{state:"frozen",ySplit:2}];aux.state="veryHidden";
    const base=wb.addWorksheet("Planilha1");base.addRow((importInfo.headers||[]).map(clean));rows.forEach(r=>base.addRow((r.raw||[]).map(clean)));
    const rules=wb.addWorksheet("Regras da consolidação");[
        ["Regra","Aplicação"],["Abas","Simulação Compras: produtos. Filtros e Tabelas: controles e resumos. Gráficos: gráficos nativos e tabelas vinculadas."],
        ["Filtros","Empresa, laboratório e curva combinam-se por E. Todos ou vazio desativa o critério. As listas não são dependentes."],
        ["Recálculo","Requer cálculo automático do Excel. Não há sincronização com o app. Somente os produtos exportados estão disponíveis."],
        ["Edição","Altere filtros, dias por curva e critério na aba Filtros e Tabelas. Quantidade/preço podem ser substituídos na tabela, atualizando valores e gráficos; essas substituições ficam na posição da linha. Para nova filtragem, prefira reexportar os valores manuais pelo app."],
        ["Dados originais","Planilha1 é uma cópia para conferência; editar essa aba não altera os resultados calculados."],
        ["Gráficos","São objetos nativos ligados às células da aba Gráficos. A última tabela do painel é Por laboratório."],
        ["Alta de vendas","Meses com quantidade acima da média dos meses fechados. Não altera a sugestão de compra."],
        ["Base",importInfo.fileName||""]].forEach(r=>rules.addRow(r));rules.getColumn(1).width=25;rules.getColumn(2).width=120;
    let buffer=await wb.xlsx.writeBuffer();buffer=await addNativeExcelCharts(buffer,graphs.id,chartSpecs);
    const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download=`Simulacao-Compra-${new Date().toISOString().slice(0,10)}.xlsx`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
