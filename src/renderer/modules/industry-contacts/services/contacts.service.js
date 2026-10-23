function getContactsApi() {
    if (
        !window.alfadime ||
        !window.alfadime.industryContacts
    ) {
        throw new Error(
            "API de contatos não disponível."
        );
    }


    return window.alfadime.industryContacts;
}


function getContactsChargeApi() {
    if (
        !window.alfadime ||
        !window.alfadime.contactsCharge
    ) {
        throw new Error(
            "API de favoritos de cobrança não disponível."
        );
    }


    return window.alfadime.contactsCharge;
}


export async function listContacts() {
    return getContactsApi().list();
}


export async function saveContact(data) {
    return getContactsApi().save(data);
}


export async function deleteContact(id) {
    return getContactsApi().delete(id);
}


export async function listChargeFavorites() {
    return getContactsChargeApi().listFavorites();
}


export async function getChargeFavorite(id) {
    return getContactsChargeApi().getFavorite(id);
}


export async function saveChargeFavorite(data) {
    return getContactsChargeApi().saveFavorite(data);
}


export async function deleteChargeFavorite(id) {
    return getContactsChargeApi().deleteFavorite(id);
}


export async function prepareFavoriteCharge(payload) {
    return getContactsChargeApi().prepareCharge(payload);
}


export async function sendFavoriteCharge(payload) {
    return getContactsChargeApi().sendCharge(payload);
}


export async function getChargeStatus(payload) {
    return getContactsChargeApi().getChargeStatus(payload);
}


export async function cancelCharge(payload) {
    return getContactsChargeApi().cancelCharge(payload);
}


export async function retryFailedCharge(payload) {
    return getContactsChargeApi().retryFailedCharge(payload);
}


export async function listChargeRuns(limit = 50) {
    return getContactsChargeApi().listRuns(limit);
}


export async function getChargeRun(runId) {
    return getContactsChargeApi().getRun(runId);
}


export async function cancelChargeRun(runId) {
    return getContactsChargeApi().cancelRun(runId);
}


export async function retryChargeRun(runId) {
    return getContactsChargeApi().retryRun(runId);
}
