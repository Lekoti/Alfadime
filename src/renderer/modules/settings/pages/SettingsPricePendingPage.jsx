import { useEffect, useState } from "react";


import "../styles/settings.css";


function SettingsPricePendingPage() {
    const [dbMode, setDbMode] = useState("local");
    const [dbPath, setDbPath] = useState("");
    const [defaultDbPath, setDefaultDbPath] = useState("");
    const [dbConfigLoading, setDbConfigLoading] = useState(true);
    const [dbConfigError, setDbConfigError] = useState("");
    const [dbSaving, setDbSaving] = useState(false);
    const [dbSavedMessage, setDbSavedMessage] = useState("");
    const [dbSavedError, setDbSavedError] = useState("");
    const [testingConnection, setTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [foldersPrices, setFoldersPrices] = useState("");
    const [foldersPending, setFoldersPending] = useState("");
    const [foldersLoading, setFoldersLoading] = useState(true);
    const [foldersConfigError, setFoldersConfigError] = useState("");
    const [foldersSaving, setFoldersSaving] = useState(false);
    const [foldersSavedMessage, setFoldersSavedMessage] = useState("");
    const [foldersSavedError, setFoldersSavedError] = useState("");


    useEffect(() => {
        window.alfadime?.pricePending?.getDbConfig?.()
            .then((config) => {
                setDbMode(config?.mode === "shared" ? "shared" : "local");
                setDbPath(config?.path || config?.defaultPath || "");
                setDefaultDbPath(config?.defaultPath || "");
            })
            .catch((error) => {
                console.error(error);
                setDbConfigError(
                    "Não foi possível carregar a configuração do banco."
                );
            })
            .finally(() => setDbConfigLoading(false));


        window.alfadime?.pricePending?.getFoldersConfig?.()
            .then((config) => {
                setFoldersPrices(config?.prices || "");
                setFoldersPending(config?.pending || "");
            })
            .catch((error) => {
                console.error(error);
                setFoldersConfigError(
                    "Não foi possível carregar a configuração das pastas."
                );
            })
            .finally(() => setFoldersLoading(false));
    }, []);


    function handleDbModeChange(nextMode) {
        if (nextMode === dbMode) {
            return;
        }


        const confirmed = window.confirm(
            nextMode === "shared"
                ? "Alterar para o banco compartilhado na rede?\n\nTodos os usuários passarão a utilizar os mesmos dados após reiniciar o aplicativo."
                : "Alterar para o banco local deste computador?\n\nOs dados deixarão de ser compartilhados com os demais usuários após reiniciar o aplicativo."
        );


        if (!confirmed) {
            return;
        }


        setDbMode(nextMode);
        setDbSavedMessage("");
        setDbSavedError("");
        setTestResult(null);
    }


    function handleDbPathChange(nextPath) {
        setDbPath(nextPath);
        setDbSavedMessage("");
        setDbSavedError("");
        setTestResult(null);
    }


    async function handleTestConnection() {
        const path = dbMode === "shared"
            ? String(dbPath || "").trim()
            : defaultDbPath;


        if (dbMode === "shared" && !path) {
            setTestResult({
                success: false,
                message: "Informe o caminho do banco compartilhado antes de testar."
            });
            return;
        }


        try {
            setTestingConnection(true);
            setTestResult(null);


            const result = await window.alfadime?.pricePending?.testConnection?.(path);


            setTestResult(result || {
                success: false,
                message: "Não foi possível testar a conexão."
            });
        } catch (error) {
            console.error(error);
            setTestResult({
                success: false,
                message: error?.message || "Não foi possível testar a conexão."
            });
        } finally {
            setTestingConnection(false);
        }
    }


    async function handleSaveDbConfig() {
        const path = dbMode === "shared"
            ? String(dbPath || "").trim()
            : defaultDbPath;


        if (dbMode === "shared" && !path) {
            setDbSavedError("Informe o caminho do banco compartilhado.");
            return;
        }


        setDbSaving(true);
        setDbSavedMessage("");
        setDbSavedError("");


        try {
            await window.alfadime?.pricePending?.saveDbConfig?.({
                mode: dbMode,
                path
            });


            setDbSavedMessage(
                "Configuração salva. Reinicie o aplicativo para aplicar a mudança."
            );
        } catch (error) {
            console.error(error);
            setDbSavedError(
                error?.message || "Não foi possível salvar a configuração."
            );
        } finally {
            setDbSaving(false);
        }
    }


    async function handleSaveFoldersConfig() {
        const prices = String(foldersPrices || "").trim();
        const pending = String(foldersPending || "").trim();


        if (!prices || !pending) {
            setFoldersSavedError("Informe as pastas de preços e pendências.");
            return;
        }


        setFoldersSaving(true);
        setFoldersSavedMessage("");
        setFoldersSavedError("");


        try {
            await window.alfadime?.pricePending?.saveFoldersConfig?.({
                prices,
                pending
            });


            setFoldersSavedMessage(
                "Configuração de pastas salva. Reinicie o aplicativo para aplicar a mudança."
            );
        } catch (error) {
            console.error(error);
            setFoldersSavedError(
                error?.message || "Não foi possível salvar a configuração de pastas."
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
                        Configurações
                    </span>


                    <h1>Preços e Pendências</h1>
                    <p>Escolha onde os dados de preços e pendências são armazenados.</p>
                </div>
            </header>


            <section className="settings-general-card">
                <h2>Sincronização — Preços e Pendências</h2>


                {dbConfigLoading ? (
                    <p>Carregando configuração...</p>
                ) : (
                    <>
                        {dbConfigError && (
                            <p className="settings-db-message settings-db-message-error">
                                {dbConfigError}
                            </p>
                        )}


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
                                {testingConnection ? "Testando..." : "Testar conexão"}
                            </button>


                            <button
                                type="button"
                                className="settings-db-button settings-db-button-primary"
                                disabled={dbSaving}
                                onClick={handleSaveDbConfig}
                            >
                                {dbSaving ? "Salvando..." : "Salvar configuração"}
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
                            <p className="settings-db-message settings-db-message-success">
                                {dbSavedMessage}
                            </p>
                        ) : null}


                        {dbSavedError ? (
                            <p className="settings-db-message settings-db-message-error">
                                {dbSavedError}
                            </p>
                        ) : null}
                    </>
                )}
            </section>


            <section className="settings-general-card">
                <h2>Pastas de arquivos — Preços e Pendências</h2>


                {foldersLoading ? (
                    <p>Carregando configuração...</p>
                ) : (
                    <>
                        {foldersConfigError && (
                            <p className="settings-db-message settings-db-message-error">
                                {foldersConfigError}
                            </p>
                        )}


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
                                {foldersSaving ? "Salvando..." : "Salvar configuração de pastas"}
                            </button>
                        </div>


                        {foldersSavedMessage ? (
                            <p className="settings-db-message settings-db-message-success">
                                {foldersSavedMessage}
                            </p>
                        ) : null}


                        {foldersSavedError ? (
                            <p className="settings-db-message settings-db-message-error">
                                {foldersSavedError}
                            </p>
                        ) : null}
                    </>
                )}
            </section>
        </main>
    );
}


export default SettingsPricePendingPage;