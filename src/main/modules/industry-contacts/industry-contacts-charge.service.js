const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const repository = require("./industry-contacts.repository");
const emailRepository = require("../email-dispatch/email-dispatch.repository");
const { sendEmailViaSmtp } = require("../email-dispatch/email-dispatch-smtp.service");
const { isValidEmail } = require("../../utils/validation.utils");
const history = require("./industry-contacts-charge-history.repository");
const {
    CHARGE_TYPES, CHARGE_SUBJECTS, CHARGE_EMAIL_BODIES,
    PRICES_ATTACHMENT_PATH, PENDING_ATTACHMENT_DIRECTORY
} = require("./industry-contacts-charge.constants");


const prepared = new Map();
const PREVIEW_TTL = 30 * 60 * 1000;


function normalizeChargeType(value) {
    const type = String(value ?? "").normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    if (["prices", "preco", "precos"].includes(type)) return CHARGE_TYPES.PRICES;
    if (["pending", "pendencia", "pendencias"].includes(type)) return CHARGE_TYPES.PENDING;
    if (["both", "ambos", "precos e pendencias"].includes(type)) return CHARGE_TYPES.BOTH;
    throw new Error("Tipo de cobrança inválido.");
}


function getContact(payload) {
    const id = String(payload.contact_id || payload.contactId || payload.id || "").trim();
    if (id) {
        const contact = repository.getContactById(id);
        if (!contact) throw new Error("Contato não encontrado para a cobrança.");
        return contact;
    }
    const key = payload.laboratory_key || payload.laboratoryKey;
    const branch = payload.branch || payload.filial;
    const contact = key && branch ? repository.getContactByLaboratoryKey(key, branch) : null;
    if (!contact) throw new Error("Contato não encontrado para a cobrança.");
    return contact;
}


function getAttachmentPaths(type) {
    const normalized = normalizeChargeType(type);
    const files = normalized === CHARGE_TYPES.BOTH
        ? [PRICES_ATTACHMENT_PATH, PENDING_ATTACHMENT_DIRECTORY]
        : [normalized === CHARGE_TYPES.PRICES ? PRICES_ATTACHMENT_PATH : PENDING_ATTACHMENT_DIRECTORY];
    return files.map((file) => {
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            throw new Error(`Anexo não encontrado ou inválido: ${file}`);
        }
        if (!/\.(xlsx|xls)$/i.test(file)) throw new Error(`O anexo precisa ser Excel: ${file}`);
        return { path: file, fileName: path.basename(file) };
    });
}


function fingerprint(file) {
    const stat = fs.statSync(file);
    return `${stat.size}:${stat.mtimeMs}:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
}


function buildMessage(contact, type) {
    const email = String(contact.email || "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
        throw new Error("O contato não possui e-mail válido cadastrado.");
    }

    const subject = CHARGE_SUBJECTS[type];
    const body = CHARGE_EMAIL_BODIES[type];
    if (!subject || !body) throw new Error("Assunto ou mensagem de cobrança não configurado.");

    return {
        charge_type: type,
        charge_label: type === CHARGE_TYPES.BOTH ? "Cobrar preços e pendências" :
            type === CHARGE_TYPES.PRICES ? "Cobrar preços" : "Cobrar pendências",
        to: email,
        cc: null,
        bcc: null,
        subject,
        body,
        attachments: getAttachmentPaths(type),
        contact: {
            id: contact.id,
            laboratory_name: contact.laboratory_name,
            laboratory_key: contact.laboratory_key,
            branch: contact.branch,
            contact_name: contact.contact_name,
            email
        }
    };
}


function prepareCharge(payload = {}) {
    for (const [key, entry] of prepared) {
        if (Date.now() > entry.expires && !entry.running) prepared.delete(key);
    }
    const contact = getContact(payload);
    const type = normalizeChargeType(payload.charge_type || payload.chargeType || payload.type);
    const message = buildMessage(contact, type);
    const token = crypto.randomUUID();
    const fingerprints = new Map();
    for (const attachment of message.attachments) {
        fingerprints.set(attachment.path, fingerprint(attachment.path));
    }
    prepared.set(token, { messages: [message], fingerprints, expires: Date.now() + PREVIEW_TTL, running: null });
    return {
        ...message,
        charge_type: type,
        preview_token: token,
        messages: [message],
        message_count: 1
    };
}


function resolveBulkChargeType(row, requestedType) {
    const pricesUpdated = row.prices_updated === true;
    const pendingUpdated = row.pending_updated === true;

    if (requestedType === CHARGE_TYPES.PRICES) {
        return pricesUpdated ? null : CHARGE_TYPES.PRICES;
    }

    if (requestedType === CHARGE_TYPES.PENDING) {
        return pendingUpdated ? null : CHARGE_TYPES.PENDING;
    }

    if (pricesUpdated && pendingUpdated) return null;
    if (!pricesUpdated && pendingUpdated) return CHARGE_TYPES.PRICES;
    if (pricesUpdated && !pendingUpdated) return CHARGE_TYPES.PENDING;
    return CHARGE_TYPES.BOTH;
}


function prepareBulkCharge(payload = {}) {
    for (const [key, entry] of prepared) {
        if (Date.now() > entry.expires && !entry.running) prepared.delete(key);
    }

    const contacts = Array.isArray(payload.contacts) ? payload.contacts : [];
    if (!contacts.length) throw new Error("Selecione pelo menos um contato para a cobrança em lote.");

    const requestedType = normalizeChargeType(payload.charge_type || payload.chargeType || payload.type);
    const messagesByEmail = new Map();
    const invalid = [];
    const skipped = [];
    const duplicates = [];

    for (const item of contacts) {
        try {
            const contact = getContact(item);
            const type = resolveBulkChargeType(item, requestedType);

            if (!type) {
                skipped.push({
                    contact_id: contact.id,
                    laboratory_name: contact.laboratory_name,
                    branch: contact.branch,
                    reason: "Preços e pendências já atualizados."
                });
                continue;
            }

            const email = String(contact.email || "").trim().toLowerCase();
            const existing = messagesByEmail.get(email);

            if (existing) {
                duplicates.push({
                    email,
                    laboratory_name: contact.laboratory_name,
                    branch: contact.branch,
                    keptLaboratory: existing.contact.laboratory_name,
                    keptBranch: existing.contact.branch
                });
                continue;
            }

            messagesByEmail.set(email, buildMessage(contact, type));
        } catch (error) {
            invalid.push({
                contact_id: item.contact_id || item.contactId || item.id || null,
                laboratory_name: item.laboratory_name || "Contato",
                branch: item.branch || "",
                reason: error.message
            });
        }
    }

    const messages = Array.from(messagesByEmail.values());

    if (!messages.length) {
        throw new Error("Nenhum contato selecionado precisa de cobrança ou possui e-mail válido.");
    }

    const token = crypto.randomUUID();
    const fingerprints = new Map();
    for (const message of messages) {
        for (const attachment of message.attachments) {
            fingerprints.set(attachment.path, fingerprint(attachment.path));
        }
    }

    prepared.set(token, {
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
        charge_type: requestedType,
        preview_token: token,
        selected: contacts.length,
        valid: messages.length,
        invalid,
        skipped,
        duplicates,
        message_count: messages.length,
        messages,
        pricesOnly: messages.filter((message) => message.charge_type === CHARGE_TYPES.PRICES).length,
        pendingOnly: messages.filter((message) => message.charge_type === CHARGE_TYPES.PENDING).length,
        both: messages.filter((message) => message.charge_type === CHARGE_TYPES.BOTH).length
    };
}


function getEmailConfig() {
    const configs = emailRepository.listEmailConfigs();
    const config = Array.isArray(configs) && configs.find((item) =>
        String(item.smtp_host || "").trim() && String(item.smtp_user || "").trim() &&
        String(item.smtp_password_encrypted || "").trim()
    );
    if (!config) throw new Error("Nenhuma configuração SMTP válida foi encontrada.");
    return config;
}


function finishHistory(attempts, result) {
    const errors = [];
    for (const attempt of attempts) {
        try {
            history.finish(attempt.id, result);
        } catch (error) {
            errors.push(`${attempt.type}: ${error.message}`);
        }
    }
    return errors;
}


async function executePlan(plan, token) {
    const config = getEmailConfig();
    for (const [file, expected] of plan.fingerprints) {
        if (fingerprint(file) !== expected) {
            throw new Error("Um anexo mudou após a prévia. Feche e prepare a cobrança novamente.");
        }
    }
    const contact = repository.getContactById(plan.messages[0].contact.id);
    if (!contact || String(contact.email || "").trim().toLowerCase() !== plan.messages[0].to ||
        contact.branch !== plan.messages[0].contact.branch) {
        throw new Error("O contato mudou após a prévia. Prepare a cobrança novamente.");
    }
    const results = [];
    for (const message of plan.messages) {
        const attempts = [];
        const historyTypes = message.charge_type === CHARGE_TYPES.BOTH
            ? [CHARGE_TYPES.PRICES, CHARGE_TYPES.PENDING]
            : [message.charge_type];
        try {
            for (const type of historyTypes) {
                attempts.push({ type, id: history.begin({ ...message, charge_type: type }, token) });
            }
        } catch (error) {
            finishHistory(attempts, { success: false, error: "Envio bloqueado antes do SMTP: " + error.message });
            results.push({ success: false, charge_type: message.charge_type,
                error: `Envio bloqueado: não foi possível registrar a tentativa. ${error.message}` });
            break;
        }
        let smtp;
        try {
            smtp = await sendEmailViaSmtp(config, {
                to: message.to,
                toName: message.contact.contact_name || undefined,
                cc: undefined,
                bcc: undefined,
                subject: message.subject,
                html: message.body
            }, message.attachments);
        } catch (error) {
            const historyErrors = finishHistory(attempts, { success: false, error: error.message });
            results.push({ success: false, charge_type: message.charge_type,
                error: error.message,
                historyWarning: historyErrors.length ? historyErrors.join("; ") : null });
            continue;
        }
        const sentAt = new Date().toISOString();
        const result = {
            success: true,
            charge_type: message.charge_type,
            recipient: message.to,
            subject: message.subject,
            sentAt,
            messageId: smtp?.messageId || null,
            sentCopyError: smtp?.sentCopy?.error || null
        };
        const historyErrors = finishHistory(attempts, result);
        if (historyErrors.length) {
            result.historyWarning = `E-mail enviado, mas histórico não confirmado: ${historyErrors.join("; ")}. Não reenvie automaticamente.`;
        }
        results.push(result);
    }
    return {
        success: results.length === plan.messages.length && results.every((result) => result.success),
        recipient: plan.messages[0].to,
        sent: results.filter((result) => result.success).length,
        expected: plan.messages.length,
        results
    };
}


async function executeBulkPlan(plan, token) {
    plan.startedAt = new Date().toISOString();
    plan.cancelRequested = false;
    const results = [];
    let sent = 0;

    for (let index = 0; index < plan.messages.length; index += 1) {
        if (plan.cancelRequested) {
            plan.finishedAt = new Date().toISOString();
            plan.current = index;
            plan.currentLaboratory = "";
            break;
        }

        const message = plan.messages[index];
        plan.current = index + 1;
        plan.currentLaboratory = message.contact.laboratory_name;

        try {
            const singlePlan = {
                messages: [message],
                fingerprints: plan.fingerprints
            };
            const result = await executePlan(singlePlan, token);
            results.push(...result.results);
            sent += result.sent;
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

    plan.finishedAt = new Date().toISOString();
    plan.currentLaboratory = "";

    return {
        success: sent === plan.messages.length && !plan.cancelRequested,
        cancelled: plan.cancelRequested,
        recipient: "Cobrança em lote",
        sent,
        expected: plan.messages.length,
        startedAt: plan.startedAt,
        finishedAt: plan.finishedAt,
        results
    };
}


function getBulkStatus(payload = {}) {
    const token = String(payload.preview_token || "").trim();
    const plan = prepared.get(token);
    if (!plan) throw new Error("Prévia ausente ou expirada.");

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
        estimatedFinishAt: plan.finishedAt || (plan.startedAt && current > 0 ? new Date(Date.now() + remainingMs).toISOString() : null)
    };
}


function cancelBulkCharge(payload = {}) {
    const token = String(payload.preview_token || "").trim();
    const plan = prepared.get(token);
    if (!plan) throw new Error("Prévia ausente ou expirada.");

    plan.cancelRequested = true;

    return {
        success: true,
        cancelRequested: true,
        message: "Cancelamento solicitado. Os e-mails já enviados permanecem registrados."
    };
}


function sendCharge(payload = {}) {
    const token = String(payload.preview_token || "").trim();
    const plan = prepared.get(token);
    if (!plan) throw new Error("Prévia ausente ou expirada. Prepare a cobrança novamente.");
    if (plan.running) return plan.running;
    if (Date.now() > plan.expires) throw new Error("A prévia expirou. Prepare novamente.");
    plan.running = executePlan(plan, token);
    return plan.running;
}


function sendBulkCharge(payload = {}) {
    const token = String(payload.preview_token || "").trim();
    const plan = prepared.get(token);
    if (!plan) throw new Error("Prévia ausente ou expirada. Prepare a cobrança novamente.");
    if (plan.running) return plan.running;
    if (Date.now() > plan.expires) throw new Error("A prévia expirou. Prepare novamente.");
    plan.running = executeBulkPlan(plan, token);
    return plan.running;
}


module.exports = {
    prepareCharge,
    prepareBulkCharge,
    sendCharge,
    sendBulkCharge,
    getBulkStatus,
    cancelBulkCharge,
    normalizeChargeType,
    getAttachmentPaths
};
