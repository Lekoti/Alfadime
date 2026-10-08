import React from 'react';


export const PURCHASE_COLUMNS = [
    { key: "company", label: "Empresa", defaultVisible: true },
    { key: "productcode", label: "Cód. Prod.", defaultVisible: true },
    { key: "barcode", label: "Cód. Barras", defaultVisible: true },
    { key: "description", label: "Descrição", defaultVisible: true },
    { key: "laboratoryname", label: "Laboratório", defaultVisible: true },
    { key: "availablestock", label: "Estoque + Bloqueado", defaultVisible: true },
    { key: "averagesale12m", label: "Média Venda 12M", defaultVisible: true },
    { key: "averagesale6m", label: "Média Venda 6M", defaultVisible: true },
    { key: "averagesale3m", label: "Média Venda 3M", defaultVisible: true },
    { key: "priceSource", label: "Origem do Valor", defaultVisible: true },
    { key: "effectivecurve", label: "Curva", defaultVisible: true },
    { key: "suggestedquantity", label: "Sugestão Compra", defaultVisible: true, editable: "quantity" },
    { key: "unitprice", label: "Valor Unitário", defaultVisible: true, editable: "price", type: "currency" },
    { key: "totalsuggestionvalue", label: "Total Sugestão", defaultVisible: true, type: "currency" },
    { key: "observation", label: "Observação", defaultVisible: true },
    { key: "currentstock", label: "Estoque", defaultVisible: false },
    { key: "blockedstock", label: "Bloqueado", defaultVisible: false },
    { key: "lastPurchaseDPR", label: "Últ. Compra DPR", defaultVisible: false, type: "currency" },
    { key: "lastPurchaseAMS", label: "Últ. Compra AMS", defaultVisible: false, type: "currency" },
    { key: "lastPurchaseDMT", label: "Últ. Compra DMT", defaultVisible: false, type: "currency" },
    { key: "lastPurchaseDMS", label: "Últ. Compra DMS", defaultVisible: false, type: "currency" },
    { key: "lastPurchaseDSC", label: "Últ. Compra DSC", defaultVisible: false, type: "currency" },
    { key: "penultimatepurchaseprice", label: "Penúlt. Compra", defaultVisible: false, type: "currency" },
    { key: "antepenultimatepurchaseprice", label: "Antepenúlt. Compra", defaultVisible: false, type: "currency" },
    { key: "averagecost", label: "Preço Médio", defaultVisible: false, type: "currency" },
    { key: "coverageMonths", label: "Cobertura (meses)", defaultVisible: false },
    { key: "targetMonths", label: "Meta (meses de estoque)", defaultVisible: false },
    { key: "standardbox", label: "Cx. Padrão", defaultVisible: false },
    { key: "curvevalue", label: "Curva (R$)", defaultVisible: false },
    { key: "curveunit", label: "Curva (Qtd)", defaultVisible: false }
];


export const PURCHASES_EXPORT_COLUMNS = [
    { key: "company", label: "Empresa", width: 25 },
    { key: "productcode", label: "Cód Prod", width: 15 },
    { key: "barcode", label: "Cód Barras", width: 18 },
    { key: "description", label: "Descrição", width: 40 },
    { key: "laboratoryname", label: "Laboratório", width: 25 },
    { key: "effectivecurve", label: "Curva", width: 10 },
    { key: "currentstock", label: "Estoque", width: 15 },
    { key: "blockedstock", label: "Bloqueado", width: 12 },
    { key: "averagesale12m", label: "Média 12M", width: 18 },
    { key: "averagesale6m", label: "Média 6M", width: 18 },
    { key: "averagesale3m", label: "Média 3M", width: 18 },
    { key: "coverageMonths", label: "Cobertura (meses)", width: 16 },
    { key: "suggestedquantity", label: "Sugestão Compra", width: 15 },
    { key: "unitprice", label: "Valor Unitário", width: 15 },
    { key: "totalsuggestionvalue", label: "Total Sugestão", width: 18 }
];


export const DEFAULT_VISIBLE_PURCHASE_COLUMNS = PURCHASE_COLUMNS
    .filter(column => column.defaultVisible)
    .map(column => column.key);


export const DEFAULT_PURCHASE_COLUMN_ORDER = PURCHASE_COLUMNS.map(
    column => column.key
);