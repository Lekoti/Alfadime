import { useEffect, useMemo, useState } from "react";

import MerchandiseFilters from "../components/MerchandiseFilters";
import MerchandiseImportPanel from "../components/MerchandiseImportPanel";
import MerchandisePremises from "../components/MerchandisePremises";
import MerchandiseSummaryTables from "../components/MerchandiseSummaryTables";
import MerchandiseTable from "../components/MerchandiseTable";
import { buildColumns } from "../constants/merchandise-purchases.constants";
import { useMerchandisePurchases } from "../hooks/useMerchandisePurchases";
import { buildSummaryTables } from "../services/merchandiseCalculation.service";
import { exportMerchandiseExcel } from "../services/merchandiseExport.service";
import "../styles/merchandise-purchases.css";

const PAGE_SIZE = 100;
const INT = new Intl.NumberFormat("pt-BR");
const BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

export default function MerchandisePurchasesPage() {
    const {
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
        setQuantity,
        importFile,
        clearImport
    } = useMerchandisePurchases();

    const [panelOpen, setPanelOpen] = useState(true);
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState(null);

    const columns = useMemo(
        () => buildColumns(premises.closedMonth),
        [premises.closedMonth]
    );

    const tables = useMemo(
        () => (rows.length > 0 ? buildSummaryTables(rows) : null),
        [rows]
    );

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);

    const pageRows = useMemo(
        () => rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        [rows, currentPage]
    );

    const allSelected =
        rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

    useEffect(() => {
        setPage(1);
        setSelectedIds(new Set());
    }, [filters, imported]);

    function toggleSelection(id) {
        setSelectedIds((current) => {
            const next = new Set(current);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function toggleAll() {
        setSelectedIds(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
    }

    function buildFiltersLabel() {
        const parts = [];

        if (filters.company) parts.push(`Empresa: ${filters.company}`);
        if (filters.laboratory) parts.push(`Laboratório: ${filters.laboratory}`);
        if (filters.group) parts.push(`Tipo: ${filters.group}`);
        if (filters.curve) parts.push(`Curva: ${filters.curve}`);
        if (filters.status) parts.push(`Situação: ${filters.status}`);
        if (filters.search) parts.push(`Busca: ${filters.search}`);

        return parts.length > 0 ? parts.join(" | ") : "Todas as empresas e laboratórios";
    }

    async function handleExport() {
        const exportRows =
            selectedIds.size > 0
                ? rows.filter((row) => selectedIds.has(row.id))
                : rows;

        if (exportRows.length === 0) {
            setExportError("Nenhum produto para exportar.");
            return;
        }

        try {
            setExporting(true);
            setExportError(null);

            await exportMerchandiseExcel({
                rows: exportRows,
                tables: buildSummaryTables(exportRows),
                premises,
                importInfo: imported,
                filtersLabel: buildFiltersLabel()
            });
        } catch (exportErr) {
            console.error(exportErr);
            setExportError(exportErr.message || "Erro ao exportar.");
        } finally {
            setExporting(false);
        }
    }

    return (
        <main className="mp-page">
            <div className="mp-title-bar">
                <h1>Compras de Mercadorias</h1>

                <button
                    type="button"
                    className="mp-filters-toggle"
                    onClick={() => setPanelOpen((current) => !current)}
                >
                    {panelOpen ? "Fechar filtros e ações" : "Filtros e ações"}
                </button>
            </div>

            {panelOpen && (
                <section className="mp-floating-panel">
                    <div className="mp-panel-section">
                        <div className="mp-panel-section-title">Planilha</div>

                        <MerchandiseImportPanel
                            imported={imported}
                            loading={loading}
                            onFileSelected={importFile}
                            onClear={clearImport}
                        />
                    </div>

                    {imported && (
                        <>
                            <div className="mp-panel-section">
                                <div className="mp-panel-section-title">Filtros</div>

                                <MerchandiseFilters
                                    filters={filters}
                                    options={options}
                                    onChange={setFilters}
                                />
                            </div>

                            <div className="mp-panel-section">
                                <div className="mp-panel-section-title">Premissas</div>

                                <MerchandisePremises
                                    premises={premises}
                                    onChange={setPremises}
                                />
                            </div>

                            <div className="mp-panel-section">
                                <div className="mp-panel-section-title">Resumo</div>

                                <div className="mp-summary-grid">
                                    <div className="mp-summary-item">
                                        <small>Produtos exibidos</small>
                                        <strong>{INT.format(summary.products)}</strong>
                                    </div>
                                    <div className="mp-summary-item">
                                        <small>Itens a comprar</small>
                                        <strong>{INT.format(summary.itemsToBuy)}</strong>
                                    </div>
                                    <div className="mp-summary-item">
                                        <small>Qtde a comprar</small>
                                        <strong>{INT.format(summary.totalQty)}</strong>
                                    </div>
                                    <div className="mp-summary-item">
                                        <small>Valor selecionado</small>
                                        <strong>{BRL.format(summary.totalValue)}</strong>
                                    </div>
                                    <div className="mp-summary-item">
                                        <small>Valor sugestão período</small>
                                        <strong>{BRL.format(summary.periodValue)}</strong>
                                    </div>
                                    <div className="mp-summary-item">
                                        <small>Sem preço</small>
                                        <strong>{INT.format(summary.noPrice)}</strong>
                                    </div>
                                    <div className="mp-summary-item">
                                        <small>Caixa inválida</small>
                                        <strong>{INT.format(summary.invalidBox)}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="mp-panel-section">
                                <div className="mp-panel-section-title">Ações</div>

                                <div className="mp-panel-actions">
                                    <button
                                        type="button"
                                        className="mp-action-button"
                                        onClick={handleExport}
                                        disabled={exporting || rows.length === 0}
                                    >
                                        {exporting
                                            ? "Exportando..."
                                            : selectedIds.size > 0
                                                ? `Exportar Excel (${INT.format(selectedIds.size)} selecionados)`
                                                : "Exportar Excel (filtrados)"}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            )}

            {error && (
                <div className="mp-error">
                    <strong>Erro:</strong> {error}
                </div>
            )}

            {exportError && (
                <div className="mp-error">
                    <strong>Erro:</strong> {exportError}
                </div>
            )}

            <section className="mp-card">
                <div className="mp-card-header">
                    <div>
                        <strong>Simulação de compra</strong>

                        <span>
                            {imported
                                ? `Exibindo ${INT.format(pageRows.length)} de ${INT.format(rows.length)} produtos. A quantidade a comprar pode ser alterada manualmente.`
                                : "Importe a planilha no padrão 27.10 para iniciar."}
                        </span>
                    </div>

                    <div className="mp-selection-info">
                        <strong>{INT.format(selectedIds.size)}</strong> selecionados
                    </div>
                </div>

                {loading ? (
                    <div className="mp-loading">Importando e calculando a planilha...</div>
                ) : imported ? (
                    <>
                        <MerchandiseTable
                            rows={pageRows}
                            columns={columns}
                            selectedIds={selectedIds}
                            allSelected={allSelected}
                            onToggleSelection={toggleSelection}
                            onToggleAll={toggleAll}
                            onQuantityChange={setQuantity}
                        />

                        <div className="mp-summary-tables-wrapper">
                            <MerchandiseSummaryTables tables={tables} />
                        </div>
                    </>
                ) : (
                    <div className="mp-loading">Nenhuma planilha importada.</div>
                )}

                {imported && (
                    <div className="mp-pagination">
                        <span>
                            Página {currentPage} de {totalPages}
                        </span>

                        <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => setPage(currentPage - 1)}
                        >
                            Anterior
                        </button>

                        <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setPage(currentPage + 1)}
                        >
                            Próxima
                        </button>
                    </div>
                )}
            </section>
        </main>
    );
}
