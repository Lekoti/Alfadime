import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/price-pending-interactions.css";

const STATUS_LABELS = {
    disabled: "Desativada",
    preparing: "Preparando cobrança",
    sending: "Enviando cobrança",
    waiting: "Aguardando próxima cobrança",
    ready: "Pronta para iniciar"
};
const RUN_LABELS = {
    pending: "Pendente", running: "Em andamento", sending: "Enviando",
    sent: "Enviado", failed: "Falhou", ignored: "Ignorado", cancelled: "Cancelado",
    completed: "Concluído", completed_with_errors: "Concluído com falhas"
};
const INTERVAL_OPTIONS = [24, 48, 72, 168];

function date(value) {
    if (!value) return "Não registrado";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString("pt-BR");
}
function remaining(ms) {
    if (!ms || ms <= Date.now()) return "Disponível agora";
    const total = Math.max(0, Math.ceil((ms - Date.now()) / 60000));
    const days = Math.floor(total / 1440);
    const hours = Math.floor((total % 1440) / 60);
    const minutes = total % 60;
    if (days) return `${days}d ${hours}h ${minutes}min`;
    if (hours) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
}
function statusText(status) {
    if (status?.status_text) return status.status_text;
    const phase = status?.phase;
    if (phase === "preparing") return "Preparando cobrança.";
    if (phase === "sending") return "Enviando cobrança.";
    return "";
}
async function invoke(channel, args) {
    if (typeof window.alfadime?.ipc?.invoke !== "function") throw new Error("A comunicação com o aplicativo não está disponível. Reinicie o Alfadime.");
    return window.alfadime.ipc.invoke(channel, args);
}

export default function PricePendingChargePanel({ open, onClose, canManage }) {
    const [status, setStatus] = useState(null);
    const [selectedInterval, setSelectedInterval] = useState(48);
    const [customInterval, setCustomInterval] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState("—");
    const [runs, setRuns] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const request = useRef(0);

    const loadStatus = useCallback(async () => {
        try {
            const result = await invoke("price-pending-automatic-charge:get-status");
            setStatus(result);
            setSelectedInterval(Number(result?.interval_hours || 48));
        } catch (failure) {
            setError(failure?.message || "Não foi possível carregar o status da cobrança.");
        }
    }, []);
    const loadHistory = useCallback(async () => {
        const token = ++request.current;
        setHistoryLoading(true); setError("");
        try {
            const result = await invoke("contacts:list-charge-runs", { limit: 100 });
            if (token !== request.current) return;
            setRuns(Array.isArray(result) ? result : []);
        } catch (failure) {
            if (token === request.current) setError(failure?.message || "Não foi possível carregar o histórico.");
        } finally {
            if (token === request.current) setHistoryLoading(false);
        }
    }, []);
    async function selectRun(run) {
        setBusy(true); setError(""); setDetail(null);
        try {
            const result = await invoke("contacts:get-charge-run", { run_id: run.id });
            if (!result?.id) throw new Error("Detalhes da cobrança não encontrados.");
            setDetail(result);
        } catch (failure) {
            setError(failure?.message || "Não foi possível carregar os detalhes.");
        } finally { setBusy(false); }
    }
    async function toggle() {
        setBusy(true); setError(""); setMessage("");
        try {
            const result = await invoke("price-pending-automatic-charge:set-enabled", !status?.enabled);
            setStatus(result);
            setMessage(result?.enabled ? "Cobrança automática ativada. Preparando cobrança." : "Cobrança automática desativada.");
            loadHistory();
        } catch (failure) {
            setError(failure?.message || "Não foi possível alterar a cobrança automática.");
        } finally { setBusy(false); }
    }
    async function saveInterval() {
        const hours = customInterval ? Number(customInterval) : Number(selectedInterval);
        setBusy(true); setError(""); setMessage("");
        try {
            const result = await invoke("price-pending-automatic-charge:set-interval", hours);
            setStatus(result);
            setSelectedInterval(Number(result?.interval_hours || hours));
            setCustomInterval("");
            setMessage(`Intervalo alterado para ${result?.interval_hours || hours} horas.`);
        } catch (failure) {
            setError(failure?.message || "Não foi possível alterar o intervalo.");
        } finally { setBusy(false); }
    }
    async function clearError() {
        setBusy(true); setError(""); setMessage("");
        try {
            const result = await invoke("price-pending-automatic-charge:clear-error");
            setStatus(result);
            setMessage("Aviso de falha anterior removido.");
        } catch (failure) {
            setError(failure?.message || "Não foi possível remover o aviso de falha.");
        } finally { setBusy(false); }
    }
    async function runNow() {
        setBusy(true); setError(""); setMessage("");
        try {
            const result = await invoke("price-pending-automatic-charge:run-now");
            if (result?.success) setMessage("Cobrança manual concluída.");
            else if (result?.reason === "busy_or_stopping") setMessage("Já existe uma cobrança em execução.");
            else if (result?.reason === "disabled_or_locked") setMessage("A cobrança está desativada ou bloqueada.");
            else setMessage(result?.error || "A cobrança manual não foi concluída. Consulte o histórico.");
            await loadStatus(); loadHistory();
        } catch (failure) {
            setError(failure?.message || "Não foi possível executar a cobrança.");
        } finally { setBusy(false); }
    }
    useEffect(() => {
        if (!open) return undefined;
        loadStatus(); loadHistory();
        const statusTimer = globalThis.setInterval(loadStatus, 30000);
        const countdownTimer = globalThis.setInterval(() => {
            setCountdown(remaining(status?.next_allowed_ms));
        }, 1000);
        function key(event) { if (event.key === "Escape") onClose(); }
        document.addEventListener("keydown", key);
        return () => {
            clearInterval(statusTimer); clearInterval(countdownTimer);
            document.removeEventListener("keydown", key);
        };
    }, [open, loadStatus, loadHistory, onClose, status?.next_allowed_ms]);
    if (!open) return null;
    const phase = status?.phase || "disabled";
    const running = phase === "preparing" || phase === "sending";
    const canSaveInterval = canManage && !busy && (customInterval || selectedInterval);
    return createPortal(
        <div className="pp-charge-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="pp-charge-dialog" role="dialog" aria-modal="true" aria-labelledby="pp-charge-title">
                <header className="pp-charge-header">
                    <h2 id="pp-charge-title">Cobrança automática</h2>
                    <button type="button" onClick={onClose}>Fechar</button>
                </header>
                <div className="pp-charge-body">
                    <section className="pp-charge-status">
                        <div>
                            <span>Status</span>
                            <strong>{STATUS_LABELS[phase]}</strong>
                            <p className="pp-charge-status-detail">{statusText(status)}</p>
                        </div>
                        <div>
                            <span>Próxima cobrança</span>
                            <strong>{status?.enabled ? countdown : "—"}</strong>
                        </div>
                        <div>
                            <span>Intervalo</span>
                            <strong>{status?.interval_hours || 48} horas</strong>
                        </div>
                        <div>
                            <span>Última conclusão</span>
                            <strong>{date(status?.last_success_at)}</strong>
                        </div>
                    </section>
                    {running && (
                        <div className="pp-charge-progress" role="status">
                            <span>{statusText(status)}</span>
                            <div className="pp-charge-progress-bar">
                                <div
                                    className="pp-charge-progress-fill"
                                    style={{ width: `${status?.progress?.total ? Math.min(100, Math.round(((status?.progress?.current || 0) / status.progress.total) * 100)) : 0}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                    {status?.last_error && (
                        <div className="pp-charge-error" role="alert">
                            <span>Última execução com falhas: {status.last_error}</span>
                            <button type="button" disabled={!canManage || busy} onClick={clearError}>Limpar aviso</button>
                        </div>
                    )}
                    {message && <div className="pp-charge-success" role="status">{message}</div>}
                    {error && <div className="pp-charge-error" role="alert">{error}</div>}
                    <section className="pp-charge-actions">
                        <button type="button" disabled={!canManage || busy || running} onClick={toggle}>
                            {status?.enabled ? "Desativar cobrança automática" : "Ativar cobrança automática"}
                        </button>
                        <button type="button" disabled={!canManage || busy || running} onClick={runNow}>Executar agora</button>
                        <button type="button" disabled={busy} onClick={() => { loadStatus(); loadHistory(); }}>Atualizar</button>
                    </section>
                    <section className="pp-charge-interval">
                        <label htmlFor="pp-charge-interval-select">Intervalo entre cobranças</label>
                        <select
                            id="pp-charge-interval-select"
                            value={customInterval ? "" : selectedInterval}
                            disabled={!canManage || busy}
                            onChange={(event) => { setSelectedInterval(Number(event.target.value)); setCustomInterval(""); }}
                        >
                            {INTERVAL_OPTIONS.map(option => <option key={option} value={option}>{option} horas</option>)}
                            <option value="">Personalizado</option>
                        </select>
                        <input
                            type="number"
                            min="1"
                            max="8760"
                            placeholder="Horas personalizadas"
                            value={customInterval}
                            disabled={!canManage || busy}
                            onChange={(event) => setCustomInterval(event.target.value)}
                        />
                        <button type="button" disabled={!canSaveInterval} onClick={saveInterval}>Salvar intervalo</button>
                    </section>
                    <section className="pp-charge-history">
                        <h3>Histórico de cobranças</h3>
                        {historyLoading ? <p role="status">Carregando cobranças...</p> : (
                            <div className="pp-charge-scroll">
                                <table>
                                    <thead><tr><th>Data/hora</th><th>Cobrança</th><th>Usuário</th><th>Origem</th><th>Status</th><th>Enviados</th><th>Falhas</th><th>Detalhes</th></tr></thead>
                                    <tbody>
                                        {runs.map(run => (
                                            <tr key={run.id}>
                                                <td>{date(run.started_at || run.created_at)}</td>
                                                <td>{run.favorite_name || run.charge_type || "Não registrado"}</td>
                                                <td>{run.triggered_by_name || run.created_by_name || run.username || "Não registrado"}</td>
                                                <td>{run.source || run.trigger_type || "Não registrada"}</td>
                                                <td>{RUN_LABELS[run.status] || run.status}</td>
                                                <td>{run.sent ?? 0}</td>
                                                <td>{run.failed ?? 0}</td>
                                                <td><button type="button" className="pp-charge-detail-button" disabled={busy} onClick={() => selectRun(run)}>Detalhes</button></td>
                                            </tr>
                                        ))}
                                        {!runs.length && <tr><td colSpan="8">Nenhuma cobrança registrada.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {detail && (
                            <section className="pp-charge-detail">
                                <h4>{detail.favorite_name || "Detalhes da cobrança"}</h4>
                                <p>Início: {date(detail.started_at)} · Fim: {date(detail.finished_at)}</p>
                                <p>Status: {RUN_LABELS[detail.status] || detail.status} · Enviados: {detail.sent ?? 0} · Falhas: {detail.failed ?? 0}</p>
                                {detail.error_message && <div className="pp-charge-error">{detail.error_message}</div>}
                                <div className="pp-charge-scroll">
                                    <table>
                                        <thead><tr><th>Indústria</th><th>Filial</th><th>E-mail</th><th>Status</th><th>Enviado em</th><th>Motivo da falha</th></tr></thead>
                                        <tbody>
                                            {(detail.items || []).map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.laboratory_name || "Não registrado"}</td>
                                                    <td>{item.branch || "Não registrada"}</td>
                                                    <td>{item.email || "Não registrado"}</td>
                                                    <td>{RUN_LABELS[item.status] || item.status}</td>
                                                    <td>{date(item.sent_at)}</td>
                                                    <td>{item.error_message || "—"}</td>
                                                </tr>
                                            ))}
                                            {!(detail.items || []).length && <tr><td colSpan="6">Nenhum destinatário registrado nesta cobrança.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                    </section>
                </div>
            </section>
        </div>, document.body
    );
}
