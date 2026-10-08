function PurchaseColumnSelector({
    columns = [],
    visibleColumns = [],
    onVisibleColumnsChange,
    columnOrder = [],
    onColumnOrderChange
}) {
    // Garantir que são arrays
    const safeVisibleColumns = Array.isArray(visibleColumns) ? visibleColumns : [];
    const safeColumnOrder = Array.isArray(columnOrder) ? columnOrder : [];

    function toggleColumn(key) {
        const isVisible = safeVisibleColumns.includes(key);

        if (isVisible && safeVisibleColumns.length === 1) {
            return;
        }

        const nextColumns = isVisible
            ? safeVisibleColumns.filter((item) => item !== key)
            : [...safeVisibleColumns, key];

        if (typeof onVisibleColumnsChange === "function") {
            onVisibleColumnsChange(nextColumns);
        }
    }

    function handleDragStart(event, key) {
        event.dataTransfer.setData("text/plain", key);
        event.dataTransfer.effectAllowed = "move";
    }

    function handleDragOver(event, index) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }

    function handleDrop(event, dropIndex) {
        event.preventDefault();
        const draggedKey = event.dataTransfer.getData("text/plain");

        if (!draggedKey || typeof onColumnOrderChange !== "function") {
            return;
        }

        const currentIndex = safeColumnOrder.indexOf(draggedKey);
        if (currentIndex === -1 || currentIndex === dropIndex) {
            return;
        }

        const reordered = Array.from(safeColumnOrder);
        const [removed] = reordered.splice(currentIndex, 1);
        reordered.splice(dropIndex, 0, removed);

        onColumnOrderChange(reordered);
    }

    return (
        <details className="purchases-columns-selector">
            <summary>
                Colunas ({safeVisibleColumns.length})
            </summary>

            <div className="purchases-columns-options">
                {safeColumnOrder.map((key, index) => {
                    const column = columns.find(c => c.key === key);
                    if (!column) {
                        return null;
                    }

                    const isVisible = safeVisibleColumns.includes(key);

                    return (
                        <div
                            key={key}
                            draggable
                            onDragStart={(e) => handleDragStart(e, key)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.25rem",
                                opacity: isVisible ? 1 : 0.6,
                                cursor: "grab",
                                padding: "0.25rem",
                                borderRadius: "4px",
                                border: "1px solid transparent"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#ccc";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "transparent";
                            }}
                        >
                            <span style={{ fontSize: "12px", color: "#888" }}>⋮⋮</span>

                            <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={() => toggleColumn(key)}
                            />

                            <span>{column.label}</span>
                        </div>
                    );
                })}
            </div>
        </details>
    );
}

export default PurchaseColumnSelector;