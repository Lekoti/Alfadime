import NfCodeInput from "./NfCodeInput";
import NfPurchasePanel from "./NfPurchasePanel";
import NfInfoDialog from "./NfInfoDialog";
import React, { useEffect, useState } from "react";
import { ORIGIN_REASON } from "../constants/nfImport.constants";
import "../styles/nf-invoice-compact.css";
function show(value) { return value === undefined || value === null || value === "" ? "—" : String(value); }
function num(value, max = 4, min = 0) { return value === "" || value === undefined || value === null ? "—" : Number.isFinite(Number(value)) ? Number(value).toLocaleString("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max }) : show(value); }
function destination(item, invoice) {
    if (!invoice.destination) return { code: "", label: "Destino desconhecido", tone: "warning" };
    const rows = (item.matches || []).filter((row) => row.branch === invoice.destination.key && row.code && row.isPrimary);
    if (rows.length > 1) return { code: "", label: "Vários cadastros: conferir", tone: "warning" };
    if (!rows.length) return { code: "", label: "Não localizado", tone: "missing" };
    if (!rows[0].active) return { code: rows[0].code, label: "Cadastro inativo", tone: "warning" };
    if (rows[0].basis !== "EAN tributável") return { code: rows[0].code, label: "Conferir unidade / EAN comercial", tone: "warning" };
    return { code: rows[0].code, label: "Localizado", tone: "found" };
}
export default function NfInvoiceDetails({ invoice, onClose, purchase, onImport, busy = false }) {
    const [expanded, setExpanded] = useState({});
    const [activeDialog, setActiveDialog] = useState(() => invoice && !invoice.readable ? "diagnostic" : "");
    useEffect(() => {
        setExpanded({});
        setActiveDialog(invoice && !invoice.readable ? "diagnostic" : "");
    }, [invoice]);
    if (!invoice) return null;
    const toggle = (index) => setExpanded((current) => ({ ...current, [index]: !current[index] }));
    const totals = [["Total produtos", invoice.productTotal], ["Total NF", invoice.total], ["Base ICMS", invoice.icmsBase], ["Valor ICMS", invoice.icmsValue], ["Desconto", invoice.discount], ["IPI", invoice.ipi]];
    const issueCount = invoice.warnings.length + invoice.items.reduce((total, item) => total + item.warnings.length, 0);
    return <section className="nf-invoice nf-invoice-compact" aria-label="Consulta da nota fiscal">
        <header className="nf-invoice-toolbar"><div><h1>Importação NF</h1><span>{invoice.number ? `NF ${invoice.number} / série ${show(invoice.series)}` : "Consulta do XML"}</span></div>
            <div className="nf-invoice-toolbar-actions">
                {onImport && <button type="button" disabled={busy} onClick={onImport}>Importar XML</button>}
                <button type="button" disabled={!purchase?.report} onClick={() => setActiveDialog("report")}>Relatório</button>
                <button type="button" className={issueCount ? "nf-diagnostic-alert" : ""} onClick={() => setActiveDialog("diagnostic")}>Diagnóstico ({issueCount})</button>
                <button type="button" onClick={onClose}>Voltar à lista</button>
            </div>
        </header>
        <div className="nf-invoice-overview"><div className="nf-invoice-identity">
            <div><span>Emissor</span><strong>{show(invoice.issuer)}</strong><small>{show(invoice.issuerCnpj)}</small></div>
            <div><span>Filial destinatária</span><strong>{invoice.destination ? `${invoice.destination.key} — ${invoice.destination.name}` : "Não identificada"}</strong></div>
            <div><span>Emissão</span><strong>{show(invoice.issueDate)}</strong></div>
        </div><div className="nf-invoice-totals">{totals.map(([label, value]) => <div key={label}><span>{label}</span><strong>{num(value, 2, 2)}</strong></div>)}</div></div>
        <div className="nf-invoice-items"><table className="nf-invoice-sheet"><colgroup>
            <col className="nf-item-col"/><col className="nf-description-col"/><col className="nf-unit-col"/><col className="nf-quantity-col"/><col className="nf-price-col"/><col className="nf-internal-col"/><col className="nf-total-col"/>
        </colgroup><thead><tr><th scope="col">Item</th><th scope="col">Produto</th><th scope="col" title="Unidade tributável: uTrib">UN</th><th scope="col" title="Quantidade tributável: qTrib">Qtd. NF</th><th scope="col" title="Valor unitário tributável: vUnTrib">Vlr. unit.</th><th scope="col">Código interno</th><th scope="col">Total</th></tr></thead>
        <tbody>{invoice.items.map((item, index) => {
            const result = destination(item, invoice), codeField = purchase?.getItemCode(index);
            return <React.Fragment key={`${item.line}-${index}`}><tr className={index % 2 ? "nf-item-alternate" : ""}>
                <td><button type="button" className="nf-invoice-expand" onClick={() => toggle(index)} aria-expanded={Boolean(expanded[index])} aria-label={`Detalhes do item ${item.line}`}>{expanded[index] ? "−" : "+"} {item.line}</button></td>
                <td className="nf-invoice-product" title={item.description}>{show(item.description)}</td><td>{show(item.tributaryUnit)}</td>
                <td className="nf-number">{num(item.tributaryQuantity)}</td><td className="nf-number">{num(item.tributaryUnitValue, 10, 2)}</td>
                <td className="nf-invoice-code"><NfCodeInput value={codeField?.value ?? result.code} manual={Boolean(codeField?.manual)} label={codeField?.label || result.label} onChange={(value) => purchase?.setCode(index, value)} onRestore={() => purchase?.restoreCode(index)} onDetails={() => toggle(index)} /></td>
                <td className="nf-number">{num(item.total, 2, 2)}</td>
            </tr>{expanded[index] && <tr className="nf-invoice-extra-row"><td colSpan={7}><div className="nf-invoice-extra">
                <section><h3>Identificação e unidades</h3><p>Cód. fornecedor: {show(item.supplierCode)} · EAN: {show(item.ean)}</p><p>EAN tributável: {show(item.taxEan)}</p><p>Comercial: {show(item.unit)} · quantidade {num(item.quantity)} · valor unitário {num(item.unitValue, 10, 2)}</p><p>Tributável: {show(item.tributaryUnit)} · quantidade {num(item.tributaryQuantity)} · valor unitário {num(item.tributaryUnitValue, 10, 2)}</p><p>QTD CX: — (regra de conversão não definida).</p></section>
                <section><h3>Tributos</h3><p>NCM: {show(item.ncm)} · CFOP: {show(item.cfop)} · ICMS: {show(item.icmsGroup)}</p><p>Base ICMS: {num(item.icmsBase, 2, 2)} · alíquota: {num(item.icmsRate, 4, 2)}% · valor: {num(item.icmsValue, 2, 2)}</p><p>ICMS-ST: base {num(item.icmsStBase, 2, 2)} · valor {num(item.icmsStValue, 2, 2)}</p></section>
                <section><h3>Correspondências e sugestões</h3>{item.matches?.length ? <ul>{item.matches.map((match, i) => <li key={i}>{match.branch === invoice.destination?.key ? "Destino" : "Outra filial"}: {match.branch} · código {show(match.code)} · {show(match.description)}<br/>{match.basis}{!match.active && " · INATIVO"}</li>)}</ul> : <p>Nenhuma correspondência automática por EAN.</p>}<p>Conferir unidade e apresentação no sistema externo.</p></section>
                <section><h3>Lotes e ANVISA</h3><p>Registro: {show(item.registration)}</p>{item.lots?.length ? <ul>{item.lots.map((lot, i) => <li key={i}>Lote {show(lot.lot)} · qtd. {num(lot.quantity)}<br/>Fabricação: {show(lot.manufacturing)} · validade: {show(lot.expiry)}</li>)}</ul> : <p>Sem lotes informados.</p>}</section>
                <section><h3>Diagnóstico do item</h3>{item.warnings.length ? <ul>{item.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul> : <p>Sem pendências nas verificações implementadas.</p>}</section>
            </div></td></tr>}</React.Fragment>;
        })}{!invoice.items.length && <tr><td colSpan={7}>Nenhum item disponível. Consulte o diagnóstico.</td></tr>}</tbody></table></div>
        <NfPurchasePanel key={purchase?.id} invoice={invoice} session={purchase} reportOpen={activeDialog === "report"} onCloseReport={() => setActiveDialog("")} />
        <NfInfoDialog open={activeDialog === "diagnostic"} title={`Diagnóstico e informações adicionais (${issueCount})`} onClose={() => setActiveDialog("")}>
            {invoice.folderBranch && <p className="nf-notice">Origem: ComErros / {invoice.folderBranch}. Motivo do sistema externo: {ORIGIN_REASON}</p>}
            {invoice.warnings.length ? <ul>{invoice.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul> : <p>Sem pendências gerais nas verificações implementadas. Isso não comprova importabilidade no ERP.</p>}
            <p>Arquivo: {show(invoice.fileName)}</p><p>Natureza da operação: {show(invoice.nature)}</p><p>Itens: {invoice.items.length}</p>
            <p>Destinatário: {show(invoice.recipient)} · {show(invoice.cnpj)}</p><p className="nf-break">Chave: {show(invoice.accessKey)}</p><p>Protocolo / retorno incluído no XML: {show(invoice.protocol)} · {show(invoice.protocolStatus)} · {show(invoice.protocolReason)}</p>
            {invoice.additional && <p>{invoice.additional}</p>}<p>As pendências específicas ficam nos detalhes de cada item.</p>
        </NfInfoDialog>
    </section>;
}
