export default function MerchandiseColumnSelector({columns,preferences,onToggle,onReorder}){
    const byKey=new Map(columns.map(column=>[column.key,column]));

    function handleDragStart(event,key){
        event.dataTransfer.setData("text/plain",key);
        event.dataTransfer.effectAllowed="move";
    }

    function handleDragOver(event){
        event.preventDefault();
        event.dataTransfer.dropEffect="move";
    }

    function handleDrop(event,target){
        event.preventDefault();
        const key=event.dataTransfer.getData("text/plain");
        if(key)onReorder(key,target);
    }

    return (
        <details className="mp-columns-selector">
            <summary>Colunas ({preferences.visible.length})</summary>

            <div className="mp-columns-options">
                <p>Marque para visualizar. Arraste para alterar a ordem.</p>

                {preferences.order.map(key=>{
                    const column=byKey.get(key);

                    if(!column)return null;

                    const visible=preferences.visible.includes(key);

                    return (
                        <div
                            key={key}
                            className={`mp-column-option${visible?"":" mp-column-hidden"}`}
                            draggable
                            onDragStart={event=>handleDragStart(event,key)}
                            onDragOver={handleDragOver}
                            onDrop={event=>handleDrop(event,key)}
                        >
                            <span className="mp-column-grip" aria-hidden="true">⋮⋮</span>

                            <label>
                                <input
                                    type="checkbox"
                                    checked={visible}
                                    disabled={visible&&preferences.visible.length===1}
                                    onChange={()=>onToggle(key)}
                                />
                                {column.label}
                            </label>
                        </div>
                    );
                })}
            </div>
        </details>
    );
}
