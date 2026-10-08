import { useEffect, useState } from 'react';
import '../EmailDispatch.css';

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('pt-BR');
}

function getNumber(value) {
    return Number(value || 0);
}

function getStatusLabel(status) {
    const labels = {
        processed: 'Processado',
        downloaded: 'Baixado',
        new: 'Novo',
        noattachment: 'Sem anexo',
        ignored: 'Ignorado',
        error: 'Erro'
    };
    return labels[String(status || '').toLowerCase()] || status || '-';
}

function getStatusClass(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'processed') return 'email-status-success';
    if (value === 'error') return 'email-status-error';
    if (['downloaded', 'new', 'noattachment'].includes(value)) {
        return 'email-status-warning';
    }
    return 'email-status-info';
}

export default function EmailReceivedPage() {
    const [dashboard, setDashboard] = useState(null);
    const [logs, setLogs] = useState([]);
    const [running, setRunning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadPageData();
    }, []);

    async function loadPageData() {
        setLoading(true);
        try {
            const [dashboardData, logsData] = await Promise.all([
                window.alfadime.email.received.dashboard(),
                window.alfadime.email.received.listLogs()
            ]);
            setDashboard(dashboardData || null);
            setLogs(Array.isArray(logsData) ? logsData : []);
        } catch (loadError) {
            setError(loadError?.message || 'Não foi possível carregar os dados de recebidos.');
        } finally {
            setLoading(false);
        }
    }

    async function handleRunRoutine() {
        setRunning(true);
        setError('');
        setSuccess('');
        setResult(null);
        try {
            const routineResult = await window.alfadime.email.received.runRoutine();
            setResult(routineResult);
            await loadPageData();
            setSuccess(
                `Rotina concluída: ${getNumber(routineResult.messagesNew)} mensagem(ns) nova(s), ` +
                `${getNumber(routineResult.attachmentsDownloaded)} anexo(s) baixado(s), ` +
                `${getNumber(routineResult.attachmentsProcessed)} planilha(s) processada(s) e ` +
                `${getNumber(routineResult.generatedFiles)} arquivo(s) padronizado(s) gerado(s).`
            );
        } catch (routineError) {
            setError(routineError?.message || 'Não foi possível executar a rotina de recebidos.');
        } finally {
            setRunning(false);
        }
    }

    async function handleOpenFolder(folderType) {
        setError('');
        setSuccess('');
        try {
            await window.alfadime.email.received.openFolder(folderType);
        } catch (folderError) {
            setError(folderError?.message || 'Não foi possível abrir a pasta solicitada.');
        }
    }

    const messageTotal = getNumber(dashboard?.messages?.total);
    const attachmentTotal = getNumber(dashboard?.attachments?.total);
    const processedTotal = getNumber(dashboard?.attachments?.processed);
    const errorTotal = getNumber(dashboard?.attachments?.errors);

    return (
        <div className="email-page-container">
            <div className="email-page-header">
                <div>
                    <span className="email-page-eyebrow">E-mail / Recebidos</span>
                    <h1 className="email-page-title">Rotina de retornos</h1>
                    <p className="email-page-subtitle">
                        Baixa somente anexos novos, identifica preços ou pendências e gera os arquivos padronizados automaticamente.
                    </p>
                </div>
                <button type="button" className="email-button email-button-secondary" onClick={loadPageData} disabled={running || loading}>
                    {loading ? 'Atualizando...' : 'Atualizar dados'}
                </button>
            </div>

            <div className="email-page-content">
                {error && <div className="email-alert email-alert-error">⚠ {error}</div>}
                {success && <div className="email-alert email-alert-success">✓ {success}</div>}

                <section className="email-card">
                    <div className="email-card-title-row">
                        <div>
                            <h2 className="email-card-title" style={{ marginBottom: 3 }}>Processamento automático</h2>
                            <p className="email-form-help">
                                A rotina percorre todas as contas IMAP cadastradas, ignora mensagens já baixadas e evita processar novamente anexos concluídos.
                            </p>
                        </div>
                        <button type="button" className="email-button email-button-primary" onClick={handleRunRoutine} disabled={running || loading}>
                            {running ? 'Gerando rotina...' : 'Gerar rotina'}
                        </button>
                    </div>

                    <div className="email-metrics-grid">
                        <div className="email-metric-card"><span>Mensagens</span><strong>{messageTotal}</strong></div>
                        <div className="email-metric-card"><span>Anexos baixados</span><strong>{attachmentTotal}</strong></div>
                        <div className="email-metric-card metric-success"><span>Processados</span><strong>{processedTotal}</strong></div>
                        <div className="email-metric-card metric-danger"><span>Com erro</span><strong>{errorTotal}</strong></div>
                        <div className="email-metric-card metric-info"><span>Última rotina</span><strong>{result ? getNumber(result.generatedFiles) : '-'}</strong></div>
                    </div>

                    {result && (
                        <div className="email-result-box" style={{ border: '1px solid #d5dbe3', background: '#f8fafc' }}>
                            <div className="email-result-title">Resultado da última rotina</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8, color: '#40556c', fontSize: 11 }}>
                                <div><strong>Contas:</strong> {getNumber(result.accounts)}</div>
                                <div><strong>Encontradas:</strong> {getNumber(result.messagesFound)}</div>
                                <div><strong>Novas:</strong> {getNumber(result.messagesNew)}</div>
                                <div><strong>Já baixadas:</strong> {getNumber(result.messagesSkipped)}</div>
                                <div><strong>Anexos:</strong> {getNumber(result.attachmentsDownloaded)}</div>
                                <div><strong>Processadas:</strong> {getNumber(result.attachmentsProcessed)}</div>
                                <div><strong>Ignoradas:</strong> {getNumber(result.attachmentsIgnored)}</div>
                                <div><strong>Erros:</strong> {getNumber(result.errors)}</div>
                                <div><strong>Arquivos gerados:</strong> {getNumber(result.generatedFiles)}</div>
                                <div><strong>Executada em:</strong> {formatDate(result.executedAt)}</div>
                            </div>
                        </div>
                    )}
                </section>

                <section className="email-card">
                    <div className="email-card-title-row">
                        <div>
                            <h2 className="email-card-title" style={{ marginBottom: 3 }}>Pastas da rotina</h2>
                            <p className="email-form-help">Os arquivos originais e os arquivos padronizados permanecem disponíveis para conferência.</p>
                        </div>
                    </div>
                    <div className="email-toolbar-actions">
                        <button type="button" className="email-button email-button-secondary" onClick={() => handleOpenFolder('originais')} disabled={running}>Abrir originais</button>
                        <button type="button" className="email-button email-button-secondary" onClick={() => handleOpenFolder('precos')} disabled={running}>Abrir preços Sirius</button>
                        <button type="button" className="email-button email-button-secondary" onClick={() => handleOpenFolder('pendencias')} disabled={running}>Abrir pendências processadas</button>
                    </div>
                </section>

                <section className="email-card">
                    <div className="email-card-title-row">
                        <div>
                            <h2 className="email-card-title" style={{ marginBottom: 3 }}>Histórico da rotina ({logs.length})</h2>
                            <p className="email-form-help">Mostra os arquivos já processados, ignorados ou com erro.</p>
                        </div>
                    </div>
                    <div className="email-table-wrapper">
                        <table className="email-table">
                            <thead><tr><th>Arquivo original</th><th>Arquivo gerado</th><th>Remetente</th><th>Status</th><th>Processado em</th></tr></thead>
                            <tbody>
                                {!logs.length && <tr><td colSpan={5} className="email-empty-cell">Nenhum arquivo processado ainda.</td></tr>}
                                {logs.map((log) => (
                                    <tr key={log.id}>
                                        <td>{log.originalfilename || log.original_file_name || '-'}</td>
                                        <td>{log.finalfilename || log.final_file_name || '-'}</td>
                                        <td>{log.senderemail || log.sender_email || '-'}</td>
                                        <td>
                                            <span className={`email-status ${getStatusClass(log.status)}`}>{getStatusLabel(log.status)}</span>
                                            {(log.errormessage || log.error_message) && <small className="email-log-error">{log.errormessage || log.error_message}</small>}
                                        </td>
                                        <td>{formatDate(log.processedat || log.processed_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
