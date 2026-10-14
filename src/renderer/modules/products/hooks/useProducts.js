import {
    useState,
    useEffect,
    useCallback,
    useRef
} from "react";


import {
    listProducts,
    syncProductsExcel
} from "../services/products.service";


const INITIAL_FILTERS = {
    search: "",
    branch: "",
    brand: "",
    group_code: "",
    category_code: "",
    controls_lot: "",
    active: "",
    page: 1,
    pageSize: 50
};


const EMPTY_PAGINATION = {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
    offset: 0
};


const SEARCH_DELAY_MS = 300;


export function useProducts(filters = INITIAL_FILTERS) {
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);


    const prevFiltersRef = useRef(null);
    const requestIdRef = useRef(0);
    const loadingRef = useRef(false);
    const searchTimerRef = useRef(null);
    const filtersRef = useRef(filters);


    filtersRef.current = filters;


    const loadProducts = useCallback(async (filtersToLoad = filtersRef.current) => {
        if (loadingRef.current) {
            return;
        }


        const requestId = requestIdRef.current + 1;


        requestIdRef.current = requestId;
        loadingRef.current = true;


        setLoading(true);
        setError("");


        try {
            const result = await listProducts(filtersToLoad);


            if (requestId !== requestIdRef.current) {
                return;
            }


            setProducts(
                Array.isArray(result?.rows)
                    ? result.rows
                    : []
            );


            setPagination(
                result?.pagination || EMPTY_PAGINATION
            );
        } catch (loadError) {
            console.error("Erro ao carregar produtos:", loadError);


            if (requestId !== requestIdRef.current) {
                return;
            }


            setProducts([]);
            setPagination(EMPTY_PAGINATION);


            setError(
                loadError.message || "Nao foi possivel carregar os produtos."
            );
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }


            loadingRef.current = false;
        }
    }, []);


    useEffect(() => {
        const previousFilters = prevFiltersRef.current;


        if (!previousFilters) {
            prevFiltersRef.current = filters;


            loadProducts(filters);


            return undefined;
        }


        const filtersChanged =
            JSON.stringify(previousFilters) !==
            JSON.stringify(filters);


        if (!filtersChanged) {
            return undefined;
        }


        prevFiltersRef.current = filters;


        const searchChanged =
            previousFilters.search !== filters.search;


        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }


        if (searchChanged) {
            searchTimerRef.current = setTimeout(() => {
                searchTimerRef.current = null;


                loadProducts(filters);
            }, SEARCH_DELAY_MS);
        } else {
            loadProducts(filters);
        }


        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
        };
    }, [
        filters,
        loadProducts
    ]);


    useEffect(() => {
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
        };
    }, []);


    async function synchronize() {
        setSyncing(true);


        try {
            await syncProductsExcel();


            setLastSync(new Date().toISOString());


            await loadProducts(filtersRef.current);
        } finally {
            setSyncing(false);
        }
    }


    return {
        products,
        pagination,
        loading,
        error,
        filters,
        synchronize,
        syncing,
        lastSync,
        loadProducts
    };
}
