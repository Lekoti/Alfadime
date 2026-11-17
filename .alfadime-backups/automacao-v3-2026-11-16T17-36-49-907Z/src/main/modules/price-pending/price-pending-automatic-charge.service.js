const repository = require("./price-pending-automatic-charge.repository");
const favoritesService = require("../industry-contacts/contacts-charge-favorites.service");

const INTERVAL_MS = 48 * 60 * 60 * 1000;
let timer = null;
let executing = false;

function isDue(status) {
    if (!status.enabled || status.running) return false;
    if (!status.last_success_at) return true;
    const last = new Date(status.last_success_at).getTime();
    if (Number.isNaN(last)) return true;
    return Date.now() - last >= INTERVAL_MS;
}

async function runCharge() {
    if (executing) return { success: false, reason: "already_running" };
    const status = repository.getStatus();
    if (!isDue(status)) return { success: false, reason: "not_due" };
    if (!repository.tryLock()) return { success: false, reason: "locked" };
    executing = true;
    try {
        const prepared = favoritesService.prepareFixedCharge({});
        const sent = await favoritesService.sendFavoriteCharge({ preview_token: prepared.preview_token });
        if (sent?.success) repository.markSuccess();
        else repository.unlock(new Error(sent?.error || "Cobranca automatica nao foi concluida."));
        return { success: Boolean(sent?.success), run_id: sent?.run_id || null, sent: sent?.sent || 0 };
    } catch (error) {
        repository.unlock(error);
        return { success: false, error: error.message };
    } finally {
        executing = false;
    }
}

function start() {
    if (timer) return;
    timer = setInterval(() => { runCharge().catch(() => {}); }, 15 * 60 * 1000);
    runCharge().catch(() => {});
}

function stop() {
    if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { getStatus: repository.getStatus, setEnabled: repository.setEnabled, runCharge, start, stop };
