import {
    useCallback,
    useEffect,
    useState
} from "react";

import {
    listAuditIssues,
    subscribeProductsChanged
} from "../services/product-audit.service";

const EMPTY_PAGINATION = {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
    offset: 0
};

const EMPTY_SUMMARY = {
    total: 0,
    errors: 0,
    warnings: 0
};

function hasActiveFilters(filters = {}) {
    if (String(filters.search || "").trim()) {
        return true;
    }

    if (String(filters.controlsLot || "").trim()) {
        return true;
    }

    if (String(filters.productActive || "").trim()) {
        return true;
    }

    if (String(filters.minBranches || "").trim()) {
        return true;
    }

    const arrayFilterKeys = [
        "types",
        "severities",
        "branches",
        "brands",
        "manufacturerCodes",
        "groupCodes",
        "categoryCodes",
        "units",
        "therapeuticClasses",
        "divergentFields",
        "missingFields"
    ];

    return arrayFilterKeys.some((key) =>
        Array.isArray(filters[key]) &&
        filters[key].length > 0
    );
}

export function useProductAudit(filters) {
    const [issues, setIssues] = useState([]);
    const [summary, setSummary] = useState(
        EMPTY_SUMMARY
    );
    const [pagination, setPagination] = useState(
        EMPTY_PAGINATION
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const filtersApplied =
        hasActiveFilters(filters);

    const loadAudit = useCallback(
        async () => {
            if (!filtersApplied) {
                setIssues([]);
                setSummary(EMPTY_SUMMARY);
                setPagination(EMPTY_PAGINATION);
                setError("");
                setLoading(false);

                return;
            }

            try {
                setLoading(true);
                setError("");

                const result = await listAuditIssues(
                    filters
                );

                setIssues(
                    Array.isArray(result?.rows)
                        ? result.rows
                        : []
                );

                setSummary(
                    result?.summary ||
                    EMPTY_SUMMARY
                );

                setPagination(
                    result?.pagination ||
                    EMPTY_PAGINATION
                );
            } catch (loadError) {
                console.error(
                    "Erro ao carregar auditoria:",
                    loadError
                );

                setIssues([]);
                setSummary(EMPTY_SUMMARY);
                setPagination(EMPTY_PAGINATION);

                setError(
                    loadError.message ||
                    "Nao foi possivel carregar a auditoria."
                );
            } finally {
                setLoading(false);
            }
        },
        [
            filtersApplied,
            filters.search,
            filters.types,
            filters.severities,
            filters.branches,
            filters.brands,
            filters.manufacturerCodes,
            filters.groupCodes,
            filters.categoryCodes,
            filters.units,
            filters.therapeuticClasses,
            filters.divergentFields,
            filters.missingFields,
            filters.controlsLot,
            filters.productActive,
            filters.minBranches,
            filters.page,
            filters.pageSize
        ]
    );

    useEffect(() => {
        loadAudit();
    }, [loadAudit]);

    useEffect(() => {
        const unsubscribe =
            subscribeProductsChanged(() => {
                if (filtersApplied) {
                    loadAudit();
                }
            });

        return () => {
            if (typeof unsubscribe === "function") {
                unsubscribe();
            }
        };
    }, [
        filtersApplied,
        loadAudit
    ]);

    return {
        issues,
        summary,
        pagination,
        loading,
        error,
        filtersApplied,
        loadAudit
    };
}
