import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";

import NotificationsFilters from "../components/NotificationsFilters";
import NotificationsTable from "../components/NotificationsTable";
import {
    INDUSTRY_CONTACT_BRANCHES
} from "../../industry-contacts/constants/industry-contacts.constants";
import {
    NOTIFICATION_FILTER_DEFAULTS
} from "../constants/notifications.constants";
import {
    listNotifications
} from "../services/notifications.service";
import "../styles/notifications.css";

const NOTIFICATIONS_REFRESH_INTERVAL =
    15000;

function NotificationsPage() {
    const [
        filters,
        setFilters
    ] = useState(
        NOTIFICATION_FILTER_DEFAULTS
    );

    const [
        notifications,
        setNotifications
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const filtersRef =
        useRef(
            NOTIFICATION_FILTER_DEFAULTS
        );

    const loadingRef =
        useRef(false);

    const loadNotifications =
        useCallback(
            async (
                currentFilters =
                    filtersRef.current,
                showLoading = true
            ) => {
                if (
                    loadingRef.current
                ) {
                    return;
                }

                loadingRef.current =
                    true;

                if (
                    showLoading
                ) {
                    setLoading(true);
                }

                setError("");

                try {
                    const result =
                        await listNotifications(
                            currentFilters
                        );

                    setNotifications(
                        Array.isArray(
                            result
                        )
                            ? result
                            : result?.data ||
                                  []
                    );
                } catch (
                    requestError
                ) {
                    setError(
                        requestError?.message ||
                            "Não foi possível carregar as notificações."
                    );
                } finally {
                    loadingRef.current =
                        false;

                    if (
                        showLoading
                    ) {
                        setLoading(false);
                    }
                }
            },
            []
        );

    useEffect(() => {
        filtersRef.current =
            filters;
    }, [filters]);

    useEffect(() => {
        loadNotifications();

        const refreshTimer =
            window.setInterval(
                () => {
                    loadNotifications(
                        filtersRef.current,
                        false
                    );
                },
                NOTIFICATIONS_REFRESH_INTERVAL
            );

        return () => {
            window.clearInterval(
                refreshTimer
            );
        };
    }, [
        loadNotifications
    ]);

    function handleFiltersChange(
        nextFilters
    ) {
        filtersRef.current =
            nextFilters;

        setFilters(
            nextFilters
        );

        loadNotifications(
            nextFilters
        );
    }

    function handleClearFilters() {
        filtersRef.current =
            NOTIFICATION_FILTER_DEFAULTS;

        setFilters(
            NOTIFICATION_FILTER_DEFAULTS
        );

        loadNotifications(
            NOTIFICATION_FILTER_DEFAULTS
        );
    }

    return (
        <main className="notifications-page">
            <header className="notifications-header">
                <h1>
                    Notificações
                </h1>
            </header>

            <NotificationsFilters
                filters={filters}
                onChange={
                    handleFiltersChange
                }
                onClear={
                    handleClearFilters
                }
                branches={
                    INDUSTRY_CONTACT_BRANCHES
                }
            />

            <section className="notifications-list-panel">
                <div className="notifications-list-header">
                    <div>
                        <h2>
                            Todas as notificações
                        </h2>

                        <span>
                            {loading
                                ? "Carregando notificações..."
                                : `${notifications.length} notificação(ões) encontrada(s).`}
                        </span>
                    </div>
                </div>

                {error ? (
                    <div className="notifications-feedback notifications-feedback-error">
                        {error}
                    </div>
                ) : null}

                {!loading &&
                !error &&
                notifications.length === 0 ? (
                    <div className="notifications-feedback">
                        Nenhuma notificação encontrada.
                    </div>
                ) : null}

                {!loading &&
                !error &&
                notifications.length > 0 ? (
                    <NotificationsTable
                        notifications={
                            notifications
                        }
                    />
                ) : null}
            </section>
        </main>
    );
}

export default NotificationsPage;