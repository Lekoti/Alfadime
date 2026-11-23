import React, { useEffect, useState } from "react";
import { formatUnits } from "../services/nfPurchaseReport.service";
export default function NfPurchaseAllocation({ row, saved, reservedOthers, disabled, onSave, onRemove }) {
    const [quantity, setQuantity] = useState(saved ? formatUnits(saved) : "");
    useEffect(() => { setQuantity(saved ? formatUnits(saved) : ""); }, [saved]);
    return <tr><td>{row.control}</td><td>{row.code}</td><td>{row.description}</td>
        <td className="nf-number">{formatUnits(row.pending)}</td><td className="nf-number">{formatUnits(reservedOthers)}</td>
        <td className="nf-number">{formatUnits(row.pending - reservedOthers)}</td><td>
            <input type="text" inputMode="decimal" className="nf-allocation-input" value={quantity} onChange={(event) => setQuantity(event.target.value)}
                disabled={disabled} placeholder="Ex.: 1.200 ou 12,5" aria-label={`Quantidade para o controle ${row.control}`} />
        </td><td className="nf-number">{saved ? formatUnits(saved) : "—"}</td><td>
            <button type="button" disabled={disabled} onClick={() => onSave(quantity)}>Vincular na conferência</button>
            {saved > 0n && <button type="button" onClick={onRemove}>Remover</button>}
        </td></tr>;
}
