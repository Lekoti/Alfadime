function formatValue(product, column) {
    const value = product[column.key];


    if (
        column.type === "boolean"
    ) {
        return Number(value) === 1
            ? "Sim"
            : "Não";
    }


    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }


    return String(value);
}


function ProductTable({
    products,
    columns,
    visibleColumns,
    columnOrder
}) {
    const orderedColumns = columnOrder
        ? columnOrder
            .map((key) => columns.find((column) => column.key === key))
            .filter(Boolean)
        : columns;


    const activeColumns = orderedColumns.filter(
        (column) =>
            visibleColumns.includes(column.key)
    );


    return (
        <div className="products-table-wrapper">
            <table className="products-table">
                <thead>
                    <tr>
                        {activeColumns.map((column) => (
                            <th key={column.key}>
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>


                <tbody>
                    {products.length === 0 && (
                        <tr>
                            <td
                                colSpan={
                                    activeColumns.length
                                }
                                className="products-empty-row"
                            >
                                Nenhum produto encontrado.
                            </td>
                        </tr>
                    )}


                    {products.map((product) => (
                        <tr key={product.id}>
                            {activeColumns.map((column) => (
                                <td key={column.key}>
                                    {formatValue(
                                        product,
                                        column
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


export default ProductTable;
