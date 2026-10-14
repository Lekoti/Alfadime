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



const SAVE_DELAY_MS = 300;



export function useModuleState(moduleId, initialState) {
    const stableModuleId = useMemo(() => moduleId, [moduleId]);



    const [state, setState] = useState(() => {
        if (!stableModuleId) {
            return initialState;
        }



        const saved = loadModuleState(stableModuleId);



        if (!saved || typeof saved !== 'object') {
            return initialState;
        }



        return {
            ...initialState,
            ...saved
        };
    });



    const pendingSaveRef = useRef(null);
    const pendingStateRef = useRef(null);



    const flushPendingSave = useCallback(() => {
        if (pendingSaveRef.current) {
            clearTimeout(pendingSaveRef.current);
            pendingSaveRef.current = null;
        }



        if (
            stableModuleId &&
            pendingStateRef.current
        ) {
            saveModuleState(
                stableModuleId,
                pendingStateRef.current
            );



            pendingStateRef.current = null;
        }
    }, [stableModuleId]);



    useEffect(() => {
        return () => {
            if (pendingSaveRef.current) {
                clearTimeout(pendingSaveRef.current);
            }



            if (
                stableModuleId &&
                pendingStateRef.current
            ) {
                saveModuleState(
                    stableModuleId,
                    pendingStateRef.current
                );
            }
        };
    }, [stableModuleId]);



    const setField = useCallback((field, value) => {
        setState((current) => {
            const next = {
                ...current,
                [field]: value
            };



            if (stableModuleId) {
                pendingStateRef.current = {
                    ...(pendingStateRef.current || {}),
                    [field]: value
                };



                if (pendingSaveRef.current) {
                    clearTimeout(pendingSaveRef.current);
                }



                pendingSaveRef.current = setTimeout(() => {
                    pendingSaveRef.current = null;



                    if (pendingStateRef.current) {
                        saveModuleState(
                            stableModuleId,
                            pendingStateRef.current
                        );



                        pendingStateRef.current = null;
                    }
                }, SAVE_DELAY_MS);
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
                if (Array.isArray(nextValue)) {
                    saveModuleState(
                        stableModuleId,
                        {
                            _arrayValue: nextValue
                        }
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
        setStateAndPersist,
        flushPendingSave
    ];
}
