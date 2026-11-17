const repository = require("./price-pending-automatic-charge.repository");
const favoritesService = require("../industry-contacts/contacts-charge-favorites.service");
const coordination = require("../industry-contacts/contacts-charge-coordination");

let timer = null;
let executing = false;
let stopping = false;
let activePreview = null;

function buildStatus() {
    const status = repository.getStatus();
    let phase = "disabled";
    if (status.enabled) {
        if (status.running) phase = activePreview ? "sending" : "preparing";
        else if (status.next_allowed_ms && Date.now() < status.next_allowed_ms) phase = "waiting";
        else phase = "ready";
    }
    return { ...status, phase };
}
function getStatus() { return buildStatus(); }
function setEnabled(enabled, actor) {
    const result = repository.setEnabled(enabled, actor);
    if (!enabled && activePreview) {
        try { favoritesService.cancelCharge({ preview_token: activePreview }); } catch (_) { /* preserve state */ }
    }
    return buildStatus();
}
function setChargeInterval(hours, actor) { return repository.setIntervalHours(hours, actor); }
function clearLastError(actor) { return repository.clearLastError(actor); }
async function runCharge(manual = false) {
    if (executing || stopping) return { success: false, reason: "busy_or_stopping" };
    executing = true;
    let owner = null;
    let heartbeat = null;
    let result = null;
    let failure = null;
    try {
        const status = repository.getStatus();
        if (!status.enabled || status.running) return { success: false, reason: "disabled_or_locked" };
        if (!manual && Date.now() < status.next_allowed_ms) return { success: false, reason: "not_due" };
        owner = repository.tryLock(manual);
        if (!owner) return { success: false, reason: "locked" };
        const prepared = await favoritesService.prepareFavoriteCharge({ favorite_id: favoritesService.FIXED_FAVORITE_ID });
        if (!prepared?.preview_token) throw new Error("A preparação da cobrança não retornou um token válido.");
        activePreview = prepared.preview_token;
        heartbeat = globalThis.setInterval(() => {
            try {
                if (!repository.heartbeat(owner)) throw new Error("Bloqueio da automação perdido.");
                if (stopping || !repository.getStatus().enabled) {
                    favoritesService.cancelCharge({ preview_token: activePreview });
                    throw new Error("Automação desativada durante a execução.");
                }
            } catch (error) {
                failure = error;
                try { favoritesService.cancelCharge({ preview_token: activePreview }); } catch (_) { /* preserve error */ }
            }
        }, 30000);
        if (stopping || !repository.getStatus().enabled) throw new Error("Automação desativada antes do envio.");
        result = await coordination.automatic(() => favoritesService.sendFavoriteCharge({ preview_token: activePreview }));
        if (stopping || !repository.getStatus().enabled) {
            try { favoritesService.cancelCharge({ preview_token: activePreview }); } catch (_) { /* preserve error */ }
            throw new Error("Automação desativada durante a execução.");
        }
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
function tick() { runCharge(false).catch(error => console.error("[Cobrança automática]", error)); }
function start() {
    if (timer) return;
    stopping = false;
    timer = globalThis.setInterval(tick, 15 * 60 * 1000);
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
module.exports = { getStatus, setEnabled, setChargeInterval, clearLastError, runCharge, start, stop };
