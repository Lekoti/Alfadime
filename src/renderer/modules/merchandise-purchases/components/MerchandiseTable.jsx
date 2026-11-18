import {memo,useEffect,useState} from "react";
import {validateManualQuantity} from "../services/merchandiseCalculation.service";
const BRL=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}),INT=new Intl.NumberFormat("pt-BR",{maximumFractionDigits:0}),DEC=new Intl.NumberFormat("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1});
function format(row,col){const v=row[col.key];if(col.type==="currency")return BRL.format(Number(v)||0);if(col.type==="int")return INT.format(v||0);if(col.type==="dec")return DEC.format(v||0);if(!v)return "-";if(col.type==="date"){const p=String(v).slice(0,10).split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(v);}if(col.type==="datetime"){const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString("pt-BR");}return String(v);}
const QuantityInput=memo(function QuantityInput({row,onChange}){
    const [value,setValue]=useState(String(row.finalQty));
    const [invalid,setInvalid]=useState(false);

    useEffect(()=>{setValue(String(row.finalQty));setInvalid(false);},[row.finalQty]);

    function commit(){
        const validated=validateManualQuantity(value);

        if(validated===undefined){
            setInvalid(true);
            setValue(String(row.finalQty));
            return;
        }

        setInvalid(false);
        onChange(row.id,validated);
    }

    return <div className="mp-quantity-cell"><input type="number" min="0" step="1" className={`mp-editable-input${row.manual?" mp-manual-quantity":""}${invalid?" mp-invalid-quantity":""}`} value={value} onChange={e=>{setValue(e.target.value);setInvalid(false);}} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}} title="Informe um número inteiro maior ou igual a zero. Apague para retornar à quantidade automática."/>{row.manual&&<span className="mp-manual-badge">Manual</span>}{invalid&&<span className="mp-invalid-badge">Valor inválido</span>}</div>;
});
function style(row,key){if(key==="maxPeriod")return {background:"#dcfce7",color:"#166534",whiteSpace:"normal",minWidth:220,maxWidth:400};if(key==="minPeriod")return {background:"#fee2e2",color:"#991b1b",whiteSpace:"normal",minWidth:160,maxWidth:300};if((key.startsWith("policy")&&row.policyWarning)||(key==="selectedPriceWarning"&&row.selectedPriceWarning))return {background:"#fff3cd",color:"#92400e",whiteSpace:"normal",maxWidth:300};return undefined;}
export default function MerchandiseTable({rows,columns,selectedIds,allSelected,onToggleSelection,onToggleAll,onQuantityChange}){
    return <div className="mp-table-wrapper"><table className="mp-table"><thead><tr><th className="mp-select-column"><input type="checkbox" checked={allSelected} onChange={onToggleAll} title="Selecionar todos os filtrados"/></th>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead>
    <tbody>{!rows.length?<tr><td colSpan={columns.length+1} className="mp-empty-row">Nenhum produto encontrado.</td></tr>:rows.map(row=><tr key={row.id} className={selectedIds.has(row.id)?"mp-row-selected":""}><td className="mp-select-column"><input type="checkbox" checked={selectedIds.has(row.id)} onChange={()=>onToggleSelection(row.id)}/></td>{columns.map(c=><td key={c.key} style={style(row,c.key)} title={c.key.startsWith("policy")?row.policyWarning||row.policyStatus:undefined}>{c.editable?<QuantityInput row={row} onChange={onQuantityChange}/>:format(row,c)}</td>)}</tr>)}</tbody></table></div>;
}
