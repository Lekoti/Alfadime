function messageError(error) {
    return String(error?.message || error || "Falha desconhecida.");
}

async function executeCharge(plan, token, dependencies) {
    const { runs, execution, executePlan } = dependencies;
    const now = dependencies.now || (() => new Date().toISOString());
    const results = [];
    let run = null;
    let finalRun = null;
    let failure = null;
    plan.startedAt = now();
    plan.finishedAt = null;
    plan.sent = 0;
    plan.failed = 0;
    plan.uncertain = 0;
    plan.current = 0;
    plan.currentLaboratory = "";

    try {
        run = execution.createRun({
            favorite_id: plan.favorite.id,
            favorite_name: plan.favorite.name,
            charge_type: plan.favorite.charge_type,
            total: plan.messages.length,
            contacts: plan.messages.map(message => ({
                contact_id: message.contact.id,
                laboratory_name: message.contact.laboratory_name,
                laboratory_key: message.contact.laboratory_key,
                branch: message.contact.branch,
                email: message.to
            }))
        });
        plan.runId = run.id;
        runs.startRun(run.id);

        for (const message of plan.messages) {
            if (plan.cancelRequested || execution.isCancellationRequested(run.id)) {
                plan.cancelRequested = true;
                break;
            }
            const item = run.items.find(candidate =>
                candidate.contact_id === message.contact.id &&
                String(candidate.email || "").trim().toLowerCase() === message.to
            );
            if (!item) throw new Error("Item da execução não encontrado. Nenhum envio foi iniciado para este destinatário.");
            plan.currentLaboratory = message.contact.laboratory_name || "";
            runs.updateItemStatus(run.id, item.id, "sending");
            if (plan.cancelRequested || execution.isCancellationRequested(run.id)) {
                runs.updateItemStatus(run.id, item.id, "cancelled");
                plan.cancelRequested = true;
                break;
            }

            const paths = new Set((message.attachments || []).map(attachment => attachment.path));
            const fingerprints = new Map([...plan.fingerprints].filter(([file]) => paths.has(file)));
            let outcome;
            let interrupted = false;
            try {
                const result = await executePlan({ messages: [message], fingerprints }, token);
                if (!Array.isArray(result?.results) || result.results.length !== 1) {
                    throw new Error("Resposta de envio inválida. Confira SMTP e histórico antes de reenviar.");
                }
                outcome = { ...result.results[0] };
                outcome.success = outcome.success === true && result.success === true && result.sent === 1;
                interrupted = result.delivery_status === "sending" || result.delivery_status === "uncertain";
            } catch (error) {
                if (error?.deliveryResult?.success === true && error.deliveryResult.results?.length === 1) {
                    outcome = { ...error.deliveryResult.results[0], success: true, historyWarning: messageError(error) };
                    interrupted = false;
                } else {
                    outcome = { success: false, error: messageError(error) };
                    interrupted = error?.safeToRetry !== true;
                }
            }
            outcome = {
                ...outcome,
                charge_type: message.charge_type,
                recipient: message.to,
                laboratory_name: message.contact.laboratory_name,
                uncertain: interrupted
            };
            results.push(outcome);
            plan.current += 1;
            if (outcome.success) plan.sent += 1;
            else if (interrupted) plan.uncertain += 1;
            else plan.failed += 1;

            try {
                if (interrupted) {
                    runs.updateItemStatus(run.id, item.id, "sending", outcome.error || "Resultado incerto. Confira SMTP e histórico antes de reenviar.");
                } else {
                    runs.updateItemStatus(run.id, item.id, outcome.success ? "sent" : "failed", outcome.success ? null : outcome.error);
                }
            } catch (error) {
                outcome.historyWarning = messageError(error);
                throw new Error("Falha ao registrar o resultado. Os contadores de envio foram preservados; confira SMTP e histórico antes de reenviar.");
            }
            if (outcome.historyWarning) throw new Error("Envio realizado, mas a reserva não pôde ser finalizada. Confira o histórico antes de reenviar.");
            if (interrupted) throw new Error("Resultado de envio incerto. Execução interrompida para revisão; não reenviar automaticamente.");
        }
        finalRun = execution.finishRun(run.id, Boolean(plan.cancelRequested));
    } catch (error) {
        failure = messageError(error);
        if (run) {
            try { finalRun = execution.interruptRun(run.id, failure); }
            catch (historyError) { failure += ` Falha ao persistir interrupção: ${messageError(historyError)}`; }
        }
    } finally {
        plan.finishedAt = now();
        plan.currentLaboratory = "";
        plan.lastError = failure;
    }

    const cancellation = Boolean(plan.cancelRequested);
    const persistedStatus = finalRun?.status;
    return {
        success: !failure && !cancellation && plan.sent === plan.messages.length &&
            plan.failed === 0 && plan.uncertain === 0 && results.every(result => !result.historyWarning),
        cancelled: cancellation,
        cancelledCount: Number(finalRun?.cancelled || 0),
        run_id: run?.id || null,
        favorite_id: plan.favorite.id,
        favorite_name: plan.favorite.name,
        recipient: "Cobrança por favorito",
        sent: plan.sent,
        expected: plan.messages.length,
        processed: plan.current,
        failed: plan.failed,
        uncertain: plan.uncertain,
        ignored: Number(finalRun?.ignored || 0),
        status: persistedStatus || (failure ? "interrupted" : cancellation ? "cancelled" : "completed"),
        error: failure,
        startedAt: plan.startedAt,
        finishedAt: plan.finishedAt,
        results
    };
}

module.exports = { executeCharge };
