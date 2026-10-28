import JSZip from "jszip";
function xml(value){return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
export function insertChartDefinedNames(workbookXml,ranges){
    if(!ranges.length)return workbookXml;
    for(const item of ranges){
        if(!/^MP_Chart_\d+_(Categorias|Valores)$/.test(item.name))throw new Error("Nome auxiliar de gráfico inválido.");
        if(!Number.isInteger(item.sheetIndex)||item.sheetIndex<0)throw new Error("Índice da aba de gráficos inválido.");
    }
    const entries=ranges.map(item=>`<definedName name="${item.name}" localSheetId="${item.sheetIndex}">${xml(item.formula)}</definedName>`).join("");
    let result=workbookXml;
    if(result.includes("</definedNames>"))result=result.replace("</definedNames>",entries+"</definedNames>");
    else if(/<definedNames\s*\/>/.test(result))result=result.replace(/<definedNames\s*\/>/,`<definedNames>${entries}</definedNames>`);
    else result=result.replace("</sheets>",`</sheets><definedNames>${entries}</definedNames>`);
    if(result===workbookXml)throw new Error("Não foi possível registrar intervalos dos gráficos.");
    if(/<calcPr\b/.test(result)) {
        result=result.replace(/<calcPr\b[^>]*\/?>/,tag=>{
            const attrs=tag.replace(/\s+(calcMode|forceFullCalc|fullCalcOnLoad)="[^"]*"/g,"");
            return attrs.replace(/\/?>$/, ' calcMode="auto" forceFullCalc="1" fullCalcOnLoad="1"/>');
        });
    } else result=result.replace("</workbook>",'<calcPr calcMode="auto" forceFullCalc="1" fullCalcOnLoad="1"/></workbook>');
    return result;
}
export async function addDynamicChartRanges(buffer,ranges){
    if(!ranges.length)return buffer;
    const zip=await JSZip.loadAsync(buffer),file=zip.file("xl/workbook.xml");
    if(!file)throw new Error("Estrutura do arquivo Excel não encontrada.");
    const content=await file.async("string");zip.file("xl/workbook.xml",insertChartDefinedNames(content,ranges));
    return zip.generateAsync({type:"uint8array",compression:"DEFLATE",compressionOptions:{level:6}});
}
