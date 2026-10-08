const {
    ipcMain
} = require("electron");


const service = require(
    "./products-corrections.service"
);


const {
    exportCorrectionsExcel
} = require(
    "./products-corrections-export.service"
);


const {
    getAvailableBranchesForExport,
    exportCorrectionsCsv,
    exportAllCorrectionsCsv
} = require(
    "./products-corrections-single-export.service"
);


let registered = false;


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
            return service.createCorrection(data);
        }
    );


    ipcMain.handle(
        "product-corrections:cancel",
        (event, id) => {
            return service.cancelCorrection(id);
        }
    );


    ipcMain.handle(
        "product-corrections:cancel-many",
        (event, ids = []) => {
            return service.cancelCorrections(ids);
        }
    );


    ipcMain.handle(
        "product-corrections:revert",
        (event, id) => {
            return service.revertCorrection(id);
        }
    );


    ipcMain.handle(
        "product-corrections:revert-many",
        (event, ids = []) => {
            return service.revertCorrections(ids);
        }
    );


    ipcMain.handle(
        "product-corrections:mark-sent",
        (event, correctionIds = []) => {
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
            return service.getBulkCorrectionTargets(
                ean,
                fields
            );
        }
    );


    ipcMain.handle(
        "product-corrections:create-bulk",
        (event, data = {}) => {
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
            return exportCorrectionsCsv(branch);
        }
    );


    ipcMain.handle(
        "product-corrections:export-csv-all",
        () => {
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