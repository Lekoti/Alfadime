import NfCodeInput from "./NfCodeInput";
import NfPurchasePanel from "./NfPurchasePanel";
import React, { useState } from "react";
import { ORIGIN_REASON } from "../constants/nfImport.constants";
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
export default function NfInvoiceDetails({ invoice, onClose, purchase }) {
    const [expanded, setExpanded] = useState({});
    if (!invoice) return null;
    const toggle = (index) => setExpanded((current) => ({ ...current, [index]: !current[index] }));
    const totals = [["Total produtos", invoice.productTotal], ["Total NF", invoice.total], ["Base ICMS", invoice.icmsBase], ["Valor ICMS", invoice.icmsValue], ["Desconto", invoice.discount], ["IPI", invoice.ipi]];
    const issueCount = invoice.warnings.length + invoice.items.reduce((total, item) => total + item.warnings.length, 0);
    return <section className="nf-invoice" aria-label="Consulta da nota fiscal">
        <div className="nf-heading nf-invoice-title"><div><h2>{invoice.number ? `NF ${invoice.number} / série ${show(invoice.series)}` : "Consulta do XML"}</h2><p className="nf-file-name">{invoice.fileName}</p></div><button type="button" onClick={onClose}>Voltar à lista</button></div>
        <div className="nf-invoice-summary"><div className="nf-identity">
            <div><span>Emissor</span><strong>{show(invoice.issuer)}</strong><small>{show(invoice.issuerCnpj)}</small></div>
            <div><span>Número NF / série</span><strong>{show(invoice.number)} / {show(invoice.series)}</strong></div>
            <div><span>Filial destinatária</span><strong>{invoice.destination ? `${invoice.destination.key} — ${invoice.destination.name}` : "Não identificada"}</strong></div>
            <div><span>Natureza da operação</span><strong>{show(invoice.nature)}</strong></div>
            <div><span>Emissão</span><strong>{show(invoice.issueDate)}</strong></div>
            <div><span>Itens</span><strong>{invoice.items.length}</strong></div>
        </div><div className="nf-totals">{totals.map(([label, value]) => <div key={label}><span>{label}</span><strong>{num(value, 2, 2)}</strong></div>)}</div></div>
        <div className="nf-sheet-caption">Itens: {invoice.items.length} · Código do destino: EAN tributável prioritário · QTD do destino: qTrib</div>
        <div className="nf-sheet-scroll" tabIndex={0} aria-label="Itens com rolagem horizontal"><table className="nf-sheet"><colgroup>
            <col style={{width:58}}/><col style={{width:125}}/><col style={{width:100}}/><col style={{width:290}}/><col style={{width:125}}/><col style={{width:60}}/>
            <col style={{width:85}}/><col style={{width:85}}/><col style={{width:115}}/><col style={{width:105}}/><col style={{width:75}}/><col style={{width:105}}/><col style={{width:75}}/><col style={{width:160}}/><col style={{width:90}}/>
        </colgroup><thead><tr className="nf-sheet-group"><th colSpan={13}>DADOS DO XML</th><th colSpan={2} className="nf-dest-group">DESTINO: {invoice.destination?.key || "NÃO IDENTIFICADO"}</th></tr>
            <tr><th>Item</th><th>EAN</th><th title="cProd: código do fornecedor no XML">Cód. fornecedor</th><th>Produto</th><th title="cEANTrib">EAN tributado</th><th title="uCom">UN/CX</th><th title="qCom">Qtd 1</th><th title="qTrib">QTD 2</th><th title="vUnTrib">Vlr unit.</th><th>Base ICMS</th><th>% ICMS</th><th>Valor ICMS</th><th title="Sem conversão definida">QTD CX</th><th className="nf-dest-header">Código interno</th><th className="nf-dest-header">QTD</th></tr></thead>
        <tbody>{invoice.items.map((item, index) => {
            const result = destination(item, invoice);
            const codeField = purchase?.getItemCode(index);
            return <React.Fragment key={`${item.line}-${index}`}><tr className={index % 2 ? "nf-sheet-alt" : ""}>
                <td><button type="button" className="nf-expand" onClick={() => toggle(index)} aria-expanded={Boolean(expanded[index])} aria-label={`Detalhes do item ${item.line}`}>{expanded[index] ? "−" : "+"} {item.line}</button></td>
                <td>{show(item.ean)}</td><td>{show(item.supplierCode)}</td><td className="nf-product" title={item.description}>{show(item.description)}</td><td>{show(item.taxEan)}</td><td>{show(item.unit)}</td>
                <td className="nf-number">{num(item.quantity)}</td><td className="nf-number">{num(item.tributaryQuantity)}</td><td className="nf-number">{num(item.tributaryUnitValue, 10, 2)}</td>
                <td className="nf-number">{num(item.icmsBase, 2, 2)}</td><td className="nf-number">{num(item.icmsRate, 4, 2)}</td><td className="nf-number">{num(item.icmsValue, 2, 2)}</td><td className="nf-number" title="Conversão não definida na planilha">—</td>
                <td className="nf-dest-cell"><NfCodeInput value={codeField?.value ?? result.code} manual={Boolean(codeField?.manual)} label={codeField?.label || result.label} onChange={(value) => purchase?.setCode(index, value)} onRestore={() => purchase?.restoreCode(index)} onDetails={() => toggle(index)} /></td><td className="nf-dest-cell nf-number">{num(item.tributaryQuantity)}</td>
            </tr>{expanded[index] && <tr className="nf-extra-row"><td colSpan={15}><div className="nf-item-extra">
                <section><h3>Fiscal e unidades</h3><p>NCM: {show(item.ncm)} · CFOP: {show(item.cfop)} · ICMS: {show(item.icmsGroup)}</p><p>Unidade comercial: {show(item.unit)} · tributável: {show(item.tributaryUnit)}</p><p>Vlr. unitário comercial: {num(item.unitValue, 10, 2)} · total do produto: {num(item.total, 2, 2)}</p><p>ICMS-ST: base {num(item.icmsStBase, 2, 2)} · valor {num(item.icmsStValue, 2, 2)}</p><p>QTD CX não estimada: regra de conversão não definida.</p></section>
                <section><h3>Correspondências e sugestões</h3>{item.matches?.length ? <ul>{item.matches.map((match, i) => <li key={i}>{match.branch === invoice.destination?.key ? "Destino" : "Outra filial"}: {match.branch} · código {show(match.code)} · {show(match.description)}<br/>{match.basis}{!match.active && " · INATIVO"}</li>)}</ul> : <p>Nenhuma correspondência automática por EAN.</p>}<p>Informativo: conferir unidade e apresentação. Nenhuma duplicação é executada.</p></section>
                <section><h3>Lotes e ANVISA</h3><p>Registro: {show(item.registration)}</p>{item.lots?.length ? <ul>{item.lots.map((lot, i) => <li key={i}>Lote {show(lot.lot)} · qtd. {num(lot.quantity)}<br/>Fabricação: {show(lot.manufacturing)} · validade: {show(lot.expiry)}</li>)}</ul> : <p>Sem lotes informados.</p>}</section>
                <section><h3>Diagnóstico do item</h3>{item.warnings.length ? <ul>{item.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul> : <p>Sem pendências nas verificações implementadas.</p>}</section>
            </div></td></tr>}</React.Fragment>;
        })}{!invoice.items.length && <tr><td colSpan={15}>Nenhum item disponível. Consulte o diagnóstico.</td></tr>}</tbody></table></div>
        <p className="nf-sheet-help">Clique no item ou na situação para ver detalhes. Qtd 1 = comercial; QTD 2 e QTD do destino = tributável. Valores em reais.</p>
        <NfPurchasePanel key={purchase?.id} invoice={invoice} session={purchase} />
        <details className="nf-diagnostic" open={!invoice.readable}><summary>Diagnóstico e informações adicionais ({issueCount} apontamento(s))</summary>
            {invoice.folderBranch && <p className="nf-notice">Origem: ComErros / {invoice.folderBranch}. Motivo do sistema externo: {ORIGIN_REASON}</p>}
            {invoice.warnings.length ? <ul>{invoice.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul> : <p>Sem pendências gerais nas verificações implementadas. Isso não comprova importabilidade no ERP.</p>}
            <p>Destinatário: {show(invoice.recipient)} · {show(invoice.cnpj)}</p><p className="nf-break">Chave: {show(invoice.accessKey)}</p><p>Protocolo / retorno incluído no XML: {show(invoice.protocol)} · {show(invoice.protocolStatus)} · {show(invoice.protocolReason)}</p>
            {invoice.additional && <p>{invoice.additional}</p>}<p>As pendências específicas ficam nos detalhes de cada item.</p>
        </details>
    </section>;
}
