function ExportExcelButton({
    onClick,
    disabled = false
}) {
    return (
        <button
            type="button"
            className="export-excel-button"
            onClick={onClick}
            disabled={disabled}
        >
            Exportar Excel
        </button>
    );
}

export default ExportExcelButton;
