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

export function useProducts(filters = INITIAL_FILTERS) {
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);

    const prevFiltersRef = useRef(null);

    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const result = await listProducts(filters);

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

            setProducts([]);
            setPagination(EMPTY_PAGINATION);

            setError(
                loadError.message || "Nao foi possivel carregar os produtos."
            );
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const prevFilters = prevFiltersRef.current;
        const filtersChanged = JSON.stringify(prevFilters) !== JSON.stringify(filters);

        if (filtersChanged) {
            prevFiltersRef.current = filters;
            loadProducts();
        }
    }, [filters, loadProducts]);

    async function synchronize() {
        setSyncing(true);
        try {
            await syncProductsExcel();
            setLastSync(new Date().toISOString());
            await loadProducts();
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
