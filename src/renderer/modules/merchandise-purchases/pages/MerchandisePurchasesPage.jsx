import {useEffect,useMemo,useState} from "react";
import MerchandiseFilters from "../components/MerchandiseFilters";
import MerchandiseImportPanel from "../components/MerchandiseImportPanel";
import MerchandisePremises from "../components/MerchandisePremises";
import MerchandiseSummaryTables from "../components/MerchandiseSummaryTables";
import MerchandiseCharts from "../components/MerchandiseCharts";
import MerchandiseTable from "../components/MerchandiseTable";
import {buildColumns} from "../constants/merchandise-purchases.constants";
import {useMerchandisePurchases} from "../hooks/useMerchandisePurchases";
import {buildMerchandiseReports} from "../services/merchandiseReport.service";
import {exportMerchandiseExcel} from "../services/merchandiseExport.service";
import "../styles/merchandise-purchases.css";
import "../styles/merchandise-dashboard.css";
const PAGE_SIZE=100;
const TABS=[["products","Simulação de Compras"],["reports","Filtros e Tabelas"],["charts","Gráficos"]];
export default function MerchandisePurchasesPage(){
    const {imported,loading,error,premises,setPremises,filters,setFilters,options,rows,setQuantity,importFile,clearImport}=useMerchandisePurchases();
    const [tab,setTab]=useState("reports"),[page,setPage]=useState(1),[selectedIds,setSelectedIds]=useState(()=>new Set());
    const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState(null);
    const columns=useMemo(()=>buildColumns(premises.closedMonth),[premises.closedMonth]);
    const reports=useMemo(()=>buildMerchandiseReports(rows),[rows]);
    const totalPages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE)),currentPage=Math.min(page,totalPages);
    const pageRows=useMemo(()=>rows.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE),[rows,currentPage]);
    const allSelected=rows.length>0&&rows.every(r=>selectedIds.has(r.id));
    useEffect(()=>{setPage(1);setSelectedIds(new Set());},[filters,imported]);
    function toggle(id){setSelectedIds(old=>{const next=new Set(old);next.has(id)?next.delete(id):next.add(id);return next;});}
    async function handleExport(){
        const exportRows=selectedIds.size?rows.filter(r=>selectedIds.has(r.id)):rows;
        if(!exportRows.length){setExportError("Nenhum produto para exportar.");return;}
        try{setExporting(true);setExportError(null);
            await new Promise(resolve=>setTimeout(resolve,30));
            const labels=Object.entries(filters).filter(([,v])=>String(v||"").trim()).map(([k,v])=>`${k}: ${v}`).join(" | ");
            await exportMerchandiseExcel({rows:exportRows,premises,importInfo:imported,filtersLabel:labels||"Todas as empresas e laboratórios exportados"});
        }catch(e){console.error(e);setExportError(e.message||"Erro ao exportar.");}finally{setExporting(false);}
    }
    return <main className="mp-page mp-dashboard">
        <div className="mp-title-bar"><h1>Compras de Mercadorias</h1><button className="mp-action-button" disabled={!rows.length||exporting||loading} onClick={handleExport}>{exporting?"Exportando...":selectedIds.size?`Exportar Excel (${selectedIds.size} selecionados)`:"Exportar Excel (filtrados)"}</button></div>
        <MerchandiseImportPanel imported={imported} loading={loading} onFileSelected={importFile} onClear={clearImport}/>
        <nav className="mp-dashboard-tabs" aria-label="Abas de compras">{TABS.map(([key,title])=><button key={key} type="button" className={tab===key?"active":""} aria-current={tab===key?"page":undefined} onClick={()=>setTab(key)}>{title}</button>)}</nav>
        {error&&<div className="mp-error">{error}</div>}{exportError&&<div className="mp-error">{exportError}</div>}
        {!imported?<div className="mp-loading">Importe a planilha no padrão 27.10 para iniciar.</div>:loading?<div className="mp-loading">Importando e calculando...</div>:tab==="products"?
            <section className="mp-card"><div className="mp-card-header"><span>{rows.length.toLocaleString("pt-BR")} produtos filtrados · {selectedIds.size} selecionados</span></div>
                <MerchandiseTable rows={pageRows} columns={columns} selectedIds={selectedIds} allSelected={allSelected} onToggleSelection={toggle} onToggleAll={()=>setSelectedIds(allSelected?new Set():new Set(rows.map(r=>r.id)))} onQuantityChange={setQuantity}/>
                <div className="mp-pagination"><span>Página {currentPage} de {totalPages}</span><button disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)}>Anterior</button><button disabled={currentPage>=totalPages} onClick={()=>setPage(currentPage+1)}>Próxima</button></div>
            </section>:
            <section className="mp-dashboard-content">{tab==="reports"?<>
                <section className="mp-dashboard-controls"><h2>Filtros gerais</h2><MerchandiseFilters filters={filters} options={options} onChange={setFilters}/><h2>Premissas</h2><MerchandisePremises premises={premises} onChange={setPremises}/></section>
                <MerchandiseSummaryTables reports={reports}/>
            </>:<MerchandiseCharts reports={reports}/>}</section>}
    </main>;
}
