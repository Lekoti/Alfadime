const crypto = require("node:crypto");
const repository = require("./price-pending-auto-charge.repository");
const favoritesService = require("../industry-contacts/contacts-charge-favorites.service");
const { FIXED_FAVORITE_ID } = require("../industry-contacts/contacts-charge-favorites.repository");


const EXECUTION_INTERVAL_MS = 48 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const LOCK_LEASE_MS = 10 * 60 * 1000;
const NO_OUTDATED_INDUSTRIES =
    "Nenhuma indústria desatualizada com e-mail válido foi encontrada.";


function createService({
    repository: serviceRepository = repository,
    chargeService = favoritesService,
    checkIntervalMs = CHECK_INTERVAL_MS,
    executionIntervalMs = EXECUTION_INTERVAL_MS,
    leaseMs = LOCK_LEASE_MS
} = {}) {
    const ownerId = crypto.randomUUID();
    let timer = null;
    let activeExecution = null;

    async function execute(claim) {
        let recipients = [];
        let runId = null;
        const leaseTimer = setInterval(() => {
            try {
                serviceRepository.renewExecution(ownerId, leaseMs);
            } catch (error) {
                console.error("[Preços e Pendências] Falha ao renovar bloqueio de cobrança automática:", error);
            }
        }, Math.max(1000, Math.floor(leaseMs / 3)));
        leaseTimer.unref?.();

        try {
            const preview = chargeService.prepareFavoriteCharge({
                favorite_id: FIXED_FAVORITE_ID
            });
            recipients = (Array.isArray(preview.messages) ? preview.messages : [])
                .map((message) => String(message.to || "").trim())
                .filter(Boolean);

            const result = await chargeService.sendFavoriteCharge({
                preview_token: preview.preview_token
            });
            runId = result?.run_id || null;

            const failed = (result?.results || [])
                .filter((item) => !item.success)
                .map((item) => item.error)
                .filter(Boolean);
            const success = result?.success === true;

            serviceRepository.finishExecution(ownerId, claim.event_id, {
                status: success ? "success" : "failure",
                recipients,
                run_id: runId,
                error: success ? null : failed.join("; ") || "A cobrança automática não foi concluída."
            });
            return { ...result, status: success ? "success" : "failure" };
        } catch (error) {
            const noRecipients = error?.message === NO_OUTDATED_INDUSTRIES;
            serviceRepository.finishExecution(ownerId, claim.event_id, {
                status: noRecipients ? "no_recipients" : "failure",
                recipients,
                run_id: runId,
                error: noRecipients ? null : error?.message || String(error)
            });

            if (!noRecipients) {
                console.error("[Preços e Pendências] Falha na cobrança automática:", error);
            }

            return {
                success: noRecipients,
                status: noRecipients ? "no_recipients" : "failure",
                recipients,
                error: noRecipients ? null : error?.message || String(error)
            };
        } finally {
            clearInterval(leaseTimer);
            serviceRepository.releaseExecution(ownerId);
        }
    }

    async function runIfDue() {
        if (activeExecution) return activeExecution;

        const claim = serviceRepository.claimExecution(
            ownerId,
            executionIntervalMs,
            leaseMs
        );
        if (!claim.claimed) return claim;

        activeExecution = execute(claim);
        try {
            return await activeExecution;
        } finally {
            activeExecution = null;
        }
    }

    function start() {
        if (timer) return;
        timer = setInterval(() => {
            runIfDue().catch((error) => {
                console.error("[Preços e Pendências] Erro ao verificar cobrança automática:", error);
            });
        }, checkIntervalMs);
        timer.unref?.();
        runIfDue().catch((error) => {
            console.error("[Preços e Pendências] Erro ao iniciar cobrança automática:", error);
        });
    }

    function stop() {
        if (timer) clearInterval(timer);
        timer = null;
    }

    function setEnabled(enabled, actor) {
        const config = serviceRepository.setEnabled(enabled, actor);
        if (config.enabled) {
            runIfDue().catch((error) => {
                console.error("[Preços e Pendências] Erro ao ativar cobrança automática:", error);
            });
        }
        return config;
    }

    return {
        getConfiguration: serviceRepository.getConfiguration,
        listEvents: serviceRepository.listEvents,
        setEnabled,
        runIfDue,
        start,
        stop
    };
}


module.exports = {
    ...createService(),
    createService,
    EXECUTION_INTERVAL_MS,
    NO_OUTDATED_INDUSTRIES
};
