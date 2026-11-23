import { BRANCHES } from "../constants/nfImport.constants";
function children(node, name) { return Array.from(node?.children || []).filter((child) => child.localName === name); }
function child(node, name) { return children(node, name)[0]; }
function text(node, name) { return child(node, name)?.textContent?.trim() || ""; }
function number(value) { const parsed = Number(value); return value !== "" && Number.isFinite(parsed) ? parsed : null; }
function keyOf(value) { return /^\d{8,14}$/.test(value || "") ? value.padStart(14, "0") : ""; }
export function parseInvoice(source) {
    const warnings = [];
    const base = { ...source, xml: undefined, warnings, items: [], destination: null };
    try {
        if (!source.xml?.trim()) throw new Error("Arquivo XML vazio.");
        if (/<!DOCTYPE|<!ENTITY/i.test(source.xml)) throw new Error("XML com DTD/entidades não permitido por segurança.");
        const document = new DOMParser().parseFromString(source.xml, "application/xml");
        if (document.getElementsByTagNameNS("*", "parsererror").length) throw new Error("XML malformado; não foi possível interpretar o documento.");
        const infos = document.getElementsByTagNameNS("*", "infNFe");
        if (infos.length !== 1) throw new Error("Esperada uma única NF-e com bloco infNFe.");
        const info = infos[0], ide = child(info, "ide"), emit = child(info, "emit"), dest = child(info, "dest");
        const cnpj = text(dest, "CNPJ");
        const destination = BRANCHES.find((branch) => branch.cnpj === cnpj) || null;
        if (!destination) warnings.push("CNPJ destinatário ausente ou não vinculado às cinco filiais.");
        if (source.folderBranch && destination && source.folderBranch !== destination.key) warnings.push("Filial da pasta difere da filial destinatária do XML.");
        if (!text(ide, "nNF")) warnings.push("Número da NF ausente.");
        if (!text(ide, "serie")) warnings.push("Série ausente.");
        const issueDate = text(ide, "dhEmi") || text(ide, "dEmi");
        if (!issueDate || Number.isNaN(Date.parse(issueDate))) warnings.push("Data de emissão ausente ou não interpretável.");
        const accessKey = String(info.getAttribute("Id") || "").replace(/^NFe/, "");
        if (!/^\d{44}$/.test(accessKey)) warnings.push("Chave de acesso ausente ou sem 44 dígitos (dígito verificador não validado).");
        const protocol = document.getElementsByTagNameNS("*", "infProt")[0];
        if (!protocol) warnings.push("Protocolo não incluído neste arquivo; isso não comprova rejeição.");
        const items = children(info, "det").map((det, index) => {
            const prod = child(det, "prod"), itemWarnings = [];
            const ean = text(prod, "cEAN"), taxEan = text(prod, "cEANTrib");
            if (!keyOf(ean) && !keyOf(taxEan)) itemWarnings.push("Sem EAN utilizável para correspondência automática; não implica XML inválido.");
            if (!text(prod, "xProd")) itemWarnings.push("Descrição ausente.");
            if (number(text(prod, "qCom")) === null) itemWarnings.push("Quantidade ausente ou não numérica.");
            if (number(text(prod, "vUnCom")) === null) itemWarnings.push("Valor unitário ausente ou não numérico.");
            const medicine = child(prod, "med");
            const icms = Array.from(child(child(det, "imposto"), "ICMS")?.children || [])[0];
            if (number(text(prod, "qTrib")) === null) itemWarnings.push("Quantidade tributável ausente ou inválida; QTD 2 não estimada.");
            if (number(text(prod, "vUnTrib")) === null) itemWarnings.push("Valor unitário tributável ausente ou inválido; valor não estimado.");
            return {
                line: det.getAttribute("nItem") || String(index + 1), supplierCode: text(prod, "cProd"),
                description: text(prod, "xProd"), ean, taxEan, unit: text(prod, "uCom"),
                quantity: text(prod, "qCom"), unitValue: text(prod, "vUnCom"), total: text(prod, "vProd"),
                tributaryQuantity: text(prod, "qTrib"), tributaryUnit: text(prod, "uTrib"), tributaryUnitValue: text(prod, "vUnTrib"),
                icmsBase: text(icms, "vBC"), icmsRate: text(icms, "pICMS"), icmsValue: text(icms, "vICMS"),
                icmsGroup: icms?.localName || "", icmsStBase: text(icms, "vBCST"), icmsStValue: text(icms, "vICMSST"),
                includedInTotal: text(prod, "indTot") !== "0", ncm: text(prod, "NCM"), cfop: text(prod, "CFOP"),
                registration: text(medicine, "cProdANVISA"), warnings: itemWarnings, matches: [],
                lots: children(prod, "rastro").map((lot) => ({
                    lot: text(lot, "nLote"), quantity: text(lot, "qLote"),
                    manufacturing: text(lot, "dFab"), expiry: text(lot, "dVal")
                }))
            };
        });
        if (!items.length) warnings.push("NF-e sem itens.");
        const totals = child(child(info, "total"), "ICMSTot");
        const itemsTotal = number(text(totals, "vProd"));
        const countedItems = items.filter((item) => item.includedInTotal);
        if (itemsTotal !== null && countedItems.every((item) => number(item.total) !== null)) {
            const sum = countedItems.reduce((total, item) => total + number(item.total), 0);
            if (Math.abs(sum - itemsTotal) > 0.02) warnings.push("Soma de vProd dos itens incluídos diverge de ICMSTot/vProd; conferir tolerâncias fiscais.");
        }
        return { ...base, destination, items, cnpj, number: text(ide, "nNF"), series: text(ide, "serie"),
            issuer: text(emit, "xNome"), issuerCnpj: text(emit, "CNPJ"), recipient: text(dest, "xNome"),
            issueDate, accessKey, total: text(totals, "vNF"), productTotal: text(totals, "vProd"),
            nature: text(ide, "natOp"), icmsBase: text(totals, "vBC"), icmsValue: text(totals, "vICMS"),
            discount: text(totals, "vDesc"), ipi: text(totals, "vIPI"),
            protocol: text(protocol, "nProt"), protocolStatus: text(protocol, "cStat"), protocolReason: text(protocol, "xMotivo"),
            additional: text(child(info, "infAdic"), "infCpl"), readable: true };
    } catch (error) { return { ...base, readable: false, warnings: [error.message] }; }
}
export function invoiceEans(invoice) {
    return [...new Set(invoice.items.flatMap((item) => [item.ean, item.taxEan]).filter(keyOf))];
}
export function matchInvoice(invoice, products) {
    return { ...invoice, items: invoice.items.map((item) => {
        const commercial = keyOf(item.ean), tributary = keyOf(item.taxEan), primary = tributary || commercial;
        const candidates = products.filter((product) => keyOf(product.ean) && [commercial, tributary].includes(keyOf(product.ean)));
        const matches = candidates.filter((row, index) => candidates.findIndex((other) => other.productId === row.productId && other.code === row.code) === index)
            .map((row) => ({ ...row, isPrimary: keyOf(row.ean) === primary,
                basis: keyOf(row.ean) === tributary ? "EAN tributável" : (tributary ? "Alternativa por EAN comercial — conferir unidade" : "EAN comercial — sem EAN tributável utilizável")
            })).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
        const local = invoice.destination ? matches.filter((row) => row.branch === invoice.destination.key && row.code && row.isPrimary) : [];
        const warnings = [...item.warnings];
        if (!invoice.destination) warnings.push("Filial destinatária não identificada; não é possível definir código de destino.");
        else if (!local.length) warnings.push("Código interno não localizado no destino pelo EAN de referência.");
        if (local.length > 1) warnings.push("Mais de uma correspondência no destino; código não selecionado automaticamente.");
        if (!tributary && commercial) warnings.push("Consulta por EAN comercial: conferir unidade antes de usar o código.");
        if (matches.some((row) => !row.active)) warnings.push("Há cadastro inativo entre as correspondências.");
        return { ...item, matches, warnings };
    }) };
}
