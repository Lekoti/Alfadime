export class PricePendingEditJournal {
    constructor() { this.cells = new Map(); this.sequence = 0; }
    key(id, column) { return JSON.stringify([id, column]); }
    get(id, column) { return this.cells.get(this.key(id, column)); }
    write(id, column, value) {
        const entry = { id, column, value: String(value ?? ""), version: ++this.sequence };
        this.cells.set(this.key(id, column), entry);
        return entry;
    }
    removeVersion(id, column, version) {
        const key = this.key(id, column);
        if (this.cells.get(key)?.version === version) this.cells.delete(key);
    }
    removeRow(id) {
        for (const [key, entry] of this.cells) if (entry.id === id) this.cells.delete(key);
    }
    apply(rows) {
        return rows.map(row => {
            const next = { ...row };
            for (const entry of this.cells.values()) if (entry.id === row.id) next[entry.column] = entry.value;
            return next;
        });
    }
    get size() { return this.cells.size; }
}
