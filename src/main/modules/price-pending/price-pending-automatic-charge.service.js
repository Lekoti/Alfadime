const repository = require("./price-pending-automatic-charge.repository");
const favoritesService = require("../industry-contacts/contacts-charge-favorites.service");
let timer = null;
let executing = false;
let stopping = false;
let activePreview = null;
function getStatus() { return repository.getStatus(); }
function setEnabled(enabled, actor) {
    const result = repository.setEnabled(enabled, actor);
    if (!enabled && activePreview) favoritesService.cancelCharge({ preview_token: activePreview });
    return result;
}
async function runCharge() {
    if (executing || stopping) return { success: false, reason: "busy_or_stopping" };
    executing = true;
    let owner = null;
    let heartbeat = null;
    let result = null;
    let failure = null;
    try {
        const status = repository.getStatus();
        if (!status.enabled || status.running || Date.now() < status.next_allowed_ms) return { success: false, reason: "not_due_or_locked" };
        owner = repository.tryLock();
        if (!owner) return { success: false, reason: "locked" };
        const prepared = await favoritesService.prepareFavoriteCharge({ favorite_id: favoritesService.FIXED_FAVORITE_ID });
        if (!prepared?.preview_token) throw new Error("A preparação da cobrança não retornou um token válido.");
        activePreview = prepared.preview_token;
        heartbeat = setInterval(() => {
            try {
                if (!repository.heartbeat(owner)) throw new Error("Bloqueio da automação perdido.");
                if (stopping || !repository.getStatus().enabled) favoritesService.cancelCharge({ preview_token: activePreview });
            } catch (error) {
                failure = error;
                try { favoritesService.cancelCharge({ preview_token: activePreview }); } catch (_) { /* preserve error */ }
            }
        }, 30000);
        if (stopping || !repository.getStatus().enabled) throw new Error("Automação desativada antes do envio.");
        result = await favoritesService.sendFavoriteCharge({ preview_token: activePreview });
        if (failure) throw failure;
        return result;
    } catch (error) {
        failure = error;
        return { success: false, error: error.message };
    } finally {
        if (heartbeat) clearInterval(heartbeat);
        try {
            if (owner) repository.finish(owner, result || {}, failure);
        } finally {
            activePreview = null;
            executing = false;
        }
    }
}
function tick() { runCharge().catch(error => console.error("[Cobrança automática]", error)); }
function start() {
    if (timer) return;
    stopping = false;
    timer = setInterval(tick, 15 * 60 * 1000);
    tick();
}
function stop() {
    stopping = true;
    if (timer) clearInterval(timer);
    timer = null;
    if (activePreview) {
        try { favoritesService.cancelCharge({ preview_token: activePreview }); }
        catch (error) { console.error("[Cobrança automática]", error); }
    }
}
module.exports = { getStatus, setEnabled, runCharge, start, stop };
