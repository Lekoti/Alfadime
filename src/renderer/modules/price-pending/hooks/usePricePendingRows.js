import { useCallback, useEffect, useRef, useState } from "react";
import { getFriendlyErrorMessage, isDatabaseBusyError } from "../utils/price-pending.utils";
import { PricePendingEditJournal } from "../utils/price-pending-edit-journal";

export default function usePricePendingRows({ permissions, enabled = true }) {
    const [allRows, setRenderedRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [structuralSaving, setStructuralSaving] = useState(false);
    const [savingCell, setSavingCell] = useState(null);
    const [pendingSaves, setPendingSaves] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [ignoredFiles, setIgnoredFiles] = useState([]);
    const [sharedDbMode, setSharedDbMode] = useState(false);
    const [readOnly, setReadOnly] = useState(false);
    const serverRowsRef = useRef([]);
    const journalRef = useRef(new PricePendingEditJournal());
    const loadingRef = useRef(false);
    const pendingRef = useRef(0);
    const structuralRef = useRef(false);
    const epochRef = useRef(0);
    const mountedRef = useRef(true);
    const queueRef = useRef(Promise.resolve());
    const queuedVersionsRef = useRef(new Set());
    const permissionsRef = useRef(permissions);
    const readOnlyRef = useRef(readOnly);
    permissionsRef.current = permissions;
    readOnlyRef.current = readOnly;

    const publish = useCallback(() => {
        if (mountedRef.current) setRenderedRows(journalRef.current.apply(serverRowsRef.current));
    }, []);
    const setAllRows = useCallback(next => {
        epochRef.current += 1;
        serverRowsRef.current = typeof next === "function" ? next(serverRowsRef.current) : next;
        if (!Array.isArray(serverRowsRef.current)) serverRowsRef.current = [];
        publish();
    }, [publish]);
    const report = useCallback((failure, fallback) => {
        if (!mountedRef.current) return;
        if (isDatabaseBusyError(failure)) {
            readOnlyRef.current = true;
            setReadOnly(true);
        }
        setError(getFriendlyErrorMessage(failure, failure?.message || fallback));
    }, []);

    const loadRows = useCallback(async ({ silent = false } = {}) => {
        if (loadingRef.current || pendingRef.current || structuralRef.current) return { skipped: true };
        loadingRef.current = true;
        const epoch = epochRef.current;
        if (!silent && mountedRef.current) setLoading(true);
        try {
            const result = await window.alfadime.pricePending.list();
            if (!Array.isArray(result)) throw new Error("O aplicativo retornou uma lista de laboratórios inválida.");
            if (!mountedRef.current || epoch !== epochRef.current) return { skipped: true };
            serverRowsRef.current = result;
            publish();
            readOnlyRef.current = false;
            setReadOnly(false);
            if (!silent) setError("");
            return { success: true };
        } catch (failure) {
            report(failure, "Não foi possível carregar os laboratórios.");
            return { success: false, error: failure };
        } finally {
            loadingRef.current = false;
            if (!silent && mountedRef.current) setLoading(false);
        }
    }, [publish, report]);
    const retryConnection = useCallback(() => loadRows(), [loadRows]);

    const updateLocalValue = useCallback((id, column, value) => {
        if (readOnlyRef.current || structuralRef.current) return;
        journalRef.current.write(id, column, value);
        publish();
    }, [publish]);

    const saveCell = useCallback((row, column) => {
        const permission = permissionsRef.current;
        const allowed = column === "laboratory" ? permission.canEditLaboratory
            : column === "observation" ? permission.canEditObservation
            : permission.canEditValues && permission.canEditFunction(permission.moduleKey, column);
        const draft = journalRef.current.get(row.id, column);
        if (!draft) return Promise.resolve({ unchanged: true });
        if (!allowed || readOnlyRef.current || structuralRef.current) {
            journalRef.current.removeVersion(row.id, column, draft.version);
            publish();
            if (mountedRef.current) setError("Alteração não salva: sem permissão ou banco em modo somente leitura.");
            return Promise.resolve({ success: false });
        }
        const taskKey = JSON.stringify([row.id, column, draft.version]);
        if (queuedVersionsRef.current.has(taskKey)) return queueRef.current;
        queuedVersionsRef.current.add(taskKey);
        pendingRef.current += 1;
        epochRef.current += 1;
        if (mountedRef.current) setPendingSaves(pendingRef.current);
        const task = queueRef.current.then(async () => {
            try {
                if (readOnlyRef.current) throw new Error("O banco está em modo somente leitura. Tente conectar novamente.");
                const currentPermission = permissionsRef.current;
                const canSave = column === "laboratory" ? currentPermission.canEditLaboratory
                    : column === "observation" ? currentPermission.canEditObservation
                    : currentPermission.canEditValues && currentPermission.canEditFunction(currentPermission.moduleKey, column);
                if (!canSave) throw new Error("Sua permissão de edição foi alterada. A alteração não foi salva.");
                const current = serverRowsRef.current.find(item => item.id === row.id);
                if (!current) throw new Error("Registro não encontrado na lista atual.");
                if (String(current[column] ?? "") === draft.value) {
                    journalRef.current.removeVersion(row.id, column, draft.version);
                    publish();
                    return { unchanged: true };
                }
                if (mountedRef.current) { setSavingCell(`${row.id}:${column}`); setError(""); }
                const saved = await window.alfadime.pricePending.updateCell(row.id, column, draft.value);
                if (!saved || saved.id !== row.id) throw new Error("Resposta de salvamento inválida. Confira o registro antes de editar novamente.");
                serverRowsRef.current = serverRowsRef.current.map(item => item.id === saved.id ? { ...item, ...saved } : item);
                journalRef.current.removeVersion(row.id, column, draft.version);
                publish();
                return { success: true };
            } catch (failure) {
                journalRef.current.removeVersion(row.id, column, draft.version);
                publish();
                report(failure, "Não foi possível salvar a alteração.");
                return { success: false };
            } finally {
                queuedVersionsRef.current.delete(taskKey);
                pendingRef.current -= 1;
                epochRef.current += 1;
                if (mountedRef.current) { setPendingSaves(pendingRef.current); setSavingCell(null); }
            }
        });
        queueRef.current = task.catch(failure => report(failure, "Falha na fila de salvamento."));
        return task;
    }, [publish, report]);

    const runExclusive = useCallback(async (allowed, work) => {
        if (!allowed) throw new Error("Você não tem permissão para executar esta operação.");
        if (readOnlyRef.current) throw new Error("Banco em modo somente leitura. Reconecte antes de continuar.");
        if (pendingRef.current || journalRef.current.size || structuralRef.current) throw new Error("Conclua os salvamentos antes de executar esta operação.");
        structuralRef.current = true;
        epochRef.current += 1;
        if (mountedRef.current) setStructuralSaving(true);
        try { return await work(); }
        catch (failure) { report(failure, "A operação não foi concluída."); throw failure; }
        finally {
            structuralRef.current = false;
            epochRef.current += 1;
            if (mountedRef.current) setStructuralSaving(false);
        }
    }, [report]);
    const acceptExternalUpdate = useCallback(payload => {
        const permission = permissionsRef.current;
        const allowed = permission.canEditValues && permission.canEditFunction(permission.moduleKey, payload.column);
        return runExclusive(allowed, async () => {
            const saved = await window.alfadime.pricePending.acceptExternalUpdate(payload);
            if (!saved || saved.id !== payload.id) throw new Error("Resposta inválida ao processar a proposta externa. Recarregue para conferir.");
            setAllRows(current => current.map(row => row.id === saved.id ? { ...row, ...saved } : row));
            return saved;
        });
    }, [runExclusive, setAllRows]);
    const updatePriority = useCallback((row, priority) => runExclusive(
        permissionsRef.current.canEditLaboratory,
        async () => {
            const saved = await window.alfadime.ipc.invoke("price-pending:update-priority", { id: row.id, priority });
            if (!saved || saved.id !== row.id) throw new Error("Resposta inválida ao salvar prioridade. Recarregue para conferir.");
            setAllRows(current => current.map(item => item.id === saved.id ? { ...item, ...saved } : item));
            return saved;
        }
    ), [runExclusive, setAllRows]);

    const refreshRows = useCallback(async () => {
        if (!permissionsRef.current.canRefresh) { setError("Você não tem permissão para atualizar as planilhas."); return; }
        if (readOnlyRef.current) { setError("Reconecte o banco antes de atualizar."); return; }
        if (pendingRef.current || journalRef.current.size || structuralRef.current) { setError("Conclua as edições antes de atualizar as planilhas."); return; }
        setRefreshing(true); setError(""); setSuccess("");
        try {
            const result = await window.alfadime.pricePending.refresh();
            if (!result?.success) throw new Error(result?.message || "Não foi possível atualizar os dados.");
            setIgnoredFiles(Array.isArray(result.ignored) ? result.ignored : []);
            const loaded = await loadRows();
            if (!loaded.success) { if (loaded.skipped) setError("Atualização processada. Recarregue a lista após concluir a operação atual."); return; }
            const invalidFiles = (Array.isArray(result.ignored) ? result.ignored : [])
                .filter(item => item?.reason === "nome_fora_do_padrao")
                .map(item => item?.fileName)
                .filter(Boolean);

            if (invalidFiles.length) {
                setError(
                    `Nome de arquivo fora do padrão: ${invalidFiles.join(", ")}. ` +
                    "O arquivo contém Preços e Pendências no nome e nenhuma atualização foi aplicada."
                );
                return;
            }

            setSuccess(`Atualização concluída. ${result.filesFound || 0} arquivo(s); ${result.processed || 0} processado(s); ${result.alreadyProcessed || 0} já processado(s); ${result.failures || 0} falha(s).`);
        } catch (failure) { report(failure, "Não foi possível atualizar os dados."); }
        finally { if (mountedRef.current) setRefreshing(false); }
    }, [loadRows, report]);

    const addLaboratory = useCallback(async laboratoryName => {
        if (!permissionsRef.current.canAddLaboratory) { setError("Você não tem permissão para adicionar laboratórios."); return false; }
        if (readOnlyRef.current || pendingRef.current || structuralRef.current || journalRef.current.size) { setError("Conclua as edições e verifique a conexão antes de adicionar."); return false; }
        const laboratory = String(laboratoryName || "").trim();
        if (!laboratory) { setError("Digite o nome do laboratório e o código."); return false; }
        structuralRef.current = true; epochRef.current += 1; setStructuralSaving(true); setError("");
        try {
            const created = await window.alfadime.pricePending.create({ laboratory });
            if (!created?.id) throw new Error("Resposta de criação inválida.");
            setAllRows(current => [...current, created]);
            return true;
        } catch (failure) { report(failure, "Não foi possível adicionar o laboratório."); return false; }
        finally { structuralRef.current = false; if (mountedRef.current) setStructuralSaving(false); }
    }, [setAllRows, report]);
    const removeLaboratory = useCallback(async row => {
        if (!permissionsRef.current.canRemoveLaboratory) { setError("Você não tem permissão para remover laboratórios."); return; }
        if (readOnlyRef.current || pendingRef.current || structuralRef.current || journalRef.current.size) { setError("Conclua as edições e verifique a conexão antes de remover."); return; }
        structuralRef.current = true; epochRef.current += 1; setStructuralSaving(true); setError("");
        try {
            await window.alfadime.pricePending.remove(row.id);
            journalRef.current.removeRow(row.id);
            setAllRows(current => current.filter(item => item.id !== row.id));
        } catch (failure) { report(failure, "Não foi possível remover o laboratório."); }
        finally { structuralRef.current = false; if (mountedRef.current) setStructuralSaving(false); }
    }, [setAllRows, report]);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);
    useEffect(() => {
        if (!enabled) return;
        loadRows();
        let cancelled = false;
        Promise.resolve().then(() => window.alfadime.pricePending.getDbConfig?.())
            .then(config => { if (!cancelled) setSharedDbMode(config?.mode === "shared"); })
            .catch(() => { if (!cancelled) setSharedDbMode(false); });
        return () => { cancelled = true; };
    }, [enabled, loadRows]);
    useEffect(() => {
        if (!sharedDbMode || !enabled) return undefined;
        const interval = setInterval(() => {
            if (journalRef.current.size || pendingRef.current || structuralRef.current || loadingRef.current) return;
            if (document.activeElement?.closest?.(".price-pending-table")) return;
            loadRows({ silent: true });
        }, 20000);
        return () => clearInterval(interval);
    }, [enabled, sharedDbMode, loadRows]);
    return {
        allRows, setAllRows, loading, saving: structuralSaving || pendingSaves > 0,
        savingCell, refreshing, error, success, ignoredFiles, sharedDbMode, readOnly,
        interactionLocked: structuralSaving, acceptExternalUpdate, updatePriority,
        loadRows, retryConnection, refreshRows, updateLocalValue, saveCell,
        addLaboratory, removeLaboratory, setError, setSuccess
    };
}
