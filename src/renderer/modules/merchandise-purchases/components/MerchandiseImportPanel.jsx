import { useRef } from "react";

export default function MerchandiseImportPanel({
    imported,
    loading,
    onFileSelected,
    onClear
}) {
    const inputRef = useRef(null);

    function handleChange(event) {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (file) {
            onFileSelected(file);
        }
    }

    return (
        <div className="mp-import">
            <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="mp-hidden-input"
                onChange={handleChange}
            />

            <button
                type="button"
                className="mp-action-button primary"
                disabled={loading}
                onClick={() => inputRef.current?.click()}
            >
                {loading ? "Importando..." : "Importar planilha"}
            </button>

            {imported && (
                <>
                    <span className="mp-import-info">
                        <strong>{imported.fileName}</strong>
                        {" · "}
                        {new Intl.NumberFormat("pt-BR").format(imported.rows.length)} produtos
                        {" · "}
                        {new Date(imported.importedAt).toLocaleString("pt-BR")}
                    </span>

                    <button
                        type="button"
                        className="mp-clear-button"
                        onClick={onClear}
                    >
                        Remover dados
                    </button>
                </>
            )}
        </div>
    );
}
