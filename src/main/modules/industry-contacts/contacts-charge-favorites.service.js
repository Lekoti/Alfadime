const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const favoritesRepository = require("./contacts-charge-favorites.repository");
const runRepository = require("./contacts-charge-run.repository");
const contactsRepository = require("./industry-contacts.repository");
const chargeView = require("./industry-contacts-charge-view.service");
const emailRepository = require("../email-dispatch/email-dispatch.repository");
const { sendEmailViaSmtp } = require("../email-dispatch/email-dispatch-smtp.service");
const { isValidEmail } = require("../../utils/validation.utils");
const { CHARGE_TYPES, CHARGE_SUBJECTS, CHARGE_EMAIL_BODIES } = require("./industry-contacts-charge.constants");
const { getAttachmentPaths } = require("./industry-contacts-charge.service");
const { normalizeBranch, VALID_BRANCHES } = require("./contacts-charge-policy");
const executionRepository = require("./contacts-charge-execution.repository");
const { executeCharge } = require("./contacts-charge-execution.service");

const prepared = new Map();
const PREVIEW_TTL = 30 * 60 * 1000;
const FIXED_FAVORITE_ID = favoritesRepository.FIXED_FAVORITE_ID;

function now() {
    return new Date().toISOString();
}

function normalizeText(value) {
    const text = String(value ?? "").trim();
    return text || null;
}

async function reportProgress(payload, data) {
    if (typeof payload?.onProgress === "function") payload.onProgress(data);
    await new Promise(resolve => setImmediate(resolve));
    if (typeof payload?.shouldCancel === "function" && payload.shouldCancel()) {
        throw new Error("Preparação cancelada pelo usuário.");
    }
}

function validateAttachment(attachment) {
    const filePath = normalizeText(attachment.file_path || attachment.path);
    const fileName = normalizeText(attachment.file_name || attachment.name) || path.basename(filePath || "");
    if (!filePath) throw new Error("Anexo sem caminho válido.");
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        throw new Error(`Anexo não encontrado ou inválido: ${fileName}`);
    }
    return { path: filePath, fileName };
}

function fingerprint(file) {
    const stat = fs.statSync(file);
    return `${stat.size}:${stat.mtimeMs}:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
}

function getContactsByIndustries(industries = []) {
    const allContacts = contactsRepository.listLaboratories();
    const selectedCodes = new Set(industries
        .map(industry => normalizeText(industry.industry_global_code || industry.code))
        .filter(Boolean).map(code => code.toUpperCase()));
    if (!selectedCodes.size) return [];
    return allContacts.filter(contact => {
        const code = normalizeText(contact.industry_global_code || contact.global_code);
        return code && selectedCodes.has(String(code).toUpperCase());
    });
}

function mergeRecipients(savedRecipients = [], industries = []) {
    const recipientsByContact = new Map();
    for (const recipient of savedRecipients) {
        const contactId = normalizeText(recipient.contact_id || recipient.id);
        if (!contactId) continue;
        recipientsByContact.set(contactId, {
            contact_id: contactId, laboratory_name: recipient.laboratory_name,
            laboratory_key: recipient.laboratory_key, branch: recipient.branch, email: recipient.email
        });
    }
    for (const contact of getContactsByIndustries(industries)) {
        const contactId = normalizeText(contact.contact_id || contact.id);
        if (!contactId || recipientsByContact.has(contactId)) continue;
        recipientsByContact.set(contactId, {
            contact_id: contactId, laboratory_name: contact.laboratory_name,
            laboratory_key: contact.laboratory_key, branch: contact.branch, email: contact.email
        });
    }
    return Array.from(recipientsByContact.values());
}

function buildMessage(favorite, contact) {
    const email = String(contact.email || "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) throw new Error("O contato não possui e-mail válido cadastrado.");
    return {
        charge_type: favorite.charge_type,
        charge_label: favorite.name,
        to: email, cc: null, bcc: null,
        subject: favorite.subject, body: favorite.body,
        attachments: (favorite.attachments || []).map(validateAttachment),
        contact: {
            id: contact.contact_id || contact.id,
            laboratory_name: contact.laboratory_name,
            laboratory_key: contact.laboratory_key,
            branch: contact.branch,
            contact_name: contact.contact_name,
            email
        }
    };
}

function resolveFixedType(needsPrices, needsPending) {
    if (needsPrices && needsPending) return CHARGE_TYPES.BOTH;
    if (needsPrices) return CHARGE_TYPES.PRICES;
    return CHARGE_TYPES.PENDING;
}

function buildFixedMessage(group) {
    const type = resolveFixedType(group.needsPrices, group.needsPending);
    const row = group.rows[0];
    return {
        charge_type: type,
        charge_label: "Cobrar preços e pendências desatualizados",
        to: group.email, cc: null, bcc: null,
        subject: CHARGE_SUBJECTS[type], body: CHARGE_EMAIL_BODIES[type],
        attachments: getAttachmentPaths(type),
        contact: {
            id: row.contact_id || row.id,
            laboratory_name: row.laboratory_name,
            laboratory_key: row.laboratory_key || row.industry_global_code || row.global_code || row.laboratory_name,
            branch: normalizeBranch(row.branch),
            contact_name: row.contact_name, email: group.email
        },
        covered: group.rows.map(item => ({
            contact_id: item.contact_id || item.id,
            laboratory_name: item.laboratory_name,
            laboratory_key: item.laboratory_key || item.industry_global_code || item.global_code || item.laboratory_name,
            branch: normalizeBranch(item.branch)
        }))
    };
}

async function prepareFixedCharge(payload = {}) {
    await reportProgress(payload, { stage: "loading", current: 0, total: 1, message: "Carregando preços e pendências..." });
    const result = chargeView.listLaboratories();
    const allRows = Array.isArray(result?.rows) ? result.rows : [];
    const requestedContacts = Array.isArray(payload.contacts) ? payload.contacts : [];
    const requestedIds = new Set(requestedContacts.map(item => normalizeText(item.contact_id || item.id)).filter(Boolean));
    const hasSelection = requestedIds.size > 0;
    const skipped = [];
    const rows = [];
    for (let index = 0; index < allRows.length; index += 1) {
        const row = allRows[index];
        const rowId = normalizeText(row.contact_id || row.id);
        if (hasSelection && !requestedIds.has(rowId)) continue;
        if (row.charge_update_status === "updated") {
            skipped.push({ contact_id: rowId, laboratory_name: row.laboratory_name, branch: row.branch, reason: "Preços e pendências já atualizados." });
        } else {
            rows.push(row);
        }
        await reportProgress(payload, { stage: "validating", current: index + 1, total: allRows.length || 1, message: "Validando destinatários..." });
    }
    const groups = new Map();
    const invalid = [];
    const duplicates = [];
    for (const row of rows) {
        const email = String(row.email || "").trim().toLowerCase();
        const branch = normalizeBranch(row.branch);
        if (!email || !isValidEmail(email) || !VALID_BRANCHES.has(branch)) {
            invalid.push({
                contact_id: row.contact_id || row.id || null,
                laboratory_name: row.laboratory_name || "Contato", branch: row.branch || "",
                reason: !email || !isValidEmail(email)
                    ? "O contato não possui e-mail válido cadastrado."
                    : `Filial inválida ou não identificada: "${row.branch || ""}".`
            });
            continue;
        }
        const needsPrices = !row.prices_updated;
        const needsPending = !row.pending_updated;
        const group = groups.get(email);
        if (!group) {
            groups.set(email, { email, branch, rows: [row], needsPrices, needsPending });
            continue;
        }
        group.rows.push(row);
        group.needsPrices = group.needsPrices || needsPrices;
        group.needsPending = group.needsPending || needsPending;
        duplicates.push({ email, laboratory_name: row.laboratory_name, branch: row.branch,
            keptLaboratory: group.rows[0].laboratory_name, keptBranch: group.rows[0].branch });
    }
    await reportProgress(payload, { stage: "messages", current: 0, total: groups.size || 1, message: "Preparando mensagens..." });
    const messages = [];
    let messageIndex = 0;
    for (const group of groups.values()) {
        try { messages.push(buildFixedMessage(group)); }
        catch (error) {
            for (const row of group.rows) {
                invalid.push({ contact_id: row.contact_id || row.id || null, laboratory_name: row.laboratory_name || "Contato", branch: row.branch || "", reason: error.message });
            }
        }
        messageIndex += 1;
        await reportProgress(payload, { stage: "messages", current: messageIndex, total: groups.size || 1, message: "Preparando mensagens..." });
    }
    if (!messages.length) throw new Error("Nenhuma indústria desatualizada com e-mail válido foi encontrada.");
    const token = crypto.randomUUID();
    const fingerprints = await prepareFingerprints(messages, payload);
    prepared.set(token, createPlan(favoritesRepository.getFavorite(FIXED_FAVORITE_ID), messages, fingerprints));
    return {
        success: true, preview_token: token, favorite_id: FIXED_FAVORITE_ID,
        favorite_name: "Cobrar preços e pendências desatualizados", charge_type: CHARGE_TYPES.BOTH,
        selected: rows.length, valid: messages.length, invalid, skipped, duplicates,
        message_count: messages.length, messages,
        pricesOnly: messages.filter(message => message.charge_type === CHARGE_TYPES.PRICES).length,
        pendingOnly: messages.filter(message => message.charge_type === CHARGE_TYPES.PENDING).length,
        both: messages.filter(message => message.charge_type === CHARGE_TYPES.BOTH).length
    };
}

function createPlan(favorite, messages, fingerprints) {
    if (!favorite?.id) throw new Error("Favorito de cobrança não encontrado.");
    return {
        favorite, messages, fingerprints, expires: Date.now() + PREVIEW_TTL,
        running: null, cancelRequested: false, startedAt: null, finishedAt: null,
        current: 0, currentLaboratory: "", sent: 0, failed: 0, uncertain: 0
    };
}

async function prepareFingerprints(messages, payload) {
    const paths = [...new Set(messages.flatMap(message => message.attachments.map(attachment => attachment.path)))];
    const fingerprints = new Map();
    for (let index = 0; index < paths.length; index += 1) {
        fingerprints.set(paths[index], fingerprint(paths[index]));
        await reportProgress(payload, { stage: "attachments", current: index + 1, total: paths.length,
            message: "Verificando anexos..." });
    }
    await reportProgress(payload, { stage: "done", current: paths.length || 1, total: paths.length || 1, message: "Preparação concluída." });
    return fingerprints;
}

async function prepareFavoriteCharge(payload = {}) {
    for (const [key, entry] of prepared) {
        if (Date.now() > entry.expires && (!entry.running || entry.finishedAt)) prepared.delete(key);
    }
    const favoriteId = normalizeText(payload.favorite_id);
    if (favoriteId === FIXED_FAVORITE_ID) return prepareFixedCharge(payload);
    const favorite = favoritesRepository.getFavorite(favoriteId);
    if (!favorite) throw new Error("Favorito de cobrança não encontrado.");
    const savedRecipients = favorite.save_recipients ? favorite.recipients : [];
    const extraContacts = Array.isArray(payload.contacts) ? payload.contacts : [];
    const recipients = payload.retry_only === true
        ? mergeRecipients(extraContacts, [])
        : mergeRecipients([...savedRecipients, ...extraContacts], favorite.industries);
    if (!recipients.length) throw new Error("Selecione pelo menos um contato ou indústria com contatos cadastrados.");
    await reportProgress(payload, { stage: "validating", current: 0, total: recipients.length, message: "Validando destinatários..." });
    const messagesByEmail = new Map();
    const invalid = [];
    const duplicates = [];
    for (let index = 0; index < recipients.length; index += 1) {
        const recipient = recipients[index];
        try {
            const contact = contactsRepository.getContactById(recipient.contact_id) || recipient;
            const message = buildMessage(favorite, contact);
            if (messagesByEmail.has(message.to)) {
                const existing = messagesByEmail.get(message.to);
                if (!existing.covered) existing.covered = [{
                    contact_id: existing.contact.id, laboratory_name: existing.contact.laboratory_name,
                    laboratory_key: existing.contact.laboratory_key, branch: existing.contact.branch
                }];
                existing.covered.push({ contact_id: message.contact.id, laboratory_name: message.contact.laboratory_name,
                    laboratory_key: message.contact.laboratory_key, branch: message.contact.branch });
                duplicates.push({ email: message.to, laboratory_name: contact.laboratory_name, branch: contact.branch });
            } else {
                messagesByEmail.set(message.to, message);
            }
        } catch (error) {
            invalid.push({ contact_id: recipient.contact_id, laboratory_name: recipient.laboratory_name || "Contato", branch: recipient.branch || "", reason: error.message });
        }
        await reportProgress(payload, { stage: "validating", current: index + 1, total: recipients.length, message: "Validando destinatários..." });
    }
    const messages = Array.from(messagesByEmail.values());
    if (!messages.length) throw new Error("Nenhum destinatário válido foi encontrado para esta cobrança.");
    const token = crypto.randomUUID();
    const fingerprints = await prepareFingerprints(messages, payload);
    prepared.set(token, createPlan(favorite, messages, fingerprints));
    return {
        success: true, preview_token: token, favorite_id: favorite.id, favorite_name: favorite.name,
        charge_type: favorite.charge_type, subject: favorite.subject, body: favorite.body, attachments: favorite.attachments,
        selected: recipients.length, valid: messages.length, invalid, duplicates, message_count: messages.length, messages
    };
}

function getEmailConfig() {
    const configs = emailRepository.listEmailConfigs();
    const config = Array.isArray(configs) && configs.find(item =>
        String(item.smtp_host || "").trim() && String(item.smtp_user || "").trim() && String(item.smtp_password_encrypted || "").trim());
    if (!config) throw new Error("Nenhuma configuração SMTP válida foi encontrada.");
    return config;
}

async function executePlan(plan, token) {
    return require("./contacts-charge-coordination").sendPlan(plan, token, executeUncoordinatedPlanV4);
}

async function executeUncoordinatedPlanV4(plan, token, phase) {
    const config = getEmailConfig();
    for (const [file, expected] of plan.fingerprints) {
        if (fingerprint(file) !== expected) throw new Error("Um anexo mudou após a prévia. Feche e prepare a cobrança novamente.");
    }
    const results = [];
    for (const message of plan.messages) {
        try {
            phase.smtpStarted = true;
            const smtp = await sendEmailViaSmtp(config, {
                to: message.to, toName: message.contact.contact_name || undefined,
                cc: undefined, bcc: undefined, subject: message.subject, html: message.body
            }, message.attachments);
            results.push({
                success: true, charge_type: message.charge_type, recipient: message.to,
                laboratory_name: message.contact.laboratory_name, subject: message.subject, sentAt: now(),
                messageId: smtp?.messageId || null, sentCopyError: smtp?.sentCopy?.error || null
            });
        } catch (error) {
            results.push({ success: false, charge_type: message.charge_type, recipient: message.to,
                laboratory_name: message.contact.laboratory_name, error: error.message });
        }
    }
    return {
        success: results.length === plan.messages.length && results.every(result => result.success),
        recipient: plan.messages[0].to, sent: results.filter(result => result.success).length,
        expected: plan.messages.length, results
    };
}

async function executeFavoriteCharge(plan, token) {
    return executeCharge(plan, token, {
        runs: runRepository, execution: executionRepository, executePlan, now
    });
}

function sendFavoriteCharge(payload = {}) {
    const token = normalizeText(payload.preview_token);
    const plan = prepared.get(token);
    if (!plan) throw new Error("Prévia ausente ou expirada. Prepare a cobrança novamente.");
    if (plan.running) return plan.running;
    if (Date.now() > plan.expires) throw new Error("A prévia expirou. Prepare novamente.");
    plan.running = executeFavoriteCharge(plan, token);
    return plan.running;
}

function getChargeStatus(payload = {}) {
    const token = normalizeText(payload.preview_token);
    const plan = prepared.get(token);
    if (!plan) throw new Error("Prévia ausente ou expirada.");
    const total = plan.messages.length;
    const current = Math.min(total, Math.max(0, Number(plan.current || 0)));
    const elapsedMs = plan.startedAt ? Date.now() - new Date(plan.startedAt).getTime() : 0;
    const averageMs = current > 0 ? elapsedMs / current : 0;
    const remainingMs = plan.finishedAt ? 0 : Math.max(0, Math.round((total - current) * averageMs));
    return {
        total, current, sent: Number(plan.sent || 0), failed: Number(plan.failed || 0), uncertain: Number(plan.uncertain || 0),
        remaining: Math.max(0, total - current), running: Boolean(plan.running && !plan.finishedAt),
        cancelRequested: Boolean(plan.cancelRequested), startedAt: plan.startedAt, finishedAt: plan.finishedAt,
        elapsedMs, remainingMs, currentLaboratory: plan.currentLaboratory || "", lastError: plan.lastError || null,
        estimatedFinishAt: plan.finishedAt || (plan.startedAt && current > 0 ? new Date(Date.now() + remainingMs).toISOString() : null)
    };
}

function cancelCharge(payload = {}) {
    const token = normalizeText(payload.preview_token);
    const plan = prepared.get(token);
    if (!plan) throw new Error("Prévia ausente ou expirada.");
    if (plan.finishedAt) return { success: false, cancelRequested: false, message: "Esta execução já terminou." };
    plan.cancelRequested = true;
    return { success: true, cancelRequested: true, message: "Cancelamento solicitado. Os e-mails já enviados permanecem registrados." };
}

async function retryFailedCharge(payload = {}) {
    const runId = normalizeText(payload.run_id);
    const run = runRepository.getRun(runId);
    if (!run) throw new Error("Execução de cobrança não encontrada.");
    if (!["completed_with_errors", "cancelled", "completed"].includes(run.status)) {
        throw new Error("Execução ativa ou interrompida requer revisão antes de preparar um reenvio.");
    }
    const failedItems = runRepository.getFailedItems(runId);
    if (!failedItems.length) throw new Error("Não existem envios com erro para reenviar.");
    const favorite = favoritesRepository.getFavorite(run.favorite_id);
    if (!favorite) throw new Error("Favorito original não encontrado.");
    if (failedItems.some(item => !normalizeText(item.contact_id))) {
        throw new Error("Há itens sem identificação de contato. Revise o histórico antes de preparar reenvio.");
    }
    const contacts = failedItems.map(item => ({ contact_id: item.contact_id, laboratory_name: item.laboratory_name,
        laboratory_key: item.laboratory_key, branch: item.branch, email: item.email }));
    return prepareFavoriteCharge({ favorite_id: favorite.id, contacts, retry_only: true });
}

module.exports = {
    CHARGE_TYPES, FIXED_FAVORITE_ID,
    listFavorites: favoritesRepository.listFavorites,
    getFavorite: favoritesRepository.getFavorite,
    saveFavorite: favoritesRepository.saveFavorite,
    deleteFavorite: favoritesRepository.deleteFavorite,
    prepareFavoriteCharge, sendFavoriteCharge, getChargeStatus, cancelCharge, retryFailedCharge
};
const originalSendFavoriteV4 = module.exports.sendFavoriteCharge;
module.exports.sendFavoriteCharge = payload => require("./contacts-charge-coordination").manual(() => originalSendFavoriteV4(payload));
