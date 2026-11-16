Adicione em src/main/main.js:

1. Importe:
const { registerPricePendingExtensionsIpc } = require("./modules/price-pending/price-pending-extensions.ipc");
const automaticCharge = require("./modules/price-pending/price-pending-automatic-charge.service");

2. Dentro de registerAllIpc(), apos registerPricePendingIpc(ipcMain):
registerPricePendingExtensionsIpc();

3. Dentro de startAlfadime(), apos registerAllIpc():
automaticCharge.start();

4. Dentro de app.on("before-quit"):
automaticCharge.stop();

A cobranca inicia desativada. Nao envie e-mails em testes.
