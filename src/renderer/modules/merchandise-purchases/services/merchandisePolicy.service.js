import {PRICE_SOURCES} from "../constants/merchandise-purchases.constants";
export const COMPANY_BRANCHES={"DIMEBRAS PR":"DPR","ALFAMED MS":"AMS","DIMEBRAS MT":"DMT","DIMEBRAS MS":"DMS","DIMEBRAS SC":"DSC","DPR":"DPR","AMS":"AMS","DMT":"DMT","DMS":"DMS","DSC":"DSC","1":"DPR","2":"AMS","3":"DMT","5":"DMS","6":"DSC"};
export function normalizeCode(value){const s=String(value??"").trim();if(/^\d+$/.test(s))return s.replace(/^0+(?=\d)/,"");const n=Number(s);return /^[\d.e+]+$/i.test(s)&&Number.isSafeInteger(n)&&n>=0?String(n):s;}
export function branchOf(company){const s=String(company??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toUpperCase();return COMPANY_BRANCHES[s]||COMPANY_BRANCHES[normalizeCode(s)]||"";}
export function productPriceKey(row){return `${normalizeCode(row.globalLabCode)}|${row.barcode?normalizeCode(row.barcode):`cod:${row.productCode}`}`;}
export function priceSequence(source="policyPrice"){
    if(source==="policyPrice")return ["policyPrice","lastPurchase","penultPurchase","antePenultPurchase"];
    if(source==="penultPurchase")return ["penultPurchase","antePenultPurchase"];
    if(source==="antePenultPurchase")return ["antePenultPurchase"];
    return [...new Set([source,"lastPurchase","penultPurchase","antePenultPurchase"])];
}
export function resolvePrice(row,source="policyPrice"){
    for(const key of priceSequence(source)){const price=Number(row[key]);if(Number.isFinite(price)&&price>0)return {price,key,label:PRICE_SOURCES.find(s=>s.value===key)?.label||key,company:row.company,warning:key==="policyPrice"?row.policyWarning||"":""};}
    return {price:0,key:"",label:"Sem preço",company:row.company,warning:"Sem preço disponível"};
}
function localDate(now){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;}
export function applyCommercialPolicies(rows,snapshot,now=new Date()){
    const records=new Map((snapshot?.records||[]).map(p=>[`${p.branch}|${normalizeCode(p.globalLabCode)}|${normalizeCode(p.barcode)}`,p]));
    const today=localDate(now);
    return rows.map(row=>{
        const branch=branchOf(row.company),lab=normalizeCode(row.globalLabCode),ean=normalizeCode(row.barcode);
        const found=branch&&lab&&ean?records.get(`${branch}|${lab}|${ean}`):null;
        const price=Number(found?.price)>0?Number(found.price):0,expired=Boolean(price&&found.validity&&found.validity<today);
        const warnings=[];if(expired)warnings.push("Política vencida");if(found?.stale)warnings.push("Falha na última atualização; usando leitura anterior");if(found?.conflict)warnings.push("Conflito de preços");
        return {...row,branch,policyPrice:price,policyValidity:found?.validity||"",policyModifiedAt:found?.fileModifiedAt||"",policyReadAt:found?.readAt||"",policyFile:found?.fileName||"",policyExpired:expired,policyWarning:warnings.join(" · "),
            policyStatus:!branch?"Empresa não mapeada":!lab?"Fabricante global sem código":!found?"Sem Política Comercial":found.conflict?"Conflito de preços":!price?"Política sem preço positivo":expired?"Política vencida":found.validity?"Vigente":"Validade não informada"};
    });
}
export async function readCommercialPolicies(force=false){
    const invoke=window.alfadime?.ipc?.invoke;
    if(!invoke)throw new Error("API de política comercial indisponível. Reinicie o Alfadime.");
    return invoke("commercial-policy:read",{force});
}
