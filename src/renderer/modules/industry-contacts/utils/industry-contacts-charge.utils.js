export function matchesChargeUpdate(row, filter = "") {
    if (!filter) return true;
    if (filter === "prices_missing") return row.prices_updated === false;
    if (filter === "pending_missing") return row.pending_updated === false;
    if (filter === "both_missing") return row.prices_updated === false && row.pending_updated === false;
    if (filter === "updated") return row.prices_updated === true && row.pending_updated === true;
    return false;
}

export function formatChargeDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
}
