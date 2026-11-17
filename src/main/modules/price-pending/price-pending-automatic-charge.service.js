const repository = require("./price-pending-automatic-charge.repository");
const favoritesService = require("../industry-contacts/contacts-charge-favorites.service");
const coordination = require("../industry-contacts/contacts-charge-coordination");

let timer = null;
let executing = false;
let stopping = false;
let activePreview = null;
let progress = {
    total: 0,
    current: 0,
    currentLaboratory: "",
    startedAt: null,
    finishedAt: null,
    preparation: { stage: "", current: 0, total: 0, percent: 0, message: "" }
};

function preparationPercent(preparation) {
    const total = Number(preparation?.total || 0);
    const current = Number(preparation?.current || 0);
    if (!total) return 0;
    return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}

function buildStatus() {
    const status = repository.getStatus();
    let phase = "disabled";
    if (status.enabled) {
        if (executing || status.running) phase = activePreview ? "sending" : "preparing";
        else if (status.next_allowed_ms && Date.now() < status.next_allowed_ms) phase = "waiting";
        else phase = "ready";
    }
    const preparation = { ...progress.preparation, percent: preparationPercent(progress.preparation) };
    return {
        ...status,
        phase,
        progress: { ...progress, preparation },
        status_text: buildStatusText(phase, preparation)
    };
}
function buildStatusText(phase, preparation) {
    if (phase === "preparing") {
        if (preparation?.total) {
            return `Preparando cobrança: ${preparation.percent}% concluído — ${preparation.message || "em andamento"}.`;
        }
        return "Preparando cobrança.";
    }
    if (phase === "sending") {
        const current = progress.current || 0;
        const total = progress.total || 0;
        const laboratory = progress.currentLaboratory ? ` — ${progress.currentLaboratory}` : "";
        return total ? `Enviando ${current} de ${total}${laboratory}.` : "Enviando cobrança.";
    }
    return "";
}
function getStatus() { return buildStatus(); }
function setEnabled(enabled, actor) {
    const status = repository.getStatus();
    if (!enabled && (executing || status.running)) {
        throw new Error("Não é possível desativar durante a preparação ou envio. Aguarde a conclusão da cobrança.");
    }
    const result = repository.setEnabled(enabled, actor);
    if (!enabled && activePreview) {
        try { favoritesService.cancelCharge({ preview_token: activePreview }); } catch (_) { /* preserve state */ }
    }
    if (enabled) {
        runCharge(false).catch(error => console.error("[Cobrança automática]", error));
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
    let progressTimer = null;
    let result = null;
    let failure = null;
    try {
        const status = repository.getStatus();
        if (!status.enabled || status.running) return { success: false, reason: "disabled_or_locked" };
        if (!manual && Date.now() < status.next_allowed_ms) return { success: false, reason: "not_due" };
        owner = repository.tryLock(manual);
        if (!owner) return { success: false, reason: "locked" };
        progress = {
            total: 0,
            current: 0,
            currentLaboratory: "",
            startedAt: null,
            finishedAt: null,
            preparation: { stage: "", current: 0, total: 0, percent: 0, message: "" }
        };
        const prepared = await favoritesService.prepareFavoriteCharge({
            favorite_id: favoritesService.FIXED_FAVORITE_ID,
            onProgress: (update) => {
                progress.preparation = {
                    stage: update?.stage || progress.preparation.stage,
                    current: Number(update?.current || 0),
                    total: Number(update?.total || 0),
                    percent: 0,
                    message: update?.message || progress.preparation.message
                };
                progress.preparation.percent = preparationPercent(progress.preparation);
            }
        });
        if (!prepared?.preview_token) throw new Error("A preparação da cobrança não retornou um token válido.");
        activePreview = prepared.preview_token;
        progress = {
            total: Number(prepared.message_count || 0),
            current: 0,
            currentLaboratory: "",
            startedAt: null,
            finishedAt: null,
            preparation: { ...progress.preparation, stage: "done", percent: 100, message: "Preparação concluída." }
        };
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
        progressTimer = globalThis.setInterval(async () => {
            try {
                const chargeStatus = await favoritesService.getChargeStatus({ preview_token: activePreview });
                progress = {
                    total: Number(chargeStatus.total || progress.total || 0),
                    current: Number(chargeStatus.current || 0),
                    currentLaboratory: chargeStatus.currentLaboratory || "",
                    startedAt: chargeStatus.startedAt || progress.startedAt,
                    finishedAt: chargeStatus.finishedAt || progress.finishedAt,
                    preparation: progress.preparation
                };
            } catch (_) { /* mantém último progresso conhecido */ }
        }, 1000);
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
        if (progressTimer) clearInterval(progressTimer);
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
