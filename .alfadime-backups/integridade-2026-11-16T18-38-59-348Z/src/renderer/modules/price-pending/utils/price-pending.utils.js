export function getMonthYear(value) {
    if (!value) {
        return null;
    }

    const text = String(value).trim();

    const fullDate = text.match(
        /^(?:Atualizado\s*)?\d{1,2}\/(\d{1,2})\/(\d{4})$/i
    );

    if (fullDate) {
        return {
            month: Number(fullDate[1]),
            year: Number(fullDate[2])
        };
    }

    const monthYear = text.match(
        /^(?:Atualizado\s*)?(\d{1,2})\/(\d{4})$/i
    );

    if (monthYear) {
        return {
            month: Number(monthYear[1]),
            year: Number(monthYear[2])
        };
    }

    return null;
}


export function getUpdateDateClass(value) {
    const parsed = getMonthYear(value);

    if (!parsed) {
        return "";
    }

    const today = new Date();
    const currentPeriod =
        today.getFullYear() * 12 +
        (today.getMonth() + 1);

    const updatePeriod =
        parsed.year * 12 +
        parsed.month;

    if (updatePeriod < currentPeriod) {
        return "updated-previous-month";
    }

    if (updatePeriod > currentPeriod) {
        return "updated-future-month";
    }

    return "updated-current-month";
}


export function parsePendingExternalUpdates(value) {
    let updates = value;

    if (typeof updates === "string") {
        try {
            updates = JSON.parse(updates);
        } catch {
            return {};
        }
    }

    if (
        !updates ||
        typeof updates !== "object" ||
        Array.isArray(updates)
    ) {
        return {};
    }

    return updates;
}


export function getPendingExternalUpdate(row, column) {
    const updates = parsePendingExternalUpdates(
        row.pending_external_updates
    );

    const update = updates[column];

    if (
        !update ||
        typeof update !== "object" ||
        Array.isArray(update) ||
        !Object.prototype.hasOwnProperty.call(update, "value")
    ) {
        return null;
    }

    return update;
}


export function getPeriodFromValue(value) {
    const parsed = getMonthYear(value);

    if (!parsed || parsed.month < 1 || parsed.month > 12) {
        return null;
    }

    return parsed.year * 12 + parsed.month;
}


export function getCurrentPeriod() {
    const today = new Date();

    return today.getFullYear() * 12 + (today.getMonth() + 1);
}


export function isUpdatedPeriod(value) {
    const period = getPeriodFromValue(value);

    return period !== null && period >= getCurrentPeriod();
}


export function isOutdatedPeriod(value) {
    const period = getPeriodFromValue(value);

    return period !== null && period < getCurrentPeriod();
}


export function isBranchColumn(column, branch) {
    return column.key.endsWith(
        `_${branch.toLowerCase()}`
    );
}


export function isDatabaseBusyError(anError) {
    const message = String(
        anError?.message || anError || ""
    ).toLowerCase();

    return (
        message.includes("sqlite_busy") ||
        message.includes("sqlite_locked") ||
        message.includes("database is locked") ||
        message.includes("database is busy") ||
        message.includes("locked") ||
        message.includes("busy")
    );
}


export function getFriendlyErrorMessage(
    anError,
    fallbackMessage
) {
    if (isDatabaseBusyError(anError)) {
        return (
            "Banco compartilhado está temporariamente ocupado ou " +
            "indisponível. O módulo está em modo somente leitura. " +
            "Clique em “Tentar novamente” em alguns instantes."
        );
    }

    return fallbackMessage;
}
