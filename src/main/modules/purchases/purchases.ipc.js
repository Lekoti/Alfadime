const { ipcMain } = require('electron');
const path = require('node:path');
const purchasesService = require('./purchases.service');
const { synchronizePurchasesCurveExcel } = require('./purchases-import.service');
const exportService = require('./purchases-export.service');




function registerPurchasesIpc() {
    ipcMain.handle('purchases:list-suggestions', async (event, filters) => {
        return await purchasesService.listPurchaseSuggestions(filters);
    });


    ipcMain.handle('purchases:get-filter-options', async (event, field) => {
        return await purchasesService.getPurchaseFilterOptions(field);
    });




    ipcMain.handle('purchases:sync-curve-excel', async () => {
        const curveExcelPath = '\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\CURVA COMPRAS\\CURVA COMPRAS.xlsx';
        return await synchronizePurchasesCurveExcel(curveExcelPath);
    });




    ipcMain.handle('purchases:changed', async () => {
        // Evento de mudança
    });




    ipcMain.handle('purchases:set-quantity-override', async (event, payload) => {
        const { id, quantity } = payload || {};


        return await purchasesService.setQuantityOverride(id, quantity);
    });




    ipcMain.handle('purchases:get-quantity-overrides-count', async () => {
        return await purchasesService.getQuantityOverridesCount();
    });




    ipcMain.handle('purchases:clear-quantity-overrides', async () => {
        return await purchasesService.clearQuantityOverrides();
    });




    ipcMain.handle('purchases:export-excel', async (event, payload) => {
        const {
            selectedIds,
            selectAllFiltered,
            filters,
            visibleColumns,
            columnOrder
        } = payload || {};




        if (selectAllFiltered) {
            const allRows = await purchasesService.getAllCurveProducts(filters);
            const selectedIdsFromFilters = Array.isArray(allRows)
                ? allRows.map((row) => row.id)
                : [];




            return await exportService.exportStandardExcel(selectedIdsFromFilters, {
                visibleColumns,
                columnOrder,
                curveDays: filters?.curveDays || {}
            });
        }




        if (Array.isArray(selectedIds) && selectedIds.length > 0) {
            return await exportService.exportStandardExcel(selectedIds, {
                visibleColumns,
                columnOrder,
                curveDays: filters?.curveDays || {}
            });
        }




        throw new Error('Nenhum produto selecionado para exportar.');
    });
}




module.exports = { registerPurchasesIpc };
