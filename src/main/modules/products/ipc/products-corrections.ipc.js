const {
    ipcMain
} = require("electron");


const service = require(
    "../services/products-corrections.service"
);


const {
    exportCorrectionsExcel
} = require(
    "../services/products-corrections-export.service"
);


const {
    getAvailableBranchesForExport,
    exportCorrectionsCsv,
    exportAllCorrectionsCsv
} = require(
    "../services/products-corrections-single-export.service"
);


const authHandler = require(
    "../../auth/authHandler"
);

const {
    USER_ROLES
} = require(
    "../../auth/userRoles.constants"
);


let registered = false;


function getAuthenticatedUser() {
    return authHandler.getAuthenticatedUser();
}


function requireCorrectionPermission() {
    const user = getAuthenticatedUser();

    if (!user) {
        throw new Error(
            "Usuário não autenticado."
        );
    }

    const role = String(
        user.role || ""
    ).toLowerCase();

    if (
        ![
            USER_ROLES.CREATOR,
            USER_ROLES.ADMIN,
            USER_ROLES.EDITOR
        ].includes(role)
    ) {
        throw new Error(
            "Você não tem permissão para alterar correções de produtos."
        );
    }

    return user;
}


function registerProductCorrectionsIpc() {
    if (registered) {
        return;
    }


    registered = true;


    ipcMain.handle(
        "product-corrections:list",
        (event, filters = {}) => {
            return service.listCorrections(filters);
        }
    );


    ipcMain.handle(
        "product-corrections:filter-options",
        () => {
            return service.getCorrectionFilterOptions();
        }
    );


    ipcMain.handle(
        "product-corrections:create",
        (event, data) => {
            requireCorrectionPermission();

            return service.createCorrection(data);
        }
    );


    ipcMain.handle(
        "product-corrections:cancel",
        (event, id) => {
            requireCorrectionPermission();

            return service.cancelCorrection(id);
        }
    );


    ipcMain.handle(
        "product-corrections:cancel-many",
        (event, ids = []) => {
            requireCorrectionPermission();

            return service.cancelCorrections(ids);
        }
    );


    ipcMain.handle(
        "product-corrections:revert",
        (event, id) => {
            requireCorrectionPermission();

            return service.revertCorrection(id);
        }
    );


    ipcMain.handle(
        "product-corrections:revert-many",
        (event, ids = []) => {
            requireCorrectionPermission();

            return service.revertCorrections(ids);
        }
    );


    ipcMain.handle(
        "product-corrections:mark-sent",
        (event, correctionIds = []) => {
            requireCorrectionPermission();

            return service.markCorrectionsAsSent(
                correctionIds
            );
        }
    );


    ipcMain.handle(
        "product-corrections:pending-by-products",
        (event, productIds = []) => {
            return service.getPendingCorrectionsForProducts(
                productIds
            );
        }
    );


    ipcMain.handle(
        "product-corrections:fields",
        () => {
            return service.getCorrectableFields();
        }
    );


    ipcMain.handle(
        "product-corrections:bulk-targets",
        (event, ean, fields = []) => {
            requireCorrectionPermission();

            return service.getBulkCorrectionTargets(
                ean,
                fields
            );
        }
    );


    ipcMain.handle(
        "product-corrections:create-bulk",
        (event, data = {}) => {
            requireCorrectionPermission();

            return service.createBulkCorrections(
                data
            );
        }
    );


    ipcMain.handle(
        "product-corrections:export-csv-branches",
        () => {
            return getAvailableBranchesForExport();
        }
    );


    ipcMain.handle(
        "product-corrections:export-csv",
        (event, branch) => {
            requireCorrectionPermission();

            return exportCorrectionsCsv(branch);
        }
    );


    ipcMain.handle(
        "product-corrections:export-csv-all",
        () => {
            requireCorrectionPermission();

            return exportAllCorrectionsCsv();
        }
    );


    ipcMain.handle(
        "product-corrections:export-excel",
        (event, filters = {}, columns = []) => {
            return exportCorrectionsExcel(
                filters,
                columns
            );
        }
    );
}


module.exports = {
    registerProductCorrectionsIpc
};