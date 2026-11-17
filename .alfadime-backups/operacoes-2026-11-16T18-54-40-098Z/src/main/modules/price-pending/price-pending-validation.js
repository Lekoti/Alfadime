function validateManualDate(value) {
    const text = String(value ?? "").trim().replace(/^Atualizado\s*/i, "");
    if (!/^\d.*\//.test(text)) return;
    const match = text.match(/^(?:(\d{1,2})\/)?(\d{1,2})\/(\d{4})$/);
    if (!match) throw new Error("Data inválida. Use DD/MM/AAAA ou MM/AAAA.");
    const day = match[1] === undefined ? null : Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (year < 1000 || month < 1 || month > 12 || (day !== null && (day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()))) {
        throw new Error("Data inexistente. Confira o dia, mês e ano.");
    }
}
module.exports = { validateManualDate };
