const fs = require("node:fs");
const path = require("node:path");

const repository = require(
    "./industry-contacts.repository"
);

const pricePendingRepository = require(
    "../price-pending/price-pending.repository"
);

const emailRepository = require(
    "../email-dispatch/email-dispatch.repository"
);

const {
    sendEmailViaSmtp
} = require(
    "../email-dispatch/email-dispatch-smtp.service"
);

const {
    isValidEmail
} = require(
    "../../utils/validation.utils"
);

const {
    CHARGE_TYPES,
    CHARGE_SUBJECTS,
    CHARGE_EMAIL_BODIES,
    PRICES_ATTACHMENT_PATH,
    PENDING_ATTACHMENT_DIRECTORY
} = require(
    "./industry-contacts-charge.constants"
);

function normalizeText(value) {
    return String(value ?? "").trim();
}

function normalizeChargeType(value) {
    const normalized =
        normalizeText(value)
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase();

    if (
        normalized === "prices" ||
        normalized === "preco" ||
        normalized === "precos"
    ) {
        return CHARGE_TYPES.PRICES;
    }

    if (
        normalized === "pending" ||
        normalized === "pendencia" ||
        normalized === "pendencias"
    ) {
        return CHARGE_TYPES.PENDING;
    }

    if (
        normalized === "both" ||
        normalized === "ambos" ||
        normalized === "precos e pendencias"
    ) {
        return CHARGE_TYPES.BOTH;
    }

    throw new Error(
        "Tipo de cobrança inválido."
    );
}

function getContactByPayload(payload = {}) {
    const contactId =
        normalizeText(
            payload.contact_id ||
            payload.contactId ||
            payload.id
        );

    if (contactId) {
        const contact =
            repository
                .getLaboratoriesWithContacts()
                .find((item) => {
                    return String(
                        item.id
                    ) === contactId;
                });

        if (contact) {
            return contact;
        }
    }

    const laboratoryKey =
        normalizeText(
            payload.laboratory_key ||
            payload.laboratoryKey
        );

    const branch =
        normalizeText(
            payload.branch ||
            payload.filial
        );

    if (
        laboratoryKey &&
        branch
    ) {
        const contact =
            repository
                .getContactByLaboratoryKey(
                    laboratoryKey,
                    branch
                );

        if (contact) {
            return contact;
        }
    }

    throw new Error(
        "Contato não encontrado para a cobrança."
    );
}

function getPendingAttachmentPath() {
    if (
        !fs.existsSync(
            PENDING_ATTACHMENT_DIRECTORY
        )
    ) {
        throw new Error(
            "Arquivo de pendências não encontrado: " +
            PENDING_ATTACHMENT_DIRECTORY
        );
    }

    const stats =
        fs.statSync(
            PENDING_ATTACHMENT_DIRECTORY
        );

    if (!stats.isFile()) {
        throw new Error(
            "O caminho de pendências não aponta para um arquivo: " +
            PENDING_ATTACHMENT_DIRECTORY
        );
    }

    if (
        !/\.(xlsx|xls)$/i.test(
            PENDING_ATTACHMENT_DIRECTORY
        )
    ) {
        throw new Error(
            "O arquivo de pendências precisa ser Excel."
        );
    }

    return PENDING_ATTACHMENT_DIRECTORY;
}

function getAttachmentPaths(type) {
    const normalizedType =
        normalizeChargeType(type);

    const attachments = [];

    if (
        normalizedType ===
            CHARGE_TYPES.PRICES ||
        normalizedType ===
            CHARGE_TYPES.BOTH
    ) {
        if (
            !fs.existsSync(
                PRICES_ATTACHMENT_PATH
            )
        ) {
            throw new Error(
                "Arquivo de preços não encontrado: " +
                PRICES_ATTACHMENT_PATH
            );
        }

        const priceStats =
            fs.statSync(
                PRICES_ATTACHMENT_PATH
            );

        if (!priceStats.isFile()) {
            throw new Error(
                "O caminho de preços não aponta para um arquivo: " +
                PRICES_ATTACHMENT_PATH
            );
        }

        attachments.push({
            path: PRICES_ATTACHMENT_PATH,
            fileName: path.basename(
                PRICES_ATTACHMENT_PATH
            )
        });
    }

    if (
        normalizedType ===
            CHARGE_TYPES.PENDING ||
        normalizedType ===
            CHARGE_TYPES.BOTH
    ) {
        const pendingPath =
            getPendingAttachmentPath();

        attachments.push({
            path: pendingPath,
            fileName: path.basename(
                pendingPath
            )
        });
    }

    return attachments;
}

function getEmailConfig() {
    const configs =
        emailRepository
            .listEmailConfigs();

    if (
        !Array.isArray(configs) ||
        !configs.length
    ) {
        throw new Error(
            "Nenhuma configuração de e-mail foi cadastrada."
        );
    }

    const config =
        configs.find((item) => {
            return (
                normalizeText(
                    item.smtp_host
                ) &&
                normalizeText(
                    item.smtp_user
                ) &&
                normalizeText(
                    item.smtp_password_encrypted
                )
            );
        });

    if (!config) {
        throw new Error(
            "Nenhuma configuração SMTP válida foi encontrada. Configure o e-mail no módulo Configurações."
        );
    }

    return config;
}

function getPricePendingStatus(contact) {
    if (
        pricePendingRepository
            .getPricePendingStatus
    ) {
        return pricePendingRepository
            .getPricePendingStatus(
                contact.laboratory_name,
                contact.branch
            );
    }

    return "";
}

function validateChargeContact(contact) {
    const email =
        normalizeText(
            contact.email
        ).toLowerCase();

    if (!email) {
        throw new Error(
            "O contato não possui e-mail cadastrado."
        );
    }

    if (!isValidEmail(email)) {
        throw new Error(
            "O e-mail cadastrado do contato é inválido."
        );
    }

    return email;
}

function buildChargePreview(contact, type) {
    const normalizedType =
        normalizeChargeType(type);

    const email =
        validateChargeContact(
            contact
        );

    const attachments =
        getAttachmentPaths(
            normalizedType
        );

    const subject =
        CHARGE_SUBJECTS[
            normalizedType
        ];

    const body =
        CHARGE_EMAIL_BODIES[
            normalizedType
        ];

    if (!subject || !body) {
        throw new Error(
            "Padrão de cobrança não configurado."
        );
    }

    return {
        charge_type: normalizedType,
        charge_label:
            normalizedType ===
                CHARGE_TYPES.PRICES
                ? "Cobrar preços"
                : normalizedType ===
                    CHARGE_TYPES.PENDING
                    ? "Cobrar pendências"
                    : "Cobrar preços e pendências",
        to: email,
        cc: null,
        bcc: null,
        subject,
        body,
        attachments,
        contact: {
            id: contact.id,
            laboratory_name:
                contact.laboratory_name,
            laboratory_key:
                contact.laboratory_key,
            branch: contact.branch,
            contact_name:
                contact.contact_name,
            email
        },
        price_pending_status:
            getPricePendingStatus(
                contact
            )
    };
}

function prepareCharge(payload = {}) {
    const type =
        normalizeChargeType(
            payload.charge_type ||
            payload.chargeType ||
            payload.type
        );

    const contact =
        getContactByPayload(
            payload
        );

    return buildChargePreview(
        contact,
        type
    );
}

function sendCharge(payload = {}) {
    const preview =
        prepareCharge(
            payload
        );

    const config =
        getEmailConfig();

    const messageData = {
        to: preview.to,
        toName:
            preview.contact.contact_name ||
            undefined,
        cc: undefined,
        bcc: undefined,
        subject:
            preview.subject,
        html:
            preview.body
    };

    return sendEmailViaSmtp(
        config,
        messageData,
        preview.attachments
    )
        .then((result) => {
            return {
                success: true,
                charge_type:
                    preview.charge_type,
                recipient:
                    preview.to,
                subject:
                    preview.subject,
                attachment_count:
                    preview.attachments.length,
                message_id:
                    result?.messageId ||
                    null
            };
        })
        .catch((error) => {
            throw new Error(
                error?.message ||
                "Falha ao enviar a cobrança."
            );
        });
}

module.exports = {
    prepareCharge,
    sendCharge,
    normalizeChargeType,
    getAttachmentPaths
};