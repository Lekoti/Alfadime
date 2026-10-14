import { useState, useEffect, useCallback, useRef } from "react";
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




const SEARCH_DELAY_MS = 300;




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



    const filtersRef = useRef(filters);
    const requestIdRef = useRef(0);
    const searchTimerRef = useRef(null);
    const previousFiltersRef = useRef(null);
    const mountedRef = useRef(true);



    filtersRef.current = filters;



    const loadSuggestions = useCallback(async (filtersToLoad = filtersRef.current) => {
        const requestId = requestIdRef.current + 1;



        requestIdRef.current = requestId;



        setLoading(true);
        setError(null);



        try {
            const result = await listPurchaseSuggestions(filtersToLoad);



            if (
                !mountedRef.current ||
                requestId !== requestIdRef.current
            ) {
                return;
            }



            setRows(Array.isArray(result?.rows) ? result.rows : []);
            setSummary(result?.summary || EMPTY_SUMMARY);
            setPagination(result?.pagination || EMPTY_PAGINATION);
        } catch (loadError) {
            console.error("Erro ao carregar sugestoes de compras:", loadError);



            if (
                !mountedRef.current ||
                requestId !== requestIdRef.current
            ) {
                return;
            }



            setRows([]);
            setSummary(EMPTY_SUMMARY);
            setPagination(EMPTY_PAGINATION);
            setError(loadError.message || "Nao foi possivel carregar as sugestoes.");
        } finally {
            if (
                mountedRef.current &&
                requestId === requestIdRef.current
            ) {
                setLoading(false);
            }
        }
    }, []);



    const loadFilterOptions = useCallback(async () => {
        try {
            const [company, laboratoryname, effectivecurve] =
                await Promise.all([
                    getPurchaseFilterOptions("company"),
                    getPurchaseFilterOptions("laboratoryname"),
                    getPurchaseFilterOptions("effectivecurve")
                ]);



            if (!mountedRef.current) {
                return;
            }



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
            await loadSuggestions(filtersRef.current);
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
        const previousFilters = previousFiltersRef.current;



        if (!previousFilters) {
            previousFiltersRef.current = filters;



            loadSuggestions(filters);



            return undefined;
        }



        const filtersChanged =
            JSON.stringify(previousFilters) !==
            JSON.stringify(filters);



        if (!filtersChanged) {
            return undefined;
        }



        previousFiltersRef.current = filters;



        const searchChanged =
            previousFilters.search !== filters.search;



        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
            searchTimerRef.current = null;
        }



        if (searchChanged) {
            const scheduledSearch = filters.search;



            searchTimerRef.current = setTimeout(() => {
                searchTimerRef.current = null;



                if (
                    !mountedRef.current ||
                    filtersRef.current.search !== scheduledSearch
                ) {
                    return;
                }



                loadSuggestions(filtersRef.current);
            }, SEARCH_DELAY_MS);
        } else {
            loadSuggestions(filters);
        }



        return undefined;
    }, [
        filters,
        loadSuggestions
    ]);



    useEffect(() => {
        loadFilterOptions();
    }, [loadFilterOptions]);



    useEffect(() => {
        const unsubscribe = subscribePurchasesChanged(() => {
            loadSuggestions(filtersRef.current);
        });



        return () => {
            if (typeof unsubscribe === "function") {
                unsubscribe();
            }
        };
    }, [loadSuggestions]);



    useEffect(() => {
        mountedRef.current = true;



        return () => {
            mountedRef.current = false;



            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
                searchTimerRef.current = null;
            }
        };
    }, []);



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
