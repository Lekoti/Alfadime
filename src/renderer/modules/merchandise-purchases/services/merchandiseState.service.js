const PREFIX="alfadime:merchandise-purchases";

function key(fileName){
    return `${PREFIX}:${String(fileName||"").trim()}`;
}

export function loadMerchandiseState(fileName){
    if(typeof localStorage==="undefined")return null;

    const raw=localStorage.getItem(key(fileName));

    if(!raw)return null;

    try{
        const state=JSON.parse(raw);

        return state&&typeof state==="object"?state:null;
    }catch{
        return null;
    }
}

export function saveMerchandiseState(fileName,state){
    if(typeof localStorage==="undefined"||!fileName)return;

    localStorage.setItem(key(fileName),JSON.stringify({
        premises:state.premises,
        filters:state.filters,
        overrides:state.overrides
    }));
}

export function removeMerchandiseState(fileName){
    if(typeof localStorage==="undefined")return;

    localStorage.removeItem(key(fileName));
}
