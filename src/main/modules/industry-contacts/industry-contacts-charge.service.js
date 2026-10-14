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

function prepareCharge(payload = {}) {
    for (const [key, entry] of prepared) {
        if (Date.now() > entry.expires && !entry.running) prepared.delete(key);
    }
    const contact = getContact(payload);
    const email = String(contact.email || "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) throw new Error("O contato não possui e-mail válido cadastrado.");
    const type = normalizeChargeType(payload.charge_type || payload.chargeType || payload.type);
    const subject = CHARGE_SUBJECTS[type];
    const body = CHARGE_EMAIL_BODIES[type];
    if (!subject || !body) throw new Error("Assunto ou mensagem de cobrança não configurado.");
    const messages = [{
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
    }];
    const token = crypto.randomUUID();
    const fingerprints = new Map();
    for (const message of messages) {
        for (const attachment of message.attachments) {
            fingerprints.set(attachment.path, fingerprint(attachment.path));
        }
    }
    prepared.set(token, { messages, fingerprints, expires: Date.now() + PREVIEW_TTL, running: null });
    return {
        ...messages[0],
        charge_type: type,
        preview_token: token,
        messages,
        message_count: messages.length
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
            // Uma mensagem conjunta possui duas categorias, mas apenas um envio SMTP.
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

function sendCharge(payload = {}) {
    const token = String(payload.preview_token || "").trim();
    const plan = prepared.get(token);
    if (!plan) throw new Error("Prévia ausente ou expirada. Prepare a cobrança novamente.");
    if (plan.running) return plan.running;
    if (Date.now() > plan.expires) throw new Error("A prévia expirou. Prepare novamente.");
    plan.running = executePlan(plan, token);
    return plan.running;
}

module.exports = { prepareCharge, sendCharge, normalizeChargeType, getAttachmentPaths };
