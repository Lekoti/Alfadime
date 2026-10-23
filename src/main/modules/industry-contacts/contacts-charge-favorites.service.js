const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const favoritesRepository = require("./contacts-charge-favorites.repository");
const runRepository = require("./contacts-charge-run.repository");
const contactsRepository = require("./industry-contacts.repository");
const emailRepository = require("../email-dispatch/email-dispatch.repository");
const { sendEmailViaSmtp } = require("../email-dispatch/email-dispatch-smtp.service");
const { isValidEmail } = require("../../utils/validation.utils");

const prepared = new Map();
const PREVIEW_TTL = 30 * 60 * 1000;

const CHARGE_TYPES = {
    PRICES: "prices",
    PENDING: "pending",
    DOCUMENTS: "documents",
    CUSTOM: "custom"
};

function now() {
    return new Date().toISOString();
}

function normalizeText(value) {
    const text = String(value ?? "").trim();
    return text || null;
}

function normalizeChargeType(value) {
    const type = normalizeText(value)?.toLowerCase();

    if (Object.values(CHARGE_TYPES).includes(type)) {
        return type;
    }

    throw new Error("Tipo de cobrança inválido.");
}

function validateAttachment(attachment) {
    const filePath = normalizeText(attachment.file_path || attachment.path);
    const fileName = normalizeText(attachment.file_name || attachment.name) || path.basename(filePath || "");

    if (!filePath) {
        throw new Error("Anexo sem caminho válido.");
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        throw new Error(`Anexo não encontrado ou inválido: ${fileName}`);
    }

    return {
        path: filePath,
        fileName
    };
}

function fingerprint(file) {
    const stat = fs.statSync(file);
    return `${stat.size}:${stat.mtimeMs}:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
}

function getContactsByIndustries(industries = []) {
    const allContacts = contactsRepository.listLaboratories();
    const selectedCodes = new Set(
        industries
            .map((industry) => normalizeText(industry.industry_global_code || industry.code))
            .filter(Boolean)
            .map((code) => code.toUpperCase())
    );

    if (!selectedCodes.size) return [];

    return allContacts.filter((contact) => {
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
            contact_id: contactId,
            laboratory_name: recipient.laboratory_name,
            laboratory_key: recipient.laboratory_key,
            branch: recipient.branch,
            email: recipient.email
        });
    }

    for (const contact of getContactsByIndustries(industries)) {
        const contactId = normalizeText(contact.contact_id || contact.id);
        if (!contactId || recipientsByContact.has(contactId)) continue;

        recipientsByContact.set(contactId, {
            contact_id: contactId,
            laboratory_name: contact.laboratory_name,
            laboratory_key: contact.laboratory_key,
            branch: contact.branch,
            email: contact.email
        });
    }

    return Array.from(recipientsByContact.values());
}

function buildMessage(favorite, contact) {
    const email = String(contact.email || "").trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
        throw new Error("O contato não possui e-mail válido cadastrado.");
    }

    const attachments = (favorite.attachments || []).map(validateAttachment);

    return {
        charge_type: favorite.charge_type,
        charge_label: favorite.name,
        to: email,
        cc: null,
        bcc: null,
        subject: favorite.subject,
        body: favorite.body,
        attachments,
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

function prepareFavoriteCharge(payload = {}) {
    for (const [key, entry] of prepared) {
        if (Date.now() > entry.expires && !entry.running) {
            prepared.delete(key);
        }
    }

    const favoriteId = normalizeText(payload.favorite_id);
    const favorite = favoritesRepository.getFavorite(favoriteId);

    if (!favorite) {
        throw new Error("Favorito de cobrança não encontrado.");
    }

    const savedRecipients = favorite.save_recipients ? favorite.recipients : [];
    const extraContacts = Array.isArray(payload.contacts) ? payload.contacts : [];
    const recipients = mergeRecipients(
        [...savedRecipients, ...extraContacts],
        favorite.industries
    );

    if (!recipients.length) {
        throw new Error("Selecione pelo menos um contato ou indústria com contatos cadastrados.");
    }

    const messagesByEmail = new Map();
    const invalid = [];
    const duplicates = [];

    for (const recipient of recipients) {
        try {
            const contact = contactsRepository.getContactById(recipient.contact_id) || recipient;
            const message = buildMessage(favorite, contact);
            const email = message.to;

            if (messagesByEmail.has(email)) {
                duplicates.push({
                    email,
                    laboratory_name: contact.laboratory_name,
                    branch: contact.branch
                });
                continue;
            }

            messagesByEmail.set(email, message);
        } catch (error) {
            invalid.push({
                contact_id: recipient.contact_id,
                laboratory_name: recipient.laboratory_name || "Contato",
                branch: recipient.branch || "",
                reason: error.message
            });
        }
    }

    const messages = Array.from(messagesByEmail.values());

    if (!messages.length) {
        throw new Error("Nenhum destinatário válido foi encontrado para esta cobrança.");
    }

    const token = crypto.randomUUID();
    const fingerprints = new Map();

    for (const message of messages) {
        for (const attachment of message.attachments) {
            fingerprints.set(attachment.path, fingerprint(attachment.path));
        }
    }

    prepared.set(token, {
        favorite,
        messages,
        fingerprints,
        expires: Date.now() + PREVIEW_TTL,
        running: null,
        cancelRequested: false,
        startedAt: null,
        finishedAt: null,
        current: 0,
        currentLaboratory: ""
    });

    return {
        success: true,
        preview_token: token,
        favorite_id: favorite.id,
        favorite_name: favorite.name,
        charge_type: favorite.charge_type,
        subject: favorite.subject,
        body: favorite.body,
        attachments: favorite.attachments,
        selected: recipients.length,
        valid: messages.length,
        invalid,
        duplicates,
        message_count: messages.length,
        messages
    };
}

function getEmailConfig() {
    const configs = emailRepository.listEmailConfigs();
    const config = Array.isArray(configs) && configs.find((item) =>
        String(item.smtp_host || "").trim() &&
        String(item.smtp_user || "").trim() &&
        String(item.smtp_password_encrypted || "").trim()
    );

    if (!config) {
        throw new Error("Nenhuma configuração SMTP válida foi encontrada.");
    }

    return config;
}

async function executePlan(plan, token) {
    const config = getEmailConfig();

    for (const [file, expected] of plan.fingerprints) {
        if (fingerprint(file) !== expected) {
            throw new Error("Um anexo mudou após a prévia. Feche e prepare a cobrança novamente.");
        }
    }

    const results = [];

    for (const message of plan.messages) {
        try {
            const smtp = await sendEmailViaSmtp(config, {
                to: message.to,
                toName: message.contact.contact_name || undefined,
                cc: undefined,
                bcc: undefined,
                subject: message.subject,
                html: message.body
            }, message.attachments);

            results.push({
                success: true,
                charge_type: message.charge_type,
                recipient: message.to,
                laboratory_name: message.contact.laboratory_name,
                subject: message.subject,
                sentAt: now(),
                messageId: smtp?.messageId || null,
                sentCopyError: smtp?.sentCopy?.error || null
            });
        } catch (error) {
            results.push({
                success: false,
                charge_type: message.charge_type,
                recipient: message.to,
                laboratory_name: message.contact.laboratory_name,
                error: error.message
            });
        }
    }

    return {
        success: results.length === plan.messages.length && results.every((result) => result.success),
        recipient: plan.messages[0].to,
        sent: results.filter((result) => result.success).length,
        expected: plan.messages.length,
        results
    };
}

async function executeFavoriteCharge(plan, token) {
    const run = runRepository.createRun({
        favorite_id: plan.favorite.id,
        favorite_name: plan.favorite.name,
        charge_type: plan.favorite.charge_type,
        total: plan.messages.length,
        contacts: plan.messages.map((message) => ({
            contact_id: message.contact.id,
            laboratory_name: message.contact.laboratory_name,
            laboratory_key: message.contact.laboratory_key,
            branch: message.contact.branch,
            email: message.to
        }))
    });

    plan.runId = run.id;
    runRepository.startRun(run.id);

    plan.startedAt = now();
    plan.cancelRequested = false;

    const results = [];
    let sent = 0;

    for (let index = 0; index < plan.messages.length; index += 1) {
        if (plan.cancelRequested) {
            break;
        }

        const message = plan.messages[index];
        const runItem = run.items.find((item) => item.contact_id === message.contact.id);

        plan.current = index + 1;
        plan.currentLaboratory = message.contact.laboratory_name;

        if (runItem) {
            runRepository.updateItemStatus(run.id, runItem.id, "sending");
        }

        try {
            const singlePlan = {
                messages: [message],
                fingerprints: plan.fingerprints
            };

            const result = await executePlan(singlePlan, token);
            results.push(...result.results);
            sent += result.sent;

            if (runItem) {
                const itemResult = result.results[0];
                runRepository.updateItemStatus(
                    run.id,
                    runItem.id,
                    itemResult.success ? "sent" : "failed",
                    itemResult.success ? null : itemResult.error
                );
            }
        } catch (error) {
            results.push({
                success: false,
                charge_type: message.charge_type,
                recipient: message.to,
                laboratory_name: message.contact.laboratory_name,
                error: error.message
            });

            if (runItem) {
                runRepository.updateItemStatus(run.id, runItem.id, "failed", error.message);
            }
        }
    }

    if (plan.cancelRequested) {
        runRepository.cancelRun(run.id);
    } else {
        runRepository.finishRun(run.id);
    }

    plan.finishedAt = now();
    plan.currentLaboratory = "";

    const finalRun = runRepository.getRun(run.id);

    return {
        success: sent === plan.messages.length && !plan.cancelRequested,
        cancelled: plan.cancelRequested,
        run_id: run.id,
        favorite_id: plan.favorite.id,
        favorite_name: plan.favorite.name,
        recipient: "Cobrança por favorito",
        sent,
        expected: plan.messages.length,
        failed: finalRun.failed,
        ignored: finalRun.ignored,
        cancelled: finalRun.cancelled,
        startedAt: plan.startedAt,
        finishedAt: plan.finishedAt,
        results
    };
}

function sendFavoriteCharge(payload = {}) {
    const token = normalizeText(payload.preview_token);
    const plan = prepared.get(token);

    if (!plan) {
        throw new Error("Prévia ausente ou expirada. Prepare a cobrança novamente.");
    }

    if (plan.running) {
        return plan.running;
    }

    if (Date.now() > plan.expires) {
        throw new Error("A prévia expirou. Prepare novamente.");
    }

    plan.running = executeFavoriteCharge(plan, token);
    return plan.running;
}

function getChargeStatus(payload = {}) {
    const token = normalizeText(payload.preview_token);
    const plan = prepared.get(token);

    if (!plan) {
        throw new Error("Prévia ausente ou expirada.");
    }

    const total = plan.messages.length;
    const current = plan.current || 0;
    const elapsedMs = plan.startedAt ? Date.now() - new Date(plan.startedAt).getTime() : 0;
    const averageMs = current > 0 ? elapsedMs / current : 0;
    const remainingMs = plan.finishedAt ? 0 : Math.max(0, Math.round((total - current) * averageMs));

    return {
        total,
        current,
        remaining: Math.max(0, total - current),
        running: Boolean(plan.running && !plan.finishedAt),
        cancelRequested: Boolean(plan.cancelRequested),
        startedAt: plan.startedAt,
        finishedAt: plan.finishedAt,
        elapsedMs,
        remainingMs,
        currentLaboratory: plan.currentLaboratory || "",
        estimatedFinishAt: plan.finishedAt || (
            plan.startedAt && current > 0
                ? new Date(Date.now() + remainingMs).toISOString()
                : null
        )
    };
}

function cancelCharge(payload = {}) {
    const token = normalizeText(payload.preview_token);
    const plan = prepared.get(token);

    if (!plan) {
        throw new Error("Prévia ausente ou expirada.");
    }

    plan.cancelRequested = true;

    return {
        success: true,
        cancelRequested: true,
        message: "Cancelamento solicitado. Os e-mails já enviados permanecem registrados."
    };
}

async function retryFailedCharge(payload = {}) {
    const runId = normalizeText(payload.run_id);
    const run = runRepository.getRun(runId);

    if (!run) {
        throw new Error("Execução de cobrança não encontrada.");
    }

    const failedItems = runRepository.getFailedItems(runId);

    if (!failedItems.length) {
        throw new Error("Não existem envios com erro para reenviar.");
    }

    const favorite = favoritesRepository.getFavorite(run.favorite_id);

    if (!favorite) {
        throw new Error("Favorito original não encontrado.");
    }

    const contacts = failedItems.map((item) => ({
        contact_id: item.contact_id,
        laboratory_name: item.laboratory_name,
        laboratory_key: item.laboratory_key,
        branch: item.branch,
        email: item.email
    }));

    return prepareFavoriteCharge({
        favorite_id: favorite.id,
        contacts
    });
}

module.exports = {
    CHARGE_TYPES,
    listFavorites: favoritesRepository.listFavorites,
    getFavorite: favoritesRepository.getFavorite,
    saveFavorite: favoritesRepository.saveFavorite,
    deleteFavorite: favoritesRepository.deleteFavorite,
    prepareFavoriteCharge,
    sendFavoriteCharge,
    getChargeStatus,
    cancelCharge,
    retryFailedCharge
};
