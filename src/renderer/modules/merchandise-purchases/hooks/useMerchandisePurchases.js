import { useCallback, useMemo, useState } from "react";

import {
    DEFAULT_FILTERS,
    createDefaultPremises
} from "../constants/merchandise-purchases.constants";
import {
    getCachedImport,
    importMerchandiseFile,
    setCachedImport
} from "../services/merchandiseImport.service";
import {
    applyOverrides,
    computeRows,
    filterRows,
    summarizeRows,
    uniqueSorted
} from "../services/merchandiseCalculation.service";

export function useMerchandisePurchases() {
    const [imported, setImported] = useState(() => getCachedImport());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [premises, setPremises] = useState(() => createDefaultPremises());
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [overrides, setOverrides] = useState({});

    const importFile = useCallback(async (file) => {
        setLoading(true);
        setError(null);

        try {
            await new Promise((resolve) => setTimeout(resolve, 30));

            const result = await importMerchandiseFile(file);

            setCachedImport(result);
            setImported(result);
            setOverrides({});
            setFilters(DEFAULT_FILTERS);
        } catch (importError) {
            console.error("Erro ao importar planilha de compras:", importError);
            setError(importError.message || "Não foi possível importar a planilha.");
        } finally {
            setLoading(false);
        }
    }, []);

    const clearImport = useCallback(() => {
        setCachedImport(null);
        setImported(null);
        setOverrides({});
        setFilters(DEFAULT_FILTERS);
        setError(null);
    }, []);

    const computed = useMemo(
        () => (imported ? computeRows(imported.rows, premises) : []),
        [imported, premises]
    );

    const allRows = useMemo(
        () => applyOverrides(computed, overrides),
        [computed, overrides]
    );

    const options = useMemo(
        () => ({
            companies: uniqueSorted(allRows, "company"),
            laboratories: uniqueSorted(allRows, "lab"),
            groups: uniqueSorted(allRows, "group"),
            curves: uniqueSorted(allRows, "curve")
        }),
        [allRows]
    );

    const rows = useMemo(
        () => filterRows(allRows, filters),
        [allRows, filters]
    );

    const summary = useMemo(() => summarizeRows(rows), [rows]);

    const setQuantity = useCallback((id, quantity) => {
        setOverrides((current) => {
            const next = { ...current };

            if (quantity === null || quantity === undefined) {
                delete next[id];
            } else {
                next[id] = quantity;
            }

            return next;
        });
    }, []);

    return {
        imported,
        loading,
        error,
        premises,
        setPremises,
        filters,
        setFilters,
        options,
        rows,
        summary,
        overrides,
        setQuantity,
        importFile,
        clearImport
    };
}
