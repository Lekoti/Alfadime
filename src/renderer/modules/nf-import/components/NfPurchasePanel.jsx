import React, { useEffect, useRef, useState } from "react";
import { formatUnits } from "../services/nfPurchaseReport.service";
import { groupLinked } from "../services/nfPurchaseMatch.service";
import { suggestPurchaseControl } from "../services/nfPurchaseSuggestion.service";
import NfPurchaseAllocation from "./NfPurchaseAllocation";
import "../styles/nf-purchase-compact.css";
function statusFor(suggestion) {
    if (suggestion.issue) return suggestion.issue;
    if (suggestion.relation === "missing") return "Sem saldo disponível";
    if (suggestion.relation === "tie") return `Empate entre ${suggestion.tied.length} controles — escolher nos detalhes`;
    if (suggestion.relation === "exact") return "Quantidade exata";
    if (suggestion.relation === "lower") return `Faltam ${formatUnits(-suggestion.difference)} para completar a NF`;
    return `Saldo excede a NF em ${formatUnits(suggestion.difference)}`;
}
export default function NfPurchasePanel({ invoice, session }) {
    const [pasted, setPasted] = useState(""), [encoding, setEncoding] = useState("auto"), [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState({});
    const fileInput = useRef(null), alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    if (!session) return null;
    const { report, note, state } = session;
    const replaceAllowed = () => !report || window.confirm("Substituir o relatório? Todos os vínculos da sessão serão removidos. Os códigos manuais serão preservados.");
    const toggle = (key) => setExpanded((previous) => ({ ...previous, [key]: !previous[key] }));
    async function importFile(event) {
        const file = event.target.files?.[0]; event.target.value = "";
        if (!file || !replaceAllowed()) return;
        if (file.size > 5 * 1024 * 1024) { session.fail("Relatório maior que 5 MB."); return; }
        setLoading(true);
        try {
            const data = await file.arrayBuffer();
            if (!alive.current) return;
            const decoded = session.decode(data, encoding);
            session.loadText(decoded.text, file.name, decoded.encoding);
        } catch (error) { if (alive.current) session.fail(error.message); }
        finally { if (alive.current) setLoading(false); }
    }
    return <section className="nf-purchase nf-purchase-compact" aria-label="Conferência dos pedidos de compra">
        <header className="nf-heading"><h3>Pedido de compra — controle sugerido</h3><div className="nf-actions">
            <select value={encoding} onChange={(event) => setEncoding(event.target.value)} aria-label="Codificação do TXT" disabled={loading}>
                <option value="auto">Codificação automática</option><option value="utf-8">UTF-8</option><option value="windows-1252">Windows-1252</option><option value="oem850">OEM 850 (DOS)</option>
            </select>
            <input ref={fileInput} type="file" accept=".txt,.prn,text/plain" hidden onChange={importFile}/>
            <button type="button" disabled={loading} onClick={() => fileInput.current?.click()}>{loading ? "Lendo..." : "Importar TXT de pedidos"}</button>
            {report && <button type="button" disabled={loading} onClick={() => { if (window.confirm("Limpar o relatório e todos os vínculos da sessão? Códigos manuais serão preservados.")) session.clear(); }}>Limpar relatório</button>}
        </div></header>
        <details className="nf-paste"><summary>Colar relatório</summary><textarea value={pasted} onChange={(event) => setPasted(event.target.value)} aria-label="Texto do relatório de pedidos" placeholder="Cole o relatório completo com o cabeçalho da filial." />
            <button type="button" disabled={!pasted.trim() || loading} onClick={() => { if (replaceAllowed()) session.loadText(pasted, "Texto colado", "Texto Unicode"); }}>Usar texto colado</button>
        </details>
        {state.error && <p className="nf-error" role="alert">{state.error}</p>}
        {state.notice && <p className="nf-compact-notice" role="status">{state.notice}</p>}
        {!report && <p className="nf-muted">Importe o TXT ou cole o relatório. O código interno continua editável na tabela da NF.</p>}
        {report && <>
            <p className="nf-compact-source">{report.name} · filial {report.branch || "não identificada"} · {report.rows.length} item(ns) · {report.encoding}</p>
            {report.errors.length > 0 && <details open className="nf-error"><summary>{report.errors.length} problema(s) no relatório — vínculo bloqueado</summary><ul>{report.errors.slice(0,20).map((error, index) => <li key={index}>Linha {error.line}: {error.message}<br/>{error.content}</li>)}</ul>{report.errors.length > 20 && <p>Exibidos os primeiros 20 problemas.</p>}</details>}
            {session.blocked && <p className="nf-error">{session.blocked}</p>}
            <label className="nf-unit-confirm"><input type="checkbox" checked={note.confirmed} disabled={Boolean(session.blocked)} onChange={(event) => session.confirm(event.target.checked)} />
                Confirmei que o saldo do TXT está na mesma unidade tributável da NF (qTrib/uTrib).</label>
            <div className="nf-compact-scroll"><table className="nf-control-summary"><colgroup><col className="nf-summary-product"/><col className="nf-summary-quantity"/><col className="nf-summary-quantity"/><col className="nf-summary-code"/><col className="nf-summary-control"/></colgroup>
                <thead><tr><th scope="col">Produto</th><th scope="col">Quantidade NF</th><th scope="col" title="Saldo do controle menos vínculos de outras notas da sessão">Quantidade controle</th><th scope="col">Código produto</th><th scope="col">Controle sugerido</th></tr></thead>
                <tbody>{session.groups.map((group) => {
                    const suggestion = suggestPurchaseControl({ group, report, branch: invoice.destination?.key, notes: state.notes, invoiceId: session.id, blocked: session.blocked });
                    const best = suggestion.best, key = `${report.version}-${group.key}`, linked = groupLinked(group, note, report);
                    const product = best?.row.description || group.descriptions.join(" / ");
                    const code = best?.row.code || group.displayCode || "—";
                    const balances = [...new Set(suggestion.tied.map((candidate) => formatUnits(candidate.available)))];
                    return <React.Fragment key={key}><tr className={`nf-suggestion-${suggestion.relation}`}>
                        <td className="nf-compact-product" title={`NF: ${group.descriptions.join(" / ")}`}><button type="button" className="nf-compact-toggle" onClick={() => toggle(key)} aria-expanded={Boolean(expanded[key])} aria-label={`Ver controles e vínculos do código ${code}`}><span aria-hidden="true">{expanded[key] ? "−" : "+"}</span> {product}</button></td>
                        <td className="nf-number">{formatUnits(group.total)}</td>
                        <td className={`nf-number nf-control-balance nf-balance-${suggestion.relation}`}>{best ? formatUnits(best.available) : suggestion.relation === "tie" ? balances.slice(0,2).join(" / ") : "—"}</td>
                        <td className="nf-compact-code">{code}</td><td className="nf-compact-control"><span>{best?.row.control || (suggestion.relation === "tie" ? "Empate — escolher" : "—")}</span><small>{statusFor(suggestion)}</small></td>
                    </tr>{expanded[key] && <tr className="nf-compact-detail-row"><td colSpan={5}>
                        <div className="nf-compact-detail"><div className="nf-heading"><h3>Outros controles e vínculo da conferência</h3><button type="button" onClick={() => toggle(key)}>Recolher</button></div>
                            <p>NF: {group.descriptions.join(" / ")} · código {group.displayCode || "não informado"} · unidade {group.unit || "não informada"}</p>
                            <p>Itens: {group.indexes.map((index) => invoice.items[index].line).join(", ")} · quantidade NF: {formatUnits(group.total)} · vinculado: {formatUnits(linked)} · falta conferir: {formatUnits(group.total - linked)}</p>
                            {suggestion.relation === "tie" && <p className="nf-compact-warning">Há controles igualmente próximos da quantidade da NF. Escolha manualmente; nenhum foi selecionado.</p>}
                            {best && <p className="nf-muted">Sugestão: {best.row.control}. É apenas uma indicação; informe e confirme a quantidade abaixo para registrar o vínculo da conferência.</p>}
                            {suggestion.candidates.length ? <div className="nf-purchase-scroll"><table className="nf-purchase-table"><thead><tr><th>Controle</th><th>Código TXT</th><th>Produto do relatório</th><th>Pendente TXT</th><th>Outras NFs / sessão</th><th>Disponível para esta NF</th><th>Quantidade a vincular</th><th>Vinculado nesta NF</th><th>Ação informativa</th></tr></thead><tbody>
                                {suggestion.candidates.map(({ row, reserved }) => <NfPurchaseAllocation key={row.id} row={row} saved={note.allocations[row.id] || 0n} reservedOthers={reserved}
                                    disabled={Boolean(suggestion.issue || session.blocked || group.error || !note.confirmed || row.pending <= 0n)} onSave={(value) => session.allocate(row.id, value)} onRemove={() => session.remove(row.id)} />)}
                            </tbody></table></div> : <p>Nenhum controle encontrado para esse código e filial.</p>}
                        </div>
                    </td></tr>}</React.Fragment>;
                })}{!session.groups.length && <tr><td colSpan={5}>Nenhum item da NF disponível para conferir.</td></tr>}</tbody>
            </table></div>
            <p className="nf-compact-help">Igualdade exata primeiro; depois, menor diferença entre saldo disponível e quantidade total da NF. Clique em + no produto para outros controles e ações. A sugestão não vincula automaticamente.</p>
            <details className="nf-compact-information"><summary>Informações da conferência e relatório completo</summary>
                <p>Disponível para esta NF desconta os vínculos das outras notas mantidos nesta sessão. Vínculos desta própria nota permanecem incluídos no saldo destinado a ela. A sugestão compara sempre com a quantidade total da NF, não com o restante a vincular.</p>
                <p>Substituir/limpar o relatório remove os vínculos de todas as notas; editar um código remove os vínculos desta NF. O código manual não altera o cadastro.</p>
                <p>{report.pages} cabeçalho(s) de página reconhecido(s). Prévia de até 200 linhas; todas as linhas válidas participam da conferência.</p>
                <div className="nf-purchase-scroll"><table className="nf-purchase-table"><thead><tr><th>Linha</th><th>Filial</th><th>Produto</th><th>Código</th><th>Controle</th><th>Pendente anterior</th><th>Atendida</th><th>Cancelada</th><th>Pendente atual</th></tr></thead><tbody>{report.rows.slice(0,200).map((row) => <tr key={row.id}><td>{row.line}</td><td>{row.branch} / {row.unit}</td><td>{row.description}</td><td>{row.code}</td><td>{row.control}</td><td>{formatUnits(row.previous)}</td><td>{formatUnits(row.attended)}</td><td>{formatUnits(row.cancelled)}</td><td>{formatUnits(row.pending)}</td></tr>)}</tbody></table></div>
                <button type="button" className="nf-release" onClick={() => { if (window.confirm("Remover todos os vínculos de todas as notas nesta sessão?")) session.releaseAll(); }}>Remover vínculos da sessão</button>
            </details>
        </>}
        <p className="nf-compact-session">Somente conferência · nada é enviado ao ERP · dados temporários, perdidos ao sair do módulo ou fechar o app.</p>
    </section>;
}
