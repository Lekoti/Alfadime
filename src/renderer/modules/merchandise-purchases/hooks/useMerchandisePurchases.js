import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {DEFAULT_FILTERS,createDefaultPremises} from "../constants/merchandise-purchases.constants";
import {getCachedImport,importMerchandiseFile,setCachedImport} from "../services/merchandiseImport.service";
import {applyOverrides,computeRows,filterRows,summarizeRows,uniqueSorted} from "../services/merchandiseCalculation.service";
import {readCommercialPolicies,applyCommercialPolicies} from "../services/merchandisePolicy.service";

let cachedPolicySnapshot=null;
let cachedPolicyError=null;

export function useMerchandisePurchases(){
    const [imported,setImported]=useState(()=>getCachedImport());
    const [loading,setLoading]=useState(false);
    const [error,setError]=useState(null);
    const [premises,setPremises]=useState(()=>createDefaultPremises());
    const [filters,setFilters]=useState(DEFAULT_FILTERS);
    const [overrides,setOverrides]=useState({});
    const [policySnapshot,setPolicySnapshot]=useState(()=>getCachedImport()?cachedPolicySnapshot:null);
    const [policyLoading,setPolicyLoading]=useState(false);
    const [policyError,setPolicyError]=useState(()=>getCachedImport()?cachedPolicyError:null);
    const mounted=useRef(true);
    const requestId=useRef(0);
    const busy=useRef(false);

    useEffect(()=>{
        mounted.current=true;

        return ()=>{
            mounted.current=false;
            requestId.current+=1;
        };
    },[]);

    const importFile=useCallback(async file=>{
        if(busy.current)return;

        busy.current=true;
        const request=++requestId.current;

        setLoading(true);
        setError(null);

        try{
            await new Promise(resolve=>setTimeout(resolve,30));
            const result=await importMerchandiseFile(file);

            if(!mounted.current||request!==requestId.current)return;

            setPolicyLoading(true);
            let snapshot=null;
            let warning=null;

            try{
                snapshot=await readCommercialPolicies(true);
            }catch(policyError){
                warning=`Não foi possível ler a Política Comercial nesta importação: ${policyError.message}. Os preços históricos serão utilizados. Para tentar novamente, importe a base outra vez.`;
            }

            if(!mounted.current||request!==requestId.current)return;

            setCachedImport(result);
            cachedPolicySnapshot=snapshot;
            cachedPolicyError=warning;
            setImported(result);
            setPolicySnapshot(snapshot);
            setPolicyError(warning);
            setOverrides({});
            setFilters(DEFAULT_FILTERS);
        }catch(importError){
            if(mounted.current&&request===requestId.current){
                setError(importError.message||"Não foi possível importar a planilha.");
            }
        }finally{
            busy.current=false;

            if(mounted.current&&request===requestId.current){
                setLoading(false);
                setPolicyLoading(false);
            }
        }
    },[]);

    const clearImport=useCallback(()=>{
        requestId.current+=1;
        setCachedImport(null);
        cachedPolicySnapshot=null;
        cachedPolicyError=null;
        setImported(null);
        setPolicySnapshot(null);
        setPolicyError(null);
        setOverrides({});
        setFilters(DEFAULT_FILTERS);
        setError(null);
        setLoading(false);
        setPolicyLoading(false);
    },[]);

    const enriched=useMemo(
        ()=>applyCommercialPolicies(imported?.rows||[],policySnapshot),
        [imported,policySnapshot]
    );

    const computed=useMemo(
        ()=>computeRows(enriched,premises),
        [enriched,premises]
    );

    const allRows=useMemo(
        ()=>applyOverrides(computed,overrides),
        [computed,overrides]
    );

    const options=useMemo(()=>({
        companies:uniqueSorted(allRows,"company"),
        laboratories:uniqueSorted(allRows,"lab"),
        groups:uniqueSorted(allRows,"group"),
        curves:uniqueSorted(allRows,"curve"),
        priceOrigins:uniqueSorted(allRows,"priceOrigin")
    }),[allRows]);

    const rows=useMemo(
        ()=>filterRows(allRows,filters),
        [allRows,filters]
    );

    const summary=useMemo(
        ()=>summarizeRows(rows),
        [rows]
    );

    const setQuantity=useCallback((id,quantity)=>{
        setOverrides(current=>{
            const next={...current};

            if(quantity==null){
                delete next[id];
            }else{
                next[id]=quantity;
            }

            return next;
        });
    },[]);

    return {
        imported,
        loading,
        error,
        premises,
        setPremises,
        filters,
        setFilters,
        options,
        rows,
        allRows,
        summary,
        overrides,
        setQuantity,
        importFile,
        clearImport,
        policySnapshot,
        policyLoading,
        policyError
    };
}
