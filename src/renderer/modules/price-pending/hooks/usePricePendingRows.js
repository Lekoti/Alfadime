import { useCallback, useEffect, useRef, useState } from "react";


import {
    getFriendlyErrorMessage,
    isDatabaseBusyError
} from "../utils/price-pending.utils";


export default function usePricePendingRows({
    permissions,
    enabled = true
}) {
    const [allRows, setAllRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingCell, setSavingCell] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [ignoredFiles, setIgnoredFiles] = useState([]);
    const [sharedDbMode, setSharedDbMode] = useState(false);
    const [readOnly, setReadOnly] = useState(false);

    const editingCellRef = useRef(null);
    const originalValuesRef = useRef(new Map());
    const isLoadingRowsRef = useRef(false);


    const loadRows = useCallback(async ({ silent = false } = {}) => {
        try {
            if (isLoadingRowsRef.current) {
                return;
            }


            isLoadingRowsRef.current = true;


            if (!silent) {
                setLoading(true);
            }


            setError("");


            const result =
                await window.alfadime.pricePending.list();


            const data = Array.isArray(result)
                ? result
                : [];


            const editingCell = editingCellRef.current;


            const nextRows = editingCell
                ? data.map((row) => {
                    return row.id === editingCell.id
                        ? {
                            ...row,
                            [editingCell.column]:
                                editingCell.value
                        }
                        : row;
                })
                : data;


            setAllRows(nextRows);
            setReadOnly(false);
        } catch (loadError) {
            console.error(loadError);


            if (isDatabaseBusyError(loadError)) {
                setReadOnly(true);
            }


            setError(
                getFriendlyErrorMessage(
                    loadError,
                    "Não foi possível carregar os laboratórios."
                )
            );
        } finally {
            isLoadingRowsRef.current = false;


            if (!silent) {
                setLoading(false);
            }
        }
    }, []);


    const retryConnection = useCallback(async () => {
        await loadRows();
    }, [loadRows]);


    const refreshRows = useCallback(async () => {
        if (!permissions.canRefresh) {
            setError("Você não tem permissão para atualizar as planilhas.");
            return;
        }


        if (readOnly) {
            setError(
                "O banco compartilhado está em modo somente leitura. " +
                "Clique em “Tentar novamente” antes de atualizar."
            );
            return;
        }


        const confirmed = window.confirm(
            "Verificar planilhas de preços e pendências agora?\n\n" +
            "Serão analisadas as pastas compartilhadas e apenas arquivos " +
            "novos ou alterados serão processados."
        );


        if (!confirmed) {
            return;
        }


        try {
            setRefreshing(true);
            setError("");
            setSuccess("");


            const result =
                await window.alfadime.pricePending.refresh();


            if (result?.code === "REFRESH_IN_PROGRESS") {
                setError(
                    result.message ||
                    "Outra atualização está em andamento em outro computador."
                );

                return;
            }


            if (!result?.success) {
                setError(
                    result?.message ||
                    "Não foi possível atualizar os dados."
                );

                return;
            }


            setIgnoredFiles(result.ignored || []);
            await loadRows();


            setSuccess(
                [
                    "Atualização concluída.",
                    `${result.filesFound || 0} arquivo(s) encontrado(s).`,
                    `${result.newFiles || 0} novo(s).`,
                    `${result.changedFiles || 0} alterado(s).`,
                    `${result.processed || 0} processado(s).`,
                    `${result.alreadyProcessed || 0} já processado(s).`,
                    `${result.failures || 0} falha(s).`
                ].join(" ")
            );
        } catch (refreshError) {
            console.error(refreshError);


            if (isDatabaseBusyError(refreshError)) {
                setReadOnly(true);
            }


            setError(
                getFriendlyErrorMessage(
                    refreshError,
                    "Não foi possível atualizar os dados."
                )
            );
        } finally {
            setRefreshing(false);
        }
    }, [
        loadRows,
        permissions.canRefresh,
        readOnly
    ]);


    const updateLocalValue = useCallback((id, column, value) => {
        const cellKey = `${id}:${column}`;


        if (!originalValuesRef.current.has(cellKey)) {
            setAllRows((currentRows) => {
                const currentRow = currentRows.find(
                    (row) => row.id === id
                );


                originalValuesRef.current.set(
                    cellKey,
                    currentRow?.[column] ?? ""
                );


                return currentRows;
            });
        }


        editingCellRef.current = {
            id,
            column,
            value
        };


        setAllRows((currentRows) => {
            return currentRows.map((row) => {
                return row.id === id
                    ? {
                        ...row,
                        [column]: value
                    }
                    : row;
            });
        });
    }, []);


    const saveCell = useCallback(async (row, column) => {
        if (readOnly) {
            return;
        }


        if (
            column === "laboratory" &&
            !permissions.canEditLaboratory
        ) {
            return;
        }


        if (
            column === "observation" &&
            !permissions.canEditObservation
        ) {
            return;
        }


        if (
            column !== "laboratory" &&
            column !== "observation" &&
            !permissions.canEditValues
        ) {
            return;
        }


        const cellKey = `${row.id}:${column}`;


        if (
            String(originalValuesRef.current.get(cellKey) ?? "") ===
            String(row[column] ?? "")
        ) {
            editingCellRef.current = null;
            return;
        }


        try {
            setSavingCell(cellKey);
            setError("");


            const savedRow =
                await window.alfadime.pricePending.updateCell(
                    row.id,
                    column,
                    row[column] || ""
                );


            originalValuesRef.current.set(
                cellKey,
                savedRow?.[column] ?? ""
            );


            editingCellRef.current = null;


            if (savedRow && savedRow.id === row.id) {
                setAllRows((currentRows) => {
                    return currentRows.map((currentRow) => {
                        return currentRow.id === savedRow.id
                            ? savedRow
                            : currentRow;
                    });
                });
            }
        } catch (saveError) {
            console.error(saveError);


            await loadRows({ silent: true });


            if (isDatabaseBusyError(saveError)) {
                setReadOnly(true);
            }


            setError(
                getFriendlyErrorMessage(
                    saveError,
                    "Não foi possível salvar a alteração."
                )
            );
        } finally {
            setSavingCell(null);
        }
    }, [
        loadRows,
        permissions,
        readOnly
    ]);


    const addLaboratory = useCallback(async (laboratoryName) => {
        if (!permissions.canAddLaboratory) {
            setError("Você não tem permissão para adicionar laboratórios.");
            return false;
        }


        if (readOnly) {
            return false;
        }


        const laboratory = String(laboratoryName || "").trim();


        if (!laboratory) {
            setError("Digite o nome do laboratório e o código.");
            return false;
        }


        try {
            setSaving(true);
            setError("");


            const createdRow =
                await window.alfadime.pricePending.create({
                    laboratory
                });


            setAllRows((currentRows) => [
                ...currentRows,
                createdRow
            ]);


            return true;
        } catch (createError) {
            console.error(createError);


            if (isDatabaseBusyError(createError)) {
                setReadOnly(true);
            }


            setError(
                getFriendlyErrorMessage(
                    createError,
                    "Não foi possível adicionar o laboratório."
                )
            );


            return false;
        } finally {
            setSaving(false);
        }
    }, [
        permissions.canAddLaboratory,
        readOnly
    ]);


    const removeLaboratory = useCallback(async (row) => {
        if (!permissions.canRemoveLaboratory) {
            setError("Você não tem permissão para remover laboratórios.");
            return;
        }


        if (readOnly) {
            return;
        }


        const confirmed = window.confirm(
            `Remover "${row.laboratory}"?`
        );


        if (!confirmed) {
            return;
        }


        try {
            setSaving(true);
            setError("");


            await window.alfadime.pricePending.remove(row.id);


            setAllRows((currentRows) => {
                return currentRows.filter(
                    (currentRow) => currentRow.id !== row.id
                );
            });
        } catch (removeError) {
            console.error(removeError);


            if (isDatabaseBusyError(removeError)) {
                setReadOnly(true);
            }


            setError(
                getFriendlyErrorMessage(
                    removeError,
                    "Não foi possível remover o laboratório."
                )
            );
        } finally {
            setSaving(false);
        }
    }, [
        permissions.canRemoveLaboratory,
        readOnly
    ]);


    useEffect(() => {
        if (!enabled) {
            return;
        }


        loadRows();


        window.alfadime.pricePending
            .getDbConfig?.()
            .then((config) => {
                setSharedDbMode(config?.mode === "shared");
            })
            .catch(() => {
                setSharedDbMode(false);
            });
    }, [
        enabled,
        loadRows
    ]);


    useEffect(() => {
        if (!sharedDbMode) {
            return undefined;
        }


        const intervalId = setInterval(() => {
            if (
                editingCellRef.current ||
                savingCell !== null ||
                isLoadingRowsRef.current
            ) {
                return;
            }


            const activeElement = document.activeElement;


            if (
                activeElement instanceof HTMLInputElement &&
                activeElement.closest(".price-pending-table")
            ) {
                return;
            }


            loadRows({ silent: true });
        }, 20000);


        return () => {
            clearInterval(intervalId);
        };
    }, [
        loadRows,
        savingCell,
        sharedDbMode
    ]);


    return {
        allRows,
        setAllRows,
        loading,
        saving,
        savingCell,
        refreshing,
        error,
        success,
        ignoredFiles,
        sharedDbMode,
        readOnly,
        loadRows,
        retryConnection,
        refreshRows,
        updateLocalValue,
        saveCell,
        addLaboratory,
        removeLaboratory,
        setError,
        setSuccess
    };
}