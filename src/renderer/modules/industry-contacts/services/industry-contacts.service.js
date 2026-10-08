function getApi() {
    if (
        !window.alfadime ||
        !window.alfadime.industryContacts
    ) {
        throw new Error(
            "API de contatos de laboratórios não disponível."
        );
    }

    return window.alfadime.industryContacts;
}

export async function listIndustryContacts() {
    return getApi().list();
}

export async function listLaboratoriesWithoutContact() {
    return getApi().listWithoutContact();
}

export async function saveIndustryContact(data) {
    return getApi().save(data);
}

export async function deleteIndustryContact(id) {
    return getApi().delete(id);
}

export async function prepareIndustryContactCharge(
    payload
) {
    return getApi().prepareCharge(
        payload
    );
}

export async function sendIndustryContactCharge(
    payload
) {
    return getApi().sendCharge(
        payload
    );
}