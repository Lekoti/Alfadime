import JSZip from "jszip";
const XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const CHART='http://schemas.openxmlformats.org/drawingml/2006/chart';
const DRAW='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const MAIN='http://schemas.openxmlformats.org/drawingml/2006/main';
const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG='http://schemas.openxmlformats.org/package/2006/relationships';
function x(value){return String(value??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
export function makeChartXml(spec,index){
    const catId=100000+index*2,valId=catId+1;
    const labels=spec.labels||[],values=spec.values||[];
    const strings=labels.map((v,i)=>`<c:pt idx="${i}"><c:v>${x(v)}</c:v></c:pt>`).join('');
    const numbers=values.map((v,i)=>`<c:pt idx="${i}"><c:v>${Number.isFinite(Number(v))?Number(v):0}</c:v></c:pt>`).join('');
    return XML+`<c:chartSpace xmlns:c="${CHART}" xmlns:a="${MAIN}" xmlns:r="${REL}">
<c:lang val="pt-BR"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="1200" b="1"/><a:t>${x(spec.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
<c:plotArea><c:layout/><c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/><c:varyColors val="0"/>
<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${x(spec.seriesName||'Valor')}</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="${spec.color||'3B5F86'}"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>
<c:cat><c:strRef><c:f>${x(spec.categoryFormula)}</c:f><c:strCache><c:ptCount val="${labels.length}"/>${strings}</c:strCache></c:strRef></c:cat>
<c:val><c:numRef><c:f>${x(spec.valueFormula)}</c:f><c:numCache><c:formatCode>${x(spec.format||'General')}</c:formatCode><c:ptCount val="${values.length}"/>${numbers}</c:numCache></c:numRef></c:val></c:ser>
<c:gapWidth val="80"/><c:axId val="${catId}"/><c:axId val="${valId}"/></c:barChart>
<c:catAx><c:axId val="${catId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${valId}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx>
<c:valAx><c:axId val="${valId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:majorGridlines/><c:numFmt formatCode="${x(spec.format||'General')}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${catId}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>
</c:plotArea><c:plotVisOnly val="1"/><c:dispBlanksAs val="zero"/></c:chart></c:chartSpace>`;
}
export function makeDrawingXml(specs){
    const anchors=specs.map((s,i)=>{
        const marker=(tag,col,row)=>`<xdr:${tag}><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:${tag}>`;
        return `<xdr:twoCellAnchor>${marker('from',s.fromCol,s.fromRow)}${marker('to',s.toCol,s.toRow)}<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i+2}" name="Gráfico ${i+1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${CHART}"><c:chart xmlns:c="${CHART}" xmlns:r="${REL}" r:id="rId${i+1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
    }).join('');
    return XML+`<xdr:wsDr xmlns:xdr="${DRAW}" xmlns:a="${MAIN}">${anchors}</xdr:wsDr>`;
}
export async function addNativeExcelCharts(buffer,sheetId,specs){
    if(!specs.length)return buffer;
    const zip=await JSZip.loadAsync(buffer);
    const path=`xl/worksheets/sheet${sheetId}.xml`;
    let sheet=await zip.file(path).async('string');
    if(sheet.includes('<drawing '))throw new Error('A aba Gráficos já contém desenho. Exportação interrompida para evitar conflito.');
    const drawingName='mpDrawing1.xml';
    const relPath=`xl/worksheets/_rels/sheet${sheetId}.xml.rels`;
    let relations=zip.file(relPath)?await zip.file(relPath).async('string'):XML+`<Relationships xmlns="${PKG}"></Relationships>`;
    const relId='rIdMPCharts';
    relations=relations.replace('</Relationships>',`<Relationship Id="${relId}" Type="${REL}/drawing" Target="../drawings/${drawingName}"/></Relationships>`);
    if(!sheet.includes('xmlns:r='))sheet=sheet.replace('<worksheet ',`<worksheet xmlns:r="${REL}" `);
    sheet=sheet.replace('</worksheet>',`<drawing r:id="${relId}"/></worksheet>`);
    zip.file(path,sheet);zip.file(relPath,relations);
    zip.file(`xl/drawings/${drawingName}`,makeDrawingXml(specs));
    zip.file(`xl/drawings/_rels/${drawingName}.rels`,XML+`<Relationships xmlns="${PKG}">${specs.map((s,i)=>`<Relationship Id="rId${i+1}" Type="${REL}/chart" Target="../charts/mpChart${i+1}.xml"/>`).join('')}</Relationships>`);
    let types=await zip.file('[Content_Types].xml').async('string');
    let overrides=`<Override PartName="/xl/drawings/${drawingName}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`;
    specs.forEach((spec,i)=>{zip.file(`xl/charts/mpChart${i+1}.xml`,makeChartXml(spec,i));overrides+=`<Override PartName="/xl/charts/mpChart${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`;});
    types=types.replace('</Types>',overrides+'</Types>');zip.file('[Content_Types].xml',types);
    return zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
}
