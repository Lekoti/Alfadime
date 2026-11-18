import {useEffect,useMemo,useState} from "react";
import {normalizeColumnPreferences,orderVisibleColumns,moveColumn} from "../services/merchandiseColumns.service";

const STORAGE_KEY="alfadime:merchandise-purchases:columns:v1";

function readPreferences(){
    try{
        return JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")||{};
    }catch{
        return {};
    }
}

export function useMerchandiseColumns(columns){
    const [saved,setSaved]=useState(readPreferences);
    const preferences=useMemo(()=>normalizeColumnPreferences(columns,saved),[columns,saved]);
    const visibleColumns=useMemo(()=>orderVisibleColumns(columns,preferences),[columns,preferences]);

    useEffect(()=>{
        try{
            localStorage.setItem(STORAGE_KEY,JSON.stringify(preferences));
        }catch{
            // Preferências são opcionais e não devem interromper a simulação.
        }
    },[preferences]);

    function toggleColumn(key){
        if(!preferences.order.includes(key))return;

        const visible=preferences.visible;

        if(visible.includes(key)&&visible.length===1)return;

        setSaved({
            ...preferences,
            visible:visible.includes(key)
                ?visible.filter(item=>item!==key)
                :[...visible,key]
        });
    }

    function reorderColumn(key,target){
        const order=moveColumn(preferences.order,key,target);

        if(order===preferences.order)return;

        const visible=order.filter(item=>preferences.visible.includes(item));

        setSaved({
            ...preferences,
            order,
            visible
        });
    }

    return {
        preferences,
        visibleColumns,
        toggleColumn,
        reorderColumn
    };
}
