const runRepository = require("./contacts-charge-run.repository");
const favoritesService = require("./contacts-charge-favorites.service");

function normalizeText(value) {
    return String(value ?? "").trim();
}

function listRuns(limit = 50) {
    return runRepository.listRuns(limit);
}

function getRun(runId) {
    const id = normalizeText(runId);

    if (!id) {
        throw new Error("Informe o identificador da execução.");
    }

    const run = runRepository.getRun(id);

    if (!run) {
        throw new Error("Execução de cobrança não encontrada.");
    }

    return run;
}

function getRunSummary(runId) {
    const run = getRun(runId);

    return {
        id: run.id,
        favorite_id: run.favorite_id,
        favorite_name: run.favorite_name,
        charge_type: run.charge_type,
        status: run.status,
        total: run.total,
        sent: run.sent,
        failed: run.failed,
        ignored: run.ignored,
        cancelled: run.cancelled,
        started_at: run.started_at,
        finished_at: run.finished_at,
        error_message: run.error_message,
        progress: run.total > 0
            ? Math.round(((run.sent + run.failed + run.ignored + run.cancelled) / run.total) * 100)
            : 0,
        items: run.items
    };
}

function cancelRun(runId) {
    const run = getRun(runId);

    if (["completed", "completed_with_errors", "cancelled"].includes(run.status)) {
        throw new Error("Esta execução já foi finalizada.");
    }

    return runRepository.cancelRun(run.id);
}

async function retryFailedCharge(runId) {
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

module.exports = {
    listRuns,
    getRun,
    getRunSummary,
    cancelRun,
    retryFailedCharge
};
