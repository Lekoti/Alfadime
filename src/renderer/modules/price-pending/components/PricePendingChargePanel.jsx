import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/price-pending-interactions.css";

const STATUS_LABELS = {
    disabled: "Desativada", cancelling: "Cancelamento solicitado",
    interrupted: "Execução pendente de revisão", external: "Reserva ativa em outra instância",
    preparing: "Preparando cobrança", sending: "Enviando cobrança",
    waiting: "Aguardando próxima cobrança", ready: "Pronta para iniciar"
};
const RUN_LABELS = {
    pending: "Pendente", running: "Em andamento", sending: "Resultado pendente ou incerto",
    sent: "Enviado", failed: "Falhou", ignored: "Ignorado", cancelled: "Cancelado",
    interrupted: "Interrompido — revisar", completed: "Concluído", completed_with_errors: "Concluído com falhas"
};
const INTERVAL_OPTIONS = [24, 48, 72, 168];
function date(value) {
    if (!value) return "Não registrado";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString("pt-BR");
}
function remaining(ms) {
    if (!ms || ms <= Date.now()) return "Disponível na próxima verificação";
    const total = Math.max(0, Math.ceil((ms - Date.now()) / 60000));
    const days = Math.floor(total / 1440);
    const hours = Math.floor((total % 1440) / 60);
    const minutes = total % 60;
    return days ? `${days}d ${hours}h ${minutes}min` : hours ? `${hours}h ${minutes}min` : `${minutes}min`;
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
    const [manualRunning, setManualRunning] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState("—");
    const [runs, setRuns] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const intervalDirty = useRef(false);
    const onCloseRef = useRef(onClose);
    const statusRef = useRef(null);
    const detailRef = useRef(null);
    const request = useRef(0);
    const detailRequest = useRef(0);
    const statusVersion = useRef(0);
    const pollInFlight = useRef(false);
    const manualRef = useRef(false);
    onCloseRef.current = onClose;
    detailRef.current = detail;

    const lastStatusJson = useRef("");
    const acceptStatus = useCallback(result => {
        const serialized = JSON.stringify(result);
        if (serialized === lastStatusJson.current) return;
        lastStatusJson.current = serialized;
        statusRef.current = result;
        setStatus(result);
        if (!intervalDirty.current) setSelectedInterval(Number(result?.interval_hours || 48));
    }, []);
    const loadStatus = useCallback(async () => {
        if (pollInFlight.current) return;
        pollInFlight.current = true;
        const version = statusVersion.current;
        try {
            const result = await invoke("price-pending-automatic-charge:get-status");
            if (version === statusVersion.current) acceptStatus(result);
        } catch (failure) {
            if (version === statusVersion.current) setError(failure?.message || "Não foi possível carregar o status da cobrança.");
        } finally { pollInFlight.current = false; }
    }, [acceptStatus]);
    const loadHistory = useCallback(async () => {
        const token = ++request.current;
        setHistoryLoading(true);
        try {
            const result = await invoke("contacts:list-charge-runs", { limit: 100 });
            if (token === request.current) setRuns(Array.isArray(result) ? result : []);
        } catch (failure) {
            if (token === request.current) setError(failure?.message || "Não foi possível carregar o histórico.");
        } finally {
            if (token === request.current) setHistoryLoading(false);
        }
    }, []);
    const loadDetail = useCallback(async runId => {
        const token = ++detailRequest.current;
        const result = await invoke("contacts:get-charge-run", { run_id: runId });
        if (!result?.id) throw new Error("Detalhes da cobrança não encontrados.");
        if (token === detailRequest.current) setDetail(result);
    }, []);
    async function selectRun(run) {
        setError("");
        try { await loadDetail(run.id); }
        catch (failure) { setError(failure?.message || "Não foi possível carregar os detalhes."); }
    }
    async function toggle() {
        if (busy) return;
        setBusy(true); setError(""); setMessage("");
        statusVersion.current += 1;
        try {
            const result = await invoke("price-pending-automatic-charge:set-enabled", !statusRef.current?.enabled);
            statusVersion.current += 1;
            acceptStatus(result);
            setMessage(result?.enabled
                ? result.phase === "waiting" ? "Automação ativada. Aguardando o intervalo configurado." : "Automação ativada. Consulte o status acima."
                : result.phase === "cancelling" ? "Agendamento desativado. Cancelamento solicitado para a execução local." : "Agendamento desativado. Confira se há reserva ou execução em outra instância.");
            loadHistory();
        } catch (failure) { setError(failure?.message || "Não foi possível alterar a cobrança automática."); }
        finally { setBusy(false); }
    }
    async function saveInterval() {
        const hours = customInterval ? Number(customInterval) : Number(selectedInterval);
        if (!Number.isInteger(hours) || hours < 1 || hours > 8760) {
            setError("Informe um intervalo inteiro entre 1 e 8.760 horas.");
            return;
        }
        setBusy(true); setError(""); setMessage("");
        statusVersion.current += 1;
        try {
            const result = await invoke("price-pending-automatic-charge:set-interval", hours);
            statusVersion.current += 1;
            intervalDirty.current = false;
            setCustomInterval("");
            acceptStatus(result);
            setMessage(`Intervalo alterado para ${result?.interval_hours || hours} horas.`);
        } catch (failure) { setError(failure?.message || "Não foi possível alterar o intervalo."); }
        finally { setBusy(false); }
    }
    async function clearError() {
        setBusy(true); setError(""); setMessage("");
        statusVersion.current += 1;
        try {
            const result = await invoke("price-pending-automatic-charge:clear-error");
            statusVersion.current += 1;
            acceptStatus(result);
            setMessage("Aviso de falha anterior removido. Reservas de execução foram preservadas.");
        } catch (failure) { setError(failure?.message || "Não foi possível remover o aviso de falha."); }
        finally { setBusy(false); }
    }
    async function runNow() {
        if (manualRef.current) return;
        manualRef.current = true;
        setManualRunning(true); setError(""); setMessage("");
        try {
            const result = await invoke("price-pending-automatic-charge:run-now");
            if (result?.success) setMessage("Cobrança manual concluída.");
            else if (result?.cancelled) setMessage("Cancelamento processado. Confira os envios já realizados no histórico.");
            else setError(result?.error || (result?.reason ? `Execução não iniciada: ${result.reason}.` : "Cobrança não concluída. Consulte o histórico."));
        } catch (failure) { setError(failure?.message || "Não foi possível executar a cobrança."); }
        finally {
            manualRef.current = false;
            setManualRunning(false);
            await loadStatus();
            loadHistory();
        }
    }
    useEffect(() => {
        if (!open) return undefined;
        loadStatus(); loadHistory();
        const timer = globalThis.setInterval(loadStatus, 1000);
        const countdownTimer = globalThis.setInterval(() => setCountdown(remaining(statusRef.current?.next_allowed_ms)), 1000);
        function key(event) { if (event.key === "Escape") onCloseRef.current(); }
        document.addEventListener("keydown", key);
        return () => {
            clearInterval(timer); clearInterval(countdownTimer);
            statusVersion.current += 1; request.current += 1; detailRequest.current += 1;
            document.removeEventListener("keydown", key);
        };
    }, [open, loadStatus, loadHistory, loadDetail]);
    useEffect(() => {
        if (open) loadHistory();
    }, [open, status?.phase, loadHistory]);
    if (!open) return null;
    const phase = status?.phase || "disabled";
    const running = ["preparing", "sending", "cancelling"].includes(phase);
    const progress = status?.progress || {};
    const preparation = progress.preparation || {};
    const preparationPercent = Math.min(100, Math.max(0, Number(preparation.percent || 0)));
    const percent = progress.total ? Math.min(100, Math.round(Number(progress.current || 0) / progress.total * 100)) : 0;
    const showProgress = running || Boolean(progress.finishedAt && progress.total);
    const preparing = phase === "preparing";
    const canSaveInterval = canManage && !busy && !running && (customInterval || selectedInterval);
    return createPortal(
        <div className="pp-charge-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="pp-charge-dialog" role="dialog" aria-modal="true" aria-labelledby="pp-charge-title">
                <header className="pp-charge-header">
                    <h2 id="pp-charge-title">Cobrança automática</h2>
                    <button type="button" onClick={onClose}>Fechar</button>
                </header>
                <div className="pp-charge-body">
                    <section className="pp-charge-status">
                        <div><span>Status</span><strong>{STATUS_LABELS[phase] || phase}</strong><p className="pp-charge-status-detail">{status?.status_text || ""}</p></div>
                        <div><span>Próxima cobrança</span><strong>{status?.enabled ? countdown : "—"}</strong></div>
                        <div><span>Intervalo</span><strong>{status?.interval_hours || 48} horas</strong></div>
                        <div><span>Última conclusão</span><strong>{date(status?.last_success_at)}</strong></div>
                    </section>
                    {showProgress && (
                        <div className="pp-charge-progress" role="status">
                            <span>{running ? status?.status_text : "Última execução nesta instância"}</span>
                            {(!preparing || (preparation.total > 0 && preparation.stage !== "loading")) && (
                                <div className="pp-charge-progress-bar" role="progressbar" aria-label={preparing ? "Etapa da preparação" : "Destinatários processados"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={preparing ? preparationPercent : percent}>
                                    <div className="pp-charge-progress-fill" style={{ width: `${preparing ? preparationPercent : percent}%` }}></div>
                                </div>
                            )}
                            {preparing ? (
                                <p className="pp-charge-progress-detail">{preparation.total > 0 && preparation.stage !== "loading"
                                    ? `${preparationPercent}% da etapa — ${preparation.message || "em andamento"} (${preparation.current || 0}/${preparation.total})`
                                    : "Carregando dados. Total ainda não disponível; nenhum percentual estimado."}</p>
                            ) : (
                                <p className="pp-charge-progress-detail">{percent}% processado — {progress.current || 0} de {progress.total || 0} destinatários; {progress.sent || 0} enviados; {progress.failed || 0} falhas; {progress.uncertain || 0} incertos{progress.currentLaboratory ? ` — ${progress.currentLaboratory}` : ""}</p>
                            )}
                        </div>
                    )}
                    {status?.running && !running && <div className="pp-charge-error" role="alert">Existe uma reserva de execução. Pode pertencer a outra instância ou exigir revisão. Não será liberada automaticamente; confira SMTP e histórico antes de reenviar.</div>}
                    {phase === "cancelling" && <div role="status">Cancelamento solicitado. A operação de rede atual pode precisar terminar antes da parada.</div>}
                    {status?.last_error && <div className="pp-charge-error" role="alert"><span>Última execução com falhas: {status.last_error}</span><button type="button" disabled={!canManage || busy} onClick={clearError}>Limpar aviso</button></div>}
                    {message && <div className="pp-charge-success" role="status">{message}</div>}
                    {error && <div className="pp-charge-error" role="alert">{error}</div>}
                    <section className="pp-charge-actions">
                        <button type="button" disabled={!canManage || busy || !status || (!status.enabled && (running || status.running || manualRunning))} onClick={toggle}>{status?.enabled ? "Desativar cobrança automática" : "Ativar cobrança automática"}</button>
                        <button type="button" disabled={!canManage || busy || manualRunning || running || status?.running || !status?.enabled} onClick={runNow}>Executar agora</button>
                        <button type="button" disabled={busy} onClick={() => { loadStatus(); loadHistory(); }}>Atualizar</button>
                    </section>
                    <section className="pp-charge-interval">
                        <label htmlFor="pp-charge-interval-select">Intervalo entre cobranças</label>
                        <select id="pp-charge-interval-select" value={customInterval || !INTERVAL_OPTIONS.includes(selectedInterval) ? "" : selectedInterval} disabled={!canManage || busy || running} onChange={event => { intervalDirty.current = true; setSelectedInterval(event.target.value ? Number(event.target.value) : 0); setCustomInterval(""); }}>
                            {INTERVAL_OPTIONS.map(option => <option key={option} value={option}>{option} horas</option>)}
                            <option value="">Personalizado</option>
                        </select>
                        <input type="number" min="1" max="8760" step="1" placeholder="Horas personalizadas" value={customInterval} disabled={!canManage || busy || running} onChange={event => { intervalDirty.current = true; setCustomInterval(event.target.value); }} />
                        <button type="button" disabled={!canSaveInterval} onClick={saveInterval}>Salvar intervalo</button>
                    </section>
                    <section className="pp-charge-history">
                        <h3>Histórico de cobranças</h3>
                        {historyLoading && !runs.length ? <p role="status">Carregando cobranças...</p> : (
                            <div className="pp-charge-scroll"><table>
                                <thead><tr><th>Data/hora</th><th>Cobrança</th><th>Usuário</th><th>Origem</th><th>Status</th><th>Enviados</th><th>Falhas</th><th>Detalhes</th></tr></thead>
                                <tbody>{runs.map(run => <tr key={run.id}>
                                    <td>{date(run.started_at || run.created_at)}</td><td>{run.favorite_name || run.charge_type || "Não registrado"}</td>
                                    <td>{run.triggered_by_name || run.created_by_name || run.username || "Não registrado"}</td><td>{run.source || run.trigger_type || "Não registrada"}</td>
                                    <td>{RUN_LABELS[run.status] || run.status}</td><td>{run.sent ?? 0}</td><td>{run.failed ?? 0}</td>
                                    <td><button type="button" className="pp-charge-detail-button" onClick={() => selectRun(run)}>Detalhes</button></td>
                                </tr>)}{!runs.length && <tr><td colSpan="8">Nenhuma cobrança registrada.</td></tr>}</tbody>
                            </table></div>
                        )}
                        {detail && <section className="pp-charge-detail">
                            <h4>{detail.favorite_name || "Detalhes da cobrança"}</h4>
                            <p>Início: {date(detail.started_at)} · Fim: {date(detail.finished_at)}</p>
                            <p>Status: {RUN_LABELS[detail.status] || detail.status} · Enviados: {detail.sent ?? 0} · Falhas: {detail.failed ?? 0}{detail.cancelRequested ? " · Cancelamento solicitado" : ""}</p>
                            {detail.error_message && <div className="pp-charge-error">{detail.error_message}</div>}
                            <div className="pp-charge-scroll"><table>
                                <thead><tr><th>Indústria</th><th>Filial</th><th>E-mail</th><th>Status</th><th>Enviado em</th><th>Motivo da falha</th></tr></thead>
                                <tbody>{(detail.items || []).map(item => <tr key={item.id}>
                                    <td>{item.laboratory_name || "Não registrado"}</td><td>{item.branch || "Não registrada"}</td><td>{item.email || "Não registrado"}</td>
                                    <td>{RUN_LABELS[item.status] || item.status}</td><td>{date(item.sent_at)}</td><td>{item.error_message || "—"}</td>
                                </tr>)}{!(detail.items || []).length && <tr><td colSpan="6">Nenhum destinatário registrado nesta cobrança.</td></tr>}</tbody>
                            </table></div>
                        </section>}
                    </section>
                </div>
            </section>
        </div>, document.body
    );
}
