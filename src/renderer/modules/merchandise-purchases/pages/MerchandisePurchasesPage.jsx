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
import "../styles/merchandise-policy.css";
const PAGE_SIZE=100,TABS=[["products","Simulação de Compras"],["reports","Filtros e Tabelas"],["charts","Gráficos"]];
export default function MerchandisePurchasesPage(){
    const {imported,loading,error,premises,setPremises,filters,setFilters,options,rows,allRows,setQuantity,importFile,clearImport,policySnapshot,policyLoading,policyError}=useMerchandisePurchases();
    const [tab,setTab]=useState("reports"),[page,setPage]=useState(1),[selectedIds,setSelectedIds]=useState(()=>new Set());
    const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState(null);
    const columns=useMemo(()=>buildColumns(premises.closedMonth),[premises.closedMonth]),reports=useMemo(()=>buildMerchandiseReports(rows),[rows]);
    const totalPages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE)),currentPage=Math.min(page,totalPages);
    const pageRows=useMemo(()=>rows.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE),[rows,currentPage]);
    const allSelected=rows.length>0&&rows.every(r=>selectedIds.has(r.id));
    useEffect(()=>{setPage(1);setSelectedIds(new Set());},[filters,imported]);
    const expired=allRows.filter(r=>r.policyExpired).length;
    function toggle(id){setSelectedIds(old=>{const next=new Set(old);next.has(id)?next.delete(id):next.add(id);return next;});}
    async function handleExport(){
        if(!allRows.length){setExportError("Nenhum produto importado para exportar.");return;}
        try{
            setExporting(true);setExportError(null);await new Promise(resolve=>setTimeout(resolve,30));
            await exportMerchandiseExcel({rows:allRows,premises,importInfo:imported,policySnapshot,policyError});
        }catch(e){console.error(e);setExportError(e.message||"Erro ao exportar.");}finally{setExporting(false);}
    }
    return <main className="mp-page mp-dashboard">
        <div className="mp-title-bar"><h1>Compras de Mercadorias</h1><button className="mp-action-button" disabled={!allRows.length||exporting||loading||policyLoading} onClick={handleExport} title="Sempre exporta todos os produtos com os preços carregados na importação.">{exporting?"Exportando...":`Exportar Excel completo (${allRows.length.toLocaleString("pt-BR")})`}</button></div>
        <MerchandiseImportPanel imported={imported} loading={loading} onFileSelected={importFile} onClear={clearImport}/>
        {loading&&<div className="mp-policy-toolbar"><span>{policyLoading?"Lendo Política Comercial para esta importação...":"Importando e calculando..."}</span></div>}
        {imported&&!loading&&policySnapshot&&<div className="mp-policy-toolbar"><span>{policySnapshot.filesFound} arquivos · {policySnapshot.records.length} preços identificados · leitura na importação em {new Date(policySnapshot.scannedAt).toLocaleString("pt-BR")}</span></div>}
        {policyError&&<div className="mp-policy-warning">{policyError}</div>}
        {!!expired&&<div className="mp-policy-warning">{expired} produtos com Política Comercial vencida. Os preços continuam disponíveis para uso, com aviso.</div>}
        {!!policySnapshot?.warnings?.length&&<details className="mp-policy-warning"><summary>{policySnapshot.warnings.length} avisos de leitura</summary>{policySnapshot.warnings.map((w,i)=><div key={i}>{w}</div>)}</details>}
        <nav className="mp-dashboard-tabs" aria-label="Abas de compras">{TABS.map(([key,title])=><button key={key} type="button" className={tab===key?"active":""} aria-current={tab===key?"page":undefined} onClick={()=>setTab(key)}>{title}</button>)}</nav>
        {error&&<div className="mp-error">{error}</div>}{exportError&&<div className="mp-error">{exportError}</div>}
        {loading?<div className="mp-loading">{policyLoading?"Carregando preços da Política Comercial...":"Importando e calculando..."}</div>:!imported?null:tab==="products"?
            <section className="mp-card"><div className="mp-card-header"><span>{rows.length.toLocaleString("pt-BR")} produtos filtrados · {selectedIds.size} selecionados · exportação sempre completa</span></div>
                <MerchandiseTable rows={pageRows} columns={columns} selectedIds={selectedIds} allSelected={allSelected} onToggleSelection={toggle} onToggleAll={()=>setSelectedIds(allSelected?new Set():new Set(rows.map(r=>r.id)))} onQuantityChange={setQuantity}/>
                <div className="mp-pagination"><span>Página {currentPage} de {totalPages}</span><button disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)}>Anterior</button><button disabled={currentPage>=totalPages} onClick={()=>setPage(currentPage+1)}>Próxima</button></div>
            </section>:
            <section className="mp-dashboard-content">{tab==="reports"?<><section className="mp-dashboard-controls"><h2>Filtros gerais</h2><MerchandiseFilters filters={filters} options={options} onChange={setFilters}/><h2>Premissas</h2><MerchandisePremises premises={premises} onChange={setPremises}/></section><MerchandiseSummaryTables reports={reports}/></>:<><p className="mp-chart-filter-info">Gráficos dos {rows.length.toLocaleString("pt-BR")} produtos filtrados, com laboratório baseado em Fabr_Global.</p><MerchandiseCharts reports={reports}/></>}</section>}
    </main>;
}
