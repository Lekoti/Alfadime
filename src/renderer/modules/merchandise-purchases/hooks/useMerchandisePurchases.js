import {useCallback,useMemo,useState} from "react";
import {DEFAULT_FILTERS,createDefaultPremises} from "../constants/merchandise-purchases.constants";
import {getCachedImport,importMerchandiseFile,setCachedImport} from "../services/merchandiseImport.service";
import {applyOverrides,computeRows,filterRows,summarizeRows,uniqueSorted} from "../services/merchandiseCalculation.service";
export function useMerchandisePurchases(){
    const [imported,setImported]=useState(()=>getCachedImport());
    const [loading,setLoading]=useState(false),[error,setError]=useState(null);
    const [premises,setPremises]=useState(()=>createDefaultPremises());
    const [filters,setFilters]=useState(DEFAULT_FILTERS),[overrides,setOverrides]=useState({});
    const importFile=useCallback(async file=>{
        setLoading(true);setError(null);
        try{await new Promise(resolve=>setTimeout(resolve,30));const result=await importMerchandiseFile(file);setCachedImport(result);setImported(result);setOverrides({});setFilters(DEFAULT_FILTERS);}
        catch(e){console.error("Erro ao importar planilha de compras:",e);setError(e.message||"Não foi possível importar a planilha.");}
        finally{setLoading(false);}
    },[]);
    const clearImport=useCallback(()=>{setCachedImport(null);setImported(null);setOverrides({});setFilters(DEFAULT_FILTERS);setError(null);},[]);
    const computed=useMemo(()=>imported?computeRows(imported.rows,premises):[],[imported,premises]);
    // Complete base, including manual quantities; independent of visual filters.
    const allRows=useMemo(()=>applyOverrides(computed,overrides),[computed,overrides]);
    const options=useMemo(()=>({companies:uniqueSorted(allRows,"company"),laboratories:uniqueSorted(allRows,"lab"),groups:uniqueSorted(allRows,"group"),curves:uniqueSorted(allRows,"curve")}),[allRows]);
    const rows=useMemo(()=>filterRows(allRows,filters),[allRows,filters]);
    const summary=useMemo(()=>summarizeRows(rows),[rows]);
    const setQuantity=useCallback((id,quantity)=>setOverrides(current=>{const next={...current};if(quantity==null)delete next[id];else next[id]=quantity;return next;}),[]);
    return {imported,loading,error,premises,setPremises,filters,setFilters,options,rows,allRows,summary,overrides,setQuantity,importFile,clearImport};
}
