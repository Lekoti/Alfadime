const {
    app,
    BrowserWindow,
    ipcMain,
    dialog
} = require("electron");

const path = require(
    "node:path"
);

const {
    autoUpdater
} = require(
    "electron-updater"
);

const {
    getDatabase,
    getDatabasePath,
    closeDatabase
} = require(
    "./database/connection"
);

const {
    registerPricePendingIpc
} = require(
    "./modules/price-pending/price-pending.ipc"
);

const {
    registerProductsIpc
} = require(
    "./modules/products/products.ipc"
);

const {
    registerIndustryContactsIpc
} = require(
    "./modules/industry-contacts/industry-contacts.ipc"
);

const {
    registerNotificationsIpc
} = require(
    "./modules/notifications/notifications.ipc"
);

const {
    registerProductCorrectionsIpc
} = require(
    "./modules/products/products-corrections.ipc"
);

const {
    registerPurchasesIpc
} = require(
    "./modules/purchases/purchases.ipc"
);

const {
    registerProductAuditIpc
} = require(
    "./modules/product-audit/product-audit.ipc"
);

const {
    registerExportIpc
} = require(
    "./ipc/export.ipc"
);

const {
    registerEmailDispatchIpc
} = require(
    "./modules/email-dispatch/email-dispatch.ipc"
);

const {
    registerEmailReceivedIpc
} = require(
    "./modules/email-dispatch/email-dispatch-received.ipc"
);

const {
    registerAuthIpc
} = require(
    "./modules/auth/auth.ipc"
);

let mainWindow = null;
let appIpcRegistered = false;
let updaterConfigured = false;
let updateDownloaded = false;


function logStartup(
    step,
    extra = ""
) {
    const suffix =
        extra
            ? ` | ${extra}`
            : "";

    console.log(
        `[STARTUP] ${new Date().toISOString()} | ${step}${suffix}`
    );
}


function showStartupError(
    title,
    error
) {
    const message =
        error && error.stack
            ? error.stack
            : String(
                error?.message ||
                error ||
                "Erro desconhecido."
            );

    console.error(
        title,
        message
    );

    if (
        app.isReady()
    ) {
        dialog.showErrorBox(
            title,
            message
        );
    }
}


function sendUpdateStatus(
    status,
    data = {}
) {
    if (
        !mainWindow ||
        mainWindow.isDestroyed()
    ) {
        return;
    }

    mainWindow.webContents.send(
        "app:update-status",
        {
            status,
            version:
                app.getVersion(),
            ...data
        }
    );
}


function configureAutoUpdater() {
    if (
        updaterConfigured
    ) {
        return;
    }

    updaterConfigured =
        true;

    autoUpdater.autoDownload =
        false;

    autoUpdater.autoInstallOnAppQuit =
        true;

    autoUpdater.on(
        "checking-for-update",
        () => {
            logStartup(
                "Verificando atualizações"
            );

            sendUpdateStatus(
                "checking"
            );
        }
    );

    autoUpdater.on(
        "update-available",
        (info) => {
            logStartup(
                "Atualização disponível",
                info.version
            );

            sendUpdateStatus(
                "available",
                {
                    availableVersion:
                        info.version
                }
            );
        }
    );

    autoUpdater.on(
        "update-not-available",
        (info) => {
            logStartup(
                "Aplicativo atualizado",
                info.version
            );

            sendUpdateStatus(
                "not-available"
            );
        }
    );

    autoUpdater.on(
        "download-progress",
        (progress) => {
            sendUpdateStatus(
                "downloading",
                {
                    percent:
                        Number(
                            progress.percent ||
                            0
                        ),
                    transferred:
                        progress.transferred,
                    total:
                        progress.total
                }
            );
        }
    );

    autoUpdater.on(
        "update-downloaded",
        (info) => {
            updateDownloaded =
                true;

            logStartup(
                "Atualização baixada",
                info.version
            );

            sendUpdateStatus(
                "downloaded",
                {
                    availableVersion:
                        info.version
                }
            );
        }
    );

    autoUpdater.on(
        "error",
        (error) => {
            console.error(
                "[UPDATER] Erro:",
                error
            );

            sendUpdateStatus(
                "error",
                {
                    message:
                        error?.message ||
                        "Erro ao verificar atualização."
                }
            );
        }
    );
}


async function checkForUpdates() {
    if (
        !app.isPackaged
    ) {
        sendUpdateStatus(
            "disabled",
            {
                message:
                    "Atualizações automáticas disponíveis somente no instalador."
            }
        );

        return {
            success: false,
            reason:
                "development"
        };
    }

    configureAutoUpdater();

    try {
        const result =
            await autoUpdater.checkForUpdates();

        return {
            success: true,
            version:
                result?.updateInfo
                    ?.version ||
                null
        };
    } catch (
        error
    ) {
        console.error(
            "[UPDATER] Falha ao verificar atualização:",
            error
        );

        return {
            success: false,
            error:
                error?.message ||
                "Não foi possível verificar atualizações."
        };
    }
}


function downloadUpdate() {
    if (
        !app.isPackaged
    ) {
        return Promise.resolve({
            success: false,
            reason:
                "development"
        });
    }

    configureAutoUpdater();

    return autoUpdater
        .downloadUpdate()
        .then(
            () => ({
                success: true
            })
        )
        .catch(
            (error) => {
                console.error(
                    "[UPDATER] Falha ao baixar atualização:",
                    error
                );

                return {
                    success: false,
                    error:
                        error?.message ||
                        "Não foi possível baixar a atualização."
                };
            }
        );
}


function installUpdate() {
    if (
        !updateDownloaded
    ) {
        return {
            success: false,
            reason:
                "not-downloaded"
        };
    }

    setImmediate(
        () => {
            autoUpdater.quitAndInstall(
                false,
                true
            );
        }
    );

    return {
        success: true
    };
}


process.on(
    "uncaughtException",
    (error) => {
        showStartupError(
            "Erro crítico ao iniciar o Alfadime",
            error
        );
    }
);


process.on(
    "unhandledRejection",
    (error) => {
        showStartupError(
            "Erro não tratado no Alfadime",
            error
        );
    }
);


function registerAppIpc() {
    if (
        appIpcRegistered
    ) {
        return;
    }

    appIpcRegistered =
        true;

    ipcMain.handle(
        "app:get-version",
        () => {
            return app.getVersion();
        }
    );

    ipcMain.handle(
        "app:get-open-at-login",
        () => {
            return app
                .getLoginItemSettings()
                .openAtLogin;
        }
    );

    ipcMain.handle(
        "app:set-open-at-login",
        (
            _event,
            enabled
        ) => {
            app.setLoginItemSettings({
                openAtLogin:
                    Boolean(
                        enabled
                    )
            });

            return app
                .getLoginItemSettings()
                .openAtLogin;
        }
    );

    ipcMain.handle(
        "app:check-for-updates",
        () => {
            return checkForUpdates();
        }
    );

    ipcMain.handle(
        "app:download-update",
        () => {
            return downloadUpdate();
        }
    );

    ipcMain.handle(
        "app:install-update",
        () => {
            return installUpdate();
        }
    );

    ipcMain.handle(
        "app:is-update-downloaded",
        () => {
            return updateDownloaded;
        }
    );

    ipcMain.handle(
        "dialog:save-file",
        (
            _event,
            options
        ) => {
            return dialog.showSaveDialog(
                mainWindow,
                options
            );
        }
    );
}


ipcMain.handle(
    "debug:get-db-path",
    () => {
        const dbPath =
            getDatabasePath();

        console.log(
            "[DEBUG] DB Path:",
            dbPath
        );

        return dbPath;
    }
);


async function createMainWindow() {
    logStartup(
        "Criando janela principal"
    );

    const appIconPath =
        path.join(
            process.resourcesPath,
            "Alfadime.ico"
        );

    mainWindow =
        new BrowserWindow({
            width: 1400,
            height: 850,
            minWidth: 1100,
            minHeight: 700,
            show: false,
            title: "Alfadime",
            icon: appIconPath,
            webPreferences: {
                preload: path.join(
                    __dirname,
                    "../preload/preload.js"
                ),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false
            }
        });

    if (
        process.platform ===
        "win32"
    ) {
        mainWindow.setAppDetails({
            appId: "com.alfadime.app",
            appIconPath,
            appIconIndex: 0
        });
    }

    mainWindow.on(
        "closed",
        () => {
            mainWindow = null;
        }
    );

    mainWindow.webContents.on(
        "did-fail-load",
        (
            _event,
            code,
            description,
            url
        ) => {
            console.error(
                "Falha ao carregar renderer:",
                {
                    code,
                    description,
                    url
                }
            );
        }
    );

    mainWindow.webContents.on(
        "render-process-gone",
        (
            _event,
            details
        ) => {
            console.error(
                "Renderer encerrado:",
                details
            );
        }
    );

    mainWindow.webContents.once(
        "did-finish-load",
        () => {
            logStartup(
                "Renderer carregado; exibindo janela"
            );

            if (
                mainWindow &&
                !mainWindow.isDestroyed()
            ) {
                mainWindow.show();

                setTimeout(
                    () => {
                        checkForUpdates();
                    },
                    2500
                );
            }
        }
    );

    const isDev =
        process.env.VITE_DEV_SERVER_URL ||
        process.env.NODE_ENV ===
        "development" ||
        process.argv.includes(
            "--dev"
        );

    if (
        isDev &&
        process.env.VITE_DEV_SERVER_URL
    ) {
        logStartup(
            "Carregando renderer em desenvolvimento",
            process.env.VITE_DEV_SERVER_URL
        );

        await mainWindow.loadURL(
            process.env.VITE_DEV_SERVER_URL
        );

        return;
    }

    const indexPath =
        path.join(
            __dirname,
            "../../dist/renderer/index.html"
        );

    logStartup(
        "Carregando renderer de produção",
        indexPath
    );

    await mainWindow.loadFile(
        indexPath
    );
}


function initializeLocalServices() {
    try {
        logStartup(
            "Abrindo banco local",
            getDatabasePath()
        );

        getDatabase();

        const {
            DEFAULT_SHARED_DATABASE_PATH
        } = require(
            "./modules/price-pending/price-pending.database"
        );

        const {
            ensureDefaultDbConfig
        } = require(
            "./modules/price-pending/price-pending-db-config.repository"
        );

        ensureDefaultDbConfig(
            DEFAULT_SHARED_DATABASE_PATH
        );

        logStartup(
            "Banco local e configurações prontos"
        );
    } catch (
        error
    ) {
        console.error(
            "[STARTUP] Falha ao preparar banco local:",
            error
        );
    }
}


function registerAllIpc() {
    logStartup(
        "Registrando canais IPC"
    );

    registerAppIpc();

    registerAuthIpc(
        ipcMain
    );

    registerPricePendingIpc(
        ipcMain
    );

    registerProductsIpc(
        ipcMain
    );

    registerIndustryContactsIpc(
        ipcMain
    );

    registerNotificationsIpc(
        ipcMain
    );

    registerProductCorrectionsIpc(
        ipcMain
    );

    registerPurchasesIpc(
        ipcMain
    );

    registerProductAuditIpc(
        ipcMain
    );

    registerExportIpc(
        ipcMain
    );

    registerEmailDispatchIpc(
        ipcMain
    );

    registerEmailReceivedIpc(
        ipcMain
    );

    logStartup(
        "Canais IPC registrados"
    );
}


async function startAlfadime() {
    const startedAt =
        Date.now();

    try {
        logStartup(
            "Início do Alfadime"
        );

        initializeLocalServices();
        registerAllIpc();

        await createMainWindow();

        logStartup(
            "Inicialização concluída",
            `${Date.now() - startedAt} ms`
        );
    } catch (
        error
    ) {
        console.error(
            "Erro ao inicializar Alfadime:",
            error
        );

        showStartupError(
            "Não foi possível iniciar o Alfadime",
            error
        );
    }
}


if (
    process.platform ===
    "win32"
) {
    app.setAppUserModelId(
        "com.alfadime.app"
    );
}


app.whenReady().then(
    startAlfadime
);


app.on(
    "before-quit",
    () => {
        logStartup(
            "Encerrando Alfadime"
        );

        closeDatabase();
    }
);


app.on(
    "window-all-closed",
    () => {
        if (
            process.platform !==
            "darwin"
        ) {
            app.quit();
        }
    }
);