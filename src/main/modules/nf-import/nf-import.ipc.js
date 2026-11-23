const { dialog, BrowserWindow } = require("electron");
const auth = require("../auth/authHandler");
const permissions = require("../auth/granularPermissionsDatabaseService");
const files = require("./nf-import-files.service");
const { lookupProducts } = require("./nf-import.repository");
let registered = false;
function authorize() {
    const user = auth.getAuthenticatedUser();
    if (!user?.id) throw new Error("Sessão não autenticada.");
    const result = permissions.getPermissionsForUser(user.id);
    if (!result?.success || !result.data?.modules?.some((item) => item.module_key === "products" && item.can_view)) {
        throw new Error("Sem permissão de consulta de Produtos.");
    }
}
function registerNfImportIpc(ipcMain) {
    if (registered) return;
    registered = true;
    function handle(name, action) {
        ipcMain.handle(`nf-import:${name}`, async (event, payload) => {
            try {
                if (event.senderFrame !== event.sender.mainFrame) throw new Error("Origem IPC inválida.");
                authorize();
                return { success: true, data: await action(event, payload) };
            } catch (error) { return { success: false, error: error.message || "Falha na consulta." }; }
        });
    }
    handle("root", () => files.getRoot());
    handle("scan", () => files.scanFolders());
    handle("read", (_event, id) => files.readEntry(id));
    handle("products", (_event, eans) => lookupProducts(eans));
    handle("choose-root", async (event) => {
        const response = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
            title: "Selecionar pasta IMPORTACAO_AUTOMATICA", properties: ["openDirectory"]
        });
        if (response.canceled) return null;
        files.setRoot(response.filePaths[0]);
        return files.getRoot();
    });
    handle("open", async (event) => {
        const response = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
            title: "Consultar XML de NF-e", properties: ["openFile"], filters: [{ name: "XML de NF-e", extensions: ["xml"] }]
        });
        if (response.canceled) return null;
        const filePath = response.filePaths[0];
        return { xml: await files.readXml(filePath), fileName: require("node:path").basename(filePath), folderBranch: null };
    });
}
module.exports = { registerNfImportIpc };
