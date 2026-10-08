import { useEffect, useState } from "react";

import "../styles/settings.css";



function SettingsContactsPage() {
    const [dbMode, setDbMode] = useState("shared");
    const [dbPath, setDbPath] = useState("");
    const [defaultDbPath, setDefaultDbPath] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [savedMessage, setSavedMessage] = useState("");
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
            .catch(() => {})
            .finally(() => {
                setLoading(false);
            });
    }, []);



    function handleModeChange(nextMode) {
        setDbMode(nextMode);
        setSavedMessage("");
        setTestResult(null);
    }



    function handlePathChange(nextPath) {
        setDbPath(nextPath);
        setSavedMessage("");
        setTestResult(null);
    }



    async function handleTestConnection() {
        try {
            setTesting(true);
            setTestResult(null);

            const result =
                await window.alfadime
                    ?.industryContacts
                    ?.testConnection?.(
                        dbPath || defaultDbPath
                    );

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
        try {
            setSaving(true);
            setSavedMessage("");

            await window.alfadime
                ?.industryContacts
                ?.saveDbConfig?.({
                    mode: dbMode,
                    path: dbPath || defaultDbPath
                });

            setSavedMessage(
                "Configuração de contatos salva. Reinicie o aplicativo para aplicar a mudança."
            );
        } catch (error) {
            console.error(error);

            setSavedMessage(
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
                            <p className="settings-db-message">
                                {savedMessage}
                            </p>
                        ) : null}
                    </>
                )}
            </section>
        </main>
    );
}



export default SettingsContactsPage;