import ExcelJS from "exceljs";
import {buildColumns,PRICE_CRITERIA,PRICE_SOURCES,PERIOD_REFERENCES,MONTH_LABELS} from "../constants/merchandise-purchases.constants";
import {buildMerchandiseReports,reportValue,REPORT_FORMATS} from "./merchandiseReport.service";
import {resolvePrice,productPriceKey} from "./merchandisePolicy.service";
import {addNativeExcelCharts} from "./merchandiseNativeCharts.service";
import {addDynamicChartRanges} from "./merchandiseChartRanges.service";

const PANEL="Filtros e Tabelas";
const PRODUCTS="Simulação Compras";
const BLUE="FF344B65";

const FMT={
    text:"@",
    int:"#,##0",
    dec:"#,##0.0",
    currency:'"R$" #,##0.00',
    date:"dd/mm/yyyy",
    datetime:"dd/mm/yyyy hh:mm:ss"
};

function L(number){
    let result="";

    while(number){
        number--;
        result=String.fromCharCode(65+number%26)+result;
        number=Math.floor(number/26);
    }

    return result;
}

function clean(value){
    if(typeof value==="number"){
        return Number.isFinite(value)?value:0;
    }

    if(typeof value==="string"){
        return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"");
    }

    return value??"";
}

function formula(cell,formula,value){
    cell.value={
        formula,
        result:clean(value)
    };
}

function literal(value){
    return '"'+String(value).replace(/"/g,'""')+'"';
}

function quote(value){
    return literal(
        String(value)
            .replace(/~/g,"~~")
            .replace(/\*/g,"~*")
            .replace(/\?/g,"~?")
    );
}

function head(cell,value,color=BLUE){
    cell.value=clean(value);
    cell.font={
        name:"Calibri",
        size:10,
        bold:true,
        color:{argb:"FFFFFFFF"}
    };
    cell.fill={
        type:"pattern",
        pattern:"solid",
        fgColor:{argb:color}
    };
    cell.alignment={
        wrapText:true,
        vertical:"middle"
    };
}

function color(key){
    if(key.startsWith("policy"))return "FF7C3AED";
    if(key==="maxPeriod"||key==="maxQty")return "FF047857";
    if(key==="minPeriod"||key==="minQty")return "FFBE123C";
    if(/price|Purchase|Company/i.test(key)&&key!=="company")return "FFB45309";
    if(/stock|blocked|pending|consolidated|transferred/i.test(key))return "FF047857";
    if(/avg|curve/i.test(key))return "FF0E7490";
    return BLUE;
}

function excelValue(value,type){
    if(!value){
        return type==="date"||type==="datetime"?"":clean(value);
    }

    if(type==="date"){
        const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return match
            ?Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]))/86400000+25569
            :"";
    }

    if(type==="datetime"){
        const date=new Date(value);
        return Number.isNaN(date.getTime())
            ?""
            :(date.getTime()-date.getTimezoneOffset()*60000)/86400000+25569;
    }

    return clean(value);
}

export async function exportMerchandiseExcel({
    rows,
    premises,
    importInfo,
    policySnapshot,
    policyError
}){
    if(!rows?.length){
        throw new Error("Nenhum produto filtrado para exportar.");
    }

    const workbook=new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad=true;

    const products=workbook.addWorksheet(PRODUCTS);
    const panel=workbook.addWorksheet(PANEL);
    const graphs=workbook.addWorksheet("Gráficos");
    const support=workbook.addWorksheet("Apoio");

    const columns=buildColumns(premises.closedMonth);
    const positions=Object.fromEntries(
        columns.map((column,index)=>[column.key,index])
    );

    const reports=buildMerchandiseReports(rows);
    const total=rows.length;
    const supportEnd=total+5;
    const productsEnd=total+1;
    const matrixStart=columns.length+12;
    const matrixEnd=matrixStart+PRICE_SOURCES.length*8-1;
    const chartStart=matrixEnd+10;
    const listStart=chartStart+reports.length*2+10;

    const columnLetter=key=>L(3+positions[key]);
    const supportRange=key=>`'Apoio'!$${columnLetter(key)}$6:$${columnLetter(key)}$${supportEnd}`;
    const productsRange=key=>`'${PRODUCTS}'!$${L(1+positions[key])}$2:$${L(1+positions[key])}$${productsEnd}`;

    function createList(cell,values,name,column){
        const letter=L(column);

        values.forEach((value,index)=>{
            support.getCell(`${letter}${index+1}`).value=clean(value);
        });

        workbook.definedNames.add(
            `'Apoio'!$${letter}$1:$${letter}$${values.length}`,
            name
        );

        cell.dataValidation={
            type:"list",
            allowBlank:true,
            showErrorMessage:true,
            formulae:[name],
            error:"Escolha uma opção da lista."
        };

        cell.fill={
            type:"pattern",
            pattern:"solid",
            fgColor:{argb:"FFFFF3C7"}
        };

        return `$${letter}$1:$${letter}$${values.length}`;
    }

    panel.mergeCells("B2:O2");
    head(panel.getCell("B2"),"FILTROS E TABELAS — Política Comercial e Compras");
    panel.getRow(2).height=28;

    panel.mergeCells("B3:O3");
    panel.getCell("B3").value="Exportação filtrada: este arquivo contém exatamente os produtos visíveis no app no momento da exportação.";

    panel.mergeCells("B4:F4");
    head(panel.getCell("B4"),"Filtros aplicados no app","FFB45309");

    const filterLabels=[
        ["Empresa",filters=>filters.company],
        ["Laboratório (Fabr_Global)",filters=>filters.laboratory],
        ["Curva",filters=>filters.curve]
    ];

    filterLabels.forEach(([label,values],index)=>{
    const selected=Array.isArray(values(filters))?values(filters):[];
    const display=selected.length?selected.join(", "):"Todas";

    panel.getCell(`B${5+index}`).value=label;
    panel.mergeCells(`C${5+index}:F${5+index}`);
    panel.getCell(`C${5+index}`).value=display;
});

    panel.mergeCells("B9:F9");
    panel.getCell("B9").value="Estes filtros são informativos. A base exportada já corresponde aos filtros aplicados no app.";
    panel.getCell("B9").alignment={wrapText:true};
    panel.getRow(9).height=32;

    panel.getCell("B10").value="Produtos exportados";
    formula(
        panel.getCell("C10"),
        String(total),
        total
    );

    ["Premissas","Dias","Estoque Mês"].forEach((header,index)=>{
        head(panel.getCell(12,2+index),header);
    });

    [
        ["A",13],
        ["B",14],
        ["C",15],
        ["OTHER",16]
    ].forEach(([key,row])=>{
        panel.getCell(`B${row}`).value=key==="OTHER"?"D E F (Outros)":`Curva ${key}`;
        panel.getCell(`C${row}`).value=premises.curveDays[key]||0;
        formula(
            panel.getCell(`D${row}`),
            `C${row}/30`,
            (premises.curveDays[key]||0)/30
        );
        panel.getCell(`D${row}`).numFmt="0.0";

        panel.getCell(`C${row}`).dataValidation={
            type:"decimal",
            operator:"greaterThanOrEqual",
            formulae:[0],
            showErrorMessage:true,
            error:"Informe dias maiores ou iguais a zero."
        };
    });

    panel.getCell("B17").value="Empresa de referência do preço";
    panel.mergeCells("C17:F17");

    const criteria=panel.getCell("C17");
    criteria.value=PRICE_CRITERIA.find(
        item=>item.value===premises.priceCriteria
    )?.label||"Própria empresa";

    createList(
        criteria,
        PRICE_CRITERIA.map(item=>item.label),
        "MP_Criterios",
        listStart
    );

    panel.mergeCells("G4:K4");
    head(panel.getCell("G4"),"Fonte do preço","FF7C3AED");

    panel.mergeCells("G5:K5");
    const source=panel.getCell("G5");
    source.value=PRICE_SOURCES.find(
        item=>item.value===premises.priceSource
    )?.label||"Política Comercial";

    const sourceList=createList(
        source,
        PRICE_SOURCES.map(item=>item.label),
        "MP_Fontes_Preco",
        listStart+1
    );

    formula(
        support.getCell("B1"),
        `IFERROR(MATCH('${PANEL}'!$G$5,${sourceList},0),1)`,
        Math.max(
            1,
            PRICE_SOURCES.findIndex(
                item=>item.value===premises.priceSource
            )+1
        )
    );

    panel.mergeCells("G6:K8");
    panel.getCell("G6").value="Padrão: Política Comercial → última → penúltima → antepenúltima → zero. Preço vencido continua sendo usado com aviso. As outras fontes começam pela opção escolhida e usam os históricos disponíveis.";
    panel.getCell("G6").alignment={
        wrapText:true,
        vertical:"top"
    };

    panel.mergeCells("G9:K9");
    head(panel.getCell("G9"),"Base da sugestão alternativa");

    panel.mergeCells("G10:K10");
    const period=panel.getCell("G10");
    period.value=PERIOD_REFERENCES.find(
        item=>item.value===premises.periodReference
    )?.label||PERIOD_REFERENCES[0].label;

    const periodList=createList(
        period,
        PERIOD_REFERENCES.map(item=>item.label),
        "MP_Periodos",
        listStart+2
    );

    panel.mergeCells("G11:K13");
    panel.getCell("G11").value="Altera Sugestão Compra Período. A quantidade principal usa Média Mês, estoque e dias por curva. A fonte do preço altera valores, não quantidades.";
    panel.getCell("G11").alignment={
        wrapText:true,
        vertical:"top"
    };

    panel.mergeCells("G15:K15");
    panel.getCell("G15").value=`Vendas completas até: ${MONTH_LABELS[Math.max(0,(Number(premises.closedMonth)||1)-1)]}. Para mudar o histórico, ajuste no app e reexporte.`;
    panel.getCell("G15").alignment={wrapText:true};
    panel.getRow(15).height=32;

    panel.mergeCells("L4:O4");
    head(panel.getCell("L4"),"Leitura de Política Comercial");

    panel.mergeCells("L5:O8");
    panel.getCell("L5").value=policyError||(
        !policySnapshot
            ?"Sem leitura da pasta. Os preços históricos estão disponíveis."
            :`${policySnapshot.filesFound} arquivos; ${policySnapshot.records.length} registros. Verificação: ${new Date(policySnapshot.scannedAt).toLocaleString("pt-BR")}. Confira Última Leitura por produto.`
    );
    panel.getCell("L5").alignment={
        wrapText:true,
        vertical:"top"
    };

    panel.getCell("L10").value="Políticas vencidas";
    formula(
        panel.getCell("M10"),
        `COUNTIF(${productsRange("policyStatus")},"Política vencida")`,
        rows.filter(row=>row.policyExpired).length
    );

    const alternatives=PRICE_SOURCES.map(source=>rows.map(
        row=>resolvePrice(row,source.value)
    ));

    const lowestPrices=PRICE_SOURCES.map((source,sourceIndex)=>{
        const map=new Map();

        rows.forEach((row,index)=>{
            const price=alternatives[sourceIndex][index];
            const key=productPriceKey(row);

            if(
                price.price>0&&
                (!map.has(key)||price.price<map.get(key).price)
            ){
                map.set(key,{
                    ...price,
                    index
                });
            }
        });

        return map;
    });

    support.getCell("A5").value=0;

    for(let index=0;index<total;index+=1){
        const supportRow=index+6;
        const productRow=index+2;
        const input=rows[index];
        const reference=key=>`${columnLetter(key)}${supportRow}`;
        const block=`$${L(matrixStart)}${supportRow}:$${L(matrixEnd)}${supportRow}`;

        const select=offset=>`INDEX(${block},1,($B$1-1)*8+${offset})`;

        formula(
            support.getCell(`A${supportRow}`),
            `A${supportRow-1}+1`,
            index+1
        );

        formula(
            support.getCell(`B${supportRow}`),
            `IF(${index+1}<=$A$${supportEnd},MATCH(${index+1},$A$6:$A$${supportEnd},0),0)`,
            index+1
        );

        PRICE_SOURCES.forEach((source,sourceIndex)=>{
            const own=alternatives[sourceIndex][index];
            const lowest=lowestPrices[sourceIndex].get(productPriceKey(input));
            const start=matrixStart+sourceIndex*8;

            [
                own.price,
                own.label,
                own.company,
                own.warning,
                lowest?.price||0,
                lowest?.label||"Sem preço",
                lowest?.company||"",
                lowest?.warning||"Sem preço disponível"
            ].forEach((value,position)=>{
                support.getCell(supportRow,start+position).value=clean(value);
            });

            if(own.key==="policyPrice"){
                const fixed=(input.policyWarning||"")
                    .split(" · ")
                    .filter(item=>item!=="Política vencida")
                    .join(" · ");

                formula(
                    support.getCell(supportRow,start+3),
                    `IF(AND(ISNUMBER(${reference("policyValidity")}),${reference("policyValidity")}>0,TODAY()>${reference("policyValidity")}),\"Política vencida\",\"\")&${literal(fixed?` · ${fixed}`:"")}`,
                    own.warning
                );
            }

            if(lowest){
                formula(
                    support.getCell(supportRow,start+7),
                    `${L(start+3)}${lowest.index+6}`,
                    lowest.warning
                );
            }
        });

        const box=reference("boxSize");
        const multiple=`IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),${box},1)`;
        const quantity=base=>`ROUNDUP(MAX(ROUNDUP(${base}/30*${reference("targetDays")},0)-${reference("consolidated")},0)/${multiple},0)*${multiple}`;

        const periodOptions={
            max:"maxQty",
            min:"minQty",
            avgMonth:"avgMonth",
            avg3:"avg3",
            avg6:"avg6",
            avgAll:"avgAll"
        };

        let periodFormula=reference("maxQty");

        for(const option of [...PERIOD_REFERENCES].reverse()){
            periodFormula=`IF('${PANEL}'!$G$10=${literal(option.label)},${reference(periodOptions[option.value])},${periodFormula})`;
        }

        const expressions={
            ownPrice:select(1),
            lowestPrice:select(5),
            lowestCompany:`IF(${select(5)}<=0,"Sem preço",IF(${select(1)}=${select(5)},"Igual",${select(7)}))`,
            selectedPrice:`IF('${PANEL}'!$C$17="Menor preço",${reference("lowestPrice")},${reference("ownPrice")})`,
            priceOrigin:`IF('${PANEL}'!$C$17="Menor preço",${select(6)},${select(2)})`,
            priceCompany:`IF('${PANEL}'!$C$17="Menor preço",${select(7)},${select(3)})`,
            selectedPriceWarning:`IF('${PANEL}'!$C$17="Menor preço",${select(8)},${select(4)})`,
            priceViaLast:`IF(${reference("selectedPrice")}<=0,"",IF(${reference("priceOrigin")}="Última compra","Sim","Não"))`,
            policyStatus:input.policyPrice>0
                ?`IF(AND(ISNUMBER(${reference("policyValidity")}),${reference("policyValidity")}>0),IF(TODAY()>${reference("policyValidity")},"Política vencida","Vigente"),"Validade não informada")`
                :literal(input.policyStatus||"Sem Política Comercial"),
            consolidated:`SUM(${reference("pending")}:${reference("transferred")})`,
            targetDays:`IF(${reference("curve")}="A",'${PANEL}'!$C$13,IF(${reference("curve")}="B",'${PANEL}'!$C$14,IF(${reference("curve")}="C",'${PANEL}'!$C$15,'${PANEL}'!$C$16)))`,
            refQty:periodFormula,
            finalValue:`${reference("finalQty")}*${reference("selectedPrice")}`,
            periodSuggestion:quantity(reference("refQty")),
            periodValue:`${reference("periodSuggestion")}*${reference("selectedPrice")}`,
            stockMonths:`IFERROR(${reference("consolidated")}/${reference("avgMonth")},0)`,
            boxStatus:`IF(AND(ISNUMBER(${box}),${box}>0,MOD(${box},1)=0),"OK","Caixa inválida")`
        };

        if(!input.manual){
            expressions.finalQty=quantity(reference("avgMonth"));
        }

        columns.forEach((column,columnIndex)=>{
            const value=excelValue(input[column.key],column.type);
            const supportCell=support.getCell(supportRow,3+columnIndex);

            if(expressions[column.key]){
                formula(
                    supportCell,
                    expressions[column.key],
                    value
                );
            }else{
                supportCell.value=value;
            }

            supportCell.numFmt=FMT[column.type]||"General";

            const output=products.getCell(productRow,columnIndex+1);
            const cell=key=>`${L(1+positions[key])}${productRow}`;
            let expression=`INDEX(${supportRange(column.key)},${index+1})`;

            if(column.key==="finalValue"){
                expression=`IF(${cell("company")}="","",${cell("finalQty")}*${cell("selectedPrice")})`;
            }

            if(column.key==="periodValue"){
                expression=`IF(${cell("company")}="","",${cell("periodSuggestion")}*${cell("selectedPrice")})`;
            }

            formula(output,expression,value);
            output.numFmt=FMT[column.type]||"General";
            output.font={
                name:"Calibri",
                size:10
            };

            if(column.key==="maxPeriod"||column.key==="minPeriod"){
                output.fill={
                    type:"pattern",
                    pattern:"solid",
                    fgColor:{
                        argb:column.key==="maxPeriod"?"FFDCFCE7":"FFFEE2E2"
                    }
                };
                output.alignment={
                    wrapText:true,
                    vertical:"top"
                };
            }
        });
    }

    columns.forEach((column,columnIndex)=>{
        head(
            products.getCell(1,columnIndex+1),
            column.label,
            color(column.key)
        );

        products.getColumn(columnIndex+1).width=column.width;
    });

    products.getRow(1).height=40;
    products.views=[{
        state:"frozen",
        ySplit:1,
        topLeftCell:"A2"
    }];

    products.autoFilter={
        from:{row:1,column:1},
        to:{row:productsEnd,column:columns.length}
    };

    for(const key of ["policyStatus","selectedPriceWarning"]){
        const letter=L(1+positions[key]);

        products.addConditionalFormatting({
            ref:`${letter}2:${letter}${productsEnd}`,
            rules:[{
                type:"expression",
                formulae:[key==="policyStatus"
                    ?`${letter}2="Política vencida"`
                    :`AND(${letter}2<>"",${letter}2<>"Sem preço disponível")`],
                style:{
                    fill:{
                        type:"pattern",
                        pattern:"solid",
                        fgColor:{argb:"FFFFF3C7"}
                    },
                    font:{color:{argb:"FF92400E"}}
                }
            }]
        });
    }

    function expression(metric){
        if(metric.op==="sum")return `SUM(${productsRange(metric.key)})`;
        if(metric.op==="buyCount")return `COUNTIF(${productsRange("finalQty")},">0")`;
        if(metric.op==="scenario")return `SUMPRODUCT(${productsRange("finalQty")},${productsRange(metric.key)})`;
        if(metric.op==="difference")return `SUMPRODUCT(${productsRange("finalQty")},${productsRange(metric.key)})-SUMPRODUCT(${productsRange("finalQty")},${productsRange("lowestPrice")})`;
        if(metric.op==="group")return `SUMIF(${productsRange(metric.groupKey)},${quote(metric.label)},${productsRange(metric.key)})`;
        if(metric.op==="groupAverage")return `IFERROR(SUMIF(${productsRange(metric.groupKey)},${quote(metric.label)},${productsRange("finalValue")})/SUMIF(${productsRange(metric.groupKey)},${quote(metric.label)},${productsRange("finalQty")}),0)`;
        if(metric.op==="invalidBox")return `COUNTIF(${productsRange("boxStatus")},"Caixa inválida")`;
        if(metric.op==="noPriceBuy")return `COUNTIFS(${productsRange("finalQty")},">0",${productsRange("selectedPrice")},"<=0")`;
        if(metric.op==="withPolicy")return `COUNTIF(${productsRange("policyPrice")},">0")`;
        if(metric.op==="withoutPolicy")return `COUNTIF(${productsRange("company")},"?*")-COUNTIF(${productsRange("policyPrice")},">0")`;
        if(metric.op==="expiredPolicy")return `COUNTIF(${productsRange("policyStatus")},"Política vencida")`;

        throw new Error(`Indicador desconhecido: ${metric.op}`);
    }

    function writeReport(report,row,column){
        panel.mergeCells(row,column,row,column+3);
        head(panel.getCell(row,column),report.title);

        report.headers.forEach((header,index)=>{
            head(panel.getCell(row+1,column+index),header);
        });

        report.rows.forEach((cells,index)=>{
            cells.forEach((cell,cellIndex)=>{
                const target=panel.getCell(row+2+index,column+cellIndex);

                if(cell&&typeof cell==="object"){
                    formula(target,expression(cell),cell.value);
                }else{
                    target.value=clean(cell);
                }

                target.numFmt=REPORT_FORMATS[report.formats[cellIndex]]||"General";
            });
        });
    }

    let nextRow=19;

    for(let index=0;index<reports.length;index+=3){
        const band=reports.slice(index,index+3);

        band.forEach((report,position)=>{
            writeReport(report,nextRow,2+position*5);
        });

        nextRow+=Math.max(
            ...band.map(report=>report.rows.length)
        )+5;
    }

    [2,7,12].forEach(column=>panel.getColumn(column).width=36);
    [3,4,5,8,9,10,13,14,15].forEach(column=>panel.getColumn(column).width=19);
    [6,11].forEach(column=>panel.getColumn(column).width=3);
    panel.views=[{state:"frozen",ySplit:3}];

    graphs.mergeCells("B1:U1");
    head(graphs.getCell("B1"),"GRÁFICOS E TABELAS — resultados dos filtros aplicados no app");
    graphs.getRow(1).height=28;

    graphs.mergeCells("B2:U2");
    graphs.getCell("B2").value="Esta exportação contém apenas os produtos visíveis no app. Os gráficos acompanham os valores calculados.";

    for(let column=1;column<=25;column++){
        graphs.getColumn(column).width=13;
    }

    let chartRow=4;

    for(let index=0;index<reports.length;index+=2){
        const band=reports.slice(index,index+2);
        let height=24;

        band.forEach((report,position)=>{
            const start=2+position*12;
            const tableRow=chartRow+19;
            const first=tableRow+1;
            const capacity=Math.max(1,report.rows.length);

            graphs.mergeCells(chartRow,start,chartRow,start+9);
            head(graphs.getCell(chartRow,start),report.title);

            report.headers.forEach((header,headerIndex)=>{
                head(graphs.getCell(tableRow,start+headerIndex),header);
            });

            report.rows.forEach((cells,rowIndex)=>{
                cells.forEach((cell,cellIndex)=>{
                    const target=graphs.getCell(first+rowIndex,start+cellIndex);

                    if(cell&&typeof cell==="object"){
                        formula(target,expression(cell),cell.value);
                    }else{
                        target.value=clean(cell);
                    }

                    target.numFmt=REPORT_FORMATS[report.formats[cellIndex]]||"General";
                });
            });
        });

        chartRow+=Math.max(
            ...band.map(report=>report.rows.length)
        )+23;
    }

    graphs.views=[{state:"frozen",ySplit:2}];
    support.state="veryHidden";

    const original=workbook.addWorksheet("Planilha1");
    original.addRow((importInfo.headers||[]).map(clean));

    rows.forEach(row=>{
        original.addRow((row.raw||[]).map(clean));
    });

    const rules=workbook.addWorksheet("Regras da consolidação");

    [
        ["Regra","Aplicação"],
        ["Exportação","Contém apenas os produtos visíveis no app após os filtros aplicados."],
        ["Laboratório","Fabr_Global e Cod_Fabr_Global da base. Lab. não é usado para agrupar."],
        ["Política Comercial","Vínculo por empresa, EAN e código global do fabricante. Último arquivo modificado para cada chave; conflito de mesma data usa histórico."],
        ["Prioridade padrão","Política Comercial > última compra > penúltima compra > antepenúltima compra > zero. Preços não positivos são ignorados."],
        ["Fonte do preço","Escolha em G5. Outra fonte começa pelo preço escolhido e continua pelos históricos disponíveis."],
        ["Validade","Política vencida continua sendo usada com aviso. Validade não é data de atualização."],
        ["Atualização","O Excel contém a fotografia dos produtos filtrados no app. Atualize no app e reexporte."],
        ["Arquivos originais","Planilha1 é somente uma cópia para conferência; não dirige as fórmulas."],
        ["Pasta de preços",policySnapshot?.folder||"Não lida"],
        ["Aviso de leitura",policyError||""],
        ...(policySnapshot?.warnings||[]).map(warning=>["Aviso",warning]),
        ["Base",importInfo.fileName||""]
    ].forEach(row=>rules.addRow(row));

    rules.getColumn(1).width=27;
    rules.getColumn(2).width=125;

    let buffer=await workbook.xlsx.writeBuffer();
    buffer=await addNativeExcelCharts(buffer,graphs.id,[]);
    buffer=await addDynamicChartRanges(buffer,[]);

    const blob=new Blob([buffer],{
        type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");

    link.href=url;
    link.download=`Simulacao-Compra-${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
}
