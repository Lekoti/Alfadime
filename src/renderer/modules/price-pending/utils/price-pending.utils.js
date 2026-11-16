export function getMonthYear(value) {
    const text = String(value ?? "").trim().replace(/^Atualizado\s*/i, "");
    const match = text.match(/^(?:(\d{1,2})\/)?(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const day = match[1] === undefined ? null : Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (year < 1000 || month < 1 || month > 12) return null;
    if (day !== null) {
        const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
        if (day < 1 || day > days) return null;
    }
    return { month, year };
}
export function getPeriodFromValue(value) {
    const parsed = getMonthYear(value);
    return parsed ? parsed.year * 12 + parsed.month : null;
}
export function getCurrentPeriod() {
    const now = new Date();
    return now.getFullYear() * 12 + now.getMonth() + 1;
}
export function getUpdateDateClass(value) {
    const period = getPeriodFromValue(value);
    if (period === null) return "";
    const now = getCurrentPeriod();
    return period < now ? "updated-previous-month" : period > now ? "updated-future-month" : "updated-current-month";
}
export function isUpdatedPeriod(value) {
    const period = getPeriodFromValue(value);
    return period !== null && period >= getCurrentPeriod();
}
export function isOutdatedPeriod(value) {
    if (String(value ?? "").trim() === "") return true;
    const period = getPeriodFromValue(value);
    return period !== null && period < getCurrentPeriod();
}
export function parsePendingExternalUpdates(value) {
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) { return {}; }
}
export function getPendingExternalUpdate(row, column) {
    const update = parsePendingExternalUpdates(row.pending_external_updates)[column];
    return update && typeof update === "object" && !Array.isArray(update) && Object.prototype.hasOwnProperty.call(update, "value") ? update : null;
}
export function isBranchColumn(column, branch) {
    return column.key.endsWith(`_${String(branch).toLowerCase()}`);
}
export function isDatabaseBusyError(failure) {
    const message = String(failure?.message || failure || "").toLowerCase();
    return /sqlite_busy|sqlite_locked|database is locked|database is busy/.test(message);
}
export function getFriendlyErrorMessage(failure, fallback) {
    if (isDatabaseBusyError(failure)) return "Banco compartilhado temporariamente ocupado. O módulo está em modo somente leitura. Clique em Tentar novamente.";
    return fallback;
}
