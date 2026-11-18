export function normalizeColumnPreferences(columns,preferences={}){
    const keys=columns.map(column=>column.key);
    const allowed=new Set(keys);
    const storedOrder=Array.isArray(preferences.order)?preferences.order:[];
    const order=[...new Set([...storedOrder.filter(key=>allowed.has(key)),...keys])];
    const storedVisible=Array.isArray(preferences.visible)?preferences.visible:[];
    const visible=storedVisible.length?storedVisible.filter(key=>allowed.has(key)):order;
    return {order,visible:visible.length?visible:order.slice(0,1)};
}

export function orderVisibleColumns(columns,preferences){
    const {visible}=normalizeColumnPreferences(columns,preferences);
    const byKey=new Map(columns.map(column=>[column.key,column]));
    return visible.map(key=>byKey.get(key));
}

export function moveColumn(order,key,target){
    const from=order.indexOf(key),to=order.indexOf(target);
    if(from<0||to<0||from===to)return order;
    const next=[...order];
    next.splice(from,1);
    next.splice(to,0,key);
    return next;
}

export function selectExportColumns(columns,columnKeys){
    if(columnKeys==null)return columns;
    if(!Array.isArray(columnKeys)||!columnKeys.length)throw new Error("Escolha ao menos uma coluna para exportar.");
    const byKey=new Map(columns.map(column=>[column.key,column]));
    if(columnKeys.some(key=>!byKey.has(key)))throw new Error("Coluna desconhecida na exportação.");
    return [...new Set(columnKeys)].map(key=>byKey.get(key));
}

export function createExportSelection({mode,allRows,rows,visibleColumns,filters}){
    if(!["complete","view"].includes(mode))throw new Error("Opção de exportação inválida.");
    const selectedRows=mode==="complete"?allRows:rows;
    if(!selectedRows.length)throw new Error("Nenhum produto disponível para esta exportação.");
    if(mode==="view"&&!visibleColumns.length)throw new Error("Nenhuma coluna visível para exportar.");
    return {
        rows:selectedRows,
        priceRows:allRows,
        columnKeys:mode==="complete"?null:visibleColumns.map(column=>column.key),
        filters:mode==="complete"?{search:"",company:[],laboratory:[],group:"",curve:[],status:"",priceOrigin:""}:filters,
        exportMode:mode
    };
}
