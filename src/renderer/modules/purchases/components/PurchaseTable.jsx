import React, { useEffect, useState } from "react";


function formatValue(product, column) {
    const value = product?.[column.key];

    if (column.key === "availablestock") {
        const current = product?.currentstock ?? 0;
        const blocked = product?.blockedstock ?? 0;
        const total = current + Math.abs(blocked);
        const blockedDisplay = blocked < 0 ? `(${Math.abs(blocked)})` : `+ ${blocked}`;
        return `${current} ${blockedDisplay} = ${total}`;
    }

    if (column.type === "currency") {
        if (value === null || value === undefined || value === "" || value === 0) {
            return "-";
        }

        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(value);
    }

    if (column.key === "coverageMonths") {
        if (value === null || value === undefined || value === "") {
            return "-";
        }

        return Number(value).toFixed(1);
    }

    if (column.key === "lastPurchaseAMS") {
        const priceValue = product?.lastPurchaseAMS;

        if (priceValue === null || priceValue === undefined || priceValue === "" || priceValue === 0) {
            return "-";
        }

        return `AMS · ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(priceValue)}`;
    }

    if (column.key === "lastPurchaseDPR") {
        const priceValue = product?.lastPurchaseDPR;

        if (priceValue === null || priceValue === undefined || priceValue === "" || priceValue === 0) {
            return "-";
        }

        return `DPR · ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(priceValue)}`;
    }

    if (column.key === "lastPurchaseDMT") {
        const priceValue = product?.lastPurchaseDMT;

        if (priceValue === null || priceValue === undefined || priceValue === "" || priceValue === 0) {
            return "-";
        }

        return `DMT · ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(priceValue)}`;
    }

    if (column.key === "lastPurchaseDMS") {
        const priceValue = product?.lastPurchaseDMS;

        if (priceValue === null || priceValue === undefined || priceValue === "" || priceValue === 0) {
            return "-";
        }

        return `DMS · ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(priceValue)}`;
    }

    if (column.key === "lastPurchaseDSC") {
        const priceValue = product?.lastPurchaseDSC;

        if (priceValue === null || priceValue === undefined || priceValue === "" || priceValue === 0) {
            return "-";
        }

        return `DSC · ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(priceValue)}`;
    }

    if (column.key === "priceSource") {
        return value || "-";
    }

    if (column.type === "boolean") {
        return Number(value) === 1 ? "Sim" : "Não";
    }

    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
}


function QuantityInput({ product, onQuantityChange }) {
    const manualQuantity = product?.quantityoverride;
    const hasManualQuantity =
        manualQuantity !== null &&
        manualQuantity !== undefined &&
        manualQuantity !== "";

    const [quantity, setQuantity] = useState(
        hasManualQuantity ? String(manualQuantity) : String(product?.suggestedquantity ?? 0)
    );

    useEffect(() => {
        setQuantity(
            hasManualQuantity
                ? String(manualQuantity)
                : String(product?.suggestedquantity ?? 0)
        );
    }, [
        product?.id,
        product?.suggestedquantity,
        manualQuantity,
        hasManualQuantity
    ]);

    function commit() {
        const rawValue = String(quantity).trim();

        if (rawValue === "") {
            onQuantityChange(product, null);
            return;
        }

        const parsed = Number(rawValue.replace(",", "."));

        if (!Number.isFinite(parsed) || parsed < 0) {
            setQuantity(
                hasManualQuantity
                    ? String(manualQuantity)
                    : String(product?.suggestedquantity ?? 0)
            );
            return;
        }

        onQuantityChange(product, parsed);
    }

    return (
        <div className="purchase-quantity-cell">
            <input
                type="number"
                min="0"
                step="1"
                className={`purchases-editable-input${
                    hasManualQuantity ? " purchase-manual-quantity" : ""
                }`}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.currentTarget.blur();
                    }
                }}
                title={
                    hasManualQuantity
                        ? "Quantidade manual informada. Apague o valor e pressione Enter para voltar ao calculo automatico."
                        : "Quantidade calculada pela curva"
                }
            />

            {hasManualQuantity && (
                <span
                    className="purchase-manual-badge"
                    title="Valor manual informado"
                >
                    Manual
                </span>
            )}
        </div>
    );
}


export default function PurchaseTable({
    rows = [],
    columns = [],
    visibleColumns = [],
    columnOrder = [],
    selectedIds = [],
    selectAllFiltered = false,
    onToggleSelection,
    onToggleAll,
    onQuantityChange
}) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeColumns = Array.isArray(columns) ? columns : [];
    const safeVisibleColumns = Array.isArray(visibleColumns) ? visibleColumns : [];
    const safeColumnOrder = Array.isArray(columnOrder)
        ? columnOrder
        : safeColumns.map((column) => column.key);
    const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds : [];

    const orderedColumns = safeColumnOrder
        .map((key) => safeColumns.find((column) => column.key === key))
        .filter(Boolean);

    const activeColumns = orderedColumns.filter((column) =>
        safeVisibleColumns.includes(column.key)
    );

    const allSelected =
        safeRows.length > 0 &&
        safeRows.every((row) => safeSelectedIds.includes(row.id));

    const someSelected = safeRows.some((row) =>
        safeSelectedIds.includes(row.id)
    );

    const isIndeterminate = someSelected && !allSelected;

    useEffect(() => {
        const checkbox = document.querySelector(".purchase-select-all-checkbox");

        if (checkbox) {
            checkbox.indeterminate = isIndeterminate;
        }
    }, [isIndeterminate]);

    function isRowSelected(product) {
        if (selectAllFiltered) {
            return true;
        }

        return safeSelectedIds.includes(product.id);
    }

    return (
        <div className="purchases-table-wrapper">
            <table className="purchases-table">
                <thead>
                    <tr>
                        <th className="purchase-select-column">
                            <input
                                type="checkbox"
                                checked={selectAllFiltered || allSelected}
                                onChange={onToggleAll}
                                disabled={safeRows.length === 0}
                                title={
                                    selectAllFiltered
                                        ? "Todos os produtos filtrados estão selecionados"
                                        : "Selecionar todos os produtos filtrados"
                                }
                                className="purchase-select-all-checkbox"
                            />
                        </th>

                        {activeColumns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {safeRows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={activeColumns.length + 1}
                                className="purchases-empty-row"
                            >
                                Nenhum produto encontrado.
                            </td>
                        </tr>
                    ) : (
                        safeRows.map((product) => {
                            const isSelected = isRowSelected(product);

                            return (
                                <tr
                                    key={product.id}
                                    className={isSelected ? "purchase-row-selected" : ""}
                                >
                                    <td className="purchase-select-column">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onToggleSelection(product.id)}
                                            disabled={selectAllFiltered}
                                        />
                                    </td>

                                    {activeColumns.map((column) => (
                                        <td key={column.key}>
                                            {column.key === "suggestedquantity" ? (
                                                <QuantityInput
                                                    product={product}
                                                    onQuantityChange={onQuantityChange}
                                                />
                                            ) : (
                                                formatValue(product, column)
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
