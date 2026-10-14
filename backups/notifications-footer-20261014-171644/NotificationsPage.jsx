import { useEffect, useRef, useState } from "react";
import NotificationsFilters from "../components/NotificationsFilters";
import NotificationsTable from "../components/NotificationsTable";
import { INDUSTRY_CONTACT_BRANCHES } from "../../industry-contacts/constants/industry-contacts.constants";
import { NOTIFICATION_FILTER_DEFAULTS } from "../constants/notifications.constants";
import { listNotifications } from "../services/notifications.service";
import { useModuleState } from "../../../hooks/useModuleState";
import "../styles/notifications.css";
import "../styles/notifications-pagination.css";
import "../styles/notifications-refresh.css";

const INITIAL_STATE = { filters: { ...NOTIFICATION_FILTER_DEFAULTS, page: 1 } };
const EMPTY_PAGINATION = {
    page: 1, pageSize: 50, total: 0, totalPages: 1, from: 0, to: 0
};

function formatTimestamp(value) {
    if (!value) return "Ainda não realizada";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Data indisponível" : date.toLocaleString("pt-BR");
}

export default function NotificationsPage() {
    const [moduleState, setModuleField] = useModuleState("notifications", INITIAL_STATE);
    const filters = moduleState.filters || INITIAL_STATE.filters;
    const [notifications, setNotifications] = useState([]);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [lastSuccessAt, setLastSuccessAt] = useState(null);
    const [statusLoaded, setStatusLoaded] = useState(false);
    const [error, setError] = useState("");
    const [updateError, setUpdateError] = useState("");
    const [reload, setReload] = useState(0);
    const requestRef = useRef(0);
    const mountedRef = useRef(false);
    const updateRef = useRef(false);
    const queryKey = JSON.stringify({
        ...filters, page: Math.max(1, Math.floor(Number(filters.page) || 1)),
        pageSize: 50, paginate: true
    });

    useEffect(() => {
        mountedRef.current = true;
        let active = true;
        async function loadStatus() {
            try {
                const api = window.alfadime?.notifications;
                if (!api?.refreshStatus) throw new Error("API de atualização não instalada. Reinicie o aplicativo.");
                const status = await api.refreshStatus();
                if (!active) return;
                setLastSuccessAt(status.lastSuccessAt);
                setUpdating(Boolean(status.running));
                setStatusLoaded(true);
                if (status.running) {
                    updateRef.current = true;
                    try {
                        const result = await api.refresh();
                        if (active) {
                            setLastSuccessAt(result.lastSuccessAt);
                            setReload((value) => value + 1);
                        }
                    } finally {
                        updateRef.current = false;
                        if (active) setUpdating(false);
                    }
                }
            } catch (statusError) {
                if (active) {
                    setUpdateError(statusError.message);
                    setStatusLoaded(true);
                    setUpdating(false);
                }
            }
        }
        loadStatus();
        return () => { active = false; mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (updating) return;
        let active = true;
        const id = ++requestRef.current;
        async function load() {
            setLoading(true);
            setError("");
            try {
                const result = await listNotifications(JSON.parse(queryKey));
                if (!active || id !== requestRef.current) return;
                if (!Array.isArray(result?.rows) || !result?.pagination) {
                    throw new Error("Resposta sem paginação. Confira o backend atualizado.");
                }
                setNotifications(result.rows);
                setPagination(result.pagination);
            } catch (requestError) {
                if (active && id === requestRef.current) setError(requestError.message);
            } finally {
                if (active && id === requestRef.current) setLoading(false);
            }
        }
        load();
        return () => { active = false; };
    }, [queryKey, reload, updating]);

    async function handleRefresh() {
        if (updateRef.current) return;
        updateRef.current = true;
        setUpdating(true);
        setUpdateError("");
        try {
            const api = window.alfadime?.notifications;
            if (!api?.refresh) throw new Error("API de atualização não instalada.");
            const result = await api.refresh();
            if (!mountedRef.current) return;
            setLastSuccessAt(result.lastSuccessAt);
            setReload((value) => value + 1);
        } catch (refreshError) {
            if (mountedRef.current) setUpdateError(refreshError.message);
        } finally {
            updateRef.current = false;
            if (mountedRef.current) setUpdating(false);
        }
    }

    function updateFilters(nextFilters) {
        setModuleField("filters", { ...filters, ...nextFilters, page: 1 });
    }
    function clearFilters() {
        setModuleField("filters", { ...NOTIFICATION_FILTER_DEFAULTS, page: 1 });
    }
    function changePage(page) {
        if (loading || updating || error) return;
        setModuleField("filters", {
            ...filters, page: Math.min(Math.max(page, 1), pagination.totalPages)
        });
    }

    return (
        <main className="notifications-page">
            <div className="notifications-title-bar">
                <h1>Notificações</h1>
                <div className="notifications-refresh-controls">
                    <button type="button" className="notifications-refresh-button"
                        disabled={updating || !statusLoaded} onClick={handleRefresh}>
                        {updating ? "Atualizando…" : "Atualizar notificações"}
                    </button>
                    <span className="notifications-last-refresh" aria-live="polite">
                        Última atualização: {statusLoaded ? formatTimestamp(lastSuccessAt) : "Carregando…"}
                    </span>
                </div>
            </div>
            <NotificationsFilters filters={filters} onChange={updateFilters}
                onClear={clearFilters} branches={INDUSTRY_CONTACT_BRANCHES} />
            {updateError && <div className="notifications-error" role="alert">{updateError}</div>}
            {updating && <div className="notifications-refresh-feedback" role="status">
                Conferindo Contatos, Preços e Pendências e Auditoria de Produtos…
            </div>}
            <section className="notifications-card" aria-busy={loading || updating}>
                <div className="notifications-card-header"><div>
                    <strong>Notificações</strong>
                    <span>{loading ? "Carregando notificações…" :
                        `Exibindo ${pagination.from}–${pagination.to} de ${pagination.total} notificações.`}</span>
                </div></div>
                {error ? <div className="notifications-error" role="alert">
                    {error}
                    <button type="button" className="notifications-retry-button"
                        disabled={updating} onClick={() => setReload((value) => value + 1)}>
                        Tentar novamente
                    </button>
                </div> : loading ? <div className="notifications-loading">Carregando notificações…</div> :
                    <NotificationsTable notifications={notifications} />}
                <nav className="notifications-pagination" aria-label="Paginação de notificações">
                    <span>Página {pagination.page} de {pagination.totalPages}</span>
                    <button type="button" disabled={loading || updating || Boolean(error) || pagination.page <= 1}
                        onClick={() => changePage(pagination.page - 1)}>Anterior</button>
                    <button type="button" disabled={loading || updating || Boolean(error) || pagination.page >= pagination.totalPages}
                        onClick={() => changePage(pagination.page + 1)}>Próxima</button>
                </nav>
            </section>
        </main>
    );
}
