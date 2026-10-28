import {useEffect,useState} from "react";
const BRL=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const INT=new Intl.NumberFormat("pt-BR",{maximumFractionDigits:0});
const DEC=new Intl.NumberFormat("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1});
function format(row,col){const v=row[col.key];if(col.type==="currency")return v>0?BRL.format(v):"-";if(col.type==="int")return INT.format(v||0);if(col.type==="dec")return DEC.format(v||0);return v==null||v===""?"-":String(v);}
function QuantityInput({row,onChange}){
    const [value,setValue]=useState(String(row.finalQty));
    useEffect(()=>setValue(String(row.finalQty)),[row.finalQty]);
    function commit(){if(!value.trim()){onChange(row.id,null);return;}const n=Number(value.replace(",","."));if(!Number.isFinite(n)||n<0){setValue(String(row.finalQty));return;}onChange(row.id,n);}
    return <div className="mp-quantity-cell"><input type="number" min="0" step="1" className={`mp-editable-input${row.manual?" mp-manual-quantity":""}`} value={value} onChange={e=>setValue(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}} title="Apague o valor para retornar à quantidade automática."/>{row.manual&&<span className="mp-manual-badge">Manual</span>}</div>;
}
function periodStyle(key){
    if(key==="maxPeriod")return {background:"#dcfce7",color:"#166534",whiteSpace:"normal",minWidth:220,maxWidth:400};
    if(key==="minPeriod")return {background:"#fee2e2",color:"#991b1b",whiteSpace:"normal",minWidth:160,maxWidth:300};
    return undefined;
}
export default function MerchandiseTable({rows,columns,selectedIds,allSelected,onToggleSelection,onToggleAll,onQuantityChange}){
    return <div className="mp-table-wrapper"><table className="mp-table"><thead><tr>
        <th className="mp-select-column"><input type="checkbox" checked={allSelected} onChange={onToggleAll} title="Selecionar todos os produtos filtrados"/></th>
        {columns.map(col=><th key={col.key}>{col.label}</th>)}
    </tr></thead><tbody>{!rows.length?<tr><td colSpan={columns.length+1} className="mp-empty-row">Nenhum produto encontrado.</td></tr>:
        rows.map(row=><tr key={row.id} className={selectedIds.has(row.id)?"mp-row-selected":""}>
            <td className="mp-select-column"><input type="checkbox" checked={selectedIds.has(row.id)} onChange={()=>onToggleSelection(row.id)}/></td>
            {columns.map(col=><td key={col.key} style={periodStyle(col.key)} title={col.key==="maxPeriod"?"Pico mensal e todos os meses com venda acima da média dos meses fechados.":undefined}>
                {col.editable?<QuantityInput row={row} onChange={onQuantityChange}/>:format(row,col)}
            </td>)}
        </tr>)}</tbody></table></div>;
}
