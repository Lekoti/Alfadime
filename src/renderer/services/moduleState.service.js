const STORAGE_KEY = 'alfadime_module_state_v1';


function safeParse(json, fallback) {
    if (!json || typeof json !== 'string') {
        return fallback;
    }


    try {
        const parsed = JSON.parse(json);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
        return fallback;
    }
}


export function loadModuleState(moduleId) {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = safeParse(raw, {});


    if (!all || typeof all !== 'object') {
        return null;
    }


    const moduleState = all[moduleId];


    if (!moduleState || typeof moduleState !== 'object') {
        return null;
    }
    
    // Se tiver _arrayValue, retorna o array direto
    if (moduleState._arrayValue !== undefined) {
        return moduleState._arrayValue;
    }


    return moduleState;
}


export function saveModuleState(moduleId, patch) {
    if (!moduleId) {
        return;
    }


    const raw = localStorage.getItem(STORAGE_KEY);
    const all = safeParse(raw, {});


    const current = all[moduleId] || {};
    const next = { ...current, ...patch };


    all[moduleId] = next;


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(all)
    );
}


export function clearModuleState(moduleId) {
    if (!moduleId) {
        return;
    }


    const raw = localStorage.getItem(STORAGE_KEY);
    const all = safeParse(raw, {});


    if (!all[moduleId]) {
        return;
    }


    delete all[moduleId];


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(all)
    );
}


export function clearAllModuleState() {
    localStorage.removeItem(STORAGE_KEY);
}