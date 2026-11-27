import {useEffect,useMemo,useState} from "react";
import MerchandiseFilters from "../components/MerchandiseFilters";
import MerchandiseImportPanel from "../components/MerchandiseImportPanel";
import MerchandisePremises from "../components/MerchandisePremises";
import MerchandiseCharts from "../components/MerchandiseCharts";
import MerchandiseTable from "../components/MerchandiseTable";
import {buildColumns} from "../constants/merchandise-purchases.constants";
import MerchandiseColumnSelector from "../components/MerchandiseColumnSelector";
import MerchandiseExportDialog from "../components/MerchandiseExportDialog";
import {useMerchandiseColumns} from "../hooks/useMerchandiseColumns";
import {createExportSelection} from "../services/merchandiseColumns.service";
import "../styles/merchandise-columns.css";
import {useMerchandisePurchases} from "../hooks/useMerchandisePurchases";
import {buildMerchandiseReports} from "../services/merchandiseReport.service";
import {exportMerchandiseExcel} from "../services/merchandiseExport.service";
import {useModuleState} from "../../../hooks/useModuleState";
import "../styles/merchandise-purchases.css";
import "../styles/merchandise-dashboard.css";
import "../styles/merchandise-policy.css";

const PAGE_SIZE=100;
const TABS=[
    ["products","Simulação de Compras"],
    ["filters","Filtros"],
    ["reports","Tabelas"],
    ["charts","Gráficos"]
];

export default function MerchandisePurchasesPage(){
    const {
        imported,loading,error,premises,setPremises,filters,setFilters,options,rows,allRows,setQuantity,importFile,clearImport,policySnapshot,policyLoading,policyError
    }=useMerchandisePurchases();

    const [interfaceState,setInterfaceField]=useModuleState("merchandise-purchases",{
        tab:"filters",
        page:1,
        selectedIds:[]
    });

    const tab=interfaceState.tab||"filters";
    const page=interfaceState.page||1;
    const selectedIdsArray=Array.isArray(interfaceState.selectedIds)?interfaceState.selectedIds:[];
    const selectedIds=new Set(selectedIdsArray);
    const [exporting,setExporting]=useState(false);
    const [exportError,setExportError]=useState(null);
    const [exportOpen,setExportOpen]=useState(false);

    const columns=useMemo(()=>buildColumns(premises.closedMonth,premises.referenceDate),[premises.closedMonth,premises.referenceDate]);
    const {preferences,visibleColumns,toggleColumn,reorderColumn}=useMerchandiseColumns(columns);
    const reports=useMemo(()=>buildMerchandiseReports(rows),[rows]);
    const totalPages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
    const currentPage=Math.min(page,totalPages);
    const pageRows=useMemo(()=>rows.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE),[rows,currentPage]);
    const allSelected=rows.length>0&&rows.every(row=>selectedIds.has(row.id));

    useEffect(()=>{
        setInterfaceField("page",1);
        setInterfaceField("selectedIds",[]);
    },[filters,imported]);

    const expired=allRows.filter(row=>row.policyExpired).length;

    function toggle(id){
        setInterfaceField("selectedIds",selectedIds.has(id)
            ?selectedIdsArray.filter(item=>item!==id)
            :[...selectedIdsArray,id]);
    }

    async function handleExport(mode){
        if(exporting||loading||policyLoading)return;
        setExportOpen(false);
        try{
            const selection=createExportSelection({mode,allRows,rows,visibleColumns,filters});
            setExporting(true);
            setExportError(null);
            await new Promise(resolve=>setTimeout(resolve,30));

            await exportMerchandiseExcel({
                ...selection,
                premises,
                importInfo:imported,
                policySnapshot,
                policyError
            });
        }catch(exportException){
            console.error(exportException);
            setExportError(exportException.message||"Erro ao exportar.");
        }finally{
            setExporting(false);
        }
    }

    return (
        <main className="mp-page mp-dashboard">
            <div className="mp-title-bar">
                <h1>Compras de Mercadorias</h1>
                <button className="mp-action-button" disabled={!allRows.length||exporting||loading||policyLoading} onClick={()=>setExportOpen(true)} title="Escolha exportação completa ou conforme a visualização atual.">
                    {exporting?"Exportando...":"Exportar Excel"}
                </button>
            </div>

            {exportOpen&&<MerchandiseExportDialog total={allRows.length} filtered={rows.length} columnCount={columns.length} visibleCount={visibleColumns.length} onChoose={handleExport} onCancel={()=>setExportOpen(false)}/>}

            <MerchandiseImportPanel imported={imported} loading={loading} onFileSelected={importFile} onClear={clearImport}/>

            {loading&&<div className="mp-policy-toolbar"><span>{policyLoading?"Lendo Política Comercial para esta importação...":"Importando e calculando..."}</span></div>}

            {imported&&!loading&&policySnapshot&&<div className="mp-policy-toolbar"><span>{policySnapshot.filesFound} arquivos · {policySnapshot.records.length} preços identificados · leitura na importação em {new Date(policySnapshot.scannedAt).toLocaleString("pt-BR")}</span></div>}

            {policyError&&<div className="mp-policy-warning">{policyError}</div>}

            {!!expired&&<div className="mp-policy-warning">{expired} produtos com Política Comercial vencida. Os preços continuam disponíveis para uso, com aviso.</div>}

            {!!policySnapshot?.warnings?.length&&<details className="mp-policy-warning"><summary>{policySnapshot.warnings.length} avisos de leitura</summary>{policySnapshot.warnings.map((warning,index)=><div key={index}>{warning}</div>)}</details>}

            <nav className="mp-dashboard-tabs" aria-label="Abas de compras">
                {TABS.map(([key,title])=>(
                    <button key={key} type="button" className={tab===key?"active":""} aria-current={tab===key?"page":undefined} onClick={()=>setInterfaceField("tab",key)}>{title}</button>
                ))}
            </nav>

            {error&&<div className="mp-error">{error}</div>}
            {exportError&&<div className="mp-error">{exportError}</div>}

            {loading?(
                <div className="mp-loading">{policyLoading?"Carregando preços da Política Comercial...":"Importando e calculando..."}</div>
            ):!imported?null:tab==="products"?(
                <section className="mp-card">
                    <div className="mp-card-header">
                        <span>{rows.length.toLocaleString("pt-BR")} produtos filtrados · {selectedIds.size} selecionados</span>
                        <MerchandiseColumnSelector columns={columns} preferences={preferences} onToggle={toggleColumn} onReorder={reorderColumn}/>
                    </div>

                    <MerchandiseTable rows={pageRows} columns={visibleColumns} selectedIds={selectedIds} allSelected={allSelected} onToggleSelection={toggle} onToggleAll={()=>setInterfaceField("selectedIds",allSelected?[]:rows.map(row=>row.id))} onQuantityChange={setQuantity}/>

                    <div className="mp-pagination">
                        <span>Página {currentPage} de {totalPages}</span>
                        <button disabled={currentPage<=1} onClick={()=>setInterfaceField("page",currentPage-1)}>Anterior</button>
                        <button disabled={currentPage>=totalPages} onClick={()=>setInterfaceField("page",currentPage+1)}>Próxima</button>
                    </div>
                </section>
            ):(
                <section className="mp-dashboard-content">
                    {tab==="filters"?(
                        <section className="mp-dashboard-controls">
                            <h2>Filtros gerais</h2>
                            <MerchandiseFilters filters={filters} options={options} onChange={setFilters}/>
                            <h2>Premissas</h2>
                            <MerchandisePremises premises={premises} onChange={setPremises}/>
                        </section>
                    ):tab==="reports"?(
                        <MerchandiseCharts reports={reports} mode="tables"/>
                    ):(
                        <>
                            <p className="mp-chart-filter-info">Gráficos dos {rows.length.toLocaleString("pt-BR")} produtos filtrados, com laboratório baseado em Fabr_Global.</p>
                            <MerchandiseCharts reports={reports} mode="charts"/>
                        </>
                    )}
                </section>
            )}
        </main>
    );
}
