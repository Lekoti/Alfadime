import { useMemo, useState } from "react";


export default function PricePendingPolicyIssuesModal({
    open,
    files,
    loading,
    onClose,
    onReload
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedFile, setExpandedFile] = useState("");


    const filteredFiles = useMemo(() => {
        const term = String(searchTerm ?? "")
            .trim()
            .toLowerCase();


        if (!term) {
            return files;
        }


        return files.filter((file) =>
            file.fileName.toLowerCase().includes(term)
        );
    }, [
        files,
        searchTerm
    ]);


    if (!open) {
        return null;
    }


    return (
        <div className="modal-overlay">
            <div className="modal-content price-pending-policy-modal">
                <div className="modal-header">
                    <h2>Arquivos de preços fora do padrão</h2>


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
                        type="text"
                        value={searchTerm}
                        placeholder="Buscar arquivo"
                        onChange={(event) =>
                            setSearchTerm(event.target.value)
                        }
                    />


                    <button
                        type="button"
                        className="price-pending-ignored-filter"
                        onClick={onReload}
                        disabled={loading}
                    >
                        {loading ? "Verificando..." : "Verificar novamente"}
                    </button>
                </div>


                <div className="modal-body">
                    {filteredFiles.length === 0 && (
                        <div className="price-pending-ignored-empty">
                            Nenhum arquivo fora do padrão encontrado.
                        </div>
                    )}


                    {filteredFiles.map((file) => {
                        const isExpanded =
                            expandedFile === file.fileName;


                        return (
                            <div
                                key={file.fileName}
                                className="price-pending-policy-file"
                            >
                                <button
                                    type="button"
                                    className="price-pending-policy-file-header"
                                    onClick={() =>
                                        setExpandedFile(
                                            isExpanded
                                                ? ""
                                                : file.fileName
                                        )
                                    }
                                >
                                    <strong>{file.fileName}</strong>


                                    <span>
                                        {file.totalIssues} problema
                                        {file.totalIssues > 1 ? "s" : ""}
                                    </span>
                                </button>


                                {isExpanded && (
                                    <div className="price-pending-policy-issues">
                                        {file.issues.map((issue, index) => (
                                            <div
                                                key={`${issue.sheetName}-${issue.line}-${issue.column}-${index}`}
                                                className="price-pending-policy-issue"
                                            >
                                                <strong>
                                                    {issue.type}
                                                    {issue.sheetName
                                                        ? ` / ${issue.sheetName}`
                                                        : ""}
                                                    {issue.line
                                                        ? ` / linha ${issue.line}`
                                                        : ""}
                                                </strong>


                                                <span>
                                                    {issue.message}
                                                </span>


                                                <span>
                                                    Encontrado: {issue.found}
                                                </span>


                                                <span>
                                                    Esperado: {issue.expected}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
