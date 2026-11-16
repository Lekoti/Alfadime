const fs = require("node:fs");
const XLSX = require("xlsx");

const {
    parseWorkbook,
    dateOnly
} = require("./commercial-policy.service");

const {
    listRows,
    getIndustryGlobalCodeMap,
    applyExternalCellUpdate
} = require("./price-pending.repository");

const {
    getPricePendingDatabase
} = require("./price-pending.database");

const VALID_BRANCHES = new Set(["DPR", "AMS", "DMT", "DMS", "DSC"]);

function normalizeCode(value) {
    const text = String(value ?? "").trim();
    return /^\d+$/.test(text) ? text.replace(/^0+(?=\d)/, "") : "";
}

function parseObject(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value;
    }
    try {
        const parsed = JSON.parse(String(value || "{}"));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function storedDate(value) {
    const text = String(value ?? "").trim().replace(/^Atualizado\s*/i, "");
    const monthYear = text.match(/^(\d{1,2})\/(\d{4})$/);
    if (monthYear) {
        const month = Number(monthYear[1]);
        const year = Number(monthYear[2]);
        if (month < 1 || month > 12 || year < 1000) return "";
        const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
        return `${year}-${String(month).padStart(2, "0")}-${day}`;
    }
    return dateOnly(text);
}

function formatDate(value) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

function processingDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function groupRecords(records) {
    const groups = new Map();
    for (const record of records) {
        const globalCode = normalizeCode(record.globalLabCode);
        const validity = dateOnly(record.validity);
        if (!globalCode || globalCode === "0" || !VALID_BRANCHES.has(record.branch) || !validity) {
            throw new Error("Registro inválido após a validação da planilha de preços.");
        }
        const key = `${globalCode}:${record.branch}`;
        if (!groups.has(key)) {
            groups.set(key, { globalCode, branch: record.branch, validity, records: 0 });
        }
        const group = groups.get(key);
        if (group.validity !== validity) {
            throw new Error(
                `Validades divergentes para indústria ${globalCode}, filial ${record.branch}. ` +
                "Nenhuma atualização deste arquivo foi aplicada."
            );
        }
        group.records += 1;
    }
    return [...groups.values()];
}

function processPriceFile(file) {
    const before = fs.statSync(file.path);
    const buffer = fs.readFileSync(file.path);
    const after = fs.statSync(file.path);
    if (
        before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
        before.size !== file.fileSize || Math.floor(before.mtimeMs) !== file.fileMtimeMs
    ) {
        throw new Error("Arquivo de preços alterado durante a leitura. Tente novamente após concluir a gravação.");
    }

    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const parsed = parseWorkbook(workbook, {
        fileName: file.name,
        fileModifiedAt: before.mtime.toISOString(),
        readAt: new Date().toISOString(),
        mtimeMs: before.mtimeMs
    });
    if (!parsed.valid || parsed.issues.length) {
        const first = parsed.issues[0];
        const detail = first ? `${first.message} Aba: ${first.sheetName || "-"}; linha: ${first.line || "-"}.` : "Cabeçalhos obrigatórios não encontrados.";
        throw new Error(`Arquivo de preços fora do padrão: ${file.name}. ${detail} Nenhuma atualização deste arquivo foi aplicada.`);
    }
    if (!parsed.records.length) {
        throw new Error(`Arquivo de preços sem registros válidos: ${file.name}.`);
    }

    const groups = groupRecords(parsed.records);
    getIndustryGlobalCodeMap({ forceRefresh: true });
    const rows = listRows();
    const rowsByCode = new Map();
    for (const row of rows) {
        const code = normalizeCode(row.industry_global_code);
        if (!code || code === "0") continue;
        if (!rowsByCode.has(code)) rowsByCode.set(code, []);
        rowsByCode.get(code).push(row);
    }
    const plans = groups.map((group) => {
        const matches = rowsByCode.get(group.globalCode) || [];
        if (matches.length !== 1) {
            throw new Error(
                `Indústria ${group.globalCode}: ${matches.length ? "mais de um cadastro corresponde ao código global" : "código global não encontrado na tabela"}. ` +
                "Nenhuma atualização deste arquivo foi aplicada. Confira os cadastros."
            );
        }
        return { ...group, rowId: matches[0].id };
    });

    const database = getPricePendingDatabase();
    const received = processingDate();
    let updated = 0;
    let skipped = 0;
    let queued = 0;

    database.transaction(() => {
        for (const plan of plans) {
            const suffix = plan.branch.toLowerCase();
            const priceColumn = `precos_ok_${suffix}`;
            const receiptColumn = `env_precos_${suffix}`;
            const current = database.prepare(`
                SELECT id, manual_cells, pending_external_updates,
                    "${priceColumn}" AS price_value,
                    "${receiptColumn}" AS receipt_value
                FROM price_pending_rows
                WHERE id = ? AND active = 1
            `).get(plan.rowId);
            if (!current) throw new Error("Cadastro alterado durante a atualização de preços. Tente novamente.");
            const pending = parseObject(current.pending_external_updates);
            const currentValidity = storedDate(current.price_value);
            const pendingValidity = storedDate(pending[priceColumn]?.value);
            if (currentValidity > plan.validity || pendingValidity > plan.validity) {
                skipped += 1;
                continue;
            }

            const value = formatDate(plan.validity);
            const manual = parseObject(current.manual_cells);
            const pendingValue = pending[priceColumn]?.value;
            const needsPriceUpdate = manual[priceColumn] && String(current.price_value ?? "").trim()
                ? pendingValue !== value && (current.price_value !== value || Boolean(pending[priceColumn]))
                : current.price_value !== value || Boolean(pending[priceColumn]);

            if (needsPriceUpdate) {
                const result = applyExternalCellUpdate({
                    id: plan.rowId, column: priceColumn, value,
                    fileName: file.name, fileMtimeMs: file.fileMtimeMs
                });
                updated += 1;
                if (result.externalUpdatePending) queued += 1;
            }

            const receiptValue = formatDate(received);
            const pendingReceiptValue = pending[receiptColumn]?.value;
            const needsReceiptUpdate = manual[receiptColumn] && String(current.receipt_value ?? "").trim()
                ? pendingReceiptValue !== receiptValue && (current.receipt_value !== receiptValue || Boolean(pending[receiptColumn]))
                : current.receipt_value !== receiptValue || Boolean(pending[receiptColumn]);
            if (needsReceiptUpdate) {
                const result = applyExternalCellUpdate({
                    id: plan.rowId, column: receiptColumn, value: formatDate(received),
                    fileName: file.name, fileMtimeMs: file.fileMtimeMs
                });
                updated += 1;
                if (result.externalUpdatePending) queued += 1;
            }
        }
    }).immediate();

    return {
        processed: true,
        fileName: file.name,
        type: "prices",
        source: "workbook-content-v1",
        rows: new Set(plans.map((plan) => plan.rowId)).size,
        branches: [...new Set(plans.map((plan) => plan.branch))],
        records: parsed.records.length,
        groups: plans.length,
        updatedCells: updated,
        pendingCells: queued,
        skippedOlderGroups: skipped,
        fileMtimeMs: file.fileMtimeMs
    };
}

module.exports = { processPriceFile };
