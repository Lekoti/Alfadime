import { useEffect, useMemo, useRef, useState } from "react";



import PricePendingToolbar from "../components/PricePendingToolbar";
import PricePendingFilters from "../components/PricePendingFilters";
import PricePendingTable from "../components/PricePendingTable";
import PricePendingIgnoredFilesModal from "../components/PricePendingIgnoredFilesModal";
import ExportExcelModal from "../../../shared/components/ExportExcelModal";



import usePricePendingPermissions from "../hooks/usePricePendingPermissions";
import usePricePendingFilters from "../hooks/usePricePendingFilters";
import usePricePendingRows from "../hooks/usePricePendingRows";



import { PRICE_PENDING_EXPORT_COLUMNS } from "../constants/price-pending.constants";
import { isUpdatedPeriod } from "../utils/price-pending.utils";



import "../styles/price-pending.css";



function buildSummary(rows, visibleColumnsList) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeColumns = Array.isArray(visibleColumnsList)
        ? visibleColumnsList
        : [];


    const priceColumns = safeColumns.filter(
        (column) => column.group === "precos_ok"
    );


    const pendingColumns = safeColumns.filter(
        (column) => column.group === "pendencias_ok"
    );


    const countUpdated = (columns) => {
        let updated = 0;


        safeRows.forEach((row) => {
            columns.forEach((column) => {
                const value = row[column.key];


                if (
                    String(value ?? "").trim() !== "" &&
                    isUpdatedPeriod(value)
                ) {
                    updated += 1;
                }
            });
        });


        return updated;
    };


    const pricesUpdated = countUpdated(priceColumns);
    const pendingUpdated = countUpdated(pendingColumns);
    const pricesTotal = safeRows.length * priceColumns.length;
    const pendingTotal = safeRows.length * pendingColumns.length;


    return {
        pricesUpdated,
        pricesPending: Math.max(0, pricesTotal - pricesUpdated),
        pendingUpdated,
        pendingPending: Math.max(0, pendingTotal - pendingUpdated)
    };
}



export default function PricePendingPage() {
    const permissions = usePricePendingPermissions();


    const filters = usePricePendingFilters({
        permissions
    });


    const rowsState = usePricePendingRows({
        permissions,
        enabled: !permissions.isLoadingPermissions
    });


    const [newLaboratory, setNewLaboratory] = useState("");
    const [showIgnoredModal, setShowIgnoredModal] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);


    const tableWrapperRef = useRef(null);
    const scrollTimerRef = useRef(null);


    const rows = useMemo(
        () => filters.filterRows(rowsState.allRows),
        [
            filters,
            rowsState.allRows
        ]
    );


    const summary = useMemo(
        () => buildSummary(rows, filters.visibleColumnsList),
        [
            rows,
            filters.visibleColumnsList
        ]
    );



    useEffect(() => {
        if (
            rowsState.loading ||
            !tableWrapperRef.current
        ) {
            return;
        }



        tableWrapperRef.current.scrollTop =
            filters.tableScrollTop;
    }, [
        filters.tableScrollTop,
        rowsState.loading
    ]);



    function handleTableScroll(event) {
        const nextScrollTop = event.currentTarget.scrollTop;



        if (scrollTimerRef.current) {
            clearTimeout(scrollTimerRef.current);
        }



        scrollTimerRef.current = setTimeout(() => {
            filters.setTableScrollTop(nextScrollTop);
        }, 300);
    }



    async function handleAcceptExternalUpdate({ id, column }) {
        try {
            rowsState.setError("");
            rowsState.setSuccess("");


            const updatedRow =
                await window.alfadime.pricePending.acceptExternalUpdate({
                    id,
                    column
                });


            if (updatedRow && updatedRow.id === id) {
                rowsState.setAllRows((currentRows) => {
                    return currentRows.map((currentRow) => {
                        return currentRow.id === updatedRow.id
                            ? updatedRow
                            : currentRow;
                    });
                });
            }


            rowsState.setSuccess("Atualização externa aceita.");
        } catch (acceptError) {
            console.error(acceptError);


            rowsState.setError(
                "Não foi possível aceitar a atualização externa."
            );
        }
    }



    async function handleExport(selectedColumns) {
        if (!permissions.canExport) {
            rowsState.setError("Você não tem permissão para exportar.");
            return {
                cancelled: true
            };
        }



        const fileName = `precos-pendencias-${new Date()
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
                ),
                rowIds: rows.map((row) => row.id)
            });



        rowsState.setSuccess(
            `Exportado com sucesso: ${result.filePath}`
        );



        return result;
    }



    if (
        permissions.isLoadingPermissions ||
        rowsState.loading
    ) {
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
            <PricePendingToolbar
                filtersPanelOpen={filters.filtersPanelOpen}
                ignoredFilesCount={rowsState.ignoredFiles.length}
                canRefresh={permissions.canRefresh}
                canViewIgnoredFiles={permissions.canViewIgnoredFiles}
                refreshing={rowsState.refreshing}
                readOnly={rowsState.readOnly}
                onToggleFilters={() =>
                    filters.setFiltersPanelOpen(
                        !filters.filtersPanelOpen
                    )
                }
                onRefresh={rowsState.refreshRows}
                onShowIgnoredFiles={() => setShowIgnoredModal(true)}
            />



            {filters.filtersPanelOpen && (
                <PricePendingFilters
                    searchTerm={filters.searchTerm}
                    visibleColumns={filters.visibleColumns}
                    filterUpdated={filters.filterUpdated}
                    filterOutdated={filters.filterOutdated}
                    filterBranch={filters.filterBranch}
                    newLaboratory={newLaboratory}
                    hasActiveFilters={filters.hasActiveFilters}
                    permissions={permissions}
                    onSearchTermChange={filters.setSearchTerm}
                    onVisibleColumnsChange={filters.setVisibleColumns}
                    onFilterUpdatedChange={filters.setFilterUpdated}
                    onFilterOutdatedChange={filters.setFilterOutdated}
                    onFilterBranchChange={filters.setFilterBranch}
                    onNewLaboratoryChange={setNewLaboratory}
                    onAddLaboratory={rowsState.addLaboratory}
                    onClearFilters={filters.clearFilters}
                    onClose={() => filters.setFiltersPanelOpen(false)}
                    onExport={() => setExportModalOpen(true)}
                />
            )}



            <div className="price-pending-summary">
                <div className="price-pending-summary-item">
                    <span>Preços atualizados</span>
                    <strong>{summary.pricesUpdated}</strong>
                </div>


                <div className="price-pending-summary-item pending">
                    <span>Preços pendentes</span>
                    <strong>{summary.pricesPending}</strong>
                </div>


                <div className="price-pending-summary-item">
                    <span>Pendências atualizadas</span>
                    <strong>{summary.pendingUpdated}</strong>
                </div>


                <div className="price-pending-summary-item pending">
                    <span>Pendências pendentes</span>
                    <strong>{summary.pendingPending}</strong>
                </div>
            </div>



            {rowsState.error && (
                <div className="price-pending-error">
                    {rowsState.error}
                </div>
            )}



            {rowsState.success && (
                <div className="price-pending-success">
                    {rowsState.success}
                </div>
            )}



            {rowsState.readOnly && (
                <div className="price-pending-read-only-actions">
                    <button
                        type="button"
                        className="price-pending-refresh-button"
                        onClick={rowsState.retryConnection}
                        disabled={rowsState.loading}
                    >
                        Tentar novamente
                    </button>
                </div>
            )}



            <PricePendingTable
                rows={rows}
                allRowsCount={rowsState.allRows.length}
                searchTerm={filters.searchTerm}
                headerGroups={filters.headerGroups}
                visibleColumnsList={filters.visibleColumnsList}
                permissions={permissions}
                savingCell={rowsState.savingCell}
                saving={rowsState.saving}
                readOnly={rowsState.readOnly}
                tableWrapperRef={tableWrapperRef}
                onScroll={handleTableScroll}
                onUpdateValue={rowsState.updateLocalValue}
                onSaveCell={rowsState.saveCell}
                onRemoveLaboratory={rowsState.removeLaboratory}
                onAcceptExternalUpdate={handleAcceptExternalUpdate}
            />



            <PricePendingIgnoredFilesModal
                open={showIgnoredModal}
                files={rowsState.ignoredFiles}
                onClose={() => setShowIgnoredModal(false)}
            />



            <ExportExcelModal
                open={exportModalOpen}
                title="Exportar Preços e Pendências"
                moduleKey="price-pending"
                availableColumns={PRICE_PENDING_EXPORT_COLUMNS}
                onClose={() => setExportModalOpen(false)}
                onExport={handleExport}
            />
        </main>
    );
}