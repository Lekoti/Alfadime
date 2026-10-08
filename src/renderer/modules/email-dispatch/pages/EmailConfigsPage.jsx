import { useEffect, useMemo, useState } from 'react';
import {
    listEmailConfigs,
    createEmailConfig,
    updateEmailConfig,
    deleteEmailConfig,
    testSmtpConnection,
    testImapConnection
} from '../services/emailApi';
import { EMAIL_SECURE_MODE_LABELS } from '../constants';
import '../EmailDispatch.css';

function createEmptyForm() {
    return {
        name: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_secure: 'starttls',
        smtp_user: '',
        smtp_password_encrypted: '',
        imap_host: '',
        imap_port: 993,
        imap_secure: 'tls',
        imap_user: '',
        imap_password_encrypted: '',
        from_name: '',
        from_email: '',
        reply_to_email: ''
    };
}

function getConfigValue(config, key) {
    if (!config) {
        return '';
    }

    const aliases = {
        smtp_host: ['smtp_host', 'smtphost'],
        smtp_port: ['smtp_port', 'smtpport'],
        smtp_secure: ['smtp_secure', 'smtpsecure'],
        smtp_user: ['smtp_user', 'smtpuser'],
        imap_host: ['imap_host', 'imaphost'],
        imap_port: ['imap_port', 'imapport'],
        imap_secure: ['imap_secure', 'imapsecure'],
        imap_user: ['imap_user', 'imapuser'],
        from_name: ['from_name', 'fromname'],
        from_email: ['from_email', 'fromemail'],
        reply_to_email: ['reply_to_email', 'replytoemail']
    };

    const keys = aliases[key] || [key];

    for (const alias of keys) {
        if (
            config[alias] !== undefined &&
            config[alias] !== null
        ) {
            return config[alias];
        }
    }

    return '';
}

function buildPayload(form) {
    const smtpHost = String(form.smtp_host || '').trim();
    const smtpPort = Number(form.smtp_port || 0);
    const smtpSecure = form.smtp_secure || 'starttls';
    const smtpUser = String(form.smtp_user || '').trim();
    const smtpPassword = String(
        form.smtp_password_encrypted || ''
    );

    const imapHost = String(form.imap_host || '').trim();
    const imapPort = Number(form.imap_port || 0);
    const imapSecure = form.imap_secure || 'tls';
    const imapUser = String(form.imap_user || '').trim();
    const imapPassword = String(
        form.imap_password_encrypted || ''
    );

    const fromName = String(form.from_name || '').trim();
    const fromEmail = String(form.from_email || '').trim();
    const replyToEmail = String(form.reply_to_email || '').trim();

    return {
        name: String(form.name || '').trim(),

        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_secure: smtpSecure,
        smtp_user: smtpUser,
        smtp_password_encrypted: smtpPassword,

        imap_host: imapHost,
        imap_port: imapPort,
        imap_secure: imapSecure,
        imap_user: imapUser,
        imap_password_encrypted: imapPassword,

        from_name: fromName,
        from_email: fromEmail,
        reply_to_email: replyToEmail,

        smtphost: smtpHost,
        smtpport: smtpPort,
        smtpsecure: smtpSecure,
        smtpuser: smtpUser,
        smtppasswordencrypted: smtpPassword,

        imaphost: imapHost,
        imapport: imapPort,
        imapsecure: imapSecure,
        imapuser: imapUser,
        imappasswordencrypted: imapPassword,

        fromname: fromName,
        fromemail: fromEmail,
        replytoemail: replyToEmail
    };
}

function SecureModeOptions() {
    return Object.entries(EMAIL_SECURE_MODE_LABELS).map(
        ([key, label]) => (
            <option key={key} value={key}>
                {label}
            </option>
        )
    );
}

export default function EmailConfigsPage() {
    const [configs, setConfigs] = useState([]);
    const [selectedConfig, setSelectedConfig] = useState(null);
    const [form, setForm] = useState(createEmptyForm());
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState('');
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [testResult, setTestResult] = useState(null);

    useEffect(() => {
        loadConfigs();
    }, []);

    async function loadConfigs() {
        try {
            const list = await listEmailConfigs();

            setConfigs(Array.isArray(list) ? list : []);
        } catch (error) {
            setErrorMessage(
                error?.message ||
                'Não foi possível carregar as configurações de e-mail.'
            );
        }
    }

    function updateForm(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value
        }));
    }

    function handleNewConfig() {
        setSelectedConfig(null);
        setForm(createEmptyForm());
        setTestResult(null);
        setMessage('');
        setErrorMessage('');
    }

    function handleSelectConfig(config) {
        setSelectedConfig(config);

        setForm({
            name: getConfigValue(config, 'name'),
            smtp_host: getConfigValue(config, 'smtp_host'),
            smtp_port: Number(
                getConfigValue(config, 'smtp_port') || 587
            ),
            smtp_secure:
                getConfigValue(config, 'smtp_secure') || 'starttls',
            smtp_user: getConfigValue(config, 'smtp_user'),
            smtp_password_encrypted: '',
            imap_host: getConfigValue(config, 'imap_host'),
            imap_port: Number(
                getConfigValue(config, 'imap_port') || 993
            ),
            imap_secure:
                getConfigValue(config, 'imap_secure') || 'tls',
            imap_user: getConfigValue(config, 'imap_user'),
            imap_password_encrypted: '',
            from_name: getConfigValue(config, 'from_name'),
            from_email: getConfigValue(config, 'from_email'),
            reply_to_email: getConfigValue(config, 'reply_to_email')
        });

        setTestResult(null);
        setMessage('');
        setErrorMessage('');
    }

    async function handleSave() {
        setSaving(true);
        setMessage('');
        setErrorMessage('');

        try {
            const payload = buildPayload(form);

            let savedConfig;

            if (selectedConfig?.id) {
                savedConfig = await updateEmailConfig(
                    selectedConfig.id,
                    payload
                );

                setMessage('Configuração atualizada com sucesso.');
            } else {
                savedConfig = await createEmailConfig(payload);

                setMessage('Nova configuração criada com sucesso.');
            }

            await loadConfigs();

            if (savedConfig?.id) {
                setSelectedConfig(savedConfig);
            }
        } catch (error) {
            setErrorMessage(
                error?.message || 'Não foi possível salvar a configuração.'
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!selectedConfig?.id) {
            return;
        }

        if (!confirm('Excluir esta configuração de e-mail?')) {
            return;
        }

        try {
            await deleteEmailConfig(selectedConfig.id);

            await loadConfigs();
            handleNewConfig();

            setMessage('Configuração excluída.');
        } catch (error) {
            setErrorMessage(
                error?.message || 'Não foi possível excluir a configuração.'
            );
        }
    }

    async function handleTestSmtp() {
        setTesting('smtp');
        setTestResult(null);
        setMessage('');
        setErrorMessage('');

        try {
            const result = await testSmtpConnection(
                buildPayload(form)
            );

            setTestResult({
                type: 'SMTP',
                ...result
            });
        } catch (error) {
            setTestResult({
                type: 'SMTP',
                success: false,
                message: error?.message || 'Falha ao testar SMTP.'
            });
        } finally {
            setTesting('');
        }
    }

    async function handleTestImap() {
        setTesting('imap');
        setTestResult(null);
        setMessage('');
        setErrorMessage('');

        try {
            const result = await testImapConnection(
                buildPayload(form)
            );

            setTestResult({
                type: 'IMAP',
                ...result
            });
        } catch (error) {
            setTestResult({
                type: 'IMAP',
                success: false,
                message: error?.message || 'Falha ao testar IMAP.'
            });
        } finally {
            setTesting('');
        }
    }

    const selectedSummary = useMemo(() => {
        if (!selectedConfig) {
            return null;
        }

        return {
            name: getConfigValue(selectedConfig, 'name') || '-',
            fromName: getConfigValue(selectedConfig, 'from_name') || '-',
            fromEmail: getConfigValue(selectedConfig, 'from_email') || '-',
            smtpHost: getConfigValue(selectedConfig, 'smtp_host') || '-',
            smtpPort: getConfigValue(selectedConfig, 'smtp_port') || '-',
            smtpSecure:
                getConfigValue(selectedConfig, 'smtp_secure') || '-',
            imapHost: getConfigValue(selectedConfig, 'imap_host') || '-',
            imapPort: getConfigValue(selectedConfig, 'imap_port') || '-',
            imapSecure:
                getConfigValue(selectedConfig, 'imap_secure') || '-'
        };
    }, [selectedConfig]);

    return (
        <div className="email-page-container">
            <div className="email-page-header">
                <div>
                    <h1 className="email-page-title">
                        Configurações de E-mail
                    </h1>

                    <p className="email-page-subtitle">
                        Gerencie as contas de e-mail para envio e recebimento.
                    </p>
                </div>
            </div>

            <div className="email-page-content">
                {message && (
                    <div className="email-alert email-alert-success">
                        ✓ {message}
                    </div>
                )}

                {errorMessage && (
                    <div className="email-alert email-alert-error">
                        • {errorMessage}
                    </div>
                )}

                <div className="email-layout-top">
                    <section className="email-card">
                        <div
                            className="email-card-title-row"
                            style={{
                                alignItems: 'center',
                                marginBottom: 12
                            }}
                        >
                            <h2
                                className="email-card-title"
                                style={{ margin: 0 }}
                            >
                                Configurações salvas
                            </h2>

                            <button
                                type="button"
                                className="email-button email-button-primary"
                                onClick={handleNewConfig}
                            >
                                + Nova configuração
                            </button>
                        </div>

                        {!configs.length && (
                            <div className="email-empty-state">
                                Nenhuma configuração cadastrada.
                            </div>
                        )}

                        {!!configs.length && (
                            <div className="email-campaign-list">
                                {configs.map((config) => (
                                    <div
                                        key={config.id}
                                        className={
                                            `email-campaign-item ${
                                                selectedConfig?.id === config.id
                                                    ? 'email-campaign-item-active'
                                                    : ''
                                            }`
                                        }
                                    >
                                        <button
                                            type="button"
                                            className="email-campaign-select"
                                            onClick={() => {
                                                handleSelectConfig(config);
                                            }}
                                        >
                                            <span>
                                                {getConfigValue(
                                                    config,
                                                    'name'
                                                ) || 'Sem nome'}
                                            </span>

                                            <small>
                                                {getConfigValue(
                                                    config,
                                                    'from_email'
                                                ) || 'E-mail não informado'}
                                            </small>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="email-card">
                        <h2 className="email-card-title">
                            {selectedConfig
                                ? 'Editar configuração'
                                : 'Nova configuração'}
                        </h2>

                        <div className="email-form-grid">
                            <div className="email-form-group">
                                <label className="email-form-label">
                                    Nome
                                </label>

                                <input
                                    type="text"
                                    className="email-form-input"
                                    value={form.name}
                                    placeholder="Ex.: E-mail Compras"
                                    onChange={(event) => {
                                        updateForm(
                                            'name',
                                            event.target.value
                                        );
                                    }}
                                />
                            </div>

                            <div className="email-form-group">
                                <label className="email-form-label">
                                    De (nome)
                                </label>

                                <input
                                    type="text"
                                    className="email-form-input"
                                    value={form.from_name}
                                    placeholder="Ex.: Compras"
                                    onChange={(event) => {
                                        updateForm(
                                            'from_name',
                                            event.target.value
                                        );
                                    }}
                                />
                            </div>

                            <div className="email-form-group">
                                <label className="email-form-label">
                                    De (e-mail)
                                </label>

                                <input
                                    type="email"
                                    className="email-form-input"
                                    value={form.from_email}
                                    placeholder="compras@empresa.com"
                                    onChange={(event) => {
                                        updateForm(
                                            'from_email',
                                            event.target.value
                                        );
                                    }}
                                />
                            </div>

                            <div className="email-form-group">
                                <label className="email-form-label">
                                    E-mail de resposta
                                </label>

                                <input
                                    type="email"
                                    className="email-form-input"
                                    value={form.reply_to_email}
                                    placeholder="Opcional"
                                    onChange={(event) => {
                                        updateForm(
                                            'reply_to_email',
                                            event.target.value
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        <h3 className="email-section-title">
                            SMTP — Envio
                        </h3>

                        <div className="email-form-grid">
                            <div className="email-form-group">
                                <label className="email-form-label">
                                    SMTP Host
                                </label>

                                <input
                                    type="text"
                                    className="email-form-input"
                                    value={form.smtp_host}
                                    placeholder="smtp.empresa.com"
                                    onChange={(event) => {
                                        updateForm(
                                            'smtp_host',
                                            event.target.value
                                        );
                                    }}
                                />
                            </div>

                            <div className="email-form-group">
                                <label className="email-form-label">
                                    SMTP Porta
                                </label>

                                <input
                                    type="number"
                                    className="email-form-input"
                                    value={form.smtp_port}
                                    onChange={(event) => {
                                        updateForm(
                                            'smtp_port',
                                            Number(event.target.value)
                                        );
                                    }}
                                />
                            </div>

                            <div className="email-form-group">
                                <label className="email-form-label">
                                    SMTP Seguro
                                </label>

                                <select
                                    className="email-form-select"
                                    value={form.smtp_secure}
                                    onChange={(event) => {
                                        updateForm(
                                            'smtp_secure',
                                            event.target.value
                                        );
                                    }}
                                >
                                    <SecureModeOptions />
                                </select>
                            </div>

                            <div className="email-form-group">
                                <label className="email-form-label">
                                    SMTP Usuário
                                </label>

                                <input
                                    type="text"
                                    className="email-form-input"
                                    value={form.smtp_user}
                                    onChange={(event) => {
                                        updateForm(
                                            'smtp_user',
                                            event.target.value
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        <div className="email-form-group">
                            <label className="email-form-label">
                                SMTP Senha
                            </label>

                            <input
                                type="password"
                                className="email-form-input"
                                value={form.smtp_password_encrypted}
                                placeholder={
                                    selectedConfig
                                        ? 'Deixe em branco para manter a senha atual'
                                        : 'Informe a senha SMTP'
                                }
                                onChange={(event) => {
                                    updateForm(
                                        'smtp_password_encrypted',
                                        event.target.value
                                    );
                                }}
                            />
                        </div>

                        <h3 className="email-section-title">
                            IMAP — Recebimento
                        </h3>

                        <div className="email-form-grid">
                            <div className="email-form-group">
                                <label className="email-form-label">
                                    IMAP Host
                                </label>

                                <input
                                    type="text"
                                    className="email-form-input"
                                    value={form.imap_host}
                                    placeholder="imap.empresa.com"
                                    onChange={(event) => {
                                        updateForm(
                                            'imap_host',
                                            event.target.value
                                        );
                                    }}
                                />
                            </div>

                            <div className="email-form-group">
                                <label className="email-form-label">
                                    IMAP Porta
                                </label>

                                <input
                                    type="number"
                                    className="email-form-input"
                                    value={form.imap_port}
                                    onChange={(event) => {
                                        updateForm(
                                            'imap_port',
                                            Number(event.target.value)
                                        );
                                    }}
                                />
                            </div>

                            <div className="email-form-group">
                                <label className="email-form-label">
                                    IMAP Seguro
                                </label>

                                <select
                                    className="email-form-select"
                                    value={form.imap_secure}
                                    onChange={(event) => {
                                        updateForm(
                                            'imap_secure',
                                            event.target.value
                                        );
                                    }}
                                >
                                    <SecureModeOptions />
                                </select>
                            </div>

                            <div className="email-form-group">
                                <label className="email-form-label">
                                    IMAP Usuário
                                </label>

                                <input
                                    type="text"
                                    className="email-form-input"
                                    value={form.imap_user}
                                    onChange={(event) => {
                                        updateForm(
                                            'imap_user',
                                            event.target.value
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        <div className="email-form-group">
                            <label className="email-form-label">
                                IMAP Senha
                            </label>

                            <input
                                type="password"
                                className="email-form-input"
                                value={form.imap_password_encrypted}
                                placeholder={
                                    selectedConfig
                                        ? 'Deixe em branco para manter a senha atual'
                                        : 'Informe a senha IMAP'
                                }
                                onChange={(event) => {
                                    updateForm(
                                        'imap_password_encrypted',
                                        event.target.value
                                    );
                                }}
                            />
                        </div>

                        <div
                            className="email-toolbar-actions"
                            style={{
                                justifyContent: 'flex-start',
                                marginTop: 14
                            }}
                        >
                            <button
                                type="button"
                                className="email-button email-button-secondary"
                                onClick={handleNewConfig}
                                disabled={saving || Boolean(testing)}
                            >
                                Limpar formulário
                            </button>

                            <button
                                type="button"
                                className="email-button email-button-primary"
                                onClick={handleSave}
                                disabled={saving || Boolean(testing)}
                            >
                                {saving
                                    ? 'Salvando...'
                                    : selectedConfig
                                        ? 'Salvar alterações'
                                        : 'Criar configuração'}
                            </button>

                            {selectedConfig && (
                                <button
                                    type="button"
                                    className="email-button email-button-danger"
                                    onClick={handleDelete}
                                    disabled={saving || Boolean(testing)}
                                >
                                    Excluir configuração
                                </button>
                            )}
                        </div>
                    </section>
                </div>

                <div className="email-layout-bottom">
                    <section className="email-card">
                        <div className="email-card-title-row">
                            <div>
                                <h2
                                    className="email-card-title"
                                    style={{ marginBottom: 3 }}
                                >
                                    Testar conexões
                                </h2>

                                <p className="email-form-help">
                                    Teste os dados preenchidos no formulário antes de salvar.
                                </p>
                            </div>
                        </div>

                        <div className="email-form-grid">
                            <div className="email-form-group">
                                <label className="email-form-label">
                                    SMTP
                                </label>

                                <button
                                    type="button"
                                    className="email-button email-button-secondary"
                                    style={{ width: '100%' }}
                                    onClick={handleTestSmtp}
                                    disabled={saving || Boolean(testing)}
                                >
                                    {testing === 'smtp'
                                        ? 'Testando SMTP...'
                                        : 'Testar SMTP'}
                                </button>
                            </div>

                            <div className="email-form-group">
                                <label className="email-form-label">
                                    IMAP
                                </label>

                                <button
                                    type="button"
                                    className="email-button email-button-secondary"
                                    style={{ width: '100%' }}
                                    onClick={handleTestImap}
                                    disabled={saving || Boolean(testing)}
                                >
                                    {testing === 'imap'
                                        ? 'Testando IMAP...'
                                        : 'Testar IMAP'}
                                </button>
                            </div>
                        </div>

                        {testResult && (
                            <div
                                className={
                                    `email-result-box ${
                                        testResult.success
                                            ? 'email-alert-success'
                                            : 'email-alert-error'
                                    }`
                                }
                            >
                                <div className="email-result-title">
                                    {testResult.type} — {
                                        testResult.success
                                            ? 'Conexão aprovada'
                                            : 'Falha na conexão'
                                    }
                                </div>

                                <pre className="email-result-content">
                                    {testResult.message}
                                </pre>
                            </div>
                        )}
                    </section>

                    <section className="email-card">
                        <h2 className="email-card-title">
                            Resumo
                        </h2>

                        {!selectedSummary && (
                            <div className="email-empty-state">
                                Selecione uma configuração salva para visualizar o resumo.
                            </div>
                        )}

                        {selectedSummary && (
                            <div
                                style={{
                                    display: 'grid',
                                    gap: 8,
                                    color: '#40556c',
                                    fontSize: 11
                                }}
                            >
                                <div>
                                    <strong>Nome:</strong> {selectedSummary.name}
                                </div>

                                <div>
                                    <strong>De:</strong> {selectedSummary.fromName} &lt;{selectedSummary.fromEmail}&gt;
                                </div>

                                <div>
                                    <strong>SMTP:</strong> {selectedSummary.smtpHost}:{selectedSummary.smtpPort} ({selectedSummary.smtpSecure})
                                </div>

                                <div>
                                    <strong>IMAP:</strong> {selectedSummary.imapHost}:{selectedSummary.imapPort} ({selectedSummary.imapSecure})
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}