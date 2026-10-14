import { useMemo, useState } from "react";


const REASONS = [
    {
        key: "tipo_incompativel",
        label: "Tipo incompatível"
    },
    {
        key: "laboratorio_nao_encontrado",
        label: "Laboratório não encontrado"
    },
    {
        key: "ja_processado",
        label: "Já processado"
    },
    {
        key: "erro_processamento",
        label: "Erro ao processar"
    },
    {
        key: "outro",
        label: "Outro"
    }
];


function getReasonKey(file) {
    if (REASONS.some((reason) => reason.key === file.reason)) {
        return file.reason;
    }

    if (file.reason === "erro_processamento" || file.error) {
        return "erro_processamento";
    }

    return "outro";
}


function getReasonLabel(file) {
    const reasonKey = getReasonKey(file);
    const reason = REASONS.find((item) => item.key === reasonKey);

    if (reasonKey === "erro_processamento" && file.error) {
        return file.error;
    }

    return reason?.label || "Outro";
}


export default function PricePendingIgnoredFilesModal({
    open,
    files = [],
    onClose
}) {
    const [selectedReason, setSelectedReason] = useState("");
    const [search, setSearch] = useState("");

    const safeFiles = Array.isArray(files) ? files : [];

    const reasonCounts = useMemo(() => {
        const counts = {};

        REASONS.forEach((reason) => {
            counts[reason.key] = 0;
        });

        safeFiles.forEach((file) => {
            const reasonKey = getReasonKey(file);
            counts[reasonKey] = (counts[reasonKey] || 0) + 1;
        });

        return counts;
    }, [safeFiles]);

    const filteredFiles = useMemo(() => {
        const term = search.trim().toLowerCase();

        return safeFiles.filter((file) => {
            const matchesReason =
                !selectedReason ||
                getReasonKey(file) === selectedReason;

            const fileName = String(
                file.fileName || file.name || ""
            ).toLowerCase();

            const matchesSearch =
                !term || fileName.includes(term);

            return matchesReason && matchesSearch;
        });
    }, [
        safeFiles,
        selectedReason,
        search
    ]);


    if (!open) {
        return null;
    }


    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{ pointerEvents: "auto" }}
        >
            <div
                className="modal-content price-pending-ignored-modal"
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

                <div className="price-pending-ignored-filters">
                    <input
                        type="search"
                        value={search}
                        placeholder="Buscar arquivo"
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                    />

                    <button
                        type="button"
                        className={
                            selectedReason === ""
                                ? "price-pending-ignored-filter active"
                                : "price-pending-ignored-filter"
                        }
                        onClick={() => setSelectedReason("")}
                    >
                        Todos ({safeFiles.length})
                    </button>

                    {REASONS.map((reason) => (
                        <button
                            key={reason.key}
                            type="button"
                            className={
                                selectedReason === reason.key
                                    ? "price-pending-ignored-filter active"
                                    : "price-pending-ignored-filter"
                            }
                            onClick={() =>
                                setSelectedReason(reason.key)
                            }
                        >
                            {reason.label} (
                            {reasonCounts[reason.key] || 0})
                        </button>
                    ))}
                </div>

                <div className="modal-body">
                    {filteredFiles.length === 0 ? (
                        <p className="price-pending-ignored-empty">
                            Nenhum arquivo ignorado para o filtro selecionado.
                        </p>
                    ) : (
                        <table className="ignored-files-table">
                            <thead>
                                <tr>
                                    <th>Arquivo</th>
                                    <th>Motivo</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredFiles.map((file, index) => (
                                    <tr key={`${file.fileName || file.name || index}-${index}`}>
                                        <td>
                                            {file.fileName ||
                                                file.name ||
                                                "Desconhecido"}
                                        </td>

                                        <td>
                                            {getReasonLabel(file)}
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
