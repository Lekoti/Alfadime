const { ipcMain } = require('electron');
const path = require('node:path');
const purchasesService = require('./purchases.service');
const { synchronizePurchasesCurveExcel } = require('./purchases-import.service');
const exportService = require('./purchases-export.service');
const authHandler = require('../auth/authHandler');
const {
    getSyncMetadata,
    setSyncMetadata
} = require('../../database/sync-metadata.repository');
const {
    USER_ROLES
} = require('../auth/userRoles.constants');




const PURCHASES_CURVE_EXCEL_PATH =
    '\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\CURVA COMPRAS\\CURVA COMPRAS.xlsx';




function getAuthenticatedUser() {
    return authHandler.getAuthenticatedUser();
}


function canSynchronizeDatabase(user) {
    const role = String(user?.role || '').toLowerCase();


    return [
        USER_ROLES.CREATOR,
        USER_ROLES.ADMIN,
        USER_ROLES.EDITOR
    ].includes(role);
}


function requireSyncPermission() {
    const user = getAuthenticatedUser();


    if (!user) {
        throw new Error('Usuário não autenticado.');
    }


    if (!canSynchronizeDatabase(user)) {
        throw new Error(
            'Apenas Administradores e Staff podem atualizar o banco de dados.'
        );
    }


    return user;
}




function registerPurchasesIpc() {
    ipcMain.handle('purchases:list-suggestions', async (event, filters) => {
        return await purchasesService.listPurchaseSuggestions(filters);
    });


    ipcMain.handle('purchases:get-filter-options', async (event, field) => {
        return await purchasesService.getPurchaseFilterOptions(field);
    });


    ipcMain.handle('purchases:get-last-sync', () => {
        return getSyncMetadata('purchases');
    });


    ipcMain.handle('purchases:sync-curve-excel', async () => {
        const user = requireSyncPermission();

        try {
            const result = await synchronizePurchasesCurveExcel(
                PURCHASES_CURVE_EXCEL_PATH
            );

            setSyncMetadata({
                moduleKey: 'purchases',
                syncedBy: user.username || user.name || '',
                source: PURCHASES_CURVE_EXCEL_PATH
            });

            return result;
        } catch (syncError) {
            console.error(
                '[PURCHASES][SYNC] Erro:',
                syncError.message
            );

            throw syncError;
        }
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