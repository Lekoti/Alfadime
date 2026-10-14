import { useEffect, useState } from "react";


import "../styles/settings.css";




function SettingsContactsPage() {
    const [dbMode, setDbMode] = useState("shared");
    const [dbPath, setDbPath] = useState("");
    const [defaultDbPath, setDefaultDbPath] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [savedMessage, setSavedMessage] = useState("");
    const [savedError, setSavedError] = useState("");
    const [testResult, setTestResult] = useState(null);




    useEffect(() => {
        window.alfadime?.industryContacts
            ?.getDbConfig?.()
            .then((config) => {
                setDbMode(
                    config?.mode === "local"
                        ? "local"
                        : "shared"
                );


                setDbPath(
                    config?.path ||
                    config?.defaultPath ||
                    ""
                );


                setDefaultDbPath(
                    config?.defaultPath ||
                    ""
                );
            })
            .catch((error) => {
                console.error(error);


                setLoadError(
                    "Não foi possível carregar a configuração dos contatos."
                );
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);




    function handleModeChange(nextMode) {
        if (nextMode === dbMode) {
            return;
        }


        const confirmed = window.confirm(
            nextMode === "shared"
                ? "Alterar para o banco compartilhado na rede?\n\nTodos os usuários passarão a utilizar os mesmos contatos após reiniciar o aplicativo."
                : "Alterar para o banco local deste computador?\n\nOs contatos deixarão de ser compartilhados com os demais usuários após reiniciar o aplicativo."
        );


        if (!confirmed) {
            return;
        }


        setDbMode(nextMode);
        setSavedMessage("");
        setSavedError("");
        setTestResult(null);
    }




    function handlePathChange(nextPath) {
        setDbPath(nextPath);
        setSavedMessage("");
        setSavedError("");
        setTestResult(null);
    }




    async function handleTestConnection() {
        const path = dbMode === "shared"
            ? String(dbPath || "").trim()
            : defaultDbPath;


        if (dbMode === "shared" && !path) {
            setTestResult({
                success: false,
                message: "Informe o caminho do banco de contatos antes de testar."
            });
            return;
        }


        try {
            setTesting(true);
            setTestResult(null);


            const result =
                await window.alfadime
                    ?.industryContacts
                    ?.testConnection?.(path);


            setTestResult(
                result || {
                    success: false,
                    message:
                        "Não foi possível testar a conexão."
                }
            );
        } catch (error) {
            console.error(error);


            setTestResult({
                success: false,
                message:
                    error?.message ||
                    "Não foi possível testar a conexão."
            });
        } finally {
            setTesting(false);
        }
    }




    async function handleSave() {
        const path = dbMode === "shared"
            ? String(dbPath || "").trim()
            : defaultDbPath;


        if (dbMode === "shared" && !path) {
            setSavedError("Informe o caminho do banco de contatos.");
            return;
        }


        setSaving(true);
        setSavedMessage("");
        setSavedError("");


        try {
            await window.alfadime
                ?.industryContacts
                ?.saveDbConfig?.({
                    mode: dbMode,
                    path
                });


            setSavedMessage(
                "Configuração de contatos salva. Reinicie o aplicativo para aplicar a mudança."
            );
        } catch (error) {
            console.error(error);


            setSavedError(
                error?.message ||
                "Não foi possível salvar a configuração."
            );
        } finally {
            setSaving(false);
        }
    }




    return (
        <main className="settings-general-page">
            <header className="settings-general-header">
                <div>
                    <span className="settings-general-eyebrow">
                        Configurações
                    </span>


                    <h1>Contatos</h1>


                    <p>
                        Escolha onde os contatos das indústrias
                        serão armazenados.
                    </p>
                </div>
            </header>




            <section className="settings-general-card">
                <h2>
                    Banco de dados — Contatos
                </h2>


                {loading ? (
                    <p>
                        Carregando configuração...
                    </p>
                ) : (
                    <>
                        {loadError && (
                            <p className="settings-db-message settings-db-message-error">
                                {loadError}
                            </p>
                        )}


                        <div className="settings-db-mode-options">
                            <label className="settings-general-checkbox">
                                <input
                                    type="radio"
                                    name="industry-contacts-db-mode"
                                    checked={
                                        dbMode === "local"
                                    }
                                    onChange={() =>
                                        handleModeChange(
                                            "local"
                                        )
                                    }
                                />


                                <span>
                                    Banco local neste computador
                                </span>
                            </label>


                            <label className="settings-general-checkbox">
                                <input
                                    type="radio"
                                    name="industry-contacts-db-mode"
                                    checked={
                                        dbMode === "shared"
                                    }
                                    onChange={() =>
                                        handleModeChange(
                                            "shared"
                                        )
                                    }
                                />


                                <span>
                                    Banco compartilhado na rede
                                </span>
                            </label>
                        </div>




                        <div className="settings-general-field">
                            <label htmlFor="industry-contacts-db-path">
                                Caminho do banco de contatos
                            </label>


                            <input
                                id="industry-contacts-db-path"
                                type="text"
                                value={dbPath}
                                disabled={
                                    dbMode !== "shared"
                                }
                                onChange={(event) =>
                                    handlePathChange(
                                        event.target.value
                                    )
                                }
                            />
                        </div>




                        <div className="settings-db-actions">
                            <button
                                type="button"
                                className="settings-db-button"
                                disabled={testing}
                                onClick={
                                    handleTestConnection
                                }
                            >
                                {testing
                                    ? "Testando..."
                                    : "Testar conexão"}
                            </button>


                            <button
                                type="button"
                                className="settings-db-button settings-db-button-primary"
                                disabled={saving}
                                onClick={handleSave}
                            >
                                {saving
                                    ? "Salvando..."
                                    : "Salvar configuração"}
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
                                {testResult.message ||
                                    (
                                        testResult.success
                                            ? `${testResult.total} contato(s) encontrado(s).`
                                            : "Falha ao testar o banco."
                                    )}
                            </p>
                        ) : null}




                        {savedMessage ? (
                            <p className="settings-db-message settings-db-message-success">
                                {savedMessage}
                            </p>
                        ) : null}


                        {savedError ? (
                            <p className="settings-db-message settings-db-message-error">
                                {savedError}
                            </p>
                        ) : null}
                    </>
                )}
            </section>
        </main>
    );
}




export default SettingsContactsPage;