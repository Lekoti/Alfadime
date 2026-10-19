import { useEffect, useState } from "react";



import useAuth from "../../auth/hooks/useAuth";
import settingsUsersService from "../services/settingsUsersService";



import {
    getStoredTheme,
    setTheme
} from "../../../shared/theme";



import "../styles/settings.css";



function SettingsGeneralPage() {
    const {
        isCreator,
        isAdmin,
        isEditor
    } = useAuth();



    const canManageDatabase =
        isCreator || isAdmin || isEditor;



    const [theme, setThemeState] = useState(getStoredTheme());
    const [version, setVersion] = useState("");
    const [openAtLogin, setOpenAtLogin] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishResult, setPublishResult] = useState("");
    const [publishError, setPublishError] = useState("");



    const [databasePath, setDatabasePath] = useState("");
    const [defaultDatabasePath, setDefaultDatabasePath] = useState("");
    const [testingConnection, setTestingConnection] = useState(false);
    const [savingDatabaseConfig, setSavingDatabaseConfig] = useState(false);
    const [databaseResult, setDatabaseResult] = useState("");
    const [databaseError, setDatabaseError] = useState("");



    const [syncingProducts, setSyncingProducts] = useState(false);
    const [syncingPurchases, setSyncingPurchases] = useState(false);
    const [productsLastSync, setProductsLastSync] = useState(null);
    const [purchasesLastSync, setPurchasesLastSync] = useState(null);
    const [syncResult, setSyncResult] = useState("");
    const [syncError, setSyncError] = useState("");



    useEffect(() => {
        window.alfadime?.app?.getVersion?.()
            .then((value) => setVersion(value || ""))
            .catch(() => setVersion(""));


        window.alfadime?.app?.getOpenAtLogin?.()
            .then((value) => setOpenAtLogin(Boolean(value)))
            .catch(() => setOpenAtLogin(false));
    }, []);



    useEffect(() => {
        if (!canManageDatabase) {
            return;
        }


        window.alfadime?.purchases?.getDbConfig?.()
            .then((config) => {
                setDatabasePath(config?.path || "");
                setDefaultDatabasePath(config?.defaultPath || "");
            })
            .catch((configError) => {
                console.error(configError);
                setDatabaseError(
                    "Não foi possível carregar a configuração do banco."
                );
            });


        window.alfadime?.products?.getLastSync?.()
            .then((result) => setProductsLastSync(result?.last_sync_at || null))
            .catch(() => setProductsLastSync(null));


        window.alfadime?.purchases?.getLastSync?.()
            .then((result) => setPurchasesLastSync(result?.last_sync_at || null))
            .catch(() => setPurchasesLastSync(null));
    }, [canManageDatabase]);



    function handleThemeChange(nextTheme) {
        setThemeState(nextTheme);
        setTheme(nextTheme);
    }



    async function handleOpenAtLoginChange(checked) {
        const previous = openAtLogin;

        setOpenAtLogin(checked);


        try {
            await window.alfadime?.app?.setOpenAtLogin?.(checked);
        } catch (error) {
            console.error(error);

            setOpenAtLogin(previous);
            setPublishError(
                "Não foi possível alterar a inicialização com o Windows."
            );
        }
    }



    async function handlePublishRelease() {
        const confirmed = window.confirm(
            "Publicar nova atualização do Alfadime?\n\n" +
            "A versão será aumentada automaticamente, as alterações serão commitadas e a tag será enviada ao GitHub."
        );


        if (!confirmed) {
            return;
        }


        setPublishing(true);
        setPublishResult("");
        setPublishError("");


        try {
            const result =
                await settingsUsersService.publishRelease();



            if (result?.success) {
                setPublishResult(
                    `Atualização ${result.data.tag} publicada com sucesso.`
                );



                setVersion(result.data.version || version);



                return;
            }



            setPublishError(
                result?.error ||
                "Não foi possível publicar a atualização."
            );
        } catch (error) {
            console.error(
                "[SETTINGS] Erro ao publicar atualização:",
                error
            );



            setPublishError(
                error?.message ||
                "Não foi possível publicar a atualização."
            );
        } finally {
            setPublishing(false);
        }
    }



    async function handleTestConnection() {
        setTestingConnection(true);
        setDatabaseResult("");
        setDatabaseError("");


        try {
            const result =
                await window.alfadime?.purchases?.testConnection?.(
                    databasePath
                );



            if (result?.success) {
                setDatabaseResult(result.message || "Conexão realizada com sucesso.");
                return;
            }



            setDatabaseError(result?.message || "Não foi possível conectar ao banco.");
        } catch (connectionError) {
            console.error(connectionError);
            setDatabaseError(
                connectionError?.message ||
                "Não foi possível conectar ao banco."
            );
        } finally {
            setTestingConnection(false);
        }
    }



    async function handleSaveDatabaseConfig() {
        setSavingDatabaseConfig(true);
        setDatabaseResult("");
        setDatabaseError("");


        try {
            const result =
                await window.alfadime?.purchases?.saveDbConfig?.({
                    path: databasePath
                });



            setDatabasePath(result?.path || databasePath);
            setDatabaseResult("Configuração do banco salva com sucesso.");
        } catch (saveError) {
            console.error(saveError);
            setDatabaseError(
                saveError?.message ||
                "Não foi possível salvar a configuração do banco."
            );
        } finally {
            setSavingDatabaseConfig(false);
        }
    }



    async function handleSyncProducts() {
        const confirmed = window.confirm(
            "Atualizar Produtos com base na planilha agora?"
        );


        if (!confirmed) {
            return;
        }


        setSyncingProducts(true);
        setSyncResult("");
        setSyncError("");


        try {
            await window.alfadime?.products?.syncExcel?.();


            const result =
                await window.alfadime?.products?.getLastSync?.();



            setProductsLastSync(result?.last_sync_at || null);
            setSyncResult("Produtos atualizados com sucesso.");
        } catch (productsSyncError) {
            console.error(productsSyncError);
            setSyncError(
                productsSyncError?.message ||
                "Não foi possível atualizar os Produtos."
            );
        } finally {
            setSyncingProducts(false);
        }
    }



    async function handleSyncPurchases() {
        const confirmed = window.confirm(
            "Atualizar Curva Compras com base na planilha agora?"
        );


        if (!confirmed) {
            return;
        }


        setSyncingPurchases(true);
        setSyncResult("");
        setSyncError("");


        try {
            await window.alfadime?.purchases?.syncCurveExcel?.();


            const result =
                await window.alfadime?.purchases?.getLastSync?.();



            setPurchasesLastSync(result?.last_sync_at || null);
            setSyncResult("Curva Compras atualizada com sucesso.");
        } catch (purchasesSyncError) {
            console.error(purchasesSyncError);
            setSyncError(
                purchasesSyncError?.message ||
                "Não foi possível atualizar a Curva Compras."
            );
        } finally {
            setSyncingPurchases(false);
        }
    }



    return (
        <main className="settings-general-page">
            <header className="settings-general-header">
                <div>
                    <span className="settings-general-eyebrow">
                        Configurações
                    </span>



                    <h1>Geral</h1>
                    <p>Preferências de aparência e comportamento do aplicativo.</p>
                </div>
            </header>



            {isCreator && (
                <section className="settings-general-card">
                    <h2>Atualizações</h2>



                    <p className="settings-general-description">
                        Publique uma nova versão do Alfadime para que os demais usuários
                        recebam a atualização pelo GitHub.
                    </p>



                    {publishResult && (
                        <div className="settings-general-success">
                            {publishResult}
                        </div>
                    )}



                    {publishError && (
                        <div className="settings-general-error">
                            {publishError}
                        </div>
                    )}



                    <button
                        type="button"
                        className="settings-general-primary-button"
                        onClick={handlePublishRelease}
                        disabled={publishing}
                    >
                        {publishing
                            ? "Publicando..."
                            : "Publicar atualização"}
                    </button>
                </section>
            )}



            {canManageDatabase && (
                <section className="settings-general-card">
                    <h2>Banco de Produtos e Compras</h2>



                    <p className="settings-general-description">
                        Configure o banco compartilhado utilizado pelos módulos de
                        Produtos e Compras.
                    </p>



                    {databaseResult && (
                        <div className="settings-general-success">
                            {databaseResult}
                        </div>
                    )}



                    {databaseError && (
                        <div className="settings-general-error">
                            {databaseError}
                        </div>
                    )}



                    <div className="settings-general-field">
                        <label htmlFor="products-purchases-database-path">
                            Caminho do banco na rede
                        </label>



                        <input
                            id="products-purchases-database-path"
                            type="text"
                            value={databasePath}
                            onChange={(event) =>
                                setDatabasePath(event.target.value)
                            }
                            placeholder={defaultDatabasePath}
                        />
                    </div>



                    <div className="settings-general-actions">
                        <button
                            type="button"
                            className="settings-general-primary-button"
                            onClick={handleTestConnection}
                            disabled={testingConnection}
                        >
                            {testingConnection
                                ? "Testando..."
                                : "Testar conexão"}
                        </button>



                        <button
                            type="button"
                            className="settings-general-primary-button"
                            onClick={handleSaveDatabaseConfig}
                            disabled={savingDatabaseConfig}
                        >
                            {savingDatabaseConfig
                                ? "Salvando..."
                                : "Salvar"}
                        </button>
                    </div>
                </section>
            )}



            {canManageDatabase && (
                <section className="settings-general-card">
                    <h2>Atualização do banco</h2>



                    <p className="settings-general-description">
                        Somente Administradores e Staff podem atualizar os dados
                        de Produtos e Curva Compras.
                    </p>



                    {syncResult && (
                        <div className="settings-general-success">
                            {syncResult}
                        </div>
                    )}



                    {syncError && (
                        <div className="settings-general-error">
                            {syncError}
                        </div>
                    )}



                    <div className="settings-general-field">
                        <label>
                            Última atualização de Produtos
                        </label>



                        <span>
                            {productsLastSync
                                ? new Date(productsLastSync).toLocaleString("pt-BR")
                                : "Nunca atualizado"}
                        </span>
                    </div>



                    <div className="settings-general-field">
                        <label>
                            Última atualização de Curva Compras
                        </label>



                        <span>
                            {purchasesLastSync
                                ? new Date(purchasesLastSync).toLocaleString("pt-BR")
                                : "Nunca atualizado"}
                        </span>
                    </div>



                    <div className="settings-general-actions">
                        <button
                            type="button"
                            className="settings-general-primary-button"
                            onClick={handleSyncProducts}
                            disabled={syncingProducts}
                        >
                            {syncingProducts
                                ? "Atualizando..."
                                : "Atualizar Produtos"}
                        </button>



                        <button
                            type="button"
                            className="settings-general-primary-button"
                            onClick={handleSyncPurchases}
                            disabled={syncingPurchases}
                        >
                            {syncingPurchases
                                ? "Atualizando..."
                                : "Atualizar Curva Compras"}
                        </button>
                    </div>
                </section>
            )}



            <section className="settings-general-card">
                <h2>Aparência</h2>



                <div className="settings-general-field">
                    <label htmlFor="settings-theme">Tema</label>



                    <select
                        id="settings-theme"
                        value={theme}
                        onChange={(event) =>
                            handleThemeChange(event.target.value)
                        }
                    >
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                        <option value="system">Sistema</option>
                    </select>
                </div>
            </section>



            <section className="settings-general-card">
                <h2>Sistema</h2>



                <label className="settings-general-checkbox">
                    <input
                        type="checkbox"
                        checked={openAtLogin}
                        onChange={(event) =>
                            handleOpenAtLoginChange(event.target.checked)
                        }
                    />



                    <span>Iniciar o Alfadime junto com o Windows</span>
                </label>



                <div className="settings-general-version">
                    Versão do aplicativo: {version || "-"}
                </div>
            </section>
        </main>
    );
}



export default SettingsGeneralPage;