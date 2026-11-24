const abs = (value) => value < 0n ? -value : value;
export function suggestPurchaseControl({ group, report, branch, blocked = "" }) {
    const candidates = (report?.rows || []).filter((row) => group.code && row.branch === branch && row.normalizedCode === group.code)
        .map((row) => ({ row, available: row.pending, distance: abs(row.pending - group.total) }))
        .sort((a, b) => {
            if ((a.available > 0n) !== (b.available > 0n)) return a.available > 0n ? -1 : 1;
            if (a.distance !== b.distance) return a.distance < b.distance ? -1 : 1;
            return String(a.row.control).localeCompare(String(b.row.control));
        });
    const issue = group.error || blocked || (group.total <= 0n ? "Quantidade da NF deve ser maior que zero." : "");
    if (issue) return { candidates, best: null, tied: [], issue, relation: "blocked", difference: null };
    const availableRows = candidates.filter((candidate) => candidate.available > 0n);
    if (!availableRows.length) return { candidates, best: null, tied: [], issue: "", relation: "missing", difference: null };
    const tied = availableRows.filter((candidate) => candidate.distance === availableRows[0].distance);
    if (tied.length > 1) return { candidates, best: null, tied, issue: "", relation: "tie", difference: null };
    const best = tied[0], difference = best.available - group.total;
    return { candidates, best, tied: [], issue: "", relation: difference === 0n ? "exact" : difference < 0n ? "lower" : "higher", difference };
}
