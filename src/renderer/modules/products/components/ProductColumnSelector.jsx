function ProductColumnSelector({
    columns,
    visibleColumns,
    onVisibleColumnsChange,
    columnOrder,
    onColumnOrderChange
}) {
    function toggleColumn(columnKey) {
        const isVisible =
            visibleColumns.includes(columnKey);

        if (isVisible) {
            if (visibleColumns.length === 1) {
                return;
            }

            onVisibleColumnsChange(
                visibleColumns.filter(
                    (key) => key !== columnKey
                )
            );

            return;
        }

        onVisibleColumnsChange([
            ...visibleColumns,
            columnKey
        ]);
    }

    function handleDragStart(event, key) {
        event.dataTransfer.setData("text/plain", key);
        event.dataTransfer.effectAllowed = "move";
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }

    function handleDrop(event, dropIndex) {
        event.preventDefault();
        const draggedKey = event.dataTransfer.getData("text/plain");

        if (!draggedKey) {
            return;
        }

        const order = columnOrder || columns.map((column) => column.key);
        const currentIndex = order.indexOf(draggedKey);

        if (currentIndex === -1 || currentIndex === dropIndex) {
            return;
        }

        const reordered = Array.from(order);
        const [removed] = reordered.splice(currentIndex, 1);
        reordered.splice(dropIndex, 0, removed);

        onColumnOrderChange?.(reordered);
    }

    const orderedColumns = (columnOrder || columns.map((column) => column.key))
        .map((key) => columns.find((column) => column.key === key))
        .filter(Boolean);

    return (
        <details className="products-columns-selector">
            <summary>
                Colunas ({visibleColumns.length})
            </summary>

            <div className="products-columns-options">
                {orderedColumns.map((column, index) => (
                    <label
                        key={column.key}
                        className="products-column-option"
                        draggable
                        onDragStart={(event) =>
                            handleDragStart(event, column.key)
                        }
                        onDragOver={handleDragOver}
                        onDrop={(event) => handleDrop(event, index)}
                    >
                        <span className="products-column-drag-handle">
                            ⋮⋮
                        </span>

                        <input
                            type="checkbox"
                            checked={
                                visibleColumns.includes(
                                    column.key
                                )
                            }
                            onChange={() =>
                                toggleColumn(
                                    column.key
                                )
                            }
                        />

                        <span>{column.label}</span>
                    </label>
                ))}
            </div>
        </details>
    );
}

export default ProductColumnSelector;
