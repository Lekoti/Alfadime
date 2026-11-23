import { parseInvoice, invoiceEans, matchInvoice } from "./nfImportXml.service";
async function call(method, payload) {
    if (!window.alfadimeNfImport?.[method]) throw new Error("Integração indisponível. Feche e reabra o Alfadime após aplicar o pacote.");
    const response = await window.alfadimeNfImport[method](payload);
    if (!response?.success) throw new Error(response?.error || "Falha na leitura.");
    return response.data;
}
async function analyze(source) {
    const invoice = parseInvoice(source);
    if (!invoice.readable) return invoice;
    try {
        const eans = invoiceEans(invoice), products = [];
        for (let offset = 0; offset < eans.length; offset += 500) products.push(...await call("products", eans.slice(offset, offset + 500)));
        return matchInvoice(invoice, products);
    } catch (error) { return { ...invoice, warnings: [...invoice.warnings, `Consulta de produtos não concluída: ${error.message}`] }; }
}
export const nfImportService = {
    root: () => call("root"), chooseRoot: () => call("chooseRoot"), scan: () => call("scan"),
    async open() { const source = await call("open"); return source ? analyze(source) : null; },
    async read(entry) {
        try { return { ...entry, ...await analyze(await call("read", entry.id)) }; }
        catch (error) { return { ...entry, readable: false, items: [], warnings: [error.message] }; }
    }
};
