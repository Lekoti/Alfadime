import * as XLSX from "xlsx";
import {FIELD_HEADERS,MONTH_LABELS,REQUIRED_FIELDS} from "../constants/merchandise-purchases.constants";
let cachedImport=null;
export function getCachedImport(){return cachedImport;}
export function setCachedImport(value){cachedImport=value;}
const text=value=>String(value??"").replace(/\s+/g," ").trim();
const normalize=value=>text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function number(value){if(typeof value==="number")return Number.isFinite(value)?value:0;let s=text(value);if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=Number(s);return Number.isFinite(n)?n:0;}
function code(value){if(typeof value==="number")return Number.isSafeInteger(value)?String(value):"";const s=text(value);if(/^\d+(\.\d+)?e\+?\d+$/i.test(s)){const n=Number(s);return Number.isSafeInteger(n)?String(n):"";}return s;}
export async function importMerchandiseFile(file){
    if(!file)throw new Error("Nenhum arquivo selecionado.");
    const workbook=XLSX.read(await file.arrayBuffer(),{type:"array"});
    const sheetName=workbook.SheetNames.find(n=>normalize(n)==="planilha1")||workbook.SheetNames[0];
    const matrix=XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,raw:true,defval:null,blankrows:false});
    if(matrix.length<2)throw new Error("A planilha está vazia ou sem linhas de dados.");
    const headers=matrix[0].map(text),byHeader=new Map();headers.forEach((h,i)=>{const k=normalize(h);if(k&&!byHeader.has(k))byHeader.set(k,i);});
    const indices=Object.fromEntries(Object.entries(FIELD_HEADERS).map(([key,label])=>[key,byHeader.get(normalize(label))]));
    const monthIndices=MONTH_LABELS.map(m=>byHeader.get(normalize(`${m} Qtde`)));
    const missing=[...REQUIRED_FIELDS.filter(k=>indices[k]===undefined).map(k=>FIELD_HEADERS[k]),...MONTH_LABELS.filter((m,i)=>monthIndices[i]===undefined).map(m=>`${m} Qtde`)];
    if(missing.length)throw new Error(`Cabeçalhos obrigatórios não encontrados: ${missing.join(", ")}.`);
    const get=(r,k)=>indices[k]===undefined?null:r[indices[k]],rows=[];
    for(let i=1;i<matrix.length;i++){
        const raw=matrix[i],company=text(get(raw,"company")),productCode=code(get(raw,"productCode"));if(!company&&!productCode)continue;
        const row={sourceRow:i+1,raw,company,productCode,supplierCode:code(get(raw,"supplierCode")),barcode:code(get(raw,"barcode")),description:text(get(raw,"description")),
            boxSize:text(get(raw,"boxSize"))===""?0:Number(text(get(raw,"boxSize")).replace(",",".")),labCode:code(get(raw,"labCode")),localLab:text(get(raw,"localLab")),
            lab:text(get(raw,"lab"))||"Fabricante global não informado",globalLabCode:code(get(raw,"globalLabCode")),group:text(get(raw,"group")),curve:text(get(raw,"curve")).toUpperCase(),
            avgMonthSheet:indices.avgMonthSheet===undefined?null:number(get(raw,"avgMonthSheet")),months:monthIndices.map(index=>number(raw[index]))};
        for(const k of ["stock","blocked","pf","pmc","avgCost","lastPurchase","penultPurchase","antePenultPurchase","suggestedPrice","avgPrice","recompCost","dpcCost"])row[k]=number(get(raw,k));
        rows.push(row);
    }
    if(!rows.length)throw new Error("Nenhum produto válido encontrado.");
    return {fileName:file.name,sheetName,headers,rows,importedAt:new Date().toISOString()};
}
