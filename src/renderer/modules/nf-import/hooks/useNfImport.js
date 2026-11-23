import { useEffect, useRef, useState } from "react";
import { nfImportService } from "../services/nfImport.service";
export default function useNfImport() {
    const [root, setRoot] = useState(""), [rows, setRows] = useState([]), [folders, setFolders] = useState([]);
    const [selected, setSelected] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
    const [progress, setProgress] = useState(null);
    const alive = useRef(true), running = useRef(false), cancel = useRef(false);
    useEffect(() => { alive.current = true; nfImportService.root().then((value) => { if (alive.current) setRoot(value); }).catch((err) => { if (alive.current) setError(err.message); }); return () => { alive.current = false; cancel.current = true; }; }, []);
    async function execute(action) {
        if (running.current) return;
        running.current = true; cancel.current = false; setBusy(true); setError("");
        try { await action(); } catch (err) { if (alive.current) setError(err.message); }
        finally { running.current = false; if (alive.current) setBusy(false); }
    }
    return { root, rows, folders, selected, setSelected, busy, error, progress,
        stop: () => { cancel.current = true; },
        open: () => execute(async () => { const item = await nfImportService.open(); if (item && alive.current) { setSelected(item); } }),
        chooseRoot: () => execute(async () => { const value = await nfImportService.chooseRoot(); if (value && alive.current) { setRoot(value); setRows([]); setFolders([]); setSelected(null); setProgress(null); } }),
        scan: () => execute(async () => {
            setRows([]); setFolders([]); setSelected(null); setProgress({ done: 0, total: 0, state: "Listando pastas..." });
            const result = await nfImportService.scan();
            if (!alive.current) return;
            setRoot(result.root); setFolders(result.folders);
            const collected = [];
            for (const entry of result.rows) {
                if (cancel.current || !alive.current) break;
                collected.push(await nfImportService.read(entry));
                if (!alive.current) return;
                setRows([...collected]); setProgress({ done: collected.length, total: result.rows.length, state: "Analisando XMLs" });
            }
            if (alive.current) setProgress({ done: collected.length, total: result.rows.length, state: cancel.current ? "Interrompido" : "Concluído" });
        })
    };
}
