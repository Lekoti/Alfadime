import { useEffect, useMemo, useRef, useState } from "react";
import PricePendingToolbar from "../components/PricePendingToolbar";
import PricePendingChargeHistoryModal from "../components/PricePendingChargeHistoryModal"; // pp-local-fix-history-v1
import PricePendingChargePanel from "../components/PricePendingChargePanel";
import PricePendingFilters from "../components/PricePendingFilters";
import PricePendingTable from "../components/PricePendingTable";
import PricePendingIgnoredFilesModal from "../components/PricePendingIgnoredFilesModal";
import PricePendingPolicyIssuesModal from "../components/PricePendingPolicyIssuesModal";
import ExportExcelModal from "../../../shared/components/ExportExcelModal";
import usePricePendingPermissions from "../hooks/usePricePendingPermissions";
import usePricePendingFilters from "../hooks/usePricePendingFilters";
import usePricePendingRows from "../hooks/usePricePendingRows";
import { PRICE_PENDING_EXPORT_COLUMNS } from "../constants/price-pending.constants";
import { isUpdatedPeriod } from "../utils/price-pending.utils";
import "../styles/price-pending.css";

function buildSummary(rows, visibleColumnsList) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeColumns = Array.isArray(visibleColumnsList) ? visibleColumnsList : [];
    const priceColumns = safeColumns.filter((c) => c.group === "precos_ok");
    const pendingColumns = safeColumns.filter((c) => c.group === "pendencias_ok");
    const countUpdated = (columns) => {
        let updated = 0;
        safeRows.forEach((row) => columns.forEach((column) => {
            const value = row[column.key];
            if (String(value ?? "").trim() !== "" && isUpdatedPeriod(value)) updated += 1;
        }));
        return updated;
    };
    const pricesUpdated = countUpdated(priceColumns);
    const pendingUpdated = countUpdated(pendingColumns);
    return {
        pricesUpdated,
        pricesPending: Math.max(0, safeRows.length * priceColumns.length - pricesUpdated),
        pendingUpdated,
        pendingPending: Math.max(0, safeRows.length * pendingColumns.length - pendingUpdated)
    };
}

export default function PricePendingPage() {
    const permissions = usePricePendingPermissions();
    const filters = usePricePendingFilters({ permissions });
    const rowsState = usePricePendingRows({ permissions, enabled: !permissions.isLoadingPermissions });
    const [newLaboratory, setNewLaboratory] = useState("");
    const [showIgnoredModal, setShowIgnoredModal] = useState(false);
    const [showPolicyIssuesModal, setShowPolicyIssuesModal] = useState(false);
    const [showChargePanel, setShowChargePanel] = useState(false);
    const [showChargeHistory, setShowChargeHistory] = useState(false);
    const [automaticChargeEnabled, setAutomaticChargeEnabled] = useState(false);
    const [automaticChargeBusy, setAutomaticChargeBusy] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [policyIssues, setPolicyIssues] = useState([]);
    const [policyIssuesLoading, setPolicyIssuesLoading] = useState(false);
    const [policyIssuesError, setPolicyIssuesError] = useState("");
    const tableWrapperRef = useRef(null);
    const scrollTimerRef = useRef(null);
    const rows = useMemo(() => filters.filterRows(rowsState.allRows), [filters, rowsState.allRows]);
    const summary = useMemo(() => buildSummary(rows, filters.visibleColumnsList), [rows, filters.visibleColumnsList]);

    async function loadAutomaticChargeStatus() {
        try {
            const status = await window.alfadime.ipc.invoke("price-pending-automatic-charge:get-status");
            setAutomaticChargeEnabled(Boolean(status?.enabled));
        } catch (error) {
            console.error(error);
            rowsState.setError(error?.message || "Nao foi possivel verificar o status da cobranca automatica.");
        }
    }
    async function loadPolicyIssues() {
        setPolicyIssuesLoading(true); setPolicyIssuesError("");
        try {
            const result = await window.alfadime.ipc.invoke("commercial-policy:read");
            setPolicyIssues(Array.isArray(result?.policyIssues) ? result.policyIssues : []);
        } catch (error) {
            console.error(error);
            setPolicyIssuesError("Nao foi possivel verificar os arquivos de precos fora do padrao.");
        } finally { setPolicyIssuesLoading(false); }
    }
    useEffect(() => { loadPolicyIssues(); loadAutomaticChargeStatus(); }, []);
    useEffect(() => {
        if (rowsState.loading || !tableWrapperRef.current) return;
        tableWrapperRef.current.scrollTop = filters.tableScrollTop;
    }, [filters.tableScrollTop, rowsState.loading]);
    function handleTableScroll(event) {
        const next = event.currentTarget.scrollTop;
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => filters.setTableScrollTop(next), 300);
    }
    async function handleSelectPriority(row, priority) {
        rowsState.setError(""); rowsState.setSuccess("");
        try {
            await rowsState.updatePriority(row, priority);
            rowsState.setSuccess(priority ? "Prioridade atualizada." : "Prioridade removida.");
            return { success: true };
        } catch (error) {
            const message = error?.message || "Não foi possível atualizar a prioridade.";
            rowsState.setError(message);
            return { success: false, error: message };
        }
    }
    async function handleToggleAutomaticCharge() {
        if (!permissions.canManageAutomaticCharge) {
            rowsState.setError("Voce nao tem permissao para ativar ou desativar a cobranca automatica. Solicite a permissao manage_automatic_charge ao administrador.");
            return;
        }
        try {
            setAutomaticChargeBusy(true); rowsState.setError(""); rowsState.setSuccess("");
            const status = await window.alfadime.ipc.invoke("price-pending-automatic-charge:set-enabled", !automaticChargeEnabled);
            setAutomaticChargeEnabled(Boolean(status?.enabled));
            rowsState.setSuccess(status?.enabled ? "Cobranca automatica ativada." : "Cobranca automatica desativada.");
        } catch (error) {
            console.error(error);
            rowsState.setError(error?.message || "Nao foi possivel alterar a cobranca automatica.");
        } finally { setAutomaticChargeBusy(false); }
    }
    function handleShowChargeHistory() { setShowChargeHistory(true); }
    async function handleAcceptExternalUpdate({ id, column }) {
        rowsState.setError(""); rowsState.setSuccess("");
        try {
            await rowsState.acceptExternalUpdate({ id, column });
            rowsState.setSuccess("Proposta externa processada. Valores protegidos foram preservados.");
        } catch (error) {
            rowsState.setError(error?.message || "Não foi possível processar a proposta externa.");
        }
    }
    async function handleExport(selectedColumns) {
        if (!permissions.canExport) { rowsState.setError("Voce nao tem permissao para exportar."); return { cancelled: true }; }
        const fileName = `precos-pendencias-${new Date().toISOString().slice(0,10)}.xlsx`;
        const { filePath, canceled } = await window.alfadime.ipc.invoke("dialog:save-file", { title: "Salvar arquivo Excel", defaultPath: fileName, filters: [{ name: "Excel", extensions: ["xlsx"] }] });
        if (canceled || !filePath) return { cancelled: true };
        const result = await window.alfadime.pricePending.export({ filePath, includeColumns: selectedColumns.map((c) => c.key), rowIds: rows.map((r) => r.id) });
        rowsState.setSuccess(`Exportado com sucesso: ${result.filePath}`);
        return result;
    }
    if (permissions.isLoadingPermissions || rowsState.loading) {
        return <main className="price-pending-page"><div className="price-pending-loading">Carregando laboratorios...</div></main>;
    }
    return (
        <main className="price-pending-page">
            <PricePendingToolbar
                filtersPanelOpen={filters.filtersPanelOpen}
                onToggleFilters={() => filters.setFiltersPanelOpen(!filters.filtersPanelOpen)}
                onOpenChargePanel={() => setShowChargePanel(true)}
            />
            {filters.filtersPanelOpen && (
                <PricePendingFilters
                    searchTerm={filters.searchTerm} visibleColumns={filters.visibleColumns} filterUpdated={filters.filterUpdated}
                    filterOutdated={filters.filterOutdated} filterBranch={filters.filterBranch} newLaboratory={newLaboratory}
                    hasActiveFilters={filters.hasActiveFilters} permissions={permissions} ignoredFilesCount={rowsState.ignoredFiles.length}
                    policyIssuesCount={policyIssues.length} policyIssuesLoading={policyIssuesLoading} canRefresh={permissions.canRefresh}
                    canViewIgnoredFiles={permissions.canViewIgnoredFiles} refreshing={rowsState.refreshing} readOnly={rowsState.readOnly}
                    automaticChargeEnabled={automaticChargeEnabled} automaticChargeBusy={automaticChargeBusy}
                    onSearchTermChange={filters.setSearchTerm} onVisibleColumnsChange={filters.setVisibleColumns}
                    onFilterUpdatedChange={filters.setFilterUpdated} onFilterOutdatedChange={filters.setFilterOutdated} onFilterBranchChange={filters.setFilterBranch}
                    onNewLaboratoryChange={setNewLaboratory}
                    onAddLaboratory={rowsState.addLaboratory} onClearFilters={filters.clearFilters}
                    onClose={() => filters.setFiltersPanelOpen(false)} onExport={() => setExportModalOpen(true)}
                    onRefresh={rowsState.refreshRows} onShowIgnoredFiles={() => setShowIgnoredModal(true)}
                    onShowPolicyIssues={() => setShowPolicyIssuesModal(true)} onReloadPolicyIssues={loadPolicyIssues}
                    onToggleAutomaticCharge={handleToggleAutomaticCharge} onShowChargeHistory={handleShowChargeHistory}
                />
            )}
            <div className="price-pending-summary">
                <div className="price-pending-summary-item"><span>Precos atualizados</span><strong>{summary.pricesUpdated}</strong></div>
                <div className="price-pending-summary-item pending"><span>Precos pendentes</span><strong>{summary.pricesPending}</strong></div>
                <div className="price-pending-summary-item pending"><span>Pendencias atualizadas</span><strong>{summary.pendingUpdated}</strong></div>
                <div className="price-pending-summary-item pending"><span>Pendencias pendentes</span><strong>{summary.pendingPending}</strong></div>
            </div>
            {policyIssuesError && <div className="price-pending-error">{policyIssuesError}</div>}
            {policyIssues.length > 0 && (
                <button type="button" className="price-pending-policy-alert" onClick={() => setShowPolicyIssuesModal(true)}>
                    <strong>{policyIssues.length} arquivo{policyIssues.length > 1 ? "s" : ""} de precos fora do padrao</strong>
                    <span>Politica Comercial nao aplicada para estes arquivos. Clique para ver os detalhes.</span>
                </button>
            )}
            {rowsState.error && <div className="price-pending-error">{rowsState.error}</div>}
            {rowsState.success && <div className="price-pending-success">{rowsState.success}</div>}
            {rowsState.readOnly && (
                <div className="price-pending-read-only-actions">
                    <button type="button" className="price-pending-refresh-button" onClick={rowsState.retryConnection} disabled={rowsState.loading}>Tentar novamente</button>
                </div>
            )}
            <PricePendingTable
                rows={rows} allRowsCount={rowsState.allRows.length} searchTerm={filters.searchTerm}
                headerGroups={filters.headerGroups} visibleColumnsList={filters.visibleColumnsList}
                permissions={permissions} savingCell={rowsState.savingCell} saving={rowsState.saving}
                readOnly={rowsState.readOnly} interactionLocked={rowsState.interactionLocked} tableWrapperRef={tableWrapperRef} onScroll={handleTableScroll}
                onUpdateValue={rowsState.updateLocalValue} onSaveCell={rowsState.saveCell}
                onRemoveLaboratory={rowsState.removeLaboratory} onAcceptExternalUpdate={handleAcceptExternalUpdate}
                onSelectPriority={handleSelectPriority}
            />
            <PricePendingIgnoredFilesModal open={showIgnoredModal} files={rowsState.ignoredFiles} onClose={() => setShowIgnoredModal(false)} />
            <PricePendingPolicyIssuesModal open={showPolicyIssuesModal} files={policyIssues} loading={policyIssuesLoading} onClose={() => setShowPolicyIssuesModal(false)} onReload={loadPolicyIssues} />
            <PricePendingChargePanel
                open={showChargePanel}
                onClose={() => setShowChargePanel(false)}
                canManage={permissions.canManageAutomaticCharge}
            />
            <PricePendingChargeHistoryModal open={showChargeHistory} onClose={() => setShowChargeHistory(false)} />
            <ExportExcelModal open={exportModalOpen} title="Exportar Precos e Pendencias" moduleKey="price-pending" availableColumns={PRICE_PENDING_EXPORT_COLUMNS} onClose={() => setExportModalOpen(false)} onExport={handleExport} />
        </main>
    );
}
