import { useState, useCallback } from 'react';
import { loadModuleState, saveModuleState } from '../services/moduleState.service';

export function useModuleArrayState(moduleId, initialState) {
    const [state, setState] = useState(() => {
        if (!moduleId) {
            return initialState;
        }

        const saved = loadModuleState(moduleId);
        
        if (saved && saved._arrayValue && Array.isArray(saved._arrayValue)) {
            return saved._arrayValue;
        }
        
        if (Array.isArray(saved)) {
            return saved;
        }

        return Array.isArray(initialState) ? initialState : [];
    });

    const setStateAndPersist = useCallback((updater) => {
        setState((current) => {
            let nextValue;
            
            if (typeof updater === 'function') {
                nextValue = updater(current);
            } else {
                nextValue = updater;
            }

            if (!Array.isArray(nextValue)) {
                console.error('useModuleArrayState só aceita arrays!', nextValue);
                return current;
            }

            if (moduleId) {
                saveModuleState(moduleId, { _arrayValue: nextValue });
            }

            return nextValue;
        });
    }, [moduleId]);

    return [state, setStateAndPersist];
}