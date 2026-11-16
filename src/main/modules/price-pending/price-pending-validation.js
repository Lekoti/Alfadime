function parsePeriod(value) {
    const text = String(value ?? "").trim().replace(/^Atualizado\s*/i, "");
    const match = text.match(/^(?:(\d{1,2})\/)?(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const day = match[1] === undefined ? null : Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (year < 1000 || month < 1 || month > 12) return null;
    if (day !== null && (day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate())) return null;
    return { month, year, period: year * 12 + month };
}
function validateManualDate(value) {
    const text = String(value ?? "").trim().replace(/^Atualizado\s*/i, "");
    if (/^\d.*\//.test(text) && !parsePeriod(text)) throw new Error("Data inválida ou inexistente. Use DD/MM/AAAA ou MM/AAAA.");
}
function isUpdatedPeriod(value, now = new Date()) {
    const parsed = parsePeriod(value);
    return parsed !== null && parsed.period >= now.getFullYear() * 12 + now.getMonth() + 1;
}
module.exports = { parsePeriod, validateManualDate, isUpdatedPeriod };
