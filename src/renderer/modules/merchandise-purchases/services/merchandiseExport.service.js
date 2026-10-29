import ExcelJS from "exceljs";
import {buildColumns,PRICE_CRITERIA,PRICE_SOURCES,PERIOD_REFERENCES,MONTH_LABELS} from "../constants/merchandise-purchases.constants";
import {buildMerchandiseReports,reportValue,REPORT_FORMATS} from "./merchandiseReport.service";
import {resolvePrice,productPriceKey} from "./merchandisePolicy.service";
import {addNativeExcelCharts} from "./merchandiseNativeCharts.service";
import {addDynamicChartRanges} from "./merchandiseChartRanges.service";
const PANEL="Filtros e Tabelas",PRODUCTS="Simulação Compras",BLUE="FF344B65";
const FMT={text:"@",int:"#,##0",dec:"#,##0.0",currency:'"R$" #,##0.00',date:"dd/mm/yyyy",datetime:"dd/mm/yyyy hh:mm:ss"};
function L(n){let s="";while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
function clean(v){if(typeof v==="number")return Number.isFinite(v)?v:0;return typeof v==="string"?v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,""):v??"";}
function f(cell,formula,result){cell.value={formula,result:clean(result)};}
function literal(v){return '"'+String(v).replace(/"/g,'""')+'"';}
function quote(v){return literal(String(v).replace(/~/g,"~~").replace(/\*/g,"~*").replace(/\?/g,"~?"));}
function head(cell,value,color=BLUE){cell.value=clean(value);cell.font={name:"Calibri",size:10,bold:true,color:{argb:"FFFFFFFF"}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:color}};cell.alignment={wrapText:true,vertical:"middle"};}
function color(k){if(k.startsWith("policy"))return "FF7C3AED";if(k==="maxPeriod"||k==="maxQty")return "FF047857";if(k==="minPeriod"||k==="minQty")return "FFBE123C";if(/price|Purchase|Company/i.test(k)&&k!=="company")return "FFB45309";if(/stock|blocked|pending|consolidated|transferred/i.test(k))return "FF047857";if(/avg|curve/i.test(k))return "FF0E7490";return BLUE;}
function excelValue(value,type){
    if(!value)return type==="date"||type==="datetime"?"":clean(value);
    if(type==="date"){const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);return match?Date.UTC(+match[1],+match[2]-1,+match[3])/86400000+25569:"";}
    if(type==="datetime"){const d=new Date(value);return Number.isNaN(d.getTime())?"":(d.getTime()-d.getTimezoneOffset()*60000)/86400000+25569;}
    return clean(value);
}
export async function exportMerchandiseExcel({rows,premises,importInfo,policySnapshot,policyError}){
    if(!rows?.length)throw new Error("Nenhum produto para exportar.");
    const wb=new ExcelJS.Workbook();wb.calcProperties.fullCalcOnLoad=true;
    const ws=wb.addWorksheet(PRODUCTS),panel=wb.addWorksheet(PANEL),graphs=wb.addWorksheet("Gráficos"),aux=wb.addWorksheet("Apoio");
    const cols=buildColumns(premises.closedMonth),pos=Object.fromEntries(cols.map((c,i)=>[c.key,i])),reports=buildMerchandiseReports(rows),placements=[];
    const n=rows.length,ae=n+5,ve=n+1,matrixStart=cols.length+12,matrixEnd=matrixStart+PRICE_SOURCES.length*8-1,chartStart=matrixEnd+10,listStart=chartStart+reports.length*2+10;
    const a=(key,r)=>`${L(3+pos[key])}${r}`,ar=key=>`'Apoio'!$${L(3+pos[key])}$6:$${L(3+pos[key])}$${ae}`;
    const vr=key=>`'${PRODUCTS}'!$${L(1+pos[key])}$2:$${L(1+pos[key])}$${ve}`;
    const unique=key=>[...new Set(rows.map(r=>String(r[key]||"")).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
    function list(cell,values,name,column){const col=L(column);values.forEach((value,i)=>aux.getCell(`${col}${i+1}`).value=clean(value));wb.definedNames.add(`'Apoio'!$${col}$1:$${col}$${values.length}`,name);cell.dataValidation={type:"list",allowBlank:true,showErrorMessage:true,formulae:[name],error:"Escolha uma opção da lista."};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF3C7"}};return `$${col}$1:$${col}$${values.length}`;}
    panel.mergeCells("B2:O2");head(panel.getCell("B2"),"FILTROS E TABELAS — Política Comercial e Compras");panel.getRow(2).height=28;
    panel.mergeCells("B3:O3");panel.getCell("B3").value="Exportação completa; filtros e seleção do app não limitam os produtos deste arquivo.";
    panel.mergeCells("B4:F4");head(panel.getCell("B4"),"Filtros gerais","FFB45309");
    const filters=[["Empresa","company",5],["Laboratório (Fabr_Global)","lab",6],["Curva","curve",7]];
    filters.forEach(([label,key,r],i)=>{panel.getCell(`B${r}`).value=label;panel.mergeCells(`C${r}:F${r}`);const cell=panel.getCell(`C${r}`);cell.value="Todos";list(cell,["Todos",...unique(key)],`MP_Filtro_${i}`,listStart+i);});
    panel.mergeCells("B8:F8");panel.getCell("B8").value="Todos ou vazio = sem restrição. Laboratório é Fabr_Global; Lab. não é usado para agrupar.";panel.getCell("B8").alignment={wrapText:true};panel.getRow(8).height=32;
    panel.getCell("B9").value="Produtos encontrados";f(panel.getCell("C9"),`'Apoio'!A${ae}`,n);
    ["Premissas","Dias","Estoque Mês"].forEach((h,i)=>head(panel.getCell(11,2+i),h));
    [["A",12],["B",13],["C",14],["OTHER",15]].forEach(([k,r])=>{panel.getCell(`B${r}`).value=k==="OTHER"?"D E F (Outros)":`Curva ${k}`;panel.getCell(`C${r}`).value=premises.curveDays[k]||0;f(panel.getCell(`D${r}`),`C${r}/30`,(premises.curveDays[k]||0)/30);panel.getCell(`D${r}`).numFmt="0.0";panel.getCell(`C${r}`).dataValidation={type:"decimal",operator:"greaterThanOrEqual",formulae:[0],showErrorMessage:true,error:"Informe dias maiores ou iguais a zero."};});
    panel.getCell("B16").value="Empresa de referência do preço";panel.mergeCells("C16:F16");const criterion=panel.getCell("C16");criterion.value=PRICE_CRITERIA.find(c=>c.value===premises.priceCriteria)?.label||"Própria empresa";
    list(criterion,PRICE_CRITERIA.map(c=>c.label),"MP_Criterios",listStart+3);
    panel.mergeCells("G4:K4");head(panel.getCell("G4"),"Fonte do preço","FF7C3AED");panel.mergeCells("G5:K5");const source=panel.getCell("G5");source.value=PRICE_SOURCES.find(s=>s.value===premises.priceSource)?.label||"Política Comercial";
    const sourceList=list(source,PRICE_SOURCES.map(s=>s.label),"MP_Fontes_Preco",listStart+4);
    f(aux.getCell("B1"),`IFERROR(MATCH('${PANEL}'!$G$5,${sourceList},0),1)`,Math.max(1,PRICE_SOURCES.findIndex(s=>s.value===premises.priceSource)+1));
    panel.mergeCells("G6:K8");panel.getCell("G6").value="Padrão: Política Comercial → última → penúltima → antepenúltima → zero. Preço vencido continua sendo usado com aviso. As outras fontes começam pela opção escolhida e usam os históricos disponíveis.";panel.getCell("G6").alignment={wrapText:true,vertical:"top"};
    panel.mergeCells("G9:K9");head(panel.getCell("G9"),"Base da sugestão alternativa");panel.mergeCells("G10:K10");const period=panel.getCell("G10");period.value=PERIOD_REFERENCES.find(s=>s.value===premises.periodReference)?.label||PERIOD_REFERENCES[0].label;list(period,PERIOD_REFERENCES.map(s=>s.label),"MP_Periodos",listStart+5);
    panel.mergeCells("G11:K13");panel.getCell("G11").value="Altera Sugestão Compra Período. A quantidade principal usa Média Mês, estoque e dias por curva. A fonte do preço altera valores, não quantidades.";panel.getCell("G11").alignment={wrapText:true,vertical:"top"};
    panel.mergeCells("G15:K15");panel.getCell("G15").value=`Vendas completas até: ${MONTH_LABELS[Math.max(0,(Number(premises.closedMonth)||1)-1)]}. Para mudar o histórico, ajuste no app e reexporte.`;panel.getCell("G15").alignment={wrapText:true};panel.getRow(15).height=32;
    panel.mergeCells("L4:O4");head(panel.getCell("L4"),"Leitura de Política Comercial");panel.mergeCells("L5:O8");panel.getCell("L5").value=policyError||(!policySnapshot?"Sem leitura da pasta. Os preços históricos estão disponíveis.":`${policySnapshot.filesFound} arquivos; ${policySnapshot.records.length} registros. Verificação: ${new Date(policySnapshot.scannedAt).toLocaleString("pt-BR")}. Confira Última Leitura por produto.`);panel.getCell("L5").alignment={wrapText:true,vertical:"top"};
    panel.getCell("L10").value="Políticas vencidas";f(panel.getCell("M10"),`COUNTIF(${vr("policyStatus")},"Política vencida")`,rows.filter(r=>r.policyExpired).length);
    const alternatives=PRICE_SOURCES.map(s=>rows.map(r=>resolvePrice(r,s.value)));
    const lows=PRICE_SOURCES.map((s,si)=>{const map=new Map();rows.forEach((r,i)=>{const p=alternatives[si][i],key=productPriceKey(r);if(p.price>0&&(!map.has(key)||p.price<map.get(key).price))map.set(key,{...p,index:i});});return map;});
    aux.getCell("A5").value=0;
    for(let i=0;i<n;i++){
        const r=i+6,pr=i+2,input=rows[i],ref=key=>a(key,r),block=`$${L(matrixStart)}${r}:$${L(matrixEnd)}${r}`;
        const select=offset=>`INDEX(${block},1,($B$1-1)*8+${offset})`;
        const conditions=filters.map(([,key,fr])=>`OR('${PANEL}'!$C$${fr}="Todos",'${PANEL}'!$C$${fr}="",${ref(key)}='${PANEL}'!$C$${fr})`).join(",");
        f(aux.getCell(`A${r}`),`A${r-1}+IF(AND(${conditions}),1,0)`,i+1);f(aux.getCell(`B${r}`),`IF(${i+1}<=$A$${ae},MATCH(${i+1},$A$6:$A$${ae},0),0)`,i+1);
        PRICE_SOURCES.forEach((s,si)=>{
            const own=alternatives[si][i],low=lows[si].get(productPriceKey(input)),start=matrixStart+si*8;
            [own.price,own.label,own.company,own.warning,low?.price||0,low?.label||"Sem preço",low?.company||"",low?.warning||"Sem preço disponível"].forEach((value,j)=>aux.getCell(r,start+j).value=clean(value));
            if(own.key==="policyPrice"){
                const fixed=(input.policyWarning||"").split(" · ").filter(w=>w!=="Política vencida").join(" · ");
                f(aux.getCell(r,start+3),`IF(AND(ISNUMBER(${ref("policyValidity")}),${ref("policyValidity")}>0,TODAY()>${ref("policyValidity")}),"Política vencida","")&${literal(fixed?` · ${fixed}`:"")}`,own.warning);
            }
            if(low)f(aux.getCell(r,start+7),`${L(start+3)}${low.index+6}`,low.warning);
        });
        const box=ref("boxSize"),multiple=`IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),${box},1)`,qty=base=>`ROUNDUP(MAX(ROUNDUP(${base}/30*${ref("targetDays")},0)-${ref("consolidated")},0)/${multiple},0)*${multiple}`;
        const periodOptions={max:"maxQty",min:"minQty",avgMonth:"avgMonth",avg3:"avg3",avg6:"avg6",avgAll:"avgAll"};let periodFormula=ref("maxQty");
        for(const opt of [...PERIOD_REFERENCES].reverse())periodFormula=`IF('${PANEL}'!$G$10=${literal(opt.label)},${ref(periodOptions[opt.value])},${periodFormula})`;
        const expressions={
            ownPrice:select(1),lowestPrice:select(5),lowestCompany:`IF(${select(5)}<=0,"Sem preço",IF(${select(1)}=${select(5)},"Igual",${select(7)}))`,
            selectedPrice:`IF('${PANEL}'!$C$16="Menor preço",${ref("lowestPrice")},${ref("ownPrice")})`,
            priceOrigin:`IF('${PANEL}'!$C$16="Menor preço",${select(6)},${select(2)})`,priceCompany:`IF('${PANEL}'!$C$16="Menor preço",${select(7)},${select(3)})`,
            selectedPriceWarning:`IF('${PANEL}'!$C$16="Menor preço",${select(8)},${select(4)})`,priceViaLast:`IF(${ref("selectedPrice")}<=0,"",IF(${ref("priceOrigin")}="Última compra","Sim","Não"))`,
            policyStatus:input.policyPrice>0?`IF(AND(ISNUMBER(${ref("policyValidity")}),${ref("policyValidity")}>0),IF(TODAY()>${ref("policyValidity")},"Política vencida","Vigente"),"Validade não informada")`:literal(input.policyStatus||"Sem Política Comercial"),
            consolidated:`SUM(${ref("pending")}:${ref("transferred")})`,targetDays:`IF(${ref("curve")}="A",'${PANEL}'!$C$12,IF(${ref("curve")}="B",'${PANEL}'!$C$13,IF(${ref("curve")}="C",'${PANEL}'!$C$14,'${PANEL}'!$C$15)))`,
            refQty:periodFormula,finalValue:`${ref("finalQty")}*${ref("selectedPrice")}`,periodSuggestion:qty(ref("refQty")),periodValue:`${ref("periodSuggestion")}*${ref("selectedPrice")}`,stockMonths:`IFERROR(${ref("consolidated")}/${ref("avgMonth")},0)`,boxStatus:`IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),"OK","Caixa inválida")`
        };
        if(!input.manual)expressions.finalQty=qty(ref("avgMonth"));
        cols.forEach((c,j)=>{
            const value=excelValue(input[c.key],c.type),cell=aux.getCell(r,3+j);if(expressions[c.key])f(cell,expressions[c.key],value);else cell.value=value;cell.numFmt=FMT[c.type]||"General";
            const out=ws.getCell(pr,j+1),v=key=>`${L(1+pos[key])}${pr}`;let expression=`IF('Apoio'!$B${r}=0,"",INDEX(${ar(c.key)},'Apoio'!$B${r}))`;
            if(c.key==="finalValue")expression=`IF(${v("company")}="","",${v("finalQty")}*${v("selectedPrice")})`;
            if(c.key==="periodValue")expression=`IF(${v("company")}="","",${v("periodSuggestion")}*${v("selectedPrice")})`;
            f(out,expression,value);out.numFmt=FMT[c.type]||"General";out.font={name:"Calibri",size:10};
            if(c.key==="maxPeriod"||c.key==="minPeriod"){out.fill={type:"pattern",pattern:"solid",fgColor:{argb:c.key==="maxPeriod"?"FFDCFCE7":"FFFEE2E2"}};out.alignment={wrapText:true,vertical:"top"};}
        });
    }
    cols.forEach((c,j)=>{head(ws.getCell(1,j+1),c.label,color(c.key));ws.getColumn(j+1).width=c.width;});ws.getRow(1).height=40;ws.views=[{state:"frozen",ySplit:1,topLeftCell:"A2"}];ws.autoFilter={from:{row:1,column:1},to:{row:ve,column:cols.length}};
    for(const key of ["policyStatus","selectedPriceWarning"]){const col=L(1+pos[key]);ws.addConditionalFormatting({ref:`${col}2:${col}${ve}`,rules:[{type:"expression",formulae:[key==="policyStatus"?`${col}2="Política vencida"`:`AND(${col}2<>"",${col}2<>"Sem preço disponível")`],style:{fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF3C7"}},font:{color:{argb:"FF92400E"}}}}]});}
    function expression(m){
        if(m.op==="sum")return `SUM(${vr(m.key)})`;if(m.op==="buyCount")return `COUNTIF(${vr("finalQty")},">0")`;
        if(m.op==="scenario")return `SUMPRODUCT(${vr("finalQty")},${vr(m.key)})`;if(m.op==="difference")return `SUMPRODUCT(${vr("finalQty")},${vr(m.key)})-SUMPRODUCT(${vr("finalQty")},${vr("lowestPrice")})`;
        if(m.op==="group")return `SUMIF(${vr(m.groupKey)},${quote(m.label)},${vr(m.key)})`;
        if(m.op==="groupAverage")return `IFERROR(SUMIF(${vr(m.groupKey)},${quote(m.label)},${vr("finalValue")})/SUMIF(${vr(m.groupKey)},${quote(m.label)},${vr("finalQty")}),0)`;
        if(m.op==="invalidBox")return `COUNTIF(${vr("boxStatus")},"Caixa inválida")`;if(m.op==="noPriceBuy")return `COUNTIFS(${vr("finalQty")},">0",${vr("selectedPrice")},"<=0")`;
        if(m.op==="withPolicy")return `COUNTIF(${vr("policyPrice")},">0")`;if(m.op==="withoutPolicy")return `COUNTIF(${vr("company")},"?*")-COUNTIF(${vr("policyPrice")},">0")`;if(m.op==="expiredPolicy")return `COUNTIF(${vr("policyStatus")},"Política vencida")`;
        throw new Error(`Indicador desconhecido: ${m.op}`);
    }
    function writeReport(report,row,col){
        panel.mergeCells(row,col,row,col+3);head(panel.getCell(row,col),report.title);report.headers.forEach((h,j)=>head(panel.getCell(row+1,col+j),h));const grouped=["curve","company","lab","origins"].includes(report.id),active=[];
        report.rows.forEach((cells,i)=>{const gm=grouped?cells.find(c=>c&&typeof c==="object"&&c.groupKey):null,present=!gm||rows.some(r=>String(r[gm.groupKey]||"")===gm.label);if(present)active.push(i);
            cells.forEach((cell,j)=>{const target=panel.getCell(row+2+i,col+j);if(j===0&&gm)f(target,`IF(COUNTIF(${vr(gm.groupKey)},${quote(gm.label)})>0,${literal(cell)},"")`,present?cell:"");else if(cell&&typeof cell==="object")f(target,expression(cell),cell.value);else target.value=clean(cell);target.numFmt=REPORT_FORMATS[report.formats[j]]||"General";});});placements.push({report,row,col,active});
    }
    const main=reports.filter(r=>r.id!=="lab");let nextRow=19;for(let i=0;i<main.length;i+=3){const band=main.slice(i,i+3);band.forEach((r,j)=>writeReport(r,nextRow,2+j*5));nextRow+=Math.max(...band.map(r=>r.rows.length))+5;}writeReport(reports.find(r=>r.id==="lab"),nextRow,2);
    [2,7,12].forEach(c=>panel.getColumn(c).width=36);[3,4,5,8,9,10,13,14,15].forEach(c=>panel.getColumn(c).width=19);[6,11].forEach(c=>panel.getColumn(c).width=3);panel.views=[{state:"frozen",ySplit:3}];
    graphs.mergeCells("B1:U1");head(graphs.getCell("B1"),"GRÁFICOS E TABELAS — resultados dos filtros");graphs.getRow(1).height=28;graphs.mergeCells("B2:U2");graphs.getCell("B2").value="Atualize filtros e Fonte do preço em Filtros e Tabelas. Os gráficos acompanham os valores calculados.";for(let c=1;c<=25;c++)graphs.getColumn(c).width=13;
    const chartSpecs=[],dynamicRanges=[],bands=[],regular=placements.filter(p=>p.report.id!=="lab");let graphRow=4;for(let i=0;i<regular.length;i+=2)bands.push(regular.slice(i,i+2));bands.push(placements.filter(p=>p.report.id==="lab"));
    for(const band of bands){let height=24;band.forEach((p,k)=>{
        const start=2+k*12,report=p.report,tableRow=graphRow+19,first=tableRow+1,capacity=Math.max(1,report.rows.length),idx=chartSpecs.length;graphs.mergeCells(graphRow,start,graphRow,start+9);head(graphs.getCell(graphRow,start),report.title);report.headers.forEach((h,j)=>head(graphs.getCell(tableRow,start+j),h));
        const cc=L(chartStart+idx*2),ic=L(chartStart+idx*2+1),last=capacity+5;aux.getCell(`${cc}5`).value=0;
        for(let i=0;i<capacity;i++){const rr=i+6,labelRef=`'${PANEL}'!${L(p.col)}${p.row+2+i}`;f(aux.getCell(`${cc}${rr}`),`${cc}${rr-1}+IF(${labelRef}<>"",1,0)`,p.active.filter(x=>x<=i).length);f(aux.getCell(`${ic}${rr}`),`IF(${i+1}<=$${cc}$${last},MATCH(${i+1},$${cc}$6:$${cc}$${last},0),0)`,p.active[i]===undefined?0:p.active[i]+1);
            report.headers.forEach((_,j)=>{const range=`'${PANEL}'!$${L(p.col+j)}$${p.row+2}:$${L(p.col+j)}$${p.row+1+capacity}`,cached=p.active[i]===undefined?"":reportValue(report.rows[p.active[i]][j]);f(graphs.getCell(first+i,start+j),`IF('Apoio'!$${ic}${rr}=0,"",INDEX(${range},'Apoio'!$${ic}${rr}))`,cached);graphs.getCell(first+i,start+j).numFmt=REPORT_FORMATS[report.formats[j]]||"General";});}
        const count=`'Apoio'!$${cc}$${last}`,cn=`MP_Chart_${idx}_Categorias`,vn=`MP_Chart_${idx}_Valores`;dynamicRanges.push({name:cn,sheetIndex:graphs.id-1,formula:`OFFSET('Gráficos'!$${L(start)}$${first},0,0,MAX(1,${count}),1)`},{name:vn,sheetIndex:graphs.id-1,formula:`OFFSET('Gráficos'!$${L(start+report.chartColumn)}$${first},0,0,MAX(1,${count}),1)`});
        chartSpecs.push({title:`${report.title} — ${report.headers[report.chartColumn]}`,seriesName:report.headers[report.chartColumn],categoryFormula:`'Gráficos'!${cn}`,valueFormula:`'Gráficos'!${vn}`,labels:p.active.length?p.active.map(i=>report.rows[i][0]):[""],values:p.active.length?p.active.map(i=>reportValue(report.rows[i][report.chartColumn])):[0],format:REPORT_FORMATS[report.formats[report.chartColumn]]||"General",fromCol:start-1,toCol:start+9,fromRow:graphRow,toRow:graphRow+18,color:["3B5F86","0E7490","047857","7C3AED","B45309"][idx%5]});height=Math.max(height,capacity+23);
    });graphRow+=height;}
    graphs.views=[{state:"frozen",ySplit:2}];aux.state="veryHidden";
    const original=wb.addWorksheet("Planilha1");original.addRow((importInfo.headers||[]).map(clean));rows.forEach(r=>original.addRow((r.raw||[]).map(clean)));
    const rules=wb.addWorksheet("Regras da consolidação");[
        ["Regra","Aplicação"],["Laboratório","Fabr_Global e Cod_Fabr_Global da base. Lab. não é usado para agrupar."],["Política Comercial","Vínculo por empresa, EAN e código global do fabricante. Último arquivo modificado para cada chave; conflito de mesma data usa histórico."],
        ["Prioridade padrão","Política Comercial > última compra > penúltima compra > antepenúltima compra > zero. Preços não positivos são ignorados."],["Fonte do preço","Escolha em G5. Outra fonte começa pelo preço escolhido e continua pelos históricos disponíveis. Fonte e Empresa de referência recalculam todos os valores."],
        ["Validade","Política vencida continua sendo usada com aviso. Validade não é data de atualização."],["Datas","Data da Planilha é a modificação do arquivo; Última Leitura é a leitura bem-sucedida daquele arquivo. A verificação de pasta não altera a data da leitura de um arquivo inalterado."],
        ["Atualização","O Excel contém a fotografia dos arquivos lidos. Não monitora pastas nem recebe novos preços sozinho. Atualize no app e reexporte."],["Exportação","Todos os produtos importados são exportados; filtros e seleção do app não limitam a base."],
        ["Edição","Filtros, fonte e critério atualizam resultados. Substituições manuais em linhas ficam vinculadas à posição; prefira fazê-las no app antes de refiltrar."],["Histórico de vendas","Vendas completas até é informação do período analisado. Para alterar meses, use o app e reexporte. Média Mês original é preservada."],
        ["Arquivos originais","Planilha1 é somente uma cópia para conferência; não dirige as fórmulas."],["Pasta de preços",policySnapshot?.folder||"Não lida"],["Aviso de leitura",policyError||""],...(policySnapshot?.warnings||[]).map(w=>["Aviso",w]),["Base",importInfo.fileName||""]].forEach(r=>rules.addRow(r));rules.getColumn(1).width=27;rules.getColumn(2).width=125;
    let buffer=await wb.xlsx.writeBuffer();buffer=await addNativeExcelCharts(buffer,graphs.id,chartSpecs);buffer=await addDynamicChartRanges(buffer,dynamicRanges);
    const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`Simulacao-Compra-${new Date().toISOString().slice(0,10)}.xlsx`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
