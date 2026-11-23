import { normalizeCode, xmlUnits, brUnits } from "./nfPurchaseReport.service";
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
        if (unit) group.units.add(unit); else group.error = "Unidade tributável ausente; não é seguro vincular.";
        if (!code) group.error = "Informe um código interno numérico válido (até 20 dígitos).";
        try { group.total += xmlUnits(item.tributaryQuantity); } catch (error) { group.error = "Quantidade tributável ausente ou inválida."; }
    });
    return [...grouped.values()].map((group) => ({ ...group, unit: [...group.units].join(" / "),
        error: group.units.size > 1 ? "Mesmo código em unidades tributáveis diferentes; confira os códigos e unidades." : group.error }));
}
export function reportBlock(report, invoice) {
    if (!report) return "Importe ou cole o relatório de pedidos.";
    if (report.errors.length) return "Relatório contém linhas não reconhecidas ou inconsistências. Corrija antes de vincular.";
    if (!invoice?.readable || !invoice.destination?.key) return "NF sem filial destinatária identificada; vínculo bloqueado.";
    if (report.branch !== invoice.destination.key) return `Filial do TXT (${report.branch}) difere da NF (${invoice.destination.key}).`;
    return "";
}
export function rowReserved(notes, rowId, exceptInvoice = "") {
    return Object.entries(notes).reduce((sum, [id, note]) => sum + (id === exceptInvoice ? 0n : (note.allocations[rowId] || 0n)), 0n);
}
export function groupLinked(group, note, report, exceptRow = "") {
    return report.rows.filter((row) => row.normalizedCode === group.code && row.id !== exceptRow)
        .reduce((sum, row) => sum + (note.allocations[row.id] || 0n), 0n);
}
export function emptyNote() { return { manual: {}, allocations: {}, confirmed: false }; }
export const initialPurchaseState = { notes: {}, report: null, error: "", notice: "" };
export function purchaseReducer(state, action) {
    const id = action.invoice ? invoiceIdentity(action.invoice) : "";
    const note = state.notes[id] || emptyNote();
    const save = (value, notice = "") => ({ ...state, notes: { ...state.notes, [id]: value }, error: "", notice });
    if (action.type === "ERROR") return { ...state, error: action.message, notice: "" };
    if (action.type === "IMPORT" || action.type === "CLEAR_REPORT") {
        const notes = Object.fromEntries(Object.entries(state.notes).map(([key, current]) => [key, { ...current, allocations: {}, confirmed: false }]));
        return { ...state, notes, report: action.type === "IMPORT" ? { ...action.report, version: (state.report?.version || 0) + 1 } : null, error: "", notice: "Relatório substituído/limpo; vínculos da sessão foram zerados. Códigos manuais preservados." };
    }
    if (action.type === "RELEASE_ALL") return { ...state, error: "", notice: "Todos os vínculos da sessão foram removidos.", notes: Object.fromEntries(Object.entries(state.notes).map(([key, current]) => [key, { ...current, allocations: {} }])) };
    if (!action.invoice) return state;
    if (action.type === "CODE") {
        const manual = { ...note.manual };
        if (action.restore) delete manual[action.index]; else manual[action.index] = String(action.value).slice(0, 20);
        return save({ ...note, manual, allocations: {} }, "Código alterado: vínculos desta NF foram zerados para nova conferência.");
    }
    if (action.type === "CONFIRM") return save({ ...note, confirmed: Boolean(action.value), allocations: action.value ? note.allocations : {} });
    if (action.type === "REMOVE") {
        const allocations = { ...note.allocations }; delete allocations[action.rowId];
        return save({ ...note, allocations });
    }
    if (action.type !== "ALLOCATE") return state;
    try {
        const blocked = reportBlock(state.report, action.invoice);
        if (blocked) throw new Error(blocked);
        if (!note.confirmed) throw new Error("Confirme que as quantidades do relatório estão na mesma unidade tributável da NF.");
        const row = state.report.rows.find((item) => item.id === action.rowId);
        if (!row || row.branch !== action.invoice.destination.key) throw new Error("Controle não pertence à filial da NF.");
        const group = invoiceGroups(action.invoice, note.manual).find((item) => item.code === row.normalizedCode);
        if (!group || group.error) throw new Error(group?.error || "Código do controle não corresponde à NF.");
        const amount = brUnits(action.value);
        if (amount <= 0n) throw new Error("Informe uma quantidade maior que zero; use Remover para desfazer.");
        if (groupLinked(group, note, state.report, row.id) + amount > group.total) throw new Error("A soma dos vínculos ultrapassa a quantidade da NF para esse código.");
        const otherNotes = rowReserved(state.notes, row.id, id);
        if (otherNotes + amount > row.pending) throw new Error("Quantidade ultrapassa o saldo pendente, considerando os vínculos das outras notas nesta sessão.");
        return save({ ...note, allocations: { ...note.allocations, [row.id]: amount } }, "Vínculo registrado apenas na conferência. Nada foi enviado ao sistema externo.");
    } catch (error) { return { ...state, error: error.message, notice: "" }; }
}
