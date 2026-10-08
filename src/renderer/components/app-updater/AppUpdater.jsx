import {
    useEffect,
    useState
} from "react";

import "./AppUpdater.css";

function AppUpdater() {
    const [
        status,
        setStatus
    ] = useState(null);

    const [
        downloading,
        setDownloading
    ] = useState(false);

    useEffect(() => {
        const unsubscribe =
            window.alfadime?.app?.onUpdateStatus?.(
                (nextStatus) => {
                    setStatus(
                        nextStatus
                    );

                    if (
                        nextStatus?.status ===
                        "downloading"
                    ) {
                        setDownloading(
                            true
                        );
                    }

                    if (
                        nextStatus?.status ===
                        "downloaded"
                    ) {
                        setDownloading(
                            false
                        );
                    }
                }
            );

        return () => {
            unsubscribe?.();
        };
    }, []);

    async function handleDownload() {
        setDownloading(
            true
        );

        await window.alfadime.app.downloadUpdate();
    }

    async function handleInstall() {
        await window.alfadime.app.installUpdate();
    }

    if (
        !status ||
        status.status ===
            "checking" ||
        status.status ===
            "not-available" ||
        status.status ===
            "disabled"
    ) {
        return null;
    }

    if (
        status.status ===
        "error"
    ) {
        return null;
    }

    return (
        <section
            className={
                "app-updater-panel"
            }
        >
            {status.status ===
                "available" && (
                <>
                    <div>
                        <strong>
                            Nova atualização disponível
                        </strong>

                        <span>
                            Versão{" "}
                            {
                                status.availableVersion
                            }{" "}
                            disponível para download.
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={
                            handleDownload
                        }
                        disabled={
                            downloading
                        }
                    >
                        Baixar atualização
                    </button>
                </>
            )}

            {status.status ===
                "downloading" && (
                <div>
                    <strong>
                        Baixando atualização
                    </strong>

                    <span>
                        {Math.round(
                            status.percent ||
                                0
                        )}
                        %
                    </span>
                </div>
            )}

            {status.status ===
                "downloaded" && (
                <>
                    <div>
                        <strong>
                            Atualização pronta
                        </strong>

                        <span>
                            Reinicie o aplicativo para aplicar a atualização.
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={
                            handleInstall
                        }
                    >
                        Instalar agora
                    </button>
                </>
            )}
        </section>
    );
}

export default AppUpdater;