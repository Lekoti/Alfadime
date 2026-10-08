import React from 'react';


function formatValue(product, column) {
    const value = product?.[column.key];
    
    // Coluna Estoque + Bloqueado: mostrar formato "3160 + (40) = 3200"
    if (column.key === 'availablestock') {
        const current = product?.currentstock ?? 0;
        const blocked = product?.blockedstock ?? 0;
        const total = current + Math.abs(blocked);
        const blockedDisplay = blocked < 0 ? `(${Math.abs(blocked)})` : `+ ${blocked}`;
        return `${current} ${blockedDisplay} = ${total}`;
    }
    
    // Colunas de preço/currency: formatar como R$
    if (column.type === 'currency') {
        if (value === null || value === undefined || value === '' || value === 0) {
            return '-';
        }
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
    
    // Coluna Cobertura em meses: arredondar para 1 casa decimal
    if (column.key === 'coverageMonths') {
        if (value === null || value === undefined || value === '') {
            return '-';
        }
        return Number(value).toFixed(1);
    }
    
    // Colunas de última compra por filial: formatar origem correta (item 3)
    if (column.key === 'lastPurchaseAMS') {
        const priceValue = product?.lastPurchaseAMS;
        if (priceValue === null || priceValue === undefined || priceValue === '' || priceValue === 0) {
            return '-';
        }
        return `AMS · ${new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(priceValue)}`;
    }
    
    if (column.key === 'lastPurchaseDPR') {
        const priceValue = product?.lastPurchaseDPR;
        if (priceValue === null || priceValue === undefined || priceValue === '' || priceValue === 0) {
            return '-';
        }
        return `DPR · ${new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(priceValue)}`;
    }
    
    if (column.key === 'lastPurchaseDMT') {
        const priceValue = product?.lastPurchaseDMT;
        if (priceValue === null || priceValue === undefined || priceValue === '' || priceValue === 0) {
            return '-';
        }
        return `DMT · ${new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(priceValue)}`;
    }
    
    if (column.key === 'lastPurchaseDMS') {
        const priceValue = product?.lastPurchaseDMS;
        if (priceValue === null || priceValue === undefined || priceValue === '' || priceValue === 0) {
            return '-';
        }
        return `DMS · ${new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(priceValue)}`;
    }
    
    if (column.key === 'lastPurchaseDSC') {
        const priceValue = product?.lastPurchaseDSC;
        if (priceValue === null || priceValue === undefined || priceValue === '' || priceValue === 0) {
            return '-';
        }
        return `DSC · ${new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(priceValue)}`;
    }
    
    // Coluna Origem do Valor: formatar corretamente
    if (column.key === 'priceSource') {
        if (!value || value === '') {
            return '-';
        }
        // Extrair filial e tipo (ex: "AMS · Ult.Comp.")
        return value;
    }
    
    if (column.type === 'boolean') {
        return Number(value) === 1 ? 'Sim' : 'Não';
    }
    
    if (value === null || value === undefined || value === '') {
        return '-';
    }
    
    return String(value);
}


export default function PurchaseTable({
    rows = [],
    columns = [],
    visibleColumns = [],
    columnOrder = [],
    selectedIds = [],
    selectAllFiltered = false,
    onToggleSelection,
    onToggleAll
}) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeColumns = Array.isArray(columns) ? columns : [];
    const safeVisibleColumns = Array.isArray(visibleColumns) ? visibleColumns : [];
    const safeColumnOrder = Array.isArray(columnOrder) ? columnOrder : safeColumns.map(c => c.key);
    const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds : [];
    
    const orderedColumns = safeColumnOrder
        .map(key => safeColumns.find(column => column.key === key))
        .filter(Boolean);
    
    const activeColumns = orderedColumns.filter(column => 
        safeVisibleColumns.includes(column.key)
    );
    
    const allSelected = safeRows.length > 0 && 
        safeRows.every(row => safeSelectedIds.includes(row.id));
    
    const someSelected = safeRows.some(row => safeSelectedIds.includes(row.id));
    const isIndeterminate = someSelected && !allSelected;
    
    React.useEffect(() => {
        const checkbox = document.querySelector('.purchase-select-all-checkbox');
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
                                        ? 'Todos os produtos filtrados estão selecionados' 
                                        : 'Selecionar todos os produtos filtrados'
                                }
                                className="purchase-select-all-checkbox"
                            />
                        </th>
                        {activeColumns.map(column => (
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
                        safeRows.map(product => {
                            const isSelected = isRowSelected(product);
                            
                            return (
                                <tr 
                                    key={product.id} 
                                    className={isSelected ? 'purchase-row-selected' : ''}
                                >
                                    <td className="purchase-select-column">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onToggleSelection(product.id)}
                                            disabled={selectAllFiltered}
                                        />
                                    </td>
                                    {activeColumns.map(column => (
                                        <td key={column.key}>
                                            {formatValue(product, column)}
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