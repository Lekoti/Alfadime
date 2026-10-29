const fs = require("node:fs/promises");
const path = require("node:path");
const XLSX = require("xlsx");
const { getFoldersConfig } = require("./price-pending-folders-config.repository");
const BRANCHES = { "1":"DPR", "2":"AMS", "3":"DMT", "5":"DMS", "6":"DSC" };
const cache = new Map();
let inFlight = null;
function normalize(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toUpperCase();
}
function headerKey(value) { return normalize(value).replace(/ /g, ""); }
function code(value) {
    if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0 ? String(value) : "";
    const text = String(value ?? "").trim();
    if (/^\d+$/.test(text)) return text.replace(/^0+(?=\d)/, "");
    if (/^\d+(\.\d+)?e\+?\d+$/i.test(text)) { const n = Number(text); return Number.isSafeInteger(n) && n >= 0 ? String(n) : ""; }
    return "";
}
function number(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    let text = String(value ?? "").replace(/R\$/gi, "").replace(/\s/g, "");
    if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
    const n = Number(text); return Number.isFinite(n) ? n : 0;
}
function validDate(y,m,d) {
    const date = new Date(Date.UTC(y,m-1,d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d
        ? `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}` : "";
}
function dateOnly(value) {
    const parts = value instanceof Date && !Number.isNaN(value.getTime())
        ? { y:value.getFullYear(),m:value.getMonth()+1,d:value.getDate() }
        : typeof value === "number" ? XLSX.SSF.parse_date_code(value) : null;
    if (parts) return validDate(parts.y,parts.m,parts.d);
    const text = String(value ?? "").trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/), br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return iso ? validDate(+iso[1],+iso[2],+iso[3]) : br ? validDate(+br[3],+br[2],+br[1]) : "";
}
const HEADER_ALIASES = {
    ean: ["CODIGOBARRAS"],
    price: ["PRECOFINAL"],
    company: ["EMPRESA"],
    lab: ["CODGLOBALLAB", "COD5LOBALLAB"],
    validity: ["DATAVALIDADE"]
};
function inspectHeader(row) {
    const keys = row.map(headerKey), index = {};
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        const hits = keys.map((key,i) => aliases.includes(key) ? i : -1).filter(i => i >= 0);
        if (hits.length > 1) return null;
        index[field] = hits.length ? hits[0] : -1;
    }
    return [index.ean,index.price,index.company,index.lab].every(i => i >= 0) ? index : null;
}
function shown(value) {
    const text = String(value ?? "").trim(); return text ? JSON.stringify(text) : "vazio";
}
function parseWorkbook(workbook, metadata) {
    const records = [], warnings = [];
    let usableSheets = 0;
    const rejected = [];
    for (const sheetName of workbook.SheetNames) {
        // Keep physical row numbers, including blank rows, for an accurate diagnostic.
        const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header:1,defval:null,raw:true,blankrows:true});
        let headerRow = -1, index = null;
        for (let i=0; i<Math.min(100,matrix.length); i++) {
            const found = inspectHeader(matrix[i]);
            if (found) { headerRow=i; index=found; break; }
        }
        if (headerRow < 0) {
            const first = matrix.find(row => row.some(v => String(v ?? "").trim() !== "")) || [];
            rejected.push(`${sheetName}: ${first.map(v=>String(v??"").trim()).filter(Boolean).join(" | ") || "aba vazia"}`);
            continue;
        }
        usableSheets++;
        // Explicitly support the confirmed typo, without guessing or changing the manufacturer code.
        if (headerKey(matrix[headerRow][index.lab]) === "COD5LOBALLAB") {
            warnings.push(`${metadata.fileName} / ${sheetName}: cabeçalho COD 5LOBAL LAB reconhecido como COD GLOBAL LAB. Os códigos das linhas foram preservados.`);
        }
        for (let i=headerRow+1; i<matrix.length; i++) {
            const r = matrix[i];
            if (!r.some(v => String(v ?? "").trim() !== "")) continue;
            if (inspectHeader(r)) continue;
            const ean = code(r[index.ean]), companyCode = code(r[index.company]), branch = BRANCHES[companyCode], globalLabCode = code(r[index.lab]);
            const problems = [];
            if (!ean || ean === "0") problems.push(`CODIGO BARRAS=${shown(r[index.ean])}`);
            if (!branch) problems.push(`EMPRESA=${shown(r[index.company])} (esperado: 001, 002, 003, 005 ou 006)`);
            if (!globalLabCode || globalLabCode === "0") problems.push(`COD GLOBAL LAB=${shown(r[index.lab])}`);
            if (problems.length) {
                warnings.push(`${metadata.fileName} / ${sheetName} / linha ${i+1}: ${problems.join("; ")}. Registro não aplicado.`);
                continue;
            }
            const rawPrice = number(r[index.price]);
            const rawValidity = index.validity >= 0 ? r[index.validity] : null;
            const validity = dateOnly(rawValidity);
            if (String(rawValidity ?? "").trim() && !validity) {
                warnings.push(`${metadata.fileName} / ${sheetName} / linha ${i+1}: DATA VALIDADE=${shown(rawValidity)} não reconhecida; preço mantido com validade não informada.`);
            }
            records.push({barcode:ean,branch,companyCode:companyCode.padStart(3,"0"),globalLabCode,
                price:rawPrice>0?rawPrice:0,validity,...metadata,sheetName,line:i+1});
        }
    }
    if (!usableSheets) throw new Error(
        "Cabeçalhos não reconhecidos. Esperados: CODIGO BARRAS (ou CODIGOBARRAS), PREÇO FINAL, EMPRESA e COD GLOBAL LAB. Encontrados: " + rejected.join(" / ")
    );
    return {records,warnings};
}
function samePrice(a,b) {
    return Math.abs(Number(a)-Number(b)) <= 1e-9;
}
function describeRecord(record) {
    const price = Number(record.price).toLocaleString("pt-BR", {minimumFractionDigits:2,maximumFractionDigits:10});
    return `${record.fileName} / ${record.sheetName} / linha ${record.line} / PREÇO FINAL R$ ${price} / modificação ${record.fileModifiedAt}`;
}
function selectLatestRecords(records) {
    const groups = new Map(), warnings = [], chosen = [];
    for (const record of records) {
        const key = [record.branch,record.globalLabCode,record.barcode].join("|");
        if (!groups.has(key)) groups.set(key,[]);
        groups.get(key).push(record);
    }
    for (const [key, candidates] of groups) {
        const latest = Math.max(...candidates.map(r => Number(r.mtimeMs) || 0));
        const finalists = candidates.filter(r => (Number(r.mtimeMs) || 0) === latest)
            .sort((a,b) => a.fileName.localeCompare(b.fileName,"pt-BR") || a.sheetName.localeCompare(b.sheetName,"pt-BR") || a.line-b.line);
        const first = finalists[0];
        const different = finalists.some(r => !samePrice(r.price,first.price));
        if (different) {
            // Keep the fallback to purchase history until the conflicting source is resolved.
            chosen.push({...first,price:0,conflict:true});
            const detail = [...new Set(finalists.map(describeRecord))];
            warnings.push(`Conflito de preços para ${key}. ${detail.join(" <> ")}. Política não aplicada; utilizados os históricos disponíveis. Arquivos de origem não foram alterados.`);
        } else chosen.push(first);
    }
    return {records:chosen,warnings};
}
async function scan(force=false) {
    const folder = String(getFoldersConfig().prices || "").trim();
    if (!folder) throw new Error("Configure a pasta de preços nas configurações do app.");
    const entries = await fs.readdir(folder,{withFileTypes:true});
    const files = entries.filter(e => e.isFile() && !e.name.startsWith("~$") && /\.(xlsx|xlsm|xls)$/i.test(e.name) && /\bPRECOS?\b/.test(normalize(e.name)));
    const warnings = [], records = [], seen = new Set(); let readFiles=0,reusedFiles=0;
    for (const entry of files) {
        const filePath = path.join(folder,entry.name); seen.add(filePath);
        try {
            const stat = await fs.stat(filePath), signature = `${stat.size}-${stat.mtimeMs}`;
            let saved = cache.get(filePath);
            if (force || !saved || saved.signature !== signature) {
                const buffer = await fs.readFile(filePath), after = await fs.stat(filePath);
                if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs) throw new Error("Arquivo sendo alterado; tente novamente após concluir a gravação.");
                const workbook = XLSX.read(buffer,{type:"buffer",cellDates:true});
                const parsed = parseWorkbook(workbook,{fileName:entry.name,fileModifiedAt:stat.mtime.toISOString(),readAt:new Date().toISOString(),mtimeMs:stat.mtimeMs});
                saved = {signature,...parsed}; cache.set(filePath,saved); readFiles++;
            } else reusedFiles++;
            records.push(...saved.records); warnings.push(...saved.warnings);
        } catch (e) {
            warnings.push(`${entry.name}: ${e.message}`);
            const previous = cache.get(filePath);
            if (previous) records.push(...previous.records.map(r => ({...r,stale:true})));
        }
    }
    for (const filePath of cache.keys()) if (path.dirname(filePath)===folder && !seen.has(filePath)) cache.delete(filePath);
    const selected = selectLatestRecords(records);
    return {records:selected.records,folder,scannedAt:new Date().toISOString(),filesFound:files.length,readFiles,reusedFiles,warnings:[...new Set([...warnings,...selected.warnings])]};
}
function readCommercialPolicies(options={}) {
    if (inFlight) return inFlight;
    inFlight = scan(Boolean(options?.force)).finally(() => {inFlight=null;});
    return inFlight;
}
module.exports={readCommercialPolicies,parseWorkbook,dateOnly,selectLatestRecords};
