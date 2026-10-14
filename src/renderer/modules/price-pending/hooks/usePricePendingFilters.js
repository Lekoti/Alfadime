import { useMemo } from "react";


import { useModuleState } from "../../../hooks/useModuleState";


import {
    COLUMN_GROUPS,
    PRICE_PENDING_COLUMNS
} from "../constants/price-pending.constants";


import {
    isBranchColumn,
    isOutdatedPeriod,
    isUpdatedPeriod
} from "../utils/price-pending.utils";


const MODULE_ID = "price-pending";


const INITIAL_STATE = {
    searchTerm: "",
    visibleColumns: {
        env_precos: true,
        env_pend: true,
        precos_ok: true,
        pendencias_ok: true
    },
    filterUpdated: false,
    filterOutdated: false,
    filterBranch: "",
    filtersPanelOpen: false,
    tableScrollTop: 0
};


export default function usePricePendingFilters({
    permissions
}) {
    const [state, setField] = useModuleState(
        MODULE_ID,
        INITIAL_STATE
    );

    const searchTerm = state.searchTerm || "";

    const visibleColumns = useMemo(() => ({
        ...INITIAL_STATE.visibleColumns,
        ...(state.visibleColumns || {})
    }), [state.visibleColumns]);

    const filterUpdated = Boolean(state.filterUpdated);
    const filterOutdated = Boolean(state.filterOutdated);
    const filterBranch = state.filterBranch || "";
    const filtersPanelOpen = Boolean(state.filtersPanelOpen);
    const tableScrollTop = Number(state.tableScrollTop || 0);


    function setFiltersPanelOpen(next) {
        setField(
            "filtersPanelOpen",
            typeof next === "function"
                ? next(filtersPanelOpen)
                : Boolean(next)
        );
    }


    function setSearchTerm(next) {
        if (!permissions.canSearch) {
            return;
        }

        setField(
            "searchTerm",
            typeof next === "function"
                ? next(searchTerm)
                : next
        );
    }


    function setVisibleColumns(next) {
        setField(
            "visibleColumns",
            typeof next === "function"
                ? next(visibleColumns)
                : next
        );
    }


    function setFilterUpdated(next) {
        if (!permissions.canFilterUpdated) {
            return;
        }

        setField(
            "filterUpdated",
            typeof next === "function"
                ? next(filterUpdated)
                : next
        );
    }


    function setFilterOutdated(next) {
        if (!permissions.canFilterOutdated) {
            return;
        }

        setField(
            "filterOutdated",
            typeof next === "function"
                ? next(filterOutdated)
                : next
        );
    }


    function setFilterBranch(next) {
        if (!permissions.canFilterBranch) {
            return;
        }

        setField(
            "filterBranch",
            typeof next === "function"
                ? next(filterBranch)
                : next
        );
    }


    function setTableScrollTop(next) {
        setField("tableScrollTop", next);
    }


    function clearFilters() {
        setSearchTerm("");
        setFilterUpdated(false);
        setFilterOutdated(false);
        setFilterBranch("");
    }


    const visibleGroups = useMemo(() => {
        return COLUMN_GROUPS
            .map((group) => group.key)
            .filter((groupKey) =>
                visibleColumns[groupKey] &&
                permissions.canViewFunction(
                    permissions.moduleKey,
                    groupKey
                )
            );
    }, [
        visibleColumns,
        permissions
    ]);


    const visibleColumnGroups = useMemo(() => {
        return COLUMN_GROUPS.filter((group) =>
            visibleGroups.includes(group.key)
        );
    }, [visibleGroups]);


    const visibleColumnsList = useMemo(() => {
        return PRICE_PENDING_COLUMNS.filter((column) => {
            return (
                column.group &&
                visibleGroups.includes(column.group) &&
                (!filterBranch || isBranchColumn(column, filterBranch)) &&
                permissions.canViewFunction(
                    permissions.moduleKey,
                    column.key
                )
            );
        });
    }, [
        visibleGroups,
        filterBranch,
        permissions
    ]);


    const headerGroups = useMemo(() => {
        return visibleColumnGroups
            .map((group) => ({
                group,
                groupColumns: visibleColumnsList.filter(
                    (column) => column.group === group.key
                )
            }))
            .filter((item) => item.groupColumns.length > 0);
    }, [
        visibleColumnGroups,
        visibleColumnsList
    ]);


    function filterRows(rowsToFilter) {
        let filtered = Array.isArray(rowsToFilter)
            ? rowsToFilter
            : [];


        if (
            permissions.canSearch &&
            searchTerm.trim()
        ) {
            const term = searchTerm.toLowerCase().trim();

            filtered = filtered.filter((row) =>
                String(row.laboratory || "")
                    .toLowerCase()
                    .includes(term)
            );
        }


        if (
            permissions.canFilterBranch &&
            filterBranch
        ) {
            filtered = filtered.filter((row) => {
                return visibleColumnsList.some((column) => {
                    return isBranchColumn(column, filterBranch) &&
                        String(row[column.key] || "").trim() !== "";
                });
            });
        }


        const datePredicates = [];


        if (
            permissions.canFilterUpdated &&
            filterUpdated
        ) {
            datePredicates.push(isUpdatedPeriod);
        }


        if (
            permissions.canFilterOutdated &&
            filterOutdated
        ) {
            datePredicates.push(isOutdatedPeriod);
        }


        if (datePredicates.length > 0) {
            filtered = filtered.filter((row) => {
                return visibleColumnsList.some((column) => {
                    return datePredicates.some((predicate) =>
                        predicate(row[column.key])
                    );
                });
            });
        }


        return filtered;
    }


    const hasActiveFilters = Boolean(
        searchTerm.trim() ||
        filterUpdated ||
        filterOutdated ||
        filterBranch
    );


    return {
        searchTerm,
        visibleColumns,
        filterUpdated,
        filterOutdated,
        filterBranch,
        filtersPanelOpen,
        tableScrollTop,
        hasActiveFilters,
        visibleGroups,
        visibleColumnGroups,
        visibleColumnsList,
        headerGroups,
        setSearchTerm,
        setVisibleColumns,
        setFilterUpdated,
        setFilterOutdated,
        setFilterBranch,
        setFiltersPanelOpen,
        setTableScrollTop,
        clearFilters,
        filterRows
    };
}
