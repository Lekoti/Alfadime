import ExcelJS from "exceljs";
import {buildColumns,PRICE_CRITERIA} from "../constants/merchandise-purchases.constants";
const FMT={text:"@",int:"#,##0",dec:"#,##0.0",currency:'"R$" #,##0.00'};
const BLUE="FF344B65";
function L(n){let s="";while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
function clean(v){if(typeof v==="number")return Number.isFinite(v)?v:0;return typeof v==="string"?v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,""):v??"";}
function f(cell,formula,result){cell.value={formula,result:clean(result)};}
function head(cell,value,color=BLUE){cell.value=value;cell.font={name:"Calibri",size:10,bold:true,color:{argb:"FFFFFFFF"}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:color}};cell.alignment={wrapText:true,vertical:"middle"};}
function color(k){if(k==="maxPeriod"||k==="maxQty")return "FF047857";if(k==="minPeriod"||k==="minQty")return "FFBE123C";if(/price|Purchase|Company/i.test(k)&&k!=="company")return "FFB45309";if(/stock|blocked|pending|consolidated|transferred/i.test(k))return "FF047857";if(/avg|curve/i.test(k))return "FF0E7490";return BLUE;}
export async function exportMerchandiseExcel({rows,premises,importInfo,filtersLabel}){
    if(!rows?.length)throw new Error("Nenhum produto para exportar.");
    const wb=new ExcelJS.Workbook();wb.calcProperties.fullCalcOnLoad=true;
    const ws=wb.addWorksheet("Simulação Compras"),aux=wb.addWorksheet("Apoio");
    const cols=buildColumns(premises.closedMonth),pos=Object.fromEntries(cols.map((c,i)=>[c.key,i]));
    const n=rows.length,end=n+5;
    const a=(key,r)=>`${L(3+pos[key])}${r}`;
    const ar=key=>`'Apoio'!$${L(3+pos[key])}$6:$${L(3+pos[key])}$${end}`;
    const vr=key=>`$${L(8+pos[key])}$6:$${L(8+pos[key])}$${end}`;
    const unique=key=>[...new Set(rows.map(r=>String(r[key]||"")).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
    ws.getCell("B2").value="Simulação de Compra";ws.getCell("B2").font={size:16,bold:true,color:{argb:BLUE}};
    ws.mergeCells("B3:F3");ws.getCell("B3").value=filtersLabel||"Todas as empresas e laboratórios exportados";
    ws.mergeCells("B4:F4");head(ws.getCell("B4"),"FILTROS GERAIS — combinados","FFB45309");
    const filters=[["Empresa","company",5],["Laboratório","lab",6],["Curva","curve",7]];
    filters.forEach(([label,key,r],i)=>{
        ws.getCell(`B${r}`).value=label;ws.mergeCells(`C${r}:F${r}`);const cell=ws.getCell(`C${r}`);cell.value="Todos";
        cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF3C7"}};
        const values=["Todos",...unique(key)],col=L(50+i),name=`MP_Filtro_${i}`;
        values.forEach((v,j)=>aux.getCell(`${col}${j+1}`).value=clean(v));
        wb.definedNames.add(`'Apoio'!$${col}$1:$${col}$${values.length}`,name);
        cell.dataValidation={type:"list",allowBlank:true,showErrorMessage:true,formulae:[name],error:"Escolha uma opção da lista."};
    });
    ws.mergeCells("B8:F8");ws.getCell("B8").value="Todos ou vazio = sem restrição. Alta = acima da média dos meses fechados.";ws.getCell("B8").alignment={wrapText:true};ws.getRow(8).height=30;
    ws.getCell("B9").value="Produtos encontrados";f(ws.getCell("C9"),`'Apoio'!A${end}`,n);
    ["Premissas","Dias","Estoque Mês"].forEach((h,i)=>head(ws.getCell(11,2+i),h));
    [["A",12],["B",13],["C",14],["OTHER",15]].forEach(([k,r])=>{ws.getCell(`B${r}`).value=k==="OTHER"?"D E F (Outros)":`Curva ${k}`;ws.getCell(`C${r}`).value=premises.curveDays[k]||0;f(ws.getCell(`D${r}`),`C${r}/30`,(premises.curveDays[k]||0)/30);ws.getCell(`D${r}`).numFmt="0.0";});
    ws.getCell("B16").value="Critério de preço";ws.mergeCells("C16:F16");
    const criterion=ws.getCell("C16");criterion.value=PRICE_CRITERIA.find(c=>c.value===premises.priceCriteria)?.label||"Própria empresa";
    criterion.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF3C7"}};
    PRICE_CRITERIA.forEach((v,i)=>aux.getCell(`BA${i+1}`).value=v.label);
    wb.definedNames.add(`'Apoio'!$BA$1:$BA$${PRICE_CRITERIA.length}`,"MP_Criterios");
    criterion.dataValidation={type:"list",allowBlank:false,showErrorMessage:true,formulae:["MP_Criterios"]};
    const lowestRecords=new Map();
    rows.forEach(row=>{const k=row.barcode||`cod:${row.productCode}`;const current=lowestRecords.get(k);if(row.ownPrice>0&&(!current||row.ownPrice<current.ownPrice))lowestRecords.set(k,row);});
    aux.getCell("A5").value=0;
    for(let i=0;i<n;i++){
        const r=i+6,ref=key=>a(key,r),input=rows[i];
        const conditions=filters.map(([,key,fr])=>`OR('Simulação Compras'!$C$${fr}="Todos",'Simulação Compras'!$C$${fr}="",${ref(key)}='Simulação Compras'!$C$${fr})`).join(",");
        f(aux.getCell(`A${r}`),`A${r-1}+IF(AND(${conditions}),1,0)`,i+1);
        f(aux.getCell(`B${r}`),`IF(${i+1}<=$A$${end},MATCH(${i+1},$A$6:$A$${end},0),0)`,i+1);
        const box=ref("boxSize"),multiple=`IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),${box},1)`;
        const qty=base=>`ROUNDUP(MAX(ROUNDUP(${base}/30*${ref("targetDays")},0)-${ref("consolidated")},0)/${multiple},0)*${multiple}`;
        // Additional support fields preserve origin when the criterion changes.
        aux.getCell(`BC${r}`).value=input.priceOrigin||"Sem preço";
        const ownVia=premises.priceSource!=="lastPurchase"&&!(Number(input[premises.priceSource])>0)&&input.ownPrice>0;
        aux.getCell(`BD${r}`).value=ownVia?"Sim":"Não";
        const lowOrigin=input.lowestCompany==="Igual"?input.company:input.lowestCompany;
        const low=lowestRecords.get(input.barcode||`cod:${input.productCode}`);
        aux.getCell(`BE${r}`).value=low?.company||lowOrigin||"Sem preço";
        const lowVia=low&&premises.priceSource!=="lastPurchase"&&!(Number(low[premises.priceSource])>0)&&low.ownPrice>0;
        aux.getCell(`BF${r}`).value=lowVia?"Sim":"Não";
        const expressions={
            consolidated:`SUM(${ref("pending")}:${ref("transferred")})`,
            targetDays:`IF(${ref("curve")}="A",'Simulação Compras'!$C$12,IF(${ref("curve")}="B",'Simulação Compras'!$C$13,IF(${ref("curve")}="C",'Simulação Compras'!$C$14,'Simulação Compras'!$C$15)))`,
            selectedPrice:`IF('Simulação Compras'!$C$16="Menor preço",${ref("lowestPrice")},${ref("ownPrice")})`,
            priceViaLast:`IF(${ref("selectedPrice")}<=0,"",IF('Simulação Compras'!$C$16="Menor preço",BF${r},BD${r}))`,
            priceOrigin:`IF(${ref("selectedPrice")}<=0,"Sem preço",IF(${ref("priceViaLast")}="Sim","Última compra",IF('Simulação Compras'!$C$16="Menor preço",BE${r},${ref("company")})))`,
            finalValue:`${ref("finalQty")}*${ref("selectedPrice")}`,periodSuggestion:qty(ref("refQty")),
            periodValue:`${ref("periodSuggestion")}*${ref("selectedPrice")}`,stockMonths:`IFERROR(${ref("consolidated")}/${ref("avgMonth")},0)`,
            boxStatus:`IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),"OK","Caixa inválida")`
        };
        if(!input.manual)expressions.finalQty=qty(ref("avgMonth"));
        cols.forEach((c,j)=>{
            const value=clean(input[c.key]),cell=aux.getCell(r,3+j);
            if(expressions[c.key])f(cell,expressions[c.key],value);else cell.value=value;
            const out=ws.getCell(r,8+j);
            f(out,`IF('Apoio'!$B${r}=0,"",INDEX(${ar(c.key)},'Apoio'!$B${r}))`,value);
            out.numFmt=FMT[c.type]||"General";out.font={name:"Calibri",size:10};
            if(c.key==="maxPeriod"||c.key==="minPeriod"){
                out.fill={type:"pattern",pattern:"solid",fgColor:{argb:c.key==="maxPeriod"?"FFDCFCE7":"FFFEE2E2"}};
                out.font={name:"Calibri",size:10,color:{argb:c.key==="maxPeriod"?"FF166534":"FF991B1B"}};
                out.alignment={wrapText:true,vertical:"top"};
            }
        });
    }
    cols.forEach((c,j)=>{head(ws.getCell(5,8+j),c.label,color(c.key));ws.getColumn(8+j).width=c.key==="maxPeriod"?50:c.key==="minPeriod"?35:c.width;});
    let at=18;
    function table(title,headers,items,formats){ws.mergeCells(`B${at}:F${at}`);head(ws.getCell(`B${at++}`),title);headers.forEach((h,j)=>head(ws.getCell(at,j+2),h));at++;items.forEach(item=>{item.forEach((v,j)=>{const cell=ws.getCell(at,j+2);if(v&&typeof v==="object")f(cell,v.f,v.v);else cell.value=clean(v);cell.numFmt=formats[j]||"General";});at++;});at+=2;}
    const sum=key=>({f:`SUM(${vr(key)})`,v:rows.reduce((s,r)=>s+(Number(r[key])||0),0)});
    table("Resultado da simulação",["Indicador","Quantidade"],[["Itens a comprar",{f:`COUNTIF(${vr("finalQty")},">0")`,v:rows.filter(r=>r.finalQty>0).length}],["Quantidade total",sum("finalQty")]],[null,FMT.int]);
    table("Valores da simulação",["Indicador","Valor"],[["Valor selecionado",sum("finalValue")],["Valor sugestão período",sum("periodValue")]],[null,FMT.currency]);
    function group(title,key,values){table(title,["Grupo","Qtde","Valor"],values.map(label=>{const crit='"'+label.replace(/~/g,"~~").replace(/\*/g,"~*").replace(/\?/g,"~?").replace(/"/g,'""')+'"';const matches=rows.filter(r=>String(r[key]||"")===label);return [label,{f:`SUMIF(${vr(key)},${crit},${vr("finalQty")})`,v:matches.reduce((s,r)=>s+r.finalQty,0)},{f:`SUMIF(${vr(key)},${crit},${vr("finalValue")})`,v:matches.reduce((s,r)=>s+r.finalValue,0)}];}),[null,FMT.int,FMT.currency]);}
    group("Por curva","curve",unique("curve"));group("Por empresa","company",unique("company"));group("Por laboratório","lab",unique("lab"));
    const scenario=key=>({f:`SUMPRODUCT(${vr("finalQty")},${vr(key)})`,v:rows.reduce((s,r)=>s+r.finalQty*r[key],0)});
    table("Comparativo de cenários",["Cenário","Custo total"],[["Menor preço",scenario("lowestPrice")],["Própria empresa",scenario("ownPrice")],["Preço selecionado",scenario("selectedPrice")]],[null,FMT.currency]);
    group("Origem do preço","priceOrigin",[...new Set([...unique("priceOrigin"),...unique("company"),"Última compra","Sem preço"])]);
    const via=rows.filter(r=>r.priceViaLast==="Sim");
    table("Compra via última compra",["Indicador","Quantidade"],[["Quantidade",{f:`SUMIF(${vr("priceViaLast")},"Sim",${vr("finalQty")})`,v:via.reduce((s,r)=>s+r.finalQty,0)}]],[null,FMT.int]);
    table("Valor via última compra",["Indicador","Valor"],[["Valor",{f:`SUMIF(${vr("priceViaLast")},"Sim",${vr("finalValue")})`,v:via.reduce((s,r)=>s+r.finalValue,0)}]],[null,FMT.currency]);
    table("Alertas",["Indicador","Quantidade"],[["Saldo transferido",sum("transferred")],["Caixa inválida",{f:`COUNTIF(${vr("boxStatus")},"Caixa inválida")`,v:rows.filter(r=>!r.boxValid).length}],["Sem preço com compra",{f:`COUNTIFS(${vr("finalQty")},">0",${vr("selectedPrice")},"<=0")`,v:rows.filter(r=>r.finalQty>0&&r.selectedPrice<=0).length}]],[null,FMT.int]);
    ws.getColumn(2).width=36;ws.getColumn(3).width=22;[4,5,6].forEach(c=>ws.getColumn(c).width=18);ws.getRow(5).height=38;
    ws.views=[{state:"frozen",xSplit:7,ySplit:5,topLeftCell:"H6"}];ws.autoFilter={from:{row:5,column:8},to:{row:end,column:7+cols.length}};
    aux.state="veryHidden";
    const base=wb.addWorksheet("Planilha1");base.addRow((importInfo.headers||[]).map(clean));rows.forEach(r=>base.addRow((r.raw||[]).map(clean)));
    const rules=wb.addWorksheet("Regras da consolidação");[
        ["Regra","Aplicação"],["Auxiliares","Transferidos para a aba Apoio, oculta. A aba principal contém somente painel e resultados."],
        ["Critério","C16 altera preço selecionado, origem e valores. Não altera quantidade."],
        ["Meses de alta","Quantidade mensal estritamente acima da média dos meses fechados. Não significa crescimento mês a mês. A regra não altera a sugestão de compra."],
        ["Períodos","Maior e menor venda continuam mensais. Empates mostram todos os meses correspondentes. Meses sem venda entram no cálculo."],
        ["Filtros","Empresa, laboratório e curva combinam-se. As listas não reduzem as opções entre si; combinação inexistente retorna zero resultados."],
        ["Base",importInfo.fileName||""]].forEach(r=>rules.addRow(r));rules.getColumn(1).width=25;rules.getColumn(2).width=110;
    const buffer=await wb.xlsx.writeBuffer(),blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`Simulacao-Compra-${new Date().toISOString().slice(0,10)}.xlsx`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
