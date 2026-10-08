import { useEffect, useMemo, useState } from "react";

import {
    BRANCHES,
    COLUMN_GROUPS,
    PRICE_PENDING_COLUMNS,
    PRICE_PENDING_EXPORT_COLUMNS
} from "../constants/price-pending.constants";

import ExportExcelModal from "../../../shared/components/ExportExcelModal";

import "./PricePendingTable.css";

import { useModuleState } from "../../../hooks/useModuleState";

const MODULE_ID = "price-pending";

const INITIAL_STATE = {
    searchTerm: "",
    visibleColumns: {
        envprecos: true,
        envpend: true,
        precosok: true,
        pendenciasok: true
    },
    filterUpdatedCurrentMonth: false,
    filterUpdatedPreviousMonth: false,
    filterBranch: ""
};

function getMonthYear(value) {
    if (!value) {
        return null;
    }

    const text = String(value).trim();

    const fullDate = text.match(
        /^(?:Atualizado\s*)?\d{1,2}\/(\d{1,2})\/(\d{4})$/i
    );

    if (fullDate) {
        return {
            month: Number(fullDate[1]),
            year: Number(fullDate[2])
        };
    }

    const monthYear = text.match(
        /^(?:Atualizado\s*)?(\d{1,2})\/(\d{4})$/i
    );

    if (monthYear) {
        return {
            month: Number(monthYear[1]),
            year: Number(monthYear[2])
        };
    }

    return null;
}

function getUpdateDateClass(value) {
    const parsed = getMonthYear(value);

    if (!parsed) {
        return "";
    }

    const today = new Date();

    if (
        parsed.month === today.getMonth() + 1 &&
        parsed.year === today.getFullYear()
    ) {
        return "updated-current-month";
    }

    return "updated-previous-month";
}

function isCurrentMonth(value) {
    const parsed = getMonthYear(value);

    if (!parsed) {
        return false;
    }

    const today = new Date();

    return (
        parsed.month === today.getMonth() + 1 &&
        parsed.year === today.getFullYear()
    );
}

function isPreviousMonth(value) {
    const parsed = getMonthYear(value);

    if (!parsed) {
        return false;
    }

    const today = new Date();

    const previousMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
    );

    return (
        parsed.month === previousMonth.getMonth() + 1 &&
        parsed.year === previousMonth.getFullYear()
    );
}

function PricePendingTable() {
    const [state, setField] = useModuleState(
        MODULE_ID,
        INITIAL_STATE
    );

    const searchTerm = state.searchTerm || "";

    const visibleColumns = {
        ...INITIAL_STATE.visibleColumns,
        ...(state.visibleColumns || {})
    };

    const filterUpdatedCurrentMonth = Boolean(
        state.filterUpdatedCurrentMonth
    );

    const filterUpdatedPreviousMonth = Boolean(
        state.filterUpdatedPreviousMonth
    );

    const filterBranch = state.filterBranch || "";

    const [rows, setRows] = useState([]);
    const [allRows, setAllRows] = useState([]);
    const [newLaboratory, setNewLaboratory] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [ignoredFiles, setIgnoredFiles] = useState([]);
    const [showIgnoredModal, setShowIgnoredModal] = useState(false);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [sharedDbMode, setSharedDbMode] = useState(false);
    const [readOnly, setReadOnly] = useState(false);

    const visibleGroups = useMemo(() => {
        return COLUMN_GROUPS
            .map((group) => group.key)
            .filter((groupKey) => visibleColumns[groupKey]);
    }, [visibleColumns]);

    const visibleColumnGroups = useMemo(() => {
        return COLUMN_GROUPS.filter((group) => {
            return visibleGroups.includes(group.key);
        });
    }, [visibleGroups]);

    const visibleColumnsList = useMemo(() => {
        return PRICE_PENDING_COLUMNS.filter((column) => {
            return (
                column.group &&
                visibleGroups.includes(column.group)
            );
        });
    }, [visibleGroups]);

    function rowHasDate(row, predicate) {
        const columnsToCheck = filterBranch
            ? visibleColumnsList.filter((column) => {
                return column.key.endsWith(
                    filterBranch.toLowerCase()
                );
            })
            : visibleColumnsList;

        return columnsToCheck.some((column) => {
            return predicate(row[column.key]);
        });
    }

    function filterRows(rowsToFilter) {
        let filtered = Array.isArray(rowsToFilter)
            ? rowsToFilter
            : [];

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();

            filtered = filtered.filter((row) => {
                return String(row.laboratory || "")
                    .toLowerCase()
                    .includes(term);
            });
        }

        if (filterBranch) {
            const branchSuffix = filterBranch.toLowerCase();

            filtered = filtered.filter((row) => {
                return PRICE_PENDING_COLUMNS
                    .filter((column) => {
                        return (
                            column.group &&
                            column.key.endsWith(branchSuffix)
                        );
                    })
                    .some((column) => {
                        return String(
                            row[column.key] || ""
                        ).trim() !== "";
                    });
            });
        }

        if (filterUpdatedCurrentMonth) {
            filtered = filtered.filter((row) => {
                return rowHasDate(row, isCurrentMonth);
            });
        }

        if (filterUpdatedPreviousMonth) {
            filtered = filtered.filter((row) => {
                return rowHasDate(row, isPreviousMonth);
            });
        }

        return filtered;
    }

    function isDatabaseBusyError(anError) {
        const message = String(
            anError?.message || anError || ""
        ).toLowerCase();

        return (
            message.includes("sqlite_busy") ||
            message.includes("sqlite_locked") ||
            message.includes("database is locked") ||
            message.includes("database is busy") ||
            message.includes("locked") ||
            message.includes("busy")
        );
    }

    function getFriendlyErrorMessage(
        anError,
        fallbackMessage
    ) {
        if (isDatabaseBusyError(anError)) {
            return (
                "Banco compartilhado está temporariamente ocupado ou " +
                "indisponível. O módulo está em modo somente leitura. " +
                "Clique em “Tentar novamente” em alguns instantes."
            );
        }

        return fallbackMessage;
    }

    async function loadRows({ silent = false } = {}) {
        try {
            if (!silent) {
                setLoading(true);
            }

            setError("");

            const result =
                await window.alfadime.pricePending.list();

            const data = Array.isArray(result)
                ? result
                : [];

            setAllRows(data);
            setRows(filterRows(data));
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
            if (!silent) {
                setLoading(false);
            }
        }
    }

    async function retryConnection() {
        await loadRows();
    }

    async function refreshRows() {
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

            setError(
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
    }

    useEffect(() => {
        loadRows();

        window.alfadime.pricePending
            .getDbConfig?.()
            .then((config) => {
                setSharedDbMode(
                    config?.mode === "shared"
                );
            })
            .catch(() => {
                setSharedDbMode(false);
            });
    }, []);

    useEffect(() => {
        if (!sharedDbMode) {
            return undefined;
        }

        const intervalId = setInterval(() => {
            loadRows({ silent: true });
        }, 20000);

        return () => {
            clearInterval(intervalId);
        };
    }, [sharedDbMode]);

    useEffect(() => {
        setRows(filterRows(allRows));
    }, [
        allRows,
        searchTerm,
        filterUpdatedCurrentMonth,
        filterUpdatedPreviousMonth,
        filterBranch,
        visibleColumnsList
    ]);

    function setSearchTerm(next) {
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

    function setFilterUpdatedCurrentMonth(next) {
        setField(
            "filterUpdatedCurrentMonth",
            typeof next === "function"
                ? next(filterUpdatedCurrentMonth)
                : next
        );
    }

    function setFilterUpdatedPreviousMonth(next) {
        setField(
            "filterUpdatedPreviousMonth",
            typeof next === "function"
                ? next(filterUpdatedPreviousMonth)
                : next
        );
    }

    function setFilterBranch(next) {
        setField(
            "filterBranch",
            typeof next === "function"
                ? next(filterBranch)
                : next
        );
    }

    function updateLocalValue(id, column, value) {
        const updateRows = (currentRows) => {
            return currentRows.map((row) => {
                return row.id === id
                    ? {
                        ...row,
                        [column]: value
                    }
                    : row;
            });
        };

        setRows(updateRows);
        setAllRows(updateRows);
    }

    async function saveCell(row, column) {
        if (readOnly) {
            return;
        }

        try {
            setSaving(true);
            setError("");

            await window.alfadime.pricePending.updateCell(
                row.id,
                column,
                row[column] || ""
            );
        } catch (saveError) {
            console.error(saveError);

            if (isDatabaseBusyError(saveError)) {
                setReadOnly(true);
            }

            setError(
                getFriendlyErrorMessage(
                    saveError,
                    "Não foi possível salvar a alteração."
                )
            );

            await loadRows({ silent: true });
        } finally {
            setSaving(false);
        }
    }

    async function addLaboratory(event) {
        event.preventDefault();

        if (readOnly) {
            return;
        }

        const laboratory = newLaboratory.trim();

        if (!laboratory) {
            setError(
                "Digite o nome do laboratório e o código."
            );

            return;
        }

        try {
            setSaving(true);
            setError("");

            const createdRow =
                await window.alfadime.pricePending.create({
                    laboratory
                });

            setAllRows((currentRows) => {
                return [
                    ...currentRows,
                    createdRow
                ];
            });

            setNewLaboratory("");
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
        } finally {
            setSaving(false);
        }
    }

    async function removeLaboratory(row) {
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

            await window.alfadime.pricePending.remove(
                row.id
            );

            setAllRows((currentRows) => {
                return currentRows.filter((currentRow) => {
                    return currentRow.id !== row.id;
                });
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
    }

    async function handleExport(selectedColumns) {
        const fileName =
            `precos-pendencias-${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`;

        const {
            filePath,
            canceled
        } = await window.alfadime.ipc.invoke(
            "dialog:save-file",
            {
                title: "Salvar arquivo Excel",
                defaultPath: fileName,
                filters: [
                    {
                        name: "Excel",
                        extensions: ["xlsx"]
                    }
                ]
            }
        );

        if (canceled || !filePath) {
            return {
                cancelled: true
            };
        }

        const result =
            await window.alfadime.pricePending.export({
                filePath,
                includeColumns: selectedColumns.map(
                    (column) => column.key
                )
            });

        alert(
            "Exportado com sucesso:\n" +
            result.filePath
        );

        return result;
    }

    if (loading) {
        return (
            <main className="price-pending-page">
                <div className="price-pending-loading">
                    Carregando laboratórios...
                </div>
            </main>
        );
    }

    return (
        <main className="price-pending-page">
            <header className="price-pending-toolbar">
                <div className="price-pending-title">
                    <h1>Preços e Pendências</h1>
                </div>

                <div className="price-pending-toolbar-actions">
                    <button
                        type="button"
                        className="price-pending-filters-toggle"
                        onClick={() => {
                            setFiltersPanelOpen(
                                !filtersPanelOpen
                            );
                        }}
                    >
                        {filtersPanelOpen
                            ? "Fechar filtros"
                            : "Filtros"}
                    </button>

                    <button
                        type="button"
                        className="price-pending-refresh-button"
                        onClick={refreshRows}
                        disabled={refreshing || readOnly}
                    >
                        {refreshing
                            ? "Atualizando..."
                            : "Atualizar"}
                    </button>

                    {ignoredFiles.length > 0 && (
                        <button
                            type="button"
                            className="price-pending-ignored-button"
                            onClick={() => {
                                setShowIgnoredModal(true);
                            }}
                            title="Ver arquivos ignorados"
                        >
                            Ignorados ({ignoredFiles.length})
                        </button>
                    )}
                </div>
            </header>

            {filtersPanelOpen && (
                <section className="price-pending-floating-panel">
                    <div className="price-pending-floating-panel-header">
                        <strong>Filtros e Ações</strong>

                        <button
                            type="button"
                            onClick={() => {
                                setFiltersPanelOpen(false);
                            }}
                            aria-label="Fechar filtros"
                            title="Fechar"
                        >
                            ×
                        </button>
                    </div>

                    <div className="price-pending-panel-content">
                        <div className="price-pending-panel-left">
                            <div className="price-pending-filters-section">
                                <h3>Colunas Visíveis</h3>

                                <div className="price-pending-column-toggles">
                                    {COLUMN_GROUPS.map((group) => (
                                        <label key={group.key}>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(
                                                    visibleColumns[
                                                        group.key
                                                    ]
                                                )}
                                                onChange={(event) => {
                                                    setVisibleColumns({
                                                        ...visibleColumns,
                                                        [group.key]:
                                                            event.target.checked
                                                    });
                                                }}
                                            />
                                            {group.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="price-pending-filters-section">
                                <h3>Filtros de Atualização</h3>

                                <div className="price-pending-filter-options">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={
                                                filterUpdatedCurrentMonth
                                            }
                                            onChange={(event) => {
                                                setFilterUpdatedCurrentMonth(
                                                    event.target.checked
                                                );
                                            }}
                                        />
                                        Atualizados este mês
                                    </label>

                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={
                                                filterUpdatedPreviousMonth
                                            }
                                            onChange={(event) => {
                                                setFilterUpdatedPreviousMonth(
                                                    event.target.checked
                                                );
                                            }}
                                        />
                                        Atualizados mês passado
                                    </label>
                                </div>
                            </div>

                            <div className="price-pending-filters-section">
                                <h3>Filtro por Filial</h3>

                                <select
                                    value={filterBranch}
                                    onChange={(event) => {
                                        setFilterBranch(
                                            event.target.value
                                        );
                                    }}
                                >
                                    <option value="">
                                        Todas as filiais
                                    </option>

                                    {BRANCHES.map((branch) => (
                                        <option
                                            key={branch}
                                            value={branch}
                                        >
                                            {branch}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="price-pending-filters-section">
                                <h3>Buscar Laboratório</h3>

                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => {
                                        setSearchTerm(
                                            event.target.value
                                        );
                                    }}
                                    placeholder="Buscar laboratório..."
                                />
                            </div>
                        </div>

                        <div className="price-pending-panel-right">
                            <div className="price-pending-filters-section">
                                <h3>Adicionar Laboratório</h3>

                                <form
                                    className="price-pending-add-form-inline"
                                    onSubmit={addLaboratory}
                                >
                                    <input
                                        type="text"
                                        value={newLaboratory}
                                        onChange={(event) => {
                                            setNewLaboratory(
                                                event.target.value
                                            );
                                        }}
                                        placeholder="Laboratório - código"
                                        disabled={saving || readOnly}
                                    />

                                    <button
                                        type="submit"
                                        disabled={saving || readOnly}
                                    >
                                        {saving
                                            ? "Salvando..."
                                            : "Adicionar"}
                                    </button>
                                </form>
                            </div>

                            <div className="price-pending-filters-section">
                                <h3>Exportar</h3>

                                <button
                                    type="button"
                                    className="price-pending-button"
                                    onClick={() => {
                                        setExportModalOpen(true);
                                    }}
                                >
                                    Exportar Excel
                                </button>

                                <p className="price-pending-export-hint">
                                    Escolha as colunas e a ordem antes de exportar.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {error && (
                <div className="price-pending-error">
                    {error}
                </div>
            )}

            {readOnly && (
                <div className="price-pending-read-only-actions">
                    <button
                        type="button"
                        className="price-pending-refresh-button"
                        onClick={retryConnection}
                        disabled={loading}
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {showIgnoredModal && (
                <div
                    className="modal-overlay"
                    onClick={() => {
                        setShowIgnoredModal(false);
                    }}
                    style={{ pointerEvents: "auto" }}
                >
                    <div
                        className="modal-content"
                        onClick={(event) => {
                            event.stopPropagation();
                        }}
                    >
                        <div className="modal-header">
                            <h2>
                                Arquivos ignorados na atualização
                            </h2>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => {
                                    setShowIgnoredModal(false);
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            {ignoredFiles.length === 0 ? (
                                <p>
                                    Nenhum arquivo ignorado.
                                </p>
                            ) : (
                                <table className="ignored-files-table">
                                    <thead>
                                        <tr>
                                            <th>Arquivo</th>
                                            <th>Motivo</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {ignoredFiles.map(
                                            (file, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        {file.fileName ||
                                                            file.name ||
                                                            "Desconhecido"}
                                                    </td>

                                                    <td>
                                                        {file.reason ===
                                                        "tipo_incompativel"
                                                            ? "Tipo incompatível"
                                                            : file.reason ===
                                                            "laboratorio_nao_encontrado"
                                                                ? "Laboratório não encontrado"
                                                                : file.reason ===
                                                                "ja_processado"
                                                                    ? "Já processado"
                                                                    : file.reason ===
                                                                    "erro_processamento"
                                                                        ? (
                                                                            file.error ||
                                                                            "Erro ao processar"
                                                                        )
                                                                        : "Outro"}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="modal-button"
                                onClick={() => {
                                    setShowIgnoredModal(false);
                                }}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="price-pending-card">
                <div className="price-pending-card-header">
                    <div>
                        <strong>
                            Lista de laboratórios
                        </strong>

                        <span>
                            {rows.length} registro(s)
                            {searchTerm &&
                                ` (filtrado de ${allRows.length})`}
                        </span>
                    </div>

                    {saving && (
                        <span className="saving-indicator">
                            Salvando...
                        </span>
                    )}
                </div>

                <div className="price-pending-table-wrapper">
                    <table className="price-pending-table">
                        <thead>
                            <tr>
                                <th
                                    rowSpan="2"
                                    className="laboratory-header"
                                >
                                    Laboratórios
                                </th>

                                {visibleColumnGroups.map(
                                    (group) => (
                                        <th
                                            key={group.key}
                                            colSpan={
                                                BRANCHES.length
                                            }
                                            className={
                                                `group-header group-${group.key}`
                                            }
                                        >
                                            {group.label}
                                        </th>
                                    )
                                )}

                                <th
                                    rowSpan="2"
                                    className="actions-header"
                                >
                                    Ações
                                </th>
                            </tr>

                            <tr>
                                {visibleColumnGroups.flatMap(
                                    (group) => {
                                        return BRANCHES.map(
                                            (branch) => (
                                                <th
                                                    key={
                                                        `${group.key}-${branch}`
                                                    }
                                                    className={
                                                        `branch-header group-${group.key}`
                                                    }
                                                >
                                                    {branch}
                                                </th>
                                            )
                                        );
                                    }
                                )}
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={
                                            visibleColumnsList.length +
                                            2
                                        }
                                        className="empty-row"
                                    >
                                        {searchTerm
                                            ? "Nenhum laboratório encontrado para a busca."
                                            : "Nenhum laboratório cadastrado."}
                                    </td>
                                </tr>
                            )}

                            {rows.map((row) => (
                                <tr key={row.id}>
                                    <td className="laboratory-cell">
                                        <input
                                            type="text"
                                            value={
                                                row.laboratory || ""
                                            }
                                            onChange={(event) => {
                                                updateLocalValue(
                                                    row.id,
                                                    "laboratory",
                                                    event.target.value
                                                );
                                            }}
                                            onBlur={() => {
                                                saveCell(
                                                    row,
                                                    "laboratory"
                                                );
                                            }}
                                            title={
                                                "Edite o nome do laboratório " +
                                                "e clique fora para salvar"
                                            }
                                            disabled={
                                                saving || readOnly
                                            }
                                        />
                                    </td>

                                    {visibleColumnsList.map(
                                        (column) => (
                                            <td
                                                key={column.key}
                                                className={
                                                    `editable-cell group-${column.group} ` +
                                                    getUpdateDateClass(
                                                        row[column.key]
                                                    )
                                                }
                                            >
                                                <input
                                                    type="text"
                                                    value={
                                                        row[
                                                            column.key
                                                        ] || ""
                                                    }
                                                    onChange={(event) => {
                                                        updateLocalValue(
                                                            row.id,
                                                            column.key,
                                                            event.target.value
                                                        );
                                                    }}
                                                    onBlur={() => {
                                                        saveCell(
                                                            row,
                                                            column.key
                                                        );
                                                    }}
                                                    title={
                                                        row[
                                                            column.key
                                                        ] || ""
                                                    }
                                                    disabled={
                                                        saving || readOnly
                                                    }
                                                />
                                            </td>
                                        )
                                    )}

                                    <td className="actions-cell">
                                        <button
                                            type="button"
                                            className="remove-button"
                                            onClick={() => {
                                                removeLaboratory(row);
                                            }}
                                            disabled={
                                                saving || readOnly
                                            }
                                        >
                                            Remover
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <ExportExcelModal
                open={exportModalOpen}
                title="Exportar Preços e Pendências"
                moduleKey="price-pending"
                availableColumns={
                    PRICE_PENDING_EXPORT_COLUMNS
                }
                onClose={() => {
                    setExportModalOpen(false);
                }}
                onExport={handleExport}
            />
        </main>
    );
}

export default PricePendingTable;