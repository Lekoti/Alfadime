const runRepository = require("./contacts-charge-run.repository");
const favoritesService = require("./contacts-charge-favorites.service");
const executionRepository = require("./contacts-charge-execution.repository");
const access = require("../price-pending/price-pending-access");

function normalizeText(value) {
    return String(value ?? "").trim();
}

function listRuns(limit = 50) {
    return runRepository.listRuns(limit);
}

function getRun(runId) {
    const id = normalizeText(runId);
    if (!id) throw new Error("Informe o identificador da execução.");
    const run = runRepository.getRun(id);
    if (!run) throw new Error("Execução de cobrança não encontrada.");
    return run;
}

function getRunSummary(runId) {
    const run = getRun(runId);
    return {
        ...run,
        progress: run.total > 0
            ? Math.min(100, Math.round(((run.sent + run.failed + run.ignored + run.cancelled) / run.total) * 100))
            : 0,
        cancelRequested: executionRepository.isCancellationRequested(run.id),
        items: require("./contacts-charge-coordination").expandedItems(run.id, run.items)
    };
}

function cancelRun(runId) {
    const user = access.requireEditor();
    const run = getRun(runId);
    return executionRepository.requestCancel(run.id, access.name(user));
}

async function retryFailedCharge(runId) {
    access.requireEditor();
    const run = getRun(runId);
    const preview = await favoritesService.retryFailedCharge({ run_id: run.id });
    return {
        run_id: run.id,
        preview_token: preview.preview_token,
        favorite_id: preview.favorite_id,
        favorite_name: preview.favorite_name,
        valid: preview.valid,
        invalid: preview.invalid,
        duplicates: preview.duplicates,
        message_count: preview.message_count
    };
}

module.exports = { listRuns, getRun, getRunSummary, cancelRun, retryFailedCharge };
