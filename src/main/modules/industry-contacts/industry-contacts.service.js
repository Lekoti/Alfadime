const repository = require(
    "./industry-contacts.repository"
);

const pricePendingRepository = require(
    "../price-pending/price-pending.repository"
);

const notificationsService = require(
    "../notifications/notifications.service"
);

const ALLOWED_BRANCHES = [
    "DPR",
    "AMS",
    "DMT",
    "DMS",
    "DSC"
];

const NOTIFICATION_SOURCE_MODULE =
    "industry-contacts";

const INCOMPLETE_CONTACT_NOTIFICATION_TYPE =
    "INCOMPLETE_CONTACT";

function normalizeText(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(
        value
    ).trim();
}

function normalizeBranch(
    value
) {
    return normalizeText(
        value
    ).toUpperCase();
}

function getContactStatus(
    row = {}
) {
    const problems = [];

    const hasContact =
        row.has_contact === 1 ||
        row.has_contact === true;

    if (
        !hasContact
    ) {
        return "Sem contato";
    }

    if (
        !normalizeText(
            row.contact_name
        )
    ) {
        problems.push(
            "Falta nome"
        );
    }

    if (
        !normalizeText(
            row.phone
        )
    ) {
        problems.push(
            "Falta telefone"
        );
    }

    if (
        !normalizeText(
            row.email
        )
    ) {
        problems.push(
            "Falta e-mail"
        );
    }

    if (
        !ALLOWED_BRANCHES.includes(
            normalizeBranch(
                row.branch
            )
        )
    ) {
        problems.push(
            "Falta filial"
        );
    }

    return problems.length > 0
        ? problems.join(
              "; "
          )
        : "Contato completo";
}

function getPricePendingStatus(
    laboratory,
    branch
) {
    return pricePendingRepository
        .getPricePendingStatus(
            laboratory,
            branch
        );
}

function getAutomaticObservation(
    row = {},
    pricePendingStatus = ""
) {
    const observation =
        normalizeText(
            row.notes
        );

    if (
        observation
    ) {
        return observation;
    }

    return pricePendingStatus;
}

function getNotificationEvents(
    row = {},
    pricePendingStatus = ""
) {
    return [
        {
            type:
                "PRICE_PENDING_STATUS",
            laboratoryKey:
                row.laboratory_key ||
                null,
            laboratoryName:
                row.laboratory_name ||
                null,
            branch:
                row.branch ||
                null,
            statusLabel:
                pricePendingStatus,
            automaticObservation:
                getAutomaticObservation(
                    row,
                    pricePendingStatus
                )
        }
    ];
}

function getIndustryGlobalCode(
    row = {}
) {
    const laboratory =
        row.laboratory_name ||
        row.laboratory ||
        "";

    return pricePendingRepository
        .getIndustryGlobalCodeByLaboratory(
            laboratory
        );
}

function enrichRow(
    row = {},
    context = {}
) {
    const pricePendingStatus =
        context.pricePendingStatusMap?.get(
            `${normalizeText(
                row.laboratory_name
            ).toUpperCase()}:${normalizeBranch(
                row.branch
            )}`
        ) ||
        getPricePendingStatus(
            row.laboratory_name,
            row.branch
        );

    const contactStatus =
        getContactStatus(
            row
        );

    const automaticObservation =
        getAutomaticObservation(
            row,
            pricePendingStatus
        );

    const industryGlobalCode =
        context.industryGlobalCodeMap?.get(
            normalizeText(
                row.laboratory_name
            ).toUpperCase()
        ) ||
        getIndustryGlobalCode(
            row
        );

    return {
        ...row,

        industry_global_code:
            industryGlobalCode,

        status_label:
            contactStatus,

        price_pending_status:
            pricePendingStatus,

        automatic_observation:
            automaticObservation,

        notification_events:
            getNotificationEvents(
                row,
                pricePendingStatus
            )
    };
}

function getContactNotificationSourceId(
    contact = {}
) {
    const laboratoryKey =
        normalizeText(
            contact.laboratory_key
        );

    const branch =
        normalizeBranch(
            contact.branch
        );

    if (
        !laboratoryKey ||
        !branch
    ) {
        return null;
    }

    return `${laboratoryKey}:${branch}`;
}

function removeIncompleteContactNotification(
    sourceId
) {
    if (
        !sourceId
    ) {
        return null;
    }

    return notificationsService.deleteBySource(
        NOTIFICATION_SOURCE_MODULE,
        sourceId,
        INCOMPLETE_CONTACT_NOTIFICATION_TYPE
    );
}

function syncIncompleteContactNotification(
    contact
) {
    const contactStatus =
        contact.status_label;

    const sourceId =
        getContactNotificationSourceId(
            contact
        );

    if (
        !sourceId
    ) {
        return null;
    }

    const existingNotification =
        notificationsService.findBySource(
            NOTIFICATION_SOURCE_MODULE,
            sourceId,
            INCOMPLETE_CONTACT_NOTIFICATION_TYPE
        );

    if (
        contactStatus ===
        "Contato completo"
    ) {
        if (
            existingNotification
        ) {
            return removeIncompleteContactNotification(
                sourceId
            );
        }

        return null;
    }

    const notificationData = {
        type:
            INCOMPLETE_CONTACT_NOTIFICATION_TYPE,
        title:
            "Contato incompleto",
        message:
            `${contact.laboratory_name} ` +
            `possui pendências no cadastro: ` +
            `${contactStatus}.`,
        source_module:
            NOTIFICATION_SOURCE_MODULE,
        source_id:
            sourceId,
        laboratory_name:
            contact.laboratory_name,
        laboratory_key:
            contact.laboratory_key,
        industry_global_code:
            contact.industry_global_code,
        branch:
            contact.branch,
        recipient_email:
            contact.email,
        priority:
            "normal",
        metadata: {
            contact_id:
                contact.id,
            contact_status:
                contactStatus
        }
    };

    if (
        existingNotification
    ) {
        return notificationsService.update(
            existingNotification.id,
            notificationData
        );
    }

    return notificationsService.createNotification(
        notificationData
    );
}

function buildPricePendingStatusMap() {
    if (
        typeof pricePendingRepository
            .getPricePendingStatusMap ===
        "function"
    ) {
        return pricePendingRepository
            .getPricePendingStatusMap();
    }

    return new Map();
}

function buildIndustryGlobalCodeMap() {
    if (
        typeof pricePendingRepository
            .getIndustryGlobalCodeMap ===
        "function"
    ) {
        const map =
            pricePendingRepository
                .getIndustryGlobalCodeMap();

        const normalizedMap =
            new Map();

        for (
            const [
                key,
                value
            ] of map.entries()
        ) {
            normalizedMap.set(
                normalizeText(
                    key
                ).toUpperCase(),
                value
            );
        }

        return normalizedMap;
    }

    return new Map();
}

function syncNotificationsInBackground(
    rows
) {
    setImmediate(
        () => {
            rows.forEach(
                (contact) => {
                    try {
                        syncIncompleteContactNotification(
                            contact
                        );
                    } catch (
                        notificationError
                    ) {
                        console.error(
                            "Erro ao sincronizar notificação de contato:",
                            notificationError
                        );
                    }
                }
            );
        }
    );
}

function listLaboratories() {
    const contacts =
        repository.listLaboratories();

    const pricePendingStatusMap =
        buildPricePendingStatusMap();

    const industryGlobalCodeMap =
        buildIndustryGlobalCodeMap();

    const rows =
        contacts.map(
            (contact) =>
                enrichRow(
                    contact,
                    {
                        pricePendingStatusMap,
                        industryGlobalCodeMap
                    }
                )
        );

    const total =
        rows.length;

    const withContact =
        rows.filter(
            (row) =>
                row.has_contact === 1
        ).length;

    const withoutContact =
        total -
        withContact;

    syncNotificationsInBackground(
        rows
    );

    return {
        rows,
        summary: {
            total,
            withContact,
            withoutContact
        }
    };
}

function saveContact(
    data = {}
) {
    const contact =
        repository.saveContact(
            data
        );

    const enrichedContact =
        enrichRow(
            contact
        );

    syncIncompleteContactNotification(
        enrichedContact
    );

    return {
        contact:
            enrichedContact,

        spreadsheet: {
            success: true,
            disabled: true,
            message:
                "Contato salvo somente no banco de dados."
        }
    };
}

function deleteContact(
    id
) {
    return repository.deleteContact(
        id
    );
}

function getLaboratoriesWithoutContacts() {
    return repository
        .getLaboratoriesWithoutContacts();
}

module.exports = {
    listLaboratories,
    saveContact,
    deleteContact,
    getLaboratoriesWithoutContacts,
    getContactStatus,
    getPricePendingStatus,
    getAutomaticObservation,
    getNotificationEvents,
    getIndustryGlobalCode,
    enrichRow,
    syncIncompleteContactNotification,
    getContactNotificationSourceId,
    removeIncompleteContactNotification,
    syncNotificationsInBackground
};