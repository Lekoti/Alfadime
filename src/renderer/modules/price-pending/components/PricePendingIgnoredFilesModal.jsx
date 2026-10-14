export default function PricePendingIgnoredFilesModal({
    open,
    files = [],
    onClose
}) {
    if (!open) {
        return null;
    }


    function getReason(reason, error) {
        if (reason === "tipo_incompativel") {
            return "Tipo incompatível";
        }


        if (reason === "laboratorio_nao_encontrado") {
            return "Laboratório não encontrado";
        }


        if (reason === "ja_processado") {
            return "Já processado";
        }


        if (reason === "erro_processamento") {
            return error || "Erro ao processar";
        }


        return "Outro";
    }


    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{ pointerEvents: "auto" }}
        >
            <div
                className="modal-content"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="modal-header">
                    <h2>Arquivos ignorados na atualização</h2>


                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>


                <div className="modal-body">
                    {files.length === 0 ? (
                        <p>Nenhum arquivo ignorado.</p>
                    ) : (
                        <table className="ignored-files-table">
                            <thead>
                                <tr>
                                    <th>Arquivo</th>
                                    <th>Motivo</th>
                                </tr>
                            </thead>


                            <tbody>
                                {files.map((file, index) => (
                                    <tr key={index}>
                                        <td>
                                            {file.fileName ||
                                                file.name ||
                                                "Desconhecido"}
                                        </td>


                                        <td>
                                            {getReason(
                                                file.reason,
                                                file.error
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>


                <div className="modal-footer">
                    <button
                        type="button"
                        className="modal-button"
                        onClick={onClose}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
