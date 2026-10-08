import { useEffect, useState } from "react";


import "../styles/settings.css";


function SettingsPricePendingPage() {
    const [dbMode, setDbMode] = useState("local");
    const [dbPath, setDbPath] = useState("");
    const [defaultDbPath, setDefaultDbPath] = useState("");
    const [dbConfigLoading, setDbConfigLoading] = useState(true);
    const [dbSaving, setDbSaving] = useState(false);
    const [dbSavedMessage, setDbSavedMessage] = useState("");
    const [testingConnection, setTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [foldersPrices, setFoldersPrices] = useState("");
    const [foldersPending, setFoldersPending] = useState("");
    const [foldersLoading, setFoldersLoading] = useState(true);
    const [foldersSaving, setFoldersSaving] = useState(false);
    const [foldersSavedMessage, setFoldersSavedMessage] = useState("");


    useEffect(() => {
        window.alfadime?.pricePending?.getDbConfig?.()
            .then((config) => {
                setDbMode(config?.mode === "shared" ? "shared" : "local");
                setDbPath(config?.path || config?.defaultPath || "");
                setDefaultDbPath(config?.defaultPath || "");
            })
            .catch(() => {})
            .finally(() => setDbConfigLoading(false));


        window.alfadime?.pricePending?.getFoldersConfig?.()
            .then((config) => {
                setFoldersPrices(config?.prices || "");
                setFoldersPending(config?.pending || "");
            })
            .catch(() => {})
            .finally(() => setFoldersLoading(false));
    }, []);


    function handleDbModeChange(nextMode) {
        setDbMode(nextMode);
        setDbSavedMessage("");
        setTestResult(null);
    }


    function handleDbPathChange(nextPath) {
        setDbPath(nextPath);
        setDbSavedMessage("");
        setTestResult(null);
    }


    async function handleTestConnection() {
        try {
            setTestingConnection(true);
            setTestResult(null);


            const result = await window.alfadime?.pricePending?.testConnection?.(
                dbPath || defaultDbPath
            );


            setTestResult(result || {
                success: false,
                message: "Nao foi possivel testar a conexao."
            });
        } catch (error) {
            console.error(error);
            setTestResult({
                success: false,
                message: error?.message || "Nao foi possivel testar a conexao."
            });
        } finally {
            setTestingConnection(false);
        }
    }


    async function handleSaveDbConfig() {
        try {
            setDbSaving(true);
            setDbSavedMessage("");


            await window.alfadime?.pricePending?.saveDbConfig?.({
                mode: dbMode,
                path: dbPath || defaultDbPath
            });


            setDbSavedMessage(
                "Configuracao salva. Reinicie o aplicativo para aplicar a mudanca."
            );
        } catch (error) {
            console.error(error);
            setDbSavedMessage(
                "Nao foi possivel salvar a configuracao."
            );
        } finally {
            setDbSaving(false);
        }
    }


    async function handleSaveFoldersConfig() {
        try {
            setFoldersSaving(true);
            setFoldersSavedMessage("");


            await window.alfadime?.pricePending?.saveFoldersConfig?.({
                prices: foldersPrices,
                pending: foldersPending
            });


            setFoldersSavedMessage(
                "Configuracao de pastas salva. Reinicie o aplicativo para aplicar a mudanca."
            );
        } catch (error) {
            console.error(error);
            setFoldersSavedMessage(
                "Nao foi possivel salvar a configuracao de pastas."
            );
        } finally {
            setFoldersSaving(false);
        }
    }


    return (
        <main className="settings-general-page">
            <header className="settings-general-header">
                <div>
                    <span className="settings-general-eyebrow">
                        Configuracoes
                    </span>


                    <h1>Precos e Pendencias</h1>
                    <p>Escolha onde os dados de precos e pendencias sao armazenados.</p>
                </div>
            </header>


            <section className="settings-general-card">
                <h2>Sincronizacao — Precos e Pendencias</h2>


                {dbConfigLoading ? (
                    <p>Carregando configuracao...</p>
                ) : (
                    <>
                        <div className="settings-db-mode-options">
                            <label className="settings-general-checkbox">
                                <input
                                    type="radio"
                                    name="price-pending-db-mode"
                                    checked={dbMode === "local"}
                                    onChange={() => handleDbModeChange("local")}
                                />
                                <span>Banco local neste computador</span>
                            </label>


                            <label className="settings-general-checkbox">
                                <input
                                    type="radio"
                                    name="price-pending-db-mode"
                                    checked={dbMode === "shared"}
                                    onChange={() => handleDbModeChange("shared")}
                                />
                                <span>Banco compartilhado na rede</span>
                            </label>
                        </div>


                        <div className="settings-general-field">
                            <label htmlFor="settings-db-path">
                                Caminho do banco compartilhado
                            </label>


                            <input
                                id="settings-db-path"
                                type="text"
                                value={dbPath}
                                disabled={dbMode !== "shared"}
                                onChange={(event) =>
                                    handleDbPathChange(event.target.value)
                                }
                            />
                        </div>


                        <div className="settings-db-actions">
                            <button
                                type="button"
                                className="settings-db-button"
                                disabled={testingConnection}
                                onClick={handleTestConnection}
                            >
                                {testingConnection ? "Testando..." : "Testar conexao"}
                            </button>


                            <button
                                type="button"
                                className="settings-db-button settings-db-button-primary"
                                disabled={dbSaving}
                                onClick={handleSaveDbConfig}
                            >
                                {dbSaving ? "Salvando..." : "Salvar configuracao"}
                            </button>
                        </div>


                        {testResult ? (
                            <p
                                className={
                                    testResult.success
                                        ? "settings-db-message settings-db-message-success"
                                        : "settings-db-message settings-db-message-error"
                                }
                            >
                                {testResult.message}
                            </p>
                        ) : null}


                        {dbSavedMessage ? (
                            <p className="settings-db-message">
                                {dbSavedMessage}
                            </p>
                        ) : null}
                    </>
                )}
            </section>


            <section className="settings-general-card">
                <h2>Pastas de arquivos — Preços e Pendências</h2>


                {foldersLoading ? (
                    <p>Carregando configuracao...</p>
                ) : (
                    <>
                        <div className="settings-general-field">
                            <label htmlFor="settings-folders-prices">
                                Pasta de preços (arquivos de preços)
                            </label>


                            <input
                                id="settings-folders-prices"
                                type="text"
                                value={foldersPrices}
                                onChange={(event) =>
                                    setFoldersPrices(event.target.value)
                                }
                            />
                        </div>


                        <div className="settings-general-field">
                            <label htmlFor="settings-folders-pending">
                                Pasta de pendências (arquivos de pendências)
                            </label>


                            <input
                                id="settings-folders-pending"
                                type="text"
                                value={foldersPending}
                                onChange={(event) =>
                                    setFoldersPending(event.target.value)
                                }
                            />
                        </div>


                        <div className="settings-db-actions">
                            <button
                                type="button"
                                className="settings-db-button settings-db-button-primary"
                                disabled={foldersSaving}
                                onClick={handleSaveFoldersConfig}
                            >
                                {foldersSaving ? "Salvando..." : "Salvar configuracao de pastas"}
                            </button>
                        </div>


                        {foldersSavedMessage ? (
                            <p className="settings-db-message">
                                {foldersSavedMessage}
                            </p>
                        ) : null}
                    </>
                )}
            </section>
        </main>
    );
}


export default SettingsPricePendingPage;