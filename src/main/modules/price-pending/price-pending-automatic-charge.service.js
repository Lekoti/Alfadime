const repository = require("./price-pending-automatic-charge.repository");
const favoritesService = require("../industry-contacts/contacts-charge-favorites.service");
const coordination = require("../industry-contacts/contacts-charge-coordination");

let timer = null;
let executing = false;
let stopping = false;
let activePreview = null;
let cancelRequested = false;
let lastResult = null;
let progress = emptyProgress();

function emptyProgress() {
    return {
        total: 0, current: 0, sent: 0, failed: 0, uncertain: 0,
        currentLaboratory: "", startedAt: null, finishedAt: null,
        preparation: { stage: "", current: 0, total: 0, percent: 0, message: "" }
    };
}
function preparationPercent(preparation) {
    const total = Number(preparation?.total || 0);
    return total > 0 ? Math.min(100, Math.max(0, Math.round(Number(preparation.current || 0) / total * 100))) : 0;
}
function buildStatus() {
    const status = repository.getStatus();
    let phase;
    if (executing) phase = cancelRequested || !status.enabled ? "cancelling" : activePreview ? "sending" : "preparing";
    else if (status.running) phase = status.recovery_required ? "interrupted" : "external";
    else if (!status.enabled) phase = "disabled";
    else phase = status.next_allowed_ms && Date.now() < status.next_allowed_ms ? "waiting" : "ready";
    const preparation = { ...progress.preparation, percent: preparationPercent(progress.preparation) };
    return { ...status, phase, progress: { ...progress, preparation }, last_result: lastResult, status_text: buildStatusText(phase, preparation) };
}
function buildStatusText(phase, preparation) {
    if (phase === "preparing") {
        if (preparation.stage === "loading") return "Carregando dados: total ainda não disponível.";
        return preparation.total
            ? `Preparação — ${preparation.message || "etapa atual"} ${preparation.percent}% da etapa (${preparation.current}/${preparation.total}).`
            : "Iniciando preparação da cobrança.";
    }
    if (phase === "sending") return `Processados ${progress.current} de ${progress.total}${progress.currentLaboratory ? ` — ${progress.currentLaboratory}` : ""}.`;
    if (phase === "external") return "Existe uma reserva ativa nesta ou em outra instância. Progresso remoto indisponível; não iniciar outra cobrança.";
    if (phase === "interrupted") return "Reserva expirada ou interrompida. Confira SMTP e histórico antes de autorizar recuperação.";
    if (phase === "cancelling") return "Cancelamento solicitado. A operação atual pode precisar terminar antes da parada.";
    return "";
}
function getStatus() { return buildStatus(); }
function requestStop() {
    cancelRequested = true;
    if (activePreview) favoritesService.cancelCharge({ preview_token: activePreview });
}
function setEnabled(enabled, actor) {
    if (enabled && executing) throw new Error("Aguarde a execução atual terminar antes de reativar.");
    repository.setEnabled(enabled, actor);
    if (!enabled && executing) requestStop();
    if (enabled) runCharge(false).catch(error => console.error("[Cobrança automática]", error));
    return buildStatus();
}
function setChargeInterval(hours, actor) {
    repository.setIntervalHours(hours, actor);
    return buildStatus();
}
function clearLastError(actor) {
    repository.clearLastError(actor);
    return buildStatus();
}
function sampleProgress() {
    if (!activePreview) return;
    const status = favoritesService.getChargeStatus({ preview_token: activePreview });
    progress = {
        ...progress,
        total: Number(status.total || progress.total), current: Number(status.current || 0),
        sent: Number(status.sent || 0), failed: Number(status.failed || 0), uncertain: Number(status.uncertain || 0),
        currentLaboratory: status.currentLaboratory || "", startedAt: status.startedAt || progress.startedAt,
        finishedAt: status.finishedAt || progress.finishedAt
    };
}
async function runCharge(manual = false) {
    if (executing || stopping) return { success: false, reason: "busy_or_stopping" };
    executing = true;
    cancelRequested = false;
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
        progress = emptyProgress();
        lastResult = null;
        heartbeat = globalThis.setInterval(() => {
            try {
                if (!repository.heartbeat(owner)) throw new Error("Bloqueio da automação perdido.");
                if (!repository.getStatus().enabled || stopping) requestStop();
            } catch (error) {
                failure = error;
                try { requestStop(); } catch (_) { cancelRequested = true; }
            }
        }, 30000);
        const prepared = await favoritesService.prepareFavoriteCharge({
            favorite_id: favoritesService.FIXED_FAVORITE_ID,
            shouldCancel: () => cancelRequested || stopping || Boolean(failure),
            onProgress: update => { progress.preparation = { ...update, percent: preparationPercent(update) }; }
        });
        if (!prepared?.preview_token) throw new Error("A preparação da cobrança não retornou um token válido.");
        activePreview = prepared.preview_token;
        progress.total = Number(prepared.message_count || 0);
        progress.preparation = { ...progress.preparation, stage: "done", percent: 100, message: "Preparação concluída." };
        progressTimer = globalThis.setInterval(() => {
            try { sampleProgress(); }
            catch (error) {
                failure = error;
                try { requestStop(); } catch (_) { cancelRequested = true; }
            }
        }, 1000);
        if (cancelRequested || stopping || !repository.getStatus().enabled) throw new Error("Automação desativada antes do envio.");
        result = await coordination.automatic(() => favoritesService.sendFavoriteCharge({ preview_token: activePreview }));
        sampleProgress();
        if (failure) throw failure;
        lastResult = result;
        return result;
    } catch (error) {
        failure = error;
        result = { ...(result || {}), success: false, error: error.message };
        lastResult = result;
        return result;
    } finally {
        if (heartbeat) clearInterval(heartbeat);
        if (progressTimer) clearInterval(progressTimer);
        if (activePreview) {
            try { sampleProgress(); } catch (_) { /* Mantém o último snapshot disponível. */ }
        }
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
    try { requestStop(); } catch (error) { console.error("[Cobrança automática]", error); }
}
module.exports = { getStatus, setEnabled, setChargeInterval, clearLastError, runCharge, start, stop };
