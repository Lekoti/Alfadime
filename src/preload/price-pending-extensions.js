const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("alfadimePricePendingExtensions", {
    updatePriority: (id, priority) => ipcRenderer.invoke("price-pending:update-priority", { id, priority }),
    getAutomaticChargeStatus: () => ipcRenderer.invoke("price-pending-automatic-charge:get-status"),
    setAutomaticChargeEnabled: enabled => ipcRenderer.invoke("price-pending-automatic-charge:set-enabled", enabled),
    listChargeRuns: limit => ipcRenderer.invoke("contacts:list-charge-runs", { limit })
});
