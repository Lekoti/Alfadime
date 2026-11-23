import useNfPurchaseSession from "../hooks/useNfPurchaseSession";
import React, { useState } from "react";
import useNfImport from "../hooks/useNfImport";
import { BRANCHES } from "../constants/nfImport.constants";
import NfInvoiceDetails from "../components/NfInvoiceDetails";
import "../styles/nf-import.css";
export default function NfImportPage() {
    const model = useNfImport();
    const purchase = useNfPurchaseSession(model.selected);
    const [branch, setBranch] = useState(""), [search, setSearch] = useState("");
    const rows = model.rows.filter((row) => (!branch || row.folderBranch === branch) &&
        [row.fileName, row.issuer, row.number, row.cnpj].join(" ").toLowerCase().includes(search.toLowerCase()));
    if (model.selected) return <main className="nf-page">
        <header className="nf-heading"><h1>Importação NF</h1><button type="button" disabled={model.busy} onClick={model.open}>Importar outro XML</button></header>
        <p className="nf-muted">Somente leitura · nenhuma alteração em XMLs, produtos ou estoque.</p>
        {model.error && <p className="nf-error" role="alert">{model.error}</p>}
        <NfInvoiceDetails purchase={purchase} key={model.selected.id || model.selected.fileName} invoice={model.selected} onClose={() => model.setSelected(null)} />
    </main>;
    return <main className="nf-page">
        <header className="nf-heading"><h1>Importação NF</h1><div className="nf-actions">
            <button type="button" disabled={model.busy} onClick={model.open}>Importar XML</button>
            <button type="button" disabled={model.busy} onClick={model.scan}>Atualizar pastas ComErros</button>
            {model.busy && <button type="button" onClick={model.stop}>Interromper após o arquivo atual</button>}
        </div></header>
        <p className="nf-notice">Somente leitura. Diagnóstico informativo; não altera XMLs, produtos ou estoque. Acesso vinculado à permissão de consulta de Produtos nesta versão de teste.</p>
        <section className="nf-card"><div className="nf-heading"><div><strong>Pasta base</strong><p className="nf-path">{model.root || "Carregando..."}</p></div>
            <button type="button" disabled={model.busy} onClick={model.chooseRoot}>Selecionar pasta base</button></div>
            <p className="nf-muted">Pasta alternativa válida somente nesta sessão. Leitura manual de 0001, 0002, 0003, 0005 e 0006 / ComErros; sem subpastas e sem monitoramento automático contínuo.</p>
            {model.progress && <p role="status">{model.progress.state}: {model.progress.done} / {model.progress.total} XMLs analisados</p>}
            {model.folders.map((folder) => <p className={folder.error ? "nf-error" : "nf-muted"} key={folder.branch}>
                {folder.branch}: {folder.error || `${folder.included} de ${folder.total} XMLs incluídos`}
                {!folder.error && folder.included < folder.total && " — limite global de 2.000 arquivos atingido; resultado parcial"}
            </p>)}
        </section>
        {model.error && <p className="nf-error" role="alert">{model.error}</p>}
        <div className="nf-summary">{BRANCHES.map((item) => <span key={item.key}>{item.key}: {model.rows.filter((row) => row.folderBranch === item.key).length}</span>)}<span>Total analisado: {model.rows.length}</span></div>
        <section className="nf-card"><div className="nf-actions">
            <label>Filial da pasta <select value={branch} onChange={(event) => setBranch(event.target.value)}><option value="">Todas</option>{BRANCHES.map((item) => <option key={item.key}>{item.key}</option>)}</select></label>
            <label>Pesquisar <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Arquivo, NF, emissor ou CNPJ" /></label>
        </div><div className="nf-table-wrap"><table><thead><tr><th>Arquivo</th><th>Pasta / destino</th><th>NF / emissor</th><th>Resumo do diagnóstico</th><th>Consulta</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>
            <td>{row.fileName}</td><td>{row.folderBranch} / {row.destination?.key || "Não identificado"}</td><td>{row.number || "—"}<br/>{row.issuer || "—"}</td>
            <td>{!row.readable ? "Não foi possível ler. " : ""}{row.warnings.join(" • ") || "Sem pendências estruturais detectadas"}<br/>
                {row.items?.filter((item) => item.warnings.length).length || 0} item(ns) com pendências ou necessidade de conferência</td>
            <td><button type="button" onClick={() => model.setSelected(row)}>Ver detalhes</button></td>
        </tr>)}{!rows.length && <tr><td colSpan={5}>Nenhum XML listado. Importe um arquivo ou atualize as pastas.</td></tr>}</tbody></table></div></section>
        <NfInvoiceDetails purchase={purchase} invoice={model.selected} onClose={() => model.setSelected(null)} />
    </main>;
}
