import { useEffect, useMemo, useState } from 'react';
import {
    listEmailCampaigns,
    createEmailCampaign,
    deleteEmailCampaign,
    listEmailConfigs,
    listEmailRecipients,
    createEmailRecipientsBatch,
    deleteEmailRecipient,
    sendEmailCampaign,
    listCampaignAttachments,
    selectAndSaveCampaignAttachments,
    removeCampaignAttachment,
    getCampaignDashboard,
    getCampaignHistory
} from '../services/emailApi';
import { EMAIL_STATUS_LABELS } from '../constants';
import '../EmailDispatch.css';

const DEFAULT_SUBJECT = 'Solicitação de atualização de preços e pendências';

const DEFAULT_BODY = `Olá,

Solicitamos, por gentileza, a atualização das informações dos itens anexados.

Caso existam preços atualizados, informe-os na planilha correspondente.
Caso existam pendências, informe a posição atual dos itens na planilha correspondente.

Pedimos que responda a este e-mail mantendo o assunto e anexando os arquivos atualizados.

Atenciosamente,
Setor de Compras`;

function createEmptyForm() {
    return {
        config_id: '',
        subject: DEFAULT_SUBJECT,
        body_template: DEFAULT_BODY,
        recipients_text: '',
        cc: '',
        bcc: ''
    };
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('pt-BR');
}

function formatSize(value) {
    const bytes = Number(value || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getValue(object, names, fallback = '') {
    for (const name of names) {
        if (object && object[name] !== undefined && object[name] !== null) {
            return object[name];
        }
    }
    return fallback;
}

function parseRecipients(text) {
    const seen = new Set();
    const valid = [];
    const invalid = [];
    const duplicated = [];

    String(text || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
            const email = line.split(',')[0].trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                invalid.push(line);
                return;
            }
            if (seen.has(email)) {
                duplicated.push(email);
                return;
            }
            seen.add(email);
            valid.push({ email, name: '', company: '' });
        });

    return { valid, invalid, duplicated };
}

function parseEmailList(text, label) {
    const values = String(text || '')
        .replace(/[,;]/g, '\n')
        .split(/\r?\n/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

    const uniqueValues = [...new Set(values)];
    const invalid = uniqueValues.filter((email) => {
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    });

    if (invalid.length) {
        throw new Error(`E-mail inválido em ${label}: ${invalid.join(', ')}`);
    }

    return uniqueValues.join(';');
}

function recipientsToText(recipients) {
    return (recipients || [])
        .map((recipient) => String(recipient.email || '').trim())
        .filter(Boolean)
        .join('\n');
}

export default function EmailCampaignsPage() {
    const [configs, setConfigs] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [form, setForm] = useState(createEmptyForm());
    const [draftCampaign, setDraftCampaign] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [recipients, setRecipients] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [history, setHistory] = useState([]);
    const [creating, setCreating] = useState(false);
    const [savingFavorite, setSavingFavorite] = useState(false);
    const [selectingAttachments, setSelectingAttachments] = useState(false);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        try {
            const [configList, campaignList] = await Promise.all([
                listEmailConfigs(),
                listEmailCampaigns()
            ]);

            setConfigs(Array.isArray(configList) ? configList : []);
            setCampaigns(Array.isArray(campaignList) ? campaignList : []);
        } catch (error) {
            setErrorMessage(error?.message || 'Não foi possível carregar o módulo de e-mail.');
        }
    }

    function updateForm(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    const recipientValidation = useMemo(() => {
        return parseRecipients(form.recipients_text);
    }, [form.recipients_text]);

    async function refreshCampaigns() {
        const list = await listEmailCampaigns();
        setCampaigns(Array.isArray(list) ? list : []);
        return Array.isArray(list) ? list : [];
    }

    async function getFullCampaign(campaignId) {
        const [recipientsList, attachmentsList, dashboardData, historyList] = await Promise.all([
            listEmailRecipients(campaignId),
            listCampaignAttachments(campaignId),
            getCampaignDashboard(campaignId),
            getCampaignHistory(campaignId)
        ]);

        return {
            recipients: Array.isArray(recipientsList) ? recipientsList : [],
            attachments: Array.isArray(attachmentsList) ? attachmentsList : [],
            dashboard: dashboardData || null,
            history: Array.isArray(historyList) ? historyList : []
        };
    }

    async function refreshDraftDetails(campaign, options = {}) {
        const { preserveFormRecipients = true, preserveFormContent = true } = options;
        const currentCampaign = campaign || draftCampaign;

        if (!currentCampaign?.id) return null;

        const details = await getFullCampaign(currentCampaign.id);

        setDraftCampaign(currentCampaign);
        setRecipients(details.recipients);
        setAttachments(details.attachments);
        setDashboard(details.dashboard);
        setHistory(details.history);

        if (!preserveFormContent) {
            setForm({
                config_id: String(getValue(currentCampaign, ['config_id', 'configid'], '')),
                subject: String(getValue(currentCampaign, ['subject'], '')),
                body_template: String(getValue(currentCampaign, ['body_template', 'bodytemplate'], '')),
                recipients_text: preserveFormRecipients ? form.recipients_text : recipientsToText(details.recipients),
                cc: String(getValue(currentCampaign, ['cc'], '') || ''),
                bcc: String(getValue(currentCampaign, ['bcc'], '') || '')
            });
        }

        return details;
    }

    async function loadFavorite(campaign) {
        setMessage('');
        setErrorMessage('');

        try {
            const details = await getFullCampaign(campaign.id);

            setDraftCampaign(campaign);
            setRecipients(details.recipients);
            setAttachments(details.attachments);
            setDashboard(details.dashboard);
            setHistory(details.history);

            setForm({
                config_id: String(getValue(campaign, ['config_id', 'configid'], '')),
                subject: String(getValue(campaign, ['subject'], '')),
                body_template: String(getValue(campaign, ['body_template', 'bodytemplate'], '')),
                recipients_text: recipientsToText(details.recipients),
                cc: String(getValue(campaign, ['cc'], '') || ''),
                bcc: String(getValue(campaign, ['bcc'], '') || '')
            });

            setMessage('Favorito carregado. Os destinatários e anexos foram restaurados.');
        } catch (error) {
            setErrorMessage(error?.message || 'Não foi possível carregar o favorito.');
        }
    }

    async function createDraftIfNeeded() {
        if (draftCampaign?.id) return draftCampaign;

        if (!form.config_id) throw new Error('Selecione a conta remetente.');
        if (!form.subject.trim()) throw new Error('Informe o assunto do e-mail.');
        if (!form.body_template.trim()) throw new Error('Informe a mensagem do e-mail.');

        const campaign = await createEmailCampaign({
            config_id: form.config_id,
            request_type: 'precos',
            subject: form.subject.trim(),
            body_template: form.body_template.trim(),
            cc: parseEmailList(form.cc, 'CC') || null,
            bcc: parseEmailList(form.bcc, 'CCO') || null
        });

        setDraftCampaign(campaign);
        return campaign;
    }

    async function syncRecipients(campaign) {
        const parsed = parseRecipients(form.recipients_text);
        const existing = await listEmailRecipients(campaign.id);
        const existingEmails = new Set(
            (existing || []).map((recipient) => String(recipient.email || '').trim().toLowerCase()).filter(Boolean)
        );

        const newRecipients = parsed.valid.filter((recipient) => !existingEmails.has(recipient.email));

        if (newRecipients.length) {
            await createEmailRecipientsBatch(campaign.id, newRecipients);
        }

        return {
            added: newRecipients.length,
            existing: existingEmails.size,
            invalid: parsed.invalid.length,
            duplicated: parsed.duplicated.length
        };
    }

    async function handleSaveFavorite() {
        setSavingFavorite(true);
        setMessage('');
        setErrorMessage('');

        try {
            const campaign = await createDraftIfNeeded();
            const syncResult = await syncRecipients(campaign);
            const details = await refreshDraftDetails(campaign, { preserveFormRecipients: true, preserveFormContent: true });
            await refreshCampaigns();

            const recipientTotal = details?.recipients.length || 0;
            const attachmentTotal = details?.attachments.length || 0;

            if (!recipientTotal) {
                setErrorMessage('Favorito criado, mas sem destinatários salvos. Informe pelo menos um e-mail válido, depois clique em Salvar como favorito novamente.');
                return;
            }

            setMessage(`Favorito salvo com sucesso: ${recipientTotal} destinatário(s) e ${attachmentTotal} anexo(s). ` +
                `${syncResult.added ? `${syncResult.added} novo(s) e-mail(s) incluído(s).` : 'Nenhum novo e-mail precisava ser incluído.'}`);
        } catch (error) {
            setErrorMessage(error?.message || 'Não foi possível salvar o favorito.');
        } finally {
            setSavingFavorite(false);
        }
    }

    async function handleSelectAttachments() {
        setSelectingAttachments(true);
        setMessage('');
        setErrorMessage('');

        try {
            const campaign = await createDraftIfNeeded();
            const recipientResult = await syncRecipients(campaign);
            const result = await selectAndSaveCampaignAttachments(String(campaign.id));
            const details = await refreshDraftDetails(campaign, { preserveFormRecipients: true, preserveFormContent: true });
            await refreshCampaigns();

            if (result?.cancelled) {
                setMessage(`Seleção de anexos cancelada. Favorito mantido com ${details?.recipients.length || 0} destinatário(s) e ${details?.attachments.length || 0} anexo(s).`);
                return;
            }

            const ignored = Array.isArray(result?.ignored) ? result.ignored : [];
            const ignoredDetails = ignored.map((item) => {
                const fileName = String(item?.path || '').split(/[\\/]/).pop() || 'arquivo';
                return `${fileName}: ${item?.reason || 'motivo não informado'}`;
            }).join(' | ');

            if (Number(result?.added_count || 0) > 0) {
                setMessage(`${result.added_count} anexo(s) adicionado(s). Favorito atual: ${details?.recipients.length || 0} destinatário(s) e ${details?.attachments.length || 0} anexo(s).`);
            } else if (ignored.length > 0) {
                setErrorMessage(`Nenhum arquivo foi anexado. Arquivo(s) ignorado(s): ${ignoredDetails}`);
            } else {
                setErrorMessage('Nenhum arquivo foi anexado. Verifique se você selecionou um arquivo permitido.');
            }

            if (recipientResult.invalid > 0) {
                setErrorMessage(`Foram encontrados ${recipientResult.invalid} destinatário(s) inválido(s). Corrija o campo de e-mails e salve novamente.`);
            }
        } catch (error) {
            setErrorMessage(error?.message || 'Não foi possível adicionar arquivos anexos.');
        } finally {
            setSelectingAttachments(false);
        }
    }

    async function handleRemoveAttachment(attachmentId) {
        if (!draftCampaign?.id) return;
        if (!confirm('Remover este anexo?')) return;

        try {
            await removeCampaignAttachment(attachmentId);
            const details = await refreshDraftDetails(draftCampaign, { preserveFormRecipients: true, preserveFormContent: true });
            setMessage(`Anexo removido. Restam ${details?.attachments.length || 0} anexo(s).`);
        } catch (error) {
            setErrorMessage(error?.message || 'Erro ao remover o anexo.');
        }
    }

    async function handleQuickSend() {
        setCreating(true);
        setMessage('');
        setErrorMessage('');

        try {
            const campaign = await createDraftIfNeeded();
            await syncRecipients(campaign);
            const details = await refreshDraftDetails(campaign, { preserveFormRecipients: true, preserveFormContent: true });

            if (!details?.recipients.length) {
                throw new Error('Informe pelo menos um e-mail válido antes de enviar.');
            }

            const confirmation = confirm(`Disparar e-mails individuais para ${details.recipients.length} destinatário(s)?\n\nCC: ${form.cc || 'nenhum'}\nCCO: ${form.bcc || 'nenhum'}\n\nAnexos: ${details.attachments.length}\n\nCada destinatário receberá uma mensagem separada.`);

            if (!confirmation) return;

            setSending(true);
            const result = await sendEmailCampaign(campaign.id, { sendInterval: 2000 });
            await refreshCampaigns();
            const updatedDetails = await refreshDraftDetails(campaign, { preserveFormRecipients: true, preserveFormContent: true });

            const sentCount = (result?.results || []).filter((item) => item.status === 'sent').length;
            const failedCount = (result?.results || []).filter((item) => item.status === 'error').length;

            setMessage(`Disparo concluído: ${sentCount} enviado(s), ${failedCount} falha(s), ${updatedDetails?.attachments.length || 0} anexo(s) por e-mail.`);
        } catch (error) {
            setErrorMessage(error?.message || 'Não foi possível disparar os e-mails.');
        } finally {
            setCreating(false);
            setSending(false);
        }
    }

    function handleNewRequest() {
        setDraftCampaign(null);
        setAttachments([]);
        setRecipients([]);
        setDashboard(null);
        setHistory([]);
        setForm(createEmptyForm());
        setMessage('');
        setErrorMessage('');
    }

    async function handleDeleteFavorite(campaignId) {
        if (!confirm('Excluir este favorito, seus destinatários, anexos e histórico?')) return;

        try {
            await deleteEmailCampaign(campaignId);
            const list = await refreshCampaigns();
            if (draftCampaign?.id === campaignId) handleNewRequest();
            setMessage('Favorito excluído.');
            if (!list.length) setDraftCampaign(null);
        } catch (error) {
            setErrorMessage(error?.message || 'Erro ao excluir o favorito.');
        }
    }

    async function handleDeleteRecipient(recipientId) {
        if (!draftCampaign?.id) return;
        if (!confirm('Excluir este destinatário?')) return;

        try {
            await deleteEmailRecipient(recipientId);
            const details = await refreshDraftDetails(draftCampaign, { preserveFormRecipients: false, preserveFormContent: false });
            setMessage(`Destinatário removido. Restam ${details?.recipients.length || 0} destinatário(s).`);
        } catch (error) {
            setErrorMessage(error?.message || 'Erro ao excluir o destinatário.');
        }
    }

    const pendingCount = recipients.filter((recipient) => recipient.status !== 'sent' && recipient.status !== 'replied').length;
    const formDisabled = creating || savingFavorite || selectingAttachments || sending || Boolean(draftCampaign);

    return (
        <div className="email-page-container">
            <div className="email-page-header">
                <div>
                    <h1 className="email-page-title">Disparo rápido de e-mails</h1>
                    <p className="email-page-subtitle">Prepare e salve assunto, mensagem, e-mails e anexos. O envio é individual para cada destinatário.</p>
                </div>
                <button type="button" className="email-button email-button-secondary" onClick={handleNewRequest} disabled={creating || savingFavorite || selectingAttachments || sending}>+ Nova solicitação</button>
            </div>

            <div className="email-page-content">
                {message && <div className="email-alert email-alert-success">✓ {message}</div>}
                {errorMessage && <div className="email-alert email-alert-error">⚠ {errorMessage}</div>}

                <section className="email-card">
                    <div className="email-card-title-row">
                        <div>
                            <h2 className="email-card-title" style={{ marginBottom: 3 }}>{draftCampaign ? 'Favorito em edição' : 'Nova solicitação'}</h2>
                            <p className="email-form-help">Use somente um e-mail por linha no campo de destinatários.</p>
                        </div>
                    </div>

                    <div className="email-form-group">
                        <label className="email-form-label">Conta remetente</label>
                        <select className="email-form-select" value={form.config_id} onChange={(event) => updateForm('config_id', event.target.value)} disabled={formDisabled}>
                            <option value="">Selecione a conta...</option>
                            {configs.map((config) => (
                                <option key={config.id} value={config.id}>{config.name} — {config.from_email || config.fromemail || ''}</option>
                            ))}
                        </select>
                    </div>

                    <div className="email-form-group">
                        <label className="email-form-label">Assunto</label>
                        <input type="text" className="email-form-input" value={form.subject} onChange={(event) => updateForm('subject', event.target.value)} disabled={formDisabled} />
                    </div>

                    <div className="email-form-group">
                        <label className="email-form-label">Mensagem</label>
                        <textarea className="email-form-textarea" value={form.body_template} onChange={(event) => updateForm('body_template', event.target.value)} disabled={formDisabled} />
                        <p className="email-form-help">Você pode usar {'{{email}}'} na mensagem, se necessário.</p>
                    </div>

                    <div className="email-form-group">
                        <label className="email-form-label">CC (Cópia)</label>
                        <input type="text" className="email-form-input" value={form.cc} onChange={(event) => updateForm('cc', event.target.value)} placeholder="copia@empresa.com; outro@empresa.com" disabled={formDisabled} />
                        <p className="email-form-help">E-mails visíveis em todos os envios. Separe por vírgula ou ponto e vírgula.</p>
                    </div>

                    <div className="email-form-group">
                        <label className="email-form-label">CCO (Cópia Oculta)</label>
                        <input type="text" className="email-form-input" value={form.bcc} onChange={(event) => updateForm('bcc', event.target.value)} placeholder="oculto@empresa.com; outro@empresa.com" disabled={formDisabled} />
                        <p className="email-form-help">E-mails ocultos dos demais destinatários. Separe por vírgula ou ponto e vírgula.</p>
                    </div>

                    <div className="email-form-group">
                        <label className="email-form-label">Destinatários</label>
                        <textarea className="email-form-textarea" value={form.recipients_text} onChange={(event) => updateForm('recipients_text', event.target.value)} placeholder="fornecedor1@empresa.com
fornecedor2@empresa.com
fornecedor3@empresa.com" style={{ minHeight: 130 }} disabled={formDisabled} />
                        <p className="email-form-help">Informe somente um e-mail por linha.</p>
                    </div>

                    {!draftCampaign && (
                        <div className="email-metrics-grid">
                            <div className="email-metric-card"><span>Válidos</span><strong>{recipientValidation.valid.length}</strong></div>
                            <div className="email-metric-card metric-warning"><span>Inválidos</span><strong>{recipientValidation.invalid.length}</strong></div>
                            <div className="email-metric-card metric-info"><span>Duplicados</span><strong>{recipientValidation.duplicated.length}</strong></div>
                            <div className="email-metric-card metric-success"><span>Envio</span><strong>Individual</strong></div>
                            <div className="email-metric-card"><span>Anexos</span><strong>{attachments.length}</strong></div>
                        </div>
                    )}

                    <div className="email-toolbar-actions">
                        <button type="button" className="email-button email-button-secondary" onClick={handleSelectAttachments} disabled={creating || savingFavorite || selectingAttachments || sending}>
                            {selectingAttachments ? 'Selecionando arquivos...' : '+ Adicionar arquivos anexos'}
                        </button>
                        <button type="button" className="email-button email-button-secondary" onClick={handleSaveFavorite} disabled={creating || savingFavorite || selectingAttachments || sending}>
                            {savingFavorite ? 'Salvando favorito...' : 'Salvar como favorito'}
                        </button>
                        <button type="button" className="email-button email-button-primary" onClick={handleQuickSend} disabled={creating || savingFavorite || selectingAttachments || sending || (!draftCampaign && !recipientValidation.valid.length)}>
                            {creating ? 'Preparando...' : sending ? 'Enviando...' : draftCampaign ? `Disparar para ${pendingCount} destinatário(s)` : `Disparar para ${recipientValidation.valid.length} destinatário(s)`}
                        </button>
                    </div>
                </section>

                <section className="email-card">
                    <div className="email-card-title-row">
                        <div>
                            <h2 className="email-card-title" style={{ marginBottom: 3 }}>Favoritos e solicitações salvas</h2>
                            <p className="email-form-help">Ao abrir um favorito, os e-mails, cópias e anexos são restaurados.</p>
                        </div>
                    </div>

                    {!campaigns.length && <div className="email-empty-state">Nenhum favorito salvo ainda.</div>}

                    {!!campaigns.length && (
                        <div className="email-campaign-list">
                            {campaigns.map((campaign) => (
                                <div key={campaign.id} className={`email-campaign-item ${draftCampaign?.id === campaign.id ? 'email-campaign-item-active' : ''}`}>
                                    <button type="button" className="email-campaign-select" onClick={() => loadFavorite(campaign)}>
                                        <span>{campaign.subject}</span>
                                        <small>{campaign.config_name || campaign.configname || 'Configuração'} · {formatDate(campaign.created_at || campaign.createdat)}</small>
                                    </button>
                                    <button type="button" className="email-icon-button email-icon-danger" onClick={() => handleDeleteFavorite(campaign.id)} title="Excluir favorito">✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {draftCampaign && (
                    <>
                        <div className="email-metrics-grid">
                            <div className="email-metric-card"><span>Destinatários</span><strong>{dashboard?.total || 0}</strong></div>
                            <div className="email-metric-card metric-warning"><span>Pendentes</span><strong>{dashboard?.pending || 0}</strong></div>
                            <div className="email-metric-card metric-success"><span>Enviados</span><strong>{dashboard?.sent || 0}</strong></div>
                            <div className="email-metric-card metric-info"><span>Respondidos</span><strong>{dashboard?.replied || 0}</strong></div>
                            <div className="email-metric-card"><span>Anexos</span><strong>{attachments.length}</strong></div>
                        </div>

                        <div className="email-layout-middle">
                            <section className="email-card">
                                <h2 className="email-card-title">Arquivos anexos ({attachments.length})</h2>
                                {!attachments.length && <div className="email-empty-state">Nenhum arquivo anexado.</div>}
                                <div className="email-attachment-list">
                                    {attachments.map((attachment) => (
                                        <div key={attachment.id} className="email-attachment-item">
                                            <div style={{ minWidth: 0 }}>
                                                <strong>{attachment.file_name || attachment.filename}</strong>
                                                <small>{formatSize(attachment.file_size || attachment.filesize)} · {formatDate(attachment.created_at || attachment.createdat)}</small>
                                            </div>
                                            <button type="button" className="email-icon-button email-icon-danger" onClick={() => handleRemoveAttachment(attachment.id)} disabled={sending} title="Remover anexo">✕</button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="email-card">
                                <h2 className="email-card-title">Resumo do favorito</h2>
                                <div style={{ display: 'grid', gap: 8, color: '#40556c', fontSize: 11 }}>
                                    <div><strong>Assunto:</strong> {form.subject}</div>
                                    <div><strong>CC:</strong> {form.cc || 'Nenhum'}</div>
                                    <div><strong>CCO:</strong> {form.bcc || 'Nenhum'}</div>
                                    <div><strong>Destinatários:</strong> {recipients.length}</div>
                                    <div><strong>Anexos:</strong> {attachments.length}</div>
                                    <div><strong>Envio:</strong> individual para cada e-mail</div>
                                    <div><strong>Status:</strong> {pendingCount ? `${pendingCount} pendente(s)` : 'Sem destinatários pendentes'}</div>
                                </div>
                            </section>
                        </div>

                        <div className="email-layout-bottom">
                            <section className="email-card">
                                <h2 className="email-card-title">Destinatários ({recipients.length})</h2>
                                <div className="email-table-wrapper">
                                    <table className="email-table">
                                        <thead><tr><th>E-mail</th><th>Status</th><th>Enviado em</th><th>Ação</th></tr></thead>
                                        <tbody>
                                            {recipients.map((recipient) => (
                                                <tr key={recipient.id}>
                                                    <td>{recipient.email}</td>
                                                    <td><span className={`email-status-badge email-status-${recipient.status}`}>{EMAIL_STATUS_LABELS[recipient.status] || recipient.status}</span></td>
                                                    <td>{formatDate(recipient.sent_at || recipient.sentat)}</td>
                                                    <td><button type="button" className="email-icon-button email-icon-danger" onClick={() => handleDeleteRecipient(recipient.id)} disabled={sending} title="Excluir destinatário">✕</button></td>
                                                </tr>
                                            ))}
                                            {!recipients.length && <tr><td colSpan={4} className="email-empty-cell">Nenhum destinatário salvo.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="email-card">
                                <h2 className="email-card-title">Histórico ({history.length})</h2>
                                <div className="email-table-wrapper">
                                    <table className="email-table">
                                        <thead><tr><th>Tipo</th><th>E-mail</th><th>Status</th><th>Data</th></tr></thead>
                                        <tbody>
                                            {history.map((event) => (
                                                <tr key={`${event.event_type || event.eventtype}-${event.id}`}>
                                                    <td>{(event.event_type || event.eventtype) === 'received' ? 'Recebido' : 'Enviado'}</td>
                                                    <td>{event.email || '-'}</td>
                                                    <td className={event.error_message || event.errormessage ? 'email-error-text' : ''}>
                                                        {event.error_message || event.errormessage ? `Falhou: ${event.error_message || event.errormessage}` : event.status || '-'}
                                                    </td>
                                                    <td>{formatDate(event.event_at || event.eventat || event.created_at || event.createdat)}</td>
                                                </tr>
                                            ))}
                                            {!history.length && <tr><td colSpan={4} className="email-empty-cell">Nenhum evento registrado.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}