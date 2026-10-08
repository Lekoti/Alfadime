import { useState, useEffect, useCallback } from "react";
import {
    listPurchaseSuggestions,
    getPurchaseFilterOptions,
    syncPurchasesCurveExcel,
    subscribePurchasesChanged
} from "../services/purchases.service";


const EMPTY_PAGINATION = {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
    offset: 0
};


const EMPTY_SUMMARY = {
    products: 0,
    suggestedQuantity: 0,
    suggestedValue: 0,
    criticalProducts: 0
};


export function usePurchases(filters = {}) {
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState(EMPTY_SUMMARY);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filterOptions, setFilterOptions] = useState({
        company: [],
        laboratoryname: [],
        effectivecurve: []
    });
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);

    const loadSuggestions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await listPurchaseSuggestions(filters);

            setRows(Array.isArray(result?.rows) ? result.rows : []);
            setSummary(result?.summary || EMPTY_SUMMARY);
            setPagination(result?.pagination || EMPTY_PAGINATION);
        } catch (loadError) {
            console.error("Erro ao carregar sugestoes de compras:", loadError);
            setRows([]);
            setSummary(EMPTY_SUMMARY);
            setPagination(EMPTY_PAGINATION);
            setError(loadError.message || "Nao foi possivel carregar as sugestoes.");
        } finally {
            setLoading(false);
        }
    }, [
        filters.search,
        filters.company,
        filters.laboratoryname,
        filters.effectivecurve,
        filters.status,
        filters.page,
        filters.pageSize
    ]);

    const loadFilterOptions = useCallback(async () => {
        try {
            const [company, laboratoryname, effectivecurve] =
                await Promise.all([
                    getPurchaseFilterOptions("company"),
                    getPurchaseFilterOptions("laboratoryname"),
                    getPurchaseFilterOptions("effectivecurve")
                ]);

            setFilterOptions({
                company: Array.isArray(company) ? company : [],
                laboratoryname: Array.isArray(laboratoryname)
                    ? laboratoryname
                    : [],
                effectivecurve: Array.isArray(effectivecurve)
                    ? effectivecurve
                    : []
            });
        } catch (optionsError) {
            console.warn(
                "Erro ao carregar opcoes dos filtros de Compras:",
                optionsError
            );
        }
    }, []);

    const synchronize = useCallback(async () => {
        setSyncing(true);
        setError(null);

        try {
            const result = await syncPurchasesCurveExcel();
            setLastSync(new Date().toISOString());
            await loadSuggestions();
            return result;
        } catch (syncError) {
            console.error("Erro ao sincronizar Curva Compras:", syncError);
            setError(
                syncError.message || "Nao foi possivel sincronizar a Curva Compras."
            );
            throw syncError;
        } finally {
            setSyncing(false);
        }
    }, [loadSuggestions]);

    useEffect(() => {
        loadSuggestions();
    }, [loadSuggestions]);

    useEffect(() => {
        loadFilterOptions();
    }, [loadFilterOptions]);

    useEffect(() => {
        const unsubscribe = subscribePurchasesChanged(loadSuggestions);

        return () => {
            if (typeof unsubscribe === "function") {
                unsubscribe();
            }
        };
    }, [loadSuggestions]);

    return {
        rows,
        summary,
        pagination,
        loading,
        error,
        filterOptions,
        syncing,
        lastSync,
        synchronize,
        loadSuggestions
    };
}