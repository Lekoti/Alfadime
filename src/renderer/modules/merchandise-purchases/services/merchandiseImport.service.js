import * as XLSX from "xlsx";
import {FIELD_HEADERS,MONTH_LABELS,REQUIRED_FIELDS} from "../constants/merchandise-purchases.constants";

let cachedImport=null;

export function getCachedImport(){
    return cachedImport;
}

export function setCachedImport(value){
    cachedImport=value;
}

const text=value=>String(value??"").replace(/\s+/g," ").trim();
const normalize=value=>text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

function number(value){
    if(typeof value==="number")return Number.isFinite(value)?value:0;

    let valueText=text(value);

    if(valueText==="")return 0;

    if(valueText.includes(","))valueText=valueText.replace(/\./g,"").replace(",",".");

    const converted=Number(valueText);

    return Number.isFinite(converted)?converted:0;
}

function nullableNumber(value){
    const valueText=text(value);

    if(valueText==="")return null;

    let normalized=valueText;

    if(normalized.includes(","))normalized=normalized.replace(/\./g,"").replace(",",".");

    const converted=Number(normalized);

    return Number.isFinite(converted)?converted:0;
}

function code(value){
    if(typeof value==="number")return Number.isSafeInteger(value)?String(value):"";

    const valueText=text(value);

    if(/^\d+(\.\d+)?e\+?\d+$/i.test(valueText)){
        const converted=Number(valueText);
        return Number.isSafeInteger(converted)?String(converted):"";
    }

    return valueText;
}

export async function importMerchandiseFile(file){
    if(!file)throw new Error("Nenhum arquivo selecionado.");

    const workbook=XLSX.read(await file.arrayBuffer(),{type:"array"});
    const sheetName=workbook.SheetNames.find(name=>normalize(name)==="planilha1")||workbook.SheetNames[0];
    const matrix=XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,raw:true,defval:null,blankrows:false});

    if(matrix.length<2)throw new Error("A planilha está vazia ou sem linhas de dados.");

    const headers=matrix[0].map(text);
    const byHeader=new Map();

    headers.forEach((header,index)=>{
        const key=normalize(header);

        if(key&&!byHeader.has(key))byHeader.set(key,index);
    });

    const indices=Object.fromEntries(Object.entries(FIELD_HEADERS).map(([key,label])=>[key,byHeader.get(normalize(label))]));
    const monthIndices=MONTH_LABELS.map(month=>byHeader.get(normalize(`${month} Qtde`)));
    const missing=[
        ...REQUIRED_FIELDS.filter(key=>indices[key]===undefined).map(key=>FIELD_HEADERS[key]),
        ...MONTH_LABELS.filter((month,index)=>monthIndices[index]===undefined).map(month=>`${month} Qtde`)
    ];

    if(missing.length)throw new Error(`Cabeçalhos obrigatórios não encontrados: ${missing.join(", ")}.`);

    const get=(row,key)=>indices[key]===undefined?null:row[indices[key]];
    const rows=[];

    for(let index=1;index<matrix.length;index++){
        const raw=matrix[index];
        const company=text(get(raw,"company"));
        const productCode=code(get(raw,"productCode"));

        if(!company&&!productCode)continue;

        const row={
            sourceRow:index+1,
            raw,
            company,
            productCode,
            supplierCode:code(get(raw,"supplierCode")),
            barcode:code(get(raw,"barcode")),
            description:text(get(raw,"description")),
            boxSize:text(get(raw,"boxSize"))===""?0:Number(text(get(raw,"boxSize")).replace(",",".")),
            labCode:code(get(raw,"labCode")),
            localLab:text(get(raw,"localLab")),
            lab:text(get(raw,"lab"))||"Fabricante global não informado",
            globalLabCode:code(get(raw,"globalLabCode")),
            group:text(get(raw,"group")),
            curve:text(get(raw,"curve")).toUpperCase(),
            avgMonthSheet:indices.avgMonthSheet===undefined?null:nullableNumber(get(raw,"avgMonthSheet")),
            months:monthIndices.map(monthIndex=>number(raw[monthIndex])),
            lastPurchaseCompany:text(get(raw,"lastPurchaseCompany"))||company,
            penultPurchaseCompany:text(get(raw,"penultPurchaseCompany"))||company,
            antePenultPurchaseCompany:text(get(raw,"antePenultPurchaseCompany"))||company
        };

        for(const key of ["stock","blocked","pending","transferred","pf","pmc","avgCost","lastPurchase","penultPurchase","antePenultPurchase","suggestedPrice","avgPrice","recompCost","dpcCost"]){
            row[key]=number(get(raw,key));
        }

        rows.push(row);
    }

    if(!rows.length)throw new Error("Nenhum produto válido encontrado.");

    return {
        fileName:file.name,
        sheetName,
        headers,
        rows,
        importedAt:new Date().toISOString()
    };
}
