import {useEffect,useRef} from "react";

export default function MerchandiseExportDialog({total,filtered,columnCount,visibleCount,onChoose,onCancel}){
    const dialog=useRef(null);
    useEffect(()=>{
        const element=dialog.current;
        element.showModal();
        return ()=>{if(element.open)element.close();};
    },[]);
    return (
        <dialog ref={dialog} className="mp-export-dialog" aria-labelledby="mp-export-title" aria-describedby="mp-export-description" onCancel={event=>{event.preventDefault();onCancel();}}>
            <h2 id="mp-export-title">Exportar Excel</h2>
            <p id="mp-export-description">Escolha os produtos e as colunas que deseja exportar.</p>
            <div className="mp-export-choices">
                <button type="button" className="mp-export-choice" onClick={()=>onChoose("complete")} disabled={!total}>
                    <strong>Completo</strong>
                    <span>{total.toLocaleString("pt-BR")} produtos · {columnCount} colunas, na ordem padrão</span>
                    <small>Ignora os filtros de visualização. Mantém as premissas e quantidades manuais atuais.</small>
                </button>
                <button type="button" className="mp-export-choice" onClick={()=>onChoose("view")} disabled={!filtered||!visibleCount}>
                    <strong>Conforme o app</strong>
                    <span>{filtered.toLocaleString("pt-BR")} produtos filtrados · {visibleCount} colunas visíveis</span>
                    <small>Respeita os filtros e a ordem das colunas. Inclui todas as páginas dos resultados.</small>
                </button>
            </div>
            <p className="mp-export-note">Planilha1 preserva a base original completa para conferência em ambas as opções. Ocultar colunas não remove seus dados dessa cópia.</p>
            <button type="button" className="mp-filters-toggle" aria-label="Cancelar exportação" onClick={onCancel}>Cancelar</button>
        </dialog>
    );
}
