import { useEffect, useRef, useState } from "react";
import NotificationsFilters from "../components/NotificationsFilters";
import NotificationsTable from "../components/NotificationsTable";
import { INDUSTRY_CONTACT_BRANCHES } from "../../industry-contacts/constants/industry-contacts.constants";
import { NOTIFICATION_FILTER_DEFAULTS } from "../constants/notifications.constants";
import { listNotifications } from "../services/notifications.service";
import { useModuleState } from "../../../hooks/useModuleState";
import "../styles/notifications.css";
import "../styles/notifications-pagination.css";

const MODULE_ID = "notifications";
const PAGE_SIZE = 50;
const INITIAL_STATE = {
    filters: { ...NOTIFICATION_FILTER_DEFAULTS, page: 1 }
};
const EMPTY_PAGINATION = {
    page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1, from: 0, to: 0
};

export default function NotificationsPage() {
    const [moduleState, setModuleField] = useModuleState(MODULE_ID, INITIAL_STATE);
    const filters = moduleState.filters || INITIAL_STATE.filters;
    const requestedPage = Math.max(1, Math.floor(Number(filters.page) || 1));
    const [notifications, setNotifications] = useState([]);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refresh, setRefresh] = useState(0);
    const requestRef = useRef(0);
    const queryKey = JSON.stringify({
        ...filters, page: requestedPage, pageSize: PAGE_SIZE, paginate: true
    });

    useEffect(() => {
        let active = true;
        const requestId = ++requestRef.current;
        async function load() {
            setLoading(true);
            setError("");
            try {
                const result = await listNotifications(JSON.parse(queryKey));
                if (!active || requestId !== requestRef.current) return;
                if (!Array.isArray(result?.rows) || !result?.pagination) {
                    throw new Error(
                        "Resposta sem paginação. Atualize os arquivos do backend e reinicie o aplicativo."
                    );
                }
                setNotifications(result.rows);
                setPagination(result.pagination);
            } catch (requestError) {
                if (!active || requestId !== requestRef.current) return;
                setNotifications([]);
                setPagination(EMPTY_PAGINATION);
                setError(requestError?.message || "Não foi possível carregar as notificações.");
            } finally {
                if (active && requestId === requestRef.current) setLoading(false);
            }
        }
        load();
        return () => { active = false; };
    }, [queryKey, refresh]);

    function updateFilters(nextFilters) {
        setModuleField("filters", { ...filters, ...nextFilters, page: 1 });
    }

    function clearFilters() {
        setModuleField("filters", { ...NOTIFICATION_FILTER_DEFAULTS, page: 1 });
    }

    function changePage(nextPage) {
        if (loading || error) return;
        const page = Math.min(Math.max(nextPage, 1), pagination.totalPages);
        setModuleField("filters", { ...filters, page });
    }

    return (
        <main className="notifications-page">
            <div className="notifications-title-bar">
                <h1>Notificações</h1>
            </div>
            <NotificationsFilters
                filters={filters}
                onChange={updateFilters}
                onClear={clearFilters}
                branches={INDUSTRY_CONTACT_BRANCHES}
            />
            <section className="notifications-card" aria-busy={loading}>
                <div className="notifications-card-header">
                    <div>
                        <strong>Notificações</strong>
                        <span aria-live="polite">
                            {loading
                                ? "Carregando notificações..."
                                : error
                                    ? "Não foi possível carregar as notificações."
                                    : `Exibindo ${pagination.from}–${pagination.to} de ${pagination.total} notificações.`}
                        </span>
                    </div>
                </div>
                {error ? (
                    <div className="notifications-error" role="alert">
                        {error}
                        <button
                            type="button"
                            className="notifications-retry-button"
                            onClick={() => setRefresh((current) => current + 1)}
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : loading ? (
                    <div className="notifications-loading">Carregando notificações...</div>
                ) : (
                    <NotificationsTable notifications={notifications} />
                )}
                <nav className="notifications-pagination" aria-label="Paginação de notificações">
                    <span>
                        Página {pagination.page} de {pagination.totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={loading || Boolean(error) || pagination.page <= 1}
                        onClick={() => changePage(pagination.page - 1)}
                    >
                        Anterior
                    </button>
                    <button
                        type="button"
                        disabled={loading || Boolean(error) || pagination.page >= pagination.totalPages}
                        onClick={() => changePage(pagination.page + 1)}
                    >
                        Próxima
                    </button>
                </nav>
            </section>
        </main>
    );
}
