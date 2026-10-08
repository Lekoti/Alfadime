import { useEffect, useState } from "react";

import {
    getStoredTheme,
    setTheme
} from "../../../shared/theme";

import "../styles/settings.css";

function SettingsGeneralPage() {
    const [theme, setThemeState] = useState(getStoredTheme());
    const [version, setVersion] = useState("");
    const [openAtLogin, setOpenAtLogin] = useState(false);

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


