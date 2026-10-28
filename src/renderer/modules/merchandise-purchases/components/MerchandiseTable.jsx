import { useEffect, useState } from "react";

const BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});
const INT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const DEC = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
});

function formatValue(row, column) {
    const value = row[column.key];

    switch (column.type) {
        case "currency":
            return value > 0 ? BRL.format(value) : "-";
        case "int":
            return INT.format(value || 0);
        case "dec":
            return DEC.format(value || 0);
        default:
            return value === "" || value === null || value === undefined
                ? "-"
                : String(value);
    }
}

function QuantityInput({ row, onChange }) {
    const [value, setValue] = useState(String(row.finalQty));

    useEffect(() => {
        setValue(String(row.finalQty));
    }, [row.finalQty]);

    function commit() {
        const text = String(value).trim();

        if (text === "") {
            onChange(row.id, null);
            return;
        }

        const parsed = Number(text.replace(",", "."));

        if (!Number.isFinite(parsed) || parsed < 0) {
            setValue(String(row.finalQty));
            return;
        }

        onChange(row.id, parsed);
    }

    return (
        <div className="mp-quantity-cell">
            <input
                type="number"
                min="0"
                step="1"
                className={`mp-editable-input${row.manual ? " mp-manual-quantity" : ""}`}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.currentTarget.blur();
                    }
                }}
                title={
                    row.manual
                        ? "Quantidade manual. Apague o valor e pressione Enter para voltar ao cálculo automático."
                        : "Quantidade calculada automaticamente"
                }
            />

            {row.manual && <span className="mp-manual-badge">Manual</span>}
        </div>
    );
}

export default function MerchandiseTable({
    rows,
    columns,
    selectedIds,
    allSelected,
    onToggleSelection,
    onToggleAll,
    onQuantityChange
}) {
    return (
        <div className="mp-table-wrapper">
            <table className="mp-table">
                <thead>
                    <tr>
                        <th className="mp-select-column">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={onToggleAll}
                                title="Selecionar todos os produtos filtrados"
                            />
                        </th>

                        {columns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 1} className="mp-empty-row">
                                Nenhum produto encontrado.
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => {
                            const selected = selectedIds.has(row.id);

                            return (
                                <tr key={row.id} className={selected ? "mp-row-selected" : ""}>
                                    <td className="mp-select-column">
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => onToggleSelection(row.id)}
                                        />
                                    </td>

                                    {columns.map((column) => (
                                        <td key={column.key}>
                                            {column.editable ? (
                                                <QuantityInput row={row} onChange={onQuantityChange} />
                                            ) : (
                                                formatValue(row, column)
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
