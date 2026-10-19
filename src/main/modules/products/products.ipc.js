const {
    ipcMain
} = require("electron");

const repository = require(
    "./products.repository"
);

const {
    synchronizeProductsExcel
} = require("./products-import.service");

const {
    exportProductsAdvanced,
    countProductsForExport,
    getExportTemplates,
    saveExportTemplate,
    deleteExportTemplate
} = require("./products-export.service");

const {
    PRODUCTS_EXCEL_PATH
} = require("./products.config");

const authHandler = require(
    "../auth/authHandler"
);

const {
    getSyncMetadata,
    setSyncMetadata
} = require(
    "../../database/sync-metadata.repository"
);

const {
    USER_ROLES
} = require(
    "../auth/userRoles.constants"
);

let registered = false;


function getAuthenticatedUser() {
    return authHandler.getAuthenticatedUser();
}


function canSynchronizeDatabase(user) {
    const role = String(user?.role || "").toLowerCase();


    return [
        USER_ROLES.CREATOR,
        USER_ROLES.ADMIN,
        USER_ROLES.EDITOR
    ].includes(role);
}


function requireSyncPermission() {
    const user = getAuthenticatedUser();


    if (!user) {
        throw new Error("Usuário não autenticado.");
    }


    if (!canSynchronizeDatabase(user)) {
        throw new Error(
            "Apenas Administradores e Staff podem atualizar o banco de dados."
        );
    }


    return user;
}


function registerProductsIpc() {
    if (registered) {
        return;
    }

    registered = true;

    ipcMain.handle(
        "products:list",
        (event, filters = {}) => {
            const result = repository.listProducts(filters);
            console.log("[PRODUCTS][IPC]", {
                filters,
                rows: result?.rows?.length,
                pagination: result?.pagination
            });
            return result;
        }
    );

    ipcMain.handle(
        "products:get-filter-options",
        (event, field) => {
            return repository.getUniqueFilterValues(field);
        }
    );

    ipcMain.handle(
        "products:get-last-sync",
        () => {
            return getSyncMetadata("products");
        }
    );

    ipcMain.handle(
        "products:sync-excel",
        async () => {
            console.log('[PRODUCTS][SYNC] Iniciando sincronizacao...');
            console.log('[PRODUCTS][SYNC] Caminho:', PRODUCTS_EXCEL_PATH);

            const user = requireSyncPermission();

            try {
                const result = synchronizeProductsExcel(
                    PRODUCTS_EXCEL_PATH
                );

                setSyncMetadata({
                    moduleKey: "products",
                    syncedBy: user.username || user.name || "",
                    source: PRODUCTS_EXCEL_PATH
                });

                console.log('[PRODUCTS][SYNC] Sucesso:', result);
                return result;
            } catch (error) {
                console.error('[PRODUCTS][SYNC] ERRO:', error.message);
                console.error('[PRODUCTS][SYNC] Stack:', error.stack);
                throw error;
            }
        }
    );

    ipcMain.handle(
        "products:export-preview",
        (event, filters, columns) => {
            const count = countProductsForExport(filters);
            return count;
        }
    );

    ipcMain.handle(
        "products:export-advanced",
        async (event, filters, columns) => {
            return await exportProductsAdvanced(filters, columns);
        }
    );

    ipcMain.handle(
        "export:templates:get",
        (event, moduleKey) => {
            return getExportTemplates(moduleKey);
        }
    );

    ipcMain.handle(
        "export:templates:save",
        (event, moduleKey, name, filters, columns) => {
            return saveExportTemplate(moduleKey, name, filters, columns);
        }
    );

    ipcMain.handle(
        "export:templates:delete",
        (event, moduleKey, templateId) => {
            return deleteExportTemplate(moduleKey, templateId);
        }
    );
}

module.exports = {
    registerProductsIpc
};