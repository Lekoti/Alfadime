const {
    ipcMain
} = require("electron");

const service = require(
    "./product-audit.service"
);

let registered = false;

function registerProductAuditIpc() {
    if (registered) {
        return;
    }

    registered = true;

    ipcMain.handle(
        "product-audit:list",
        (event, filters = {}) => {
            return service.listAuditIssues(filters);
        }
    );

    ipcMain.handle(
        "product-audit:filter-options",
        (event, field) => {
            return service.getAuditFilterOptions(field);
        }
    );
}

module.exports = {
    registerProductAuditIpc
};