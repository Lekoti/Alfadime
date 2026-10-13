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
        isCreator
    } = useAuth();


    const [theme, setThemeState] = useState(getStoredTheme());
    const [version, setVersion] = useState("");
    const [openAtLogin, setOpenAtLogin] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishResult, setPublishResult] = useState("");
    const [publishError, setPublishError] = useState("");


    useEffect(() => {
        window.alfadime?.app?.getVersion?.()
            .then((value) => setVersion(value || ""))
            .catch(() => setVersion(""));


        window.alfadime?.app?.getOpenAtLogin?.()
            .then((value) => setOpenAtLogin(Boolean(value)))
            .catch(() => setOpenAtLogin(false));
    }, []);


    function handleThemeChange(nextTheme) {
        setThemeState(nextTheme);
        setTheme(nextTheme);
    }


    async function handleOpenAtLoginChange(checked) {
        setOpenAtLogin(checked);


        try {
            await window.alfadime?.app?.setOpenAtLogin?.(checked);
        } catch (error) {
            console.error(error);
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


    return (
        <main className="settings-general-page">
            <header className="settings-general-header">
                <div>
                    <span className="settings-general-eyebrow">
                        Configuracoes
                    </span>


                    <h1>Geral</h1>
                    <p>Preferencias de aparencia e comportamento do aplicativo.</p>
                </div>
            </header>


            {isCreator && (
                <section className="settings-general-card">
                    <h2>Atualizacoes</h2>


                    <p className="settings-general-description">
                        Publique uma nova versao do Alfadime para que os demais usuarios
                        recebam a atualizacao pelo GitHub.
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
                            : "Publicar atualizacao"}
                    </button>
                </section>
            )}


            <section className="settings-general-card">
                <h2>Aparencia</h2>


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
                    Versao do aplicativo: {version || "-"}
                </div>
            </section>
        </main>
    );
}


export default SettingsGeneralPage;