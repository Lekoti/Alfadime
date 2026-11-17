$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
if (!(Test-Path (Join-Path $root "package.json"))) { throw "Execute na raiz do projeto Alfadime." }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$planned = @{}
function Replace-Required([string]$text, [string]$old, [string]$new, [string]$label) {
    if (!$text.Contains($old)) { throw "Codigo diferente do revisado: $label. Nenhum arquivo foi aplicado." }
    return $text.Replace($old, $new)
}

$relative = 'src/main/modules/industry-contacts/contacts-charge-favorites.service.js'
$file = Join-Path $root $relative
if (!(Test-Path $file)) { throw "Arquivo ausente: $relative" }
$text = [IO.File]::ReadAllText($file).Replace("`r`n", "`n")
$old = @'
function prepareFixedCharge(payload = {}) {
'@
$new = @'
async function prepareFixedCharge(payload = {}) {
'@
$text = Replace-Required $text $old $new '$path : 1'
$old = @'
function prepareFavoriteCharge(payload = {}) {
'@
$new = @'
async function prepareFavoriteCharge(payload = {}) {
'@
$text = Replace-Required $text $old $new '$path : 2'
$old = @'
function reportProgress(payload, data) {
'@
$new = @'
async function reportProgress(payload, data) {
'@
$text = Replace-Required $text $old $new '$path : 3'
$old = @'
        try { payload.onProgress(data); } catch (_) { /* ignora falha de progresso */ }
'@
$new = @'
        payload.onProgress(data);
'@
$text = Replace-Required $text $old $new '$path : 4'
$old = @'
    }
}

function validateAttachment
'@
$new = @'
    }
    await new Promise(resolve => setImmediate(resolve));
    if (typeof payload?.shouldCancel === "function" && payload.shouldCancel()) {
        throw new Error("Preparação cancelada pelo usuário.");
    }
}

function validateAttachment
'@
$text = Replace-Required $text $old $new '$path : 5'
$old = @'
reportProgress(payload, {
'@
$new = @'
await reportProgress(payload, {
'@
$text = Replace-Required $text $old $new '$path : 6'
$old = @'
        plan.current = index + 1;
'@
$new = @'
        plan.current = index;
'@
$text = Replace-Required $text $old $new '$path : 7'
$old = @'
    plan.finishedAt = now();
'@
$new = @'
    plan.current = results.length;
    plan.finishedAt = now();
'@
$text = Replace-Required $text $old $new '$path : 8'
$old = @'
    let sent = 0;
'@
$new = @'
    let sent = 0;
    plan.sent = 0;
    plan.failed = 0;
'@
$text = Replace-Required $text $old $new '$path : 9'
$old = @'
            sent += result.sent;
'@
$new = @'
            sent += result.sent;
            plan.sent = sent;
'@
$text = Replace-Required $text $old $new '$path : 10'
$old = @'
        }
    }

    if (plan.cancelRequested) {
'@
$new = @'
        }
        plan.current = index + 1;
        plan.failed = results.filter(item => !item.success).length;
    }

    if (plan.cancelRequested) {
'@
$text = Replace-Required $text $old $new '$path : 12'
$old = @'
        total,
        current,
'@
$new = @'
        total,
        current,
        sent: Number(plan.sent || 0),
        failed: Number(plan.failed || 0),
'@
$text = Replace-Required $text $old $new '$path : 13'
$old = @'
            fingerprints.set(attachment.path, fingerprint(attachment.path));
'@
$new = @'
            if (!fingerprints.has(attachment.path)) {
                fingerprints.set(attachment.path, fingerprint(attachment.path));
            }
'@
$text = Replace-Required $text $old $new '$path : 14'
$planned[$relative] = $text

$relative = 'src/main/modules/price-pending/price-pending-automatic-charge.service.js'
$file = Join-Path $root $relative
if (!(Test-Path $file)) { throw "Arquivo ausente: $relative" }
$text = [IO.File]::ReadAllText($file).Replace("`r`n", "`n")
$startMarker = '        heartbeat = globalThis.setInterval(() => {'
$endMarker = '        progressTimer = globalThis.setInterval(async () => {'
$start = $text.IndexOf($startMarker)
$end = $text.IndexOf($endMarker)
if ($start -lt 0 -or $end -le $start) { throw "Heartbeat diferente do revisado. Nenhuma alteracao aplicada." }
$text = $text.Remove($start, $end - $start)
$old = @'
let activePreview = null;
'@
$new = @'
let activePreview = null;
let cancelRequested = false;
'@
$text = Replace-Required $text $old $new '$path : 1'
$old = @'
        if (executing || status.running) phase = activePreview ? "sending" : "preparing";
'@
$new = @'
        if (executing) phase = cancelRequested ? "cancelling" : activePreview ? "sending" : "preparing";
        else if (status.running) phase = "interrupted";
'@
$text = Replace-Required $text $old $new '$path : 2'
$old = @'
    const preparation = { ...progress.preparation, percent: preparationPercent(progress.preparation) };
'@
$new = @'
    if (executing && !status.enabled) phase = "cancelling";
    const preparation = { ...progress.preparation, percent: preparationPercent(progress.preparation) };
'@
$text = Replace-Required $text $old $new '$path : 3'
$old = @'
    if (!enabled && (executing || status.running)) {
        throw new Error("Não é possível desativar durante a preparação ou envio. Aguarde a conclusão da cobrança.");
    }
'@
$new = @'
    if (enabled && executing) throw new Error("Aguarde a execução atual terminar antes de reativar.");
    if (!enabled && executing) cancelRequested = true;
'@
$text = Replace-Required $text $old $new '$path : 4'
$old = @'
    executing = true;
'@
$new = @'
    executing = true;
    cancelRequested = false;
'@
$text = Replace-Required $text $old $new '$path : 5'
$old = @'
        progress = {
            total: 0,
'@
$new = @'
        heartbeat = globalThis.setInterval(() => {
            try {
                if (!repository.heartbeat(owner)) {
                    failure = new Error("Bloqueio da automação perdido.");
                    cancelRequested = true;
                }
                if (!repository.getStatus().enabled || stopping) cancelRequested = true;
                if (cancelRequested && activePreview) favoritesService.cancelCharge({ preview_token: activePreview });
            } catch (error) { failure = error; cancelRequested = true; }
        }, 30000);
        progress = {
            total: 0,
'@
$text = Replace-Required $text $old $new '$path : 6'
$old = @'
            favorite_id: favoritesService.FIXED_FAVORITE_ID,
'@
$new = @'
            favorite_id: favoritesService.FIXED_FAVORITE_ID,
            shouldCancel: () => cancelRequested || stopping || Boolean(failure),
'@
$text = Replace-Required $text $old $new '$path : 7'
$old = @'
        if (stopping || !repository.getStatus().enabled) throw new Error("Automação desativada antes do envio.");
'@
$new = @'
        if (cancelRequested || stopping || !repository.getStatus().enabled) throw new Error("Automação desativada antes do envio.");
'@
$text = Replace-Required $text $old $new '$path : 8'
$old = @'
                    preparation: progress.preparation
'@
$new = @'
                    sent: Number(chargeStatus.sent || 0),
                    failed: Number(chargeStatus.failed || 0),
                    preparation: progress.preparation
'@
$text = Replace-Required $text $old $new '$path : 9'
$old = @'
    stopping = true;
'@
$new = @'
    stopping = true;
    cancelRequested = true;
'@
$text = Replace-Required $text $old $new '$path : 10'
$old = @'
return `Preparando cobrança: ${preparation.percent}% concluído — ${preparation.message || "em andamento"}.`;
'@
$new = @'
return preparation.stage === "loading"
                ? "Carregando dados: total ainda não disponível."
                : `Preparação — ${preparation.message || "etapa atual"} ${preparation.percent}% da etapa (${preparation.current}/${preparation.total}).`;
'@
$text = Replace-Required $text $old $new '$path : 11'
$planned[$relative] = $text

$relative = 'src/main/modules/price-pending/price-pending-automatic-charge.repository.js'
$file = Join-Path $root $relative
if (!(Test-Path $file)) { throw "Arquivo ausente: $relative" }
$text = [IO.File]::ReadAllText($file).Replace("`r`n", "`n")
$old = @'
    recoverStaleLock();
'@
$new = @'
    // Não liberar automaticamente uma reserva cujo resultado de envio pode ser incerto.
'@
$text = Replace-Required $text $old $new '$path : 1'
$old = @'
        recovery_required: false,
'@
$new = @'
        recovery_required: Boolean(row.owner && Number(row.lease_until || 0) <= Date.now()),
'@
$text = Replace-Required $text $old $new '$path : 2'
$planned[$relative] = $text

$relative = 'src/renderer/modules/price-pending/components/PricePendingChargePanel.jsx'
$file = Join-Path $root $relative
if (!(Test-Path $file)) { throw "Arquivo ausente: $relative" }
$text = [IO.File]::ReadAllText($file).Replace("`r`n", "`n")
$old = @'
    disabled: "Desativada",
'@
$new = @'
    disabled: "Desativada",
    cancelling: "Cancelamento solicitado",
    interrupted: "Execução anterior pendente de revisão",
'@
$text = Replace-Required $text $old $new '$path : 1'
$old = @'
setMessage(result?.enabled ? "Cobrança automática ativada. Preparando cobrança." : "Cobrança automática desativada.");
'@
$new = @'
setMessage(result?.enabled
                ? result.phase === "waiting" ? "Automação ativada. Aguardando o intervalo configurado." : "Automação ativada. Consulte o status acima."
                : result.phase === "cancelling" ? "Agendamento desativado. Aguardando finalizar a operação atual; novos envios serão interrompidos." : "Cobrança automática desativada.");
'@
$text = Replace-Required $text $old $new '$path : 2'
$old = @'
disabled={!canManage || busy || running} onClick={toggle}
'@
$new = @'
disabled={!canManage || busy || (!status?.enabled && (running || phase === "cancelling" || status?.running))} onClick={toggle}
'@
$text = Replace-Required $text $old $new '$path : 3'
$old = @'
disabled={!canManage || busy || running} onClick={runNow}
'@
$new = @'
disabled={!canManage || busy || running || status?.running || !status?.enabled} onClick={runNow}
'@
$text = Replace-Required $text $old $new '$path : 4'
$old = @'
{phase === "preparing" && preparation.total > 0 && (
'@
$new = @'
{phase === "preparing" && preparation.total > 0 && preparation.stage !== "loading" && (
'@
$text = Replace-Required $text $old $new '$path : 5'
$old = @'
<strong>{preparationPercent}% da preparação concluído</strong> — {preparation.message || "em andamento"}
'@
$new = @'
<strong>{preparationPercent}% da etapa</strong> — {preparation.message || "em andamento"} ({preparation.current || 0}/{preparation.total || 0})
'@
$text = Replace-Required $text $old $new '$path : 6'
$old = @'
{phase === "preparing" && !preparation.total && (
'@
$new = @'
{phase === "preparing" && (!preparation.total || preparation.stage === "loading") && (
'@
$text = Replace-Required $text $old $new '$path : 7'
$old = @'
Iniciando preparação da cobrança...
'@
$new = @'
Carregando dados. O total desta etapa ainda não está disponível; nenhum percentual é estimado.
'@
$text = Replace-Required $text $old $new '$path : 8'
$old = @'
{progress.current || 0} de {progress.total || 0} e-mails enviados
'@
$new = @'
{progress.current || 0} de {progress.total || 0} destinatários processados — {progress.sent || 0} enviados; {progress.failed || 0} falhas
'@
$text = Replace-Required $text $old $new '$path : 9'
$old = @'
                    {status?.last_error && (
'@
$new = @'
                    {phase === "interrupted" && <div className="pp-charge-error" role="alert">Existe uma reserva de execução anterior. Desative o agendamento e confira o histórico e o SMTP antes de autorizar uma recuperação. Nenhum bloqueio será removido automaticamente.</div>}
                    {phase === "cancelling" && <div role="status">Cancelamento solicitado. A operação de rede atual pode precisar terminar antes da parada.</div>}
                    {status?.last_error && (
'@
$text = Replace-Required $text $old $new '$path : 10'
$old = @'
                            <div className={`pp-charge-progress-bar ${phase === "preparing" && !preparation.total ? "pp-charge-progress-indeterminate" : ""}`}>
                                <div
                                    className={`pp-charge-progress-fill ${phase === "preparing" && !preparation.total ? "pp-charge-progress-fill-indeterminate" : ""}`}
                                    style={phase === "preparing" && preparation.total ? { width: `${preparationPercent}%` } : phase === "sending" ? { width: `${percent}%` } : undefined}
                                ></div>
                            </div>
'@
$new = @'
                            {(phase === "sending" || (preparation.total > 0 && preparation.stage !== "loading")) && (
                                <div className="pp-charge-progress-bar" role="progressbar" aria-label={phase === "preparing" ? "Etapa da preparação" : "Destinatários processados"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={phase === "preparing" ? preparationPercent : percent}>
                                    <div className="pp-charge-progress-fill" style={{ width: `${phase === "preparing" ? preparationPercent : percent}%` }}></div>
                                </div>
                            )}
'@
$text = Replace-Required $text $old $new '$path : 11'
$planned[$relative] = $text

$backup = Join-Path $root (".alfadime-backups/cobranca-revisada-" + (Get-Date -Format "yyyyMMdd-HHmmss-fff"))
foreach ($relative in $planned.Keys) {
    $target = Join-Path $backup $relative
    New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $root $relative) -Destination $target
}
try {
    foreach ($relative in $planned.Keys) {
        [IO.File]::WriteAllText((Join-Path $root $relative), $planned[$relative], $utf8)
    }
} catch {
    foreach ($relative in $planned.Keys) {
        Copy-Item -LiteralPath (Join-Path $backup $relative) -Destination (Join-Path $root $relative) -Force
    }
    throw
}
Write-Host "Alterados quatro arquivos; IPC preservado sem mudancas."
Write-Host "Backup: $backup"
Write-Host "Nenhum aplicativo iniciado, nenhum e-mail enviado, nenhum banco alterado por este script."
Write-Host "Revise git diff e execute os testes antes de iniciar o app."
