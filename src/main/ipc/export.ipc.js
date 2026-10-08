const {
    ipcMain
} = require("electron");


const preferencesRepository = require(
    "../services/export-preferences.repository"
);


const {
    exportProductsExcel
} = require(
    "../modules/products/products-export.service"
);


const {
    exportAuditExcel
} = require(
    "../modules/product-audit/product-audit-export.service"
);


const {
    exportCorrectionsExcel
} = require(
    "../modules/products/products-corrections-export.service"
);


const {
    exportIndustryContactsExcel
} = require(
    "../modules/industry-contacts/industry-contacts-export.service"
);


let registered = false;


function registerExportIpc() {
    if (registered) {
        return;
    }


    registered = true;


    ipcMain.handle(
        "export:preferences:get",
        (event, moduleKey) => {
            return preferencesRepository.getExportPreference(
                moduleKey
            );
        }
    );


    ipcMain.handle(
        "export:preferences:save",
        (event, moduleKey, columns) => {
            return preferencesRepository.saveExportPreference(
                moduleKey,
                columns
            );
        }
    );


    ipcMain.handle(
        "export:products",
        (event, filters, columns) => {
            return exportProductsExcel(
                filters,
                columns
            );
        }
    );


    ipcMain.handle(
        "export:product-audit",
        (event, filters, columns) => {
            return exportAuditExcel(
                filters,
                columns
            );
        }
    );


    ipcMain.handle(
        "export:product-corrections",
        (event, filters, columns) => {
            return exportCorrectionsExcel(
                filters,
                columns
            );
        }
    );


    ipcMain.handle(
        "export:industry-contacts",
        (event, filters, columns, rows) => {
            return exportIndustryContactsExcel(
                rows,
                columns
            );
        }
    );
}


module.exports = {
    registerExportIpc
};