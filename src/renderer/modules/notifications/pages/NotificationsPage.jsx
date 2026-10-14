import { useCallback, useEffect, useRef, useState } from "react";
import NotificationsFilters from "../components/NotificationsFilters";
import NotificationsTable from "../components/NotificationsTable";
import { INDUSTRY_CONTACT_BRANCHES } from "../../industry-contacts/constants/industry-contacts.constants";
import { NOTIFICATION_FILTER_DEFAULTS } from "../constants/notifications.constants";
import { listNotifications } from "../services/notifications.service";
import { useModuleState } from "../../../hooks/useModuleState";
import "../styles/notifications.css";


const MODULE_ID = "notifications";


const INITIAL_STATE = {
    filters: NOTIFICATION_FILTER_DEFAULTS
};


export default function NotificationsPage() {
    const [
        moduleState,
        setModuleField
    ] = useModuleState(MODULE_ID, INITIAL_STATE);


    const filters = moduleState.filters || NOTIFICATION_FILTER_DEFAULTS;


    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const filtersRef = useRef(filters);
    const loadingRef = useRef(false);


    const loadNotifications = useCallback(async (
        currentFilters = filtersRef.current,
        showLoading = true
    ) => {
        if (loadingRef.current) {
            return;
        }


        loadingRef.current = true;

        if (showLoading) {
            setLoading(true);
        }


        setError("");

        try {
            const result = await listNotifications(currentFilters);

            setNotifications(
                Array.isArray(result)
                    ? result
                    : result?.data || []
            );
        } catch (requestError) {
            setError(
                requestError?.message ||
                "Não foi possível carregar as notificações."
            );
        } finally {
            loadingRef.current = false;

            if (showLoading) {
                setLoading(false);
            }
        }
    }, []);


    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);


    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);


    function updateFilters(nextFilters) {
        const newFilters = {
            ...filters,
            ...nextFilters
        };

        filtersRef.current = newFilters;
        setModuleField("filters", newFilters);
        loadNotifications(newFilters);
    }


    function clearFilters() {
        filtersRef.current = NOTIFICATION_FILTER_DEFAULTS;
        setModuleField("filters", NOTIFICATION_FILTER_DEFAULTS);
        loadNotifications(NOTIFICATION_FILTER_DEFAULTS);
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


            <section className="notifications-card">
                <div className="notifications-card-header">
                    <div>
                        <strong>Notificações</strong>

                        <span>
                            {loading
                                ? "Carregando notificações..."
                                : `${notifications.length} notificação(ões) encontrada(s).`}
                        </span>
                    </div>
                </div>


                {error && (
                    <div className="notifications-error">
                        <strong>Erro:</strong> {error}
                    </div>
                )}


                {loading ? (
                    <div className="notifications-loading">
                        Carregando notificações...
                    </div>
                ) : (
                    <NotificationsTable
                        notifications={notifications}
                    />
                )}
            </section>
        </main>
    );
}
