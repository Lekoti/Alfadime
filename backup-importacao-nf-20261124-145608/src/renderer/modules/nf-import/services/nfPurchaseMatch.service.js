import { normalizeCode, xmlUnits } from "./nfPurchaseReport.service";
export function autoDestination(item, invoice) {
    if (!invoice?.destination) return { value: "", label: "Destino desconhecido" };
    const rows = (item.matches || []).filter((row) => row.branch === invoice.destination.key && row.code && row.isPrimary);
    if (rows.length > 1) return { value: "", label: "Vários cadastros: conferir" };
    if (!rows.length) return { value: "", label: "Não localizado" };
    return { value: String(rows[0].code), label: !rows[0].active ? "Cadastro inativo" : rows[0].basis !== "EAN tributável" ? "Conferir unidade / EAN comercial" : "Localizado no cadastro" };
}
export function invoiceIdentity(invoice) {
    if (!invoice) return "";
    return JSON.stringify([/^\d{44}$/.test(invoice.accessKey || "") ? invoice.accessKey : [invoice.issuerCnpj, invoice.cnpj, invoice.number, invoice.series, invoice.fileName],
        invoice.items.map((item) => [item.line, item.supplierCode, item.ean, item.taxEan, item.tributaryQuantity, item.tributaryUnit])]);
}
export function itemCode(invoice, manual, index) {
    const automatic = autoDestination(invoice.items[index], invoice);
    const isManual = Object.prototype.hasOwnProperty.call(manual, index);
    const value = isManual ? manual[index] : automatic.value;
    return { value, manual: isManual, normalizedCode: normalizeCode(value), automatic: automatic.value,
        label: isManual ? "Informado manualmente — não validado no cadastro" : automatic.label };
}
export function invoiceGroups(invoice, manual = {}) {
    if (!invoice) return [];
    const grouped = new Map();
    invoice.items.forEach((item, index) => {
        const field = itemCode(invoice, manual, index), code = field.normalizedCode;
        const key = code || `unmapped:${index}`;
        if (!grouped.has(key)) grouped.set(key, { key, code, displayCode: field.value, descriptions: [], indexes: [], units: new Set(), total: 0n, error: "" });
        const group = grouped.get(key);
        group.descriptions.push(item.description); group.indexes.push(index);
        const unit = String(item.tributaryUnit || "").trim().toUpperCase();
        if (unit) group.units.add(unit); else group.error = "Unidade tributável ausente; confira os dados da NF.";
        if (!code) group.error = "Informe um código interno numérico válido (até 20 dígitos).";
        try { group.total += xmlUnits(item.tributaryQuantity); } catch (error) { group.error = "Quantidade tributável ausente ou inválida."; }
    });
    return [...grouped.values()].map((group) => ({ ...group, unit: [...group.units].join(" / "),
        error: group.units.size > 1 ? "Mesmo código em unidades tributáveis diferentes; confira os códigos e unidades." : group.error }));
}
export function reportBlock(report, invoice) {
    if (!report) return "Importe ou cole o relatório de pedidos.";
    if (report.errors.length) return "Relatório contém linhas não reconhecidas ou inconsistências. Confira o TXT antes de usar a sugestão.";
    if (!invoice?.readable || !invoice.destination?.key) return "NF sem filial destinatária identificada; sugestão indisponível.";
    if (report.branch !== invoice.destination.key) return `Filial do TXT (${report.branch}) difere da NF (${invoice.destination.key}).`;
    return "";
}
export function emptyNote() { return { manual: {} }; }
export const initialPurchaseState = { notes: {}, report: null, error: "", notice: "" };
export function purchaseReducer(state, action) {
    if (action.type === "ERROR") return { ...state, error: action.message, notice: "" };
    if (action.type === "IMPORT" || action.type === "CLEAR_REPORT") {
        const notes = Object.fromEntries(Object.entries(state.notes).map(([key, current]) => [key, { manual: current.manual || {} }]));
        return { ...state, notes, report: action.type === "IMPORT" ? { ...action.report, version: (state.report?.version || 0) + 1 } : null, error: "", notice: "" };
    }
    if (action.type !== "CODE" || !action.invoice) return state;
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= action.invoice.items.length) return state;
    const id = invoiceIdentity(action.invoice), note = state.notes[id] || emptyNote();
    const manual = { ...note.manual };
    if (action.restore) delete manual[action.index]; else manual[action.index] = String(action.value).slice(0, 20);
    return { ...state, notes: { ...state.notes, [id]: { manual } }, error: "", notice: "" };
}
