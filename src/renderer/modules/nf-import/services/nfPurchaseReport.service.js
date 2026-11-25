import { REPORT_BRANCHES, MAX_REPORT_BYTES, MAX_REPORT_LINES, OEM850, QUANTITY_SCALE } from "../constants/nfPurchase.constants";
export function normalizeCode(value) {
    const text = String(value ?? "").trim();
    return /^\d{1,20}$/.test(text) ? text.replace(/^0+(?=\d)/, "") : "";
}
function canonicalUnits(value) {
    if (!/^\d+(?:\.\d{1,6})?$/.test(value)) throw new Error("Quantidade inválida; use até seis casas decimais.");
    const [whole, fraction = ""] = value.split(".");
    const units = BigInt(whole) * QUANTITY_SCALE + BigInt(fraction.padEnd(6, "0"));
    if (units > 1000000000000n * QUANTITY_SCALE) throw new Error("Quantidade ultrapassa o limite suportado.");
    return units;
}
export function brUnits(value) {
    const text = String(value ?? "").trim();
    if (text === "-") return 0n;
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,6})?$/.test(text)) throw new Error("Use quantidade brasileira, por exemplo 1.200 ou 12,5.");
    return canonicalUnits(text.replace(/\./g, "").replace(",", "."));
}
export function xmlUnits(value) { return canonicalUnits(String(value ?? "").trim()); }
export function formatUnits(value) {
    if (typeof value !== "bigint") return "—";
    const negative = value < 0n, units = negative ? -value : value;
    const whole = (units / QUANTITY_SCALE).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const fraction = (units % QUANTITY_SCALE).toString().padStart(6, "0").replace(/0+$/, "");
    return `${negative ? "-" : ""}${whole}${fraction ? "," + fraction : ""}`;
}
export function decodeReport(buffer, encoding = "auto") {
    const bytes = new Uint8Array(buffer);
    if (bytes.byteLength > MAX_REPORT_BYTES) throw new Error("Relatório maior que 5 MB.");
    if (encoding === "oem850") return { text: Array.from(bytes, (byte) => byte < 128 ? String.fromCharCode(byte) : OEM850[byte - 128]).join(""), encoding: "OEM 850" };
    if (encoding === "windows-1252") return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "Windows-1252" };
    try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "UTF-8" }; }
    catch (error) {
        if (encoding === "utf-8") throw new Error("Arquivo não é UTF-8 válido. Escolha Windows-1252 ou OEM 850.");
        return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "Windows-1252 (automático)" };
    }
}
export function parsePurchaseReport(input, name = "Texto colado", encoding = "Texto") {
    const text = String(input ?? "").replace(/\uFEFF/g, "").replace(/[\u001a\f]/g, "\n");
    if (new TextEncoder().encode(text).length > MAX_REPORT_BYTES) throw new Error("Relatório maior que 5 MB.");
    const lines = text.split(/\r\n|\n|\r/);
    if (lines.length > MAX_REPORT_LINES) throw new Error("Relatório excede 50.000 linhas.");
    const rows = [], errors = [], branches = new Set(), duplicates = new Set();
    let header = null, pages = 0;
    function error(line, message, content) { errors.push({ line, message, content: content.slice(0, 160) }); }
    lines.forEach((raw, index) => {
        const lineNumber = index + 1, value = raw.trim();
        if (!value) return;
        if (raw.length > 2048) { error(lineNumber, "Linha excede 2.048 caracteres.", value); return; }
        const company = value.match(/\((\d{4})\.(\d{3})\)/);
        if (company) {
            header = { folder: company[1], unit: company[2], branch: REPORT_BRANCHES[company[1]] || "", title: value };
            branches.add(header.folder); pages++;
            if (!header.branch) error(lineNumber, `Filial ${header.folder} não mapeada.`, value);
            return;
        }
        if (/^[-=\s]+$/.test(value) || /^<IQ>/i.test(value) || /^LWHELP\b/i.test(value) || /^PAG\./i.test(value) || /Produto\s+Pendente\s+Ant/i.test(value)) return;
        const fields = raw.match(/^\s*(.+?)\s+([\d.,]{1,40}|-)\s+([\d.,]{1,40}|-)\s+([\d.,]{1,40}|-)\s+([\d.,]{1,40}|-)\s+(\d{1,20})\s+(\d{1,20})\s*$/);
        if (!fields) { error(lineNumber, "Linha não reconhecida; confira o formato antes de vincular.", value); return; }
        if (!header?.branch) { error(lineNumber, "Item sem cabeçalho de filial reconhecido.", value); return; }
        try {
            const [, description, previous, attended, cancelled, pending, code, control] = fields;
            const normalizedCode = normalizeCode(code), controlKey = normalizeCode(control);
            const id = `${header.branch}|${normalizedCode}|${controlKey}`;
            if (duplicates.has(id)) { error(lineNumber, "Código/controle repetido na mesma filial; não será somado automaticamente.", value); return; }
            duplicates.add(id);
            rows.push({ id, line: lineNumber, branch: header.branch, folder: header.folder, unit: header.unit,
                code, normalizedCode, control, description: description.trim(),
                previous: brUnits(previous), attended: brUnits(attended), cancelled: brUnits(cancelled), pending: brUnits(pending) });
        } catch (issue) { error(lineNumber, issue.message, value); }
    });
    if (!rows.length) error(0, "Nenhum item reconhecido no relatório.", "");
    if (branches.size !== 1) {
        error(0, "Importe um relatório de uma única filial por vez. As linhas não serão usadas enquanto houver mais de uma filial.", "");
        rows.length = 0;
    }
    return { name, encoding, rows, errors, branches: [...branches], branch: branches.size === 1 ? rows[0]?.branch || "" : "", pages };
}
