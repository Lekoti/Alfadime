export default function MerchandiseColumnSelector({columns,preferences,onToggle,onReorder}){
    const byKey=new Map(columns.map(column=>[column.key,column]));
    function drop(event,target){
        event.preventDefault();
        onReorder(event.dataTransfer.getData("text/plain"),target);
    }
    return (
        <details className="mp-columns-selector">
            <summary>Colunas ({preferences.visible.length})</summary>
            <div className="mp-columns-options">
                <p>Marque para visualizar. Arraste para alterar a ordem.</p>
                {preferences.order.map((key,index)=>{
                    const column=byKey.get(key);
                    if(!column)return null;
                    const visible=preferences.visible.includes(key);
                    return (
                        <div key={key} className={`mp-column-option${visible?"":" mp-column-hidden"}`}
                            draggable onDragStart={event=>{event.dataTransfer.setData("text/plain",key);event.dataTransfer.effectAllowed="move";}}
                            onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect="move";}}
                            onDrop={event=>drop(event,key)}>
                            <span className="mp-column-grip" aria-hidden="true">⋮⋮</span>
                            <label><input type="checkbox" checked={visible} disabled={visible&&preferences.visible.length===1} onChange={()=>onToggle(key)}/>{column.label}</label>
                            <button type="button" disabled={index===0} onClick={()=>onReorder(key,preferences.order[index-1])} aria-label={`Mover ${column.label} para a esquerda`}>←</button>
                            <button type="button" disabled={index===preferences.order.length-1} onClick={()=>onReorder(key,preferences.order[index+1])} aria-label={`Mover ${column.label} para a direita`}>→</button>
                        </div>
                    );
                })}
            </div>
        </details>
    );
}
