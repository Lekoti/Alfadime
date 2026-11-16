import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/price-pending-interactions.css";

const LABELS = {
    pending: "Pendente", running: "Em andamento", sending: "Enviando",
    sent: "Enviado", failed: "Falhou", ignored: "Ignorado", cancelled: "Cancelado",
    completed: "Concluído", completed_with_errors: "Concluído com falhas"
};
function date(value) {
    if (!value) return "Não registrado";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString("pt-BR");
}
function actor(run) {
    return run?.triggered_by_name || run?.created_by_name || run?.username || run?.user_name || "Não registrado";
}
function origin(run) {
    return run?.source || run?.trigger_type || "Não registrada";
}
async function invoke(channel, args) {
    if (typeof window.alfadime?.ipc?.invoke !== "function") throw new Error("A comunicação com o aplicativo não está disponível. Reinicie o Alfadime.");
    return window.alfadime.ipc.invoke(channel, args);
}

export default function PricePendingChargeHistoryModal({ open, onClose }) {
    const [runs, setRuns] = useState([]);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState("");
    const request = useRef(0);
    const closeRef = useRef(null);

    async function load() {
        const token = ++request.current;
        setLoading(true); setError(""); setDetail(null);
        try {
            const result = await invoke("contacts:list-charge-runs", { limit: 100 });
            if (token !== request.current) return;
            if (!Array.isArray(result)) throw new Error("O aplicativo retornou um formato inválido para o histórico.");
            setRuns(result);
        } catch (failure) {
            if (token === request.current) setError(failure?.message || "Não foi possível carregar o histórico.");
        } finally {
            if (token === request.current) setLoading(false);
        }
    }
    async function select(run) {
        const token = ++request.current;
        setDetailLoading(true); setError(""); setDetail(null);
        try {
            const result = await invoke("contacts:get-charge-run", { run_id: run.id });
            if (token !== request.current) return;
            if (!result?.id) throw new Error("Detalhes da cobrança não encontrados.");
            setDetail(result);
        } catch (failure) {
            if (token === request.current) setError(failure?.message || "Não foi possível carregar os detalhes.");
        } finally {
            if (token === request.current) setDetailLoading(false);
        }
    }
    useEffect(() => {
        if (!open) return undefined;
        const previous = document.activeElement;
        load(); closeRef.current?.focus();
        function key(event) {
            if (event.key === "Escape") onClose();
            if (event.key === "Tab") {
                const nodes = Array.from(document.querySelectorAll(".pp-history-dialog button:not(:disabled)"));
                const first = nodes[0]; const last = nodes[nodes.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        }
        document.addEventListener("keydown", key);
        return () => { ++request.current; document.removeEventListener("keydown", key); previous?.focus?.(); };
    }, [open]);
    if (!open) return null;
    return createPortal(
        <div className="pp-history-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="pp-history-dialog" role="dialog" aria-modal="true" aria-labelledby="pp-history-title">
                <header className="pp-history-header">
                    <h2 id="pp-history-title">Histórico de cobranças</h2>
                    <div><button type="button" disabled={loading || detailLoading} onClick={load}>Atualizar</button>
                    <button ref={closeRef} type="button" onClick={onClose}>Fechar</button></div>
                </header>
                <div className="pp-history-body">
                    <p>Últimas 100 execuções registradas pelo módulo Contatos. Selecione Detalhes para consultar os destinatários.</p>
                    <p>Usuário e origem aparecem como não registrados quando não foram gravados no histórico existente.</p>
                    {error && <div className="pp-history-error" role="alert">{error}</div>}
                    {loading ? <p role="status">Carregando cobranças...</p> : (
                        <div className="pp-history-scroll"><table>
                            <thead><tr><th>Data/hora</th><th>Cobrança</th><th>Usuário</th><th>Origem</th><th>Status</th><th>Enviados</th><th>Falhas</th><th>Detalhes</th></tr></thead>
                            <tbody>{runs.map(run => <tr key={run.id}>
                                <td>{date(run.started_at || run.created_at)}</td><td>{run.favorite_name || run.charge_type || "Não registrado"}</td>
                                <td>{actor(run)}</td><td>{origin(run)}</td><td>{LABELS[run.status] || run.status}</td>
                                <td>{run.sent ?? 0}</td><td>{run.failed ?? 0}</td>
                                <td><button type="button" disabled={detailLoading} onClick={() => select(run)}>Detalhes</button></td>
                            </tr>)}{!runs.length && <tr><td colSpan="8">Nenhuma cobrança registrada.</td></tr>}</tbody>
                        </table></div>
                    )}
                    {detailLoading && <p role="status">Carregando destinatários...</p>}
                    {detail && <section className="pp-history-detail">
                        <h3>{detail.favorite_name || "Detalhes da cobrança"}</h3>
                        <p>Usuário: {actor(detail)} · Origem: {origin(detail)}</p>
                        <p>Início: {date(detail.started_at)} · Fim: {date(detail.finished_at)}</p>
                        <p>Status: {LABELS[detail.status] || detail.status} · Total: {detail.total ?? 0} · Enviados: {detail.sent ?? 0} · Falhas: {detail.failed ?? 0} · Ignorados: {detail.ignored ?? 0} · Cancelados: {detail.cancelled ?? 0}</p>
                        {detail.error_message && <div className="pp-history-error">{detail.error_message}</div>}
                        <div className="pp-history-scroll"><table>
                            <thead><tr><th>Indústria</th><th>Filial</th><th>E-mail</th><th>Status</th><th>Enviado em</th><th>Erro</th></tr></thead>
                            <tbody>{(detail.items || []).map(item => <tr key={item.id}>
                                <td>{item.laboratory_name || "Não registrado"}</td><td>{item.branch || "Não registrada"}</td><td>{item.email || "Não registrado"}</td>
                                <td>{LABELS[item.status] || item.status}</td><td>{date(item.sent_at)}</td><td>{item.error_message || "—"}</td>
                            </tr>)}{!detail.items?.length && <tr><td colSpan="6">Nenhum destinatário registrado.</td></tr>}</tbody>
                        </table></div>
                    </section>}
                </div>
            </section>
        </div>, document.body
    );
}
