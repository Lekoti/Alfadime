import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';


import {
    loadModuleState,
    saveModuleState
} from '../services/moduleState.service';


export function useModuleState(moduleId, initialState) {
    const initializedRef = useRef(false);
    const stableModuleId = useMemo(() => moduleId, [moduleId]);


    const [state, setState] = useState(() => {
        if (!stableModuleId) {
            return initialState;
        }


        const saved = loadModuleState(stableModuleId);


        if (!saved || typeof saved !== 'object') {
            return initialState;
        }


        return { ...initialState, ...saved };
    });


    useEffect(() => {
        if (!stableModuleId || initializedRef.current) {
            return;
        }


        initializedRef.current = true;


        const saved = loadModuleState(stableModuleId);


        if (saved && typeof saved === 'object') {
            setState((current) => ({
                ...current,
                ...saved
            }));
        }
    }, [stableModuleId]);


    const setField = useCallback((field, value) => {
        setState((current) => {
            const next = {
                ...current,
                [field]: value
            };


            if (stableModuleId) {
                saveModuleState(
                    stableModuleId,
                    { [field]: value }
                );
            }


            return next;
        });
    }, [stableModuleId]);


    const setStateAndPersist = useCallback((updater) => {
        setState((current) => {
            const nextValue =
                typeof updater === 'function'
                    ? updater(current)
                    : updater;


            if (
                stableModuleId &&
                nextValue !== null &&
                (typeof nextValue === 'object' || Array.isArray(nextValue))
            ) {
                // Se for array, salva como valor direto
                if (Array.isArray(nextValue)) {
                    saveModuleState(
                        stableModuleId,
                        { _arrayValue: nextValue }
                    );
                } else {
                    saveModuleState(
                        stableModuleId,
                        nextValue
                    );
                }
            }


            return nextValue;
        });
    }, [stableModuleId]);


    return [
        state,
        setField,
        setStateAndPersist
    ];
}