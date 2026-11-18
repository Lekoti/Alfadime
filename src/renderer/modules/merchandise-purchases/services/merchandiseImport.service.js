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

function parseNumber(value){
    if(typeof value==="number")return Number.isFinite(value)?value:null;
    if(value===null||value===undefined)return null;

    const valueText=text(value);

    if(valueText==="")return null;

    const normalized=valueText.includes(",")
        ?valueText.replace(/\./g,"").replace(",",".")
        :valueText;
    const converted=Number(normalized);

    return Number.isFinite(converted)?converted:null;
}

function number(value,context,warnings){
    const parsed=parseNumber(value);

    if(parsed===null){
        if(value!==null&&value!==undefined&&text(value)!==""){
            warnings.push(`${context}: valor inválido "${text(value)}"; foi considerado 0.`);
        }

        return 0;
    }

    return parsed;
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
    const warnings=[];

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
            boxSize:number(get(raw,"boxSize"),`Linha ${index+1} · Cx Padrao`,warnings),
            labCode:code(get(raw,"labCode")),
            localLab:text(get(raw,"localLab")),
            lab:text(get(raw,"lab"))||"Fabricante global não informado",
            globalLabCode:code(get(raw,"globalLabCode")),
            group:text(get(raw,"group")),
            curve:text(get(raw,"curve")).toUpperCase(),
            avgMonthSheet:indices.avgMonthSheet===undefined?null:parseNumber(get(raw,"avgMonthSheet")),
            months:monthIndices.map((monthIndex,monthPosition)=>{
                const value=parseNumber(raw[monthIndex]);

                if(value===null&&raw[monthIndex]!==null&&raw[monthIndex]!==undefined&&text(raw[monthIndex])!==""){
                    warnings.push(`Linha ${index+1} · ${MONTH_LABELS[monthPosition]} Qtde: valor inválido "${text(raw[monthIndex])}"; foi considerado 0.`);
                }

                return value;
            }),
            lastPurchaseCompany:text(get(raw,"lastPurchaseCompany"))||company,
            penultPurchaseCompany:text(get(raw,"penultPurchaseCompany"))||company,
            antePenultPurchaseCompany:text(get(raw,"antePenultPurchaseCompany"))||company
        };

        for(const key of ["stock","blocked","pending","transferred","pf","pmc","avgCost","lastPurchase","penultPurchase","antePenultPurchase","suggestedPrice","avgPrice","recompCost","dpcCost"]){
            row[key]=number(get(raw,key),`Linha ${index+1} · ${FIELD_HEADERS[key]||key}`,warnings);
        }

        rows.push(row);
    }

    if(!rows.length)throw new Error("Nenhum produto válido encontrado.");

    const incompleteHistory=rows.filter(row=>row.months.some(value=>value===null)).length;

    if(incompleteHistory){
        warnings.push(`${incompleteHistory} produto(s) com histórico mensal incompleto. Células vazias foram tratadas como ausentes e não como venda zero.`);
    }

    return {
        fileName:file.name,
        sheetName,
        headers,
        rows,
        warnings,
        importedAt:new Date().toISOString()
    };
}
