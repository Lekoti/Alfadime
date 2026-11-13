const {
    listRows
} = require("./price-pending.repository");

const XLSX = require("xlsx");
const fs = require("node:fs");
const path = require("node:path");

const BRANCHES = ["dpr", "ams", "dmt", "dms", "dsc"];

const COLUMN_GROUPS = {
    env_precos: "Preços Recebidos",
    env_pend: "Pendências Recebidas",
    precos_ok: "Preços Atualizados",
    pendencias_ok: "Pendências Atualizadas"
};

const COLUMN_DEFINITIONS = new Map([
    ["industry_global_code", { label: "Código Global" }],
    ["laboratory", { label: "Laboratórios" }],
    ["observation", { label: "Observação" }]
]);

for (const [group, groupLabel] of Object.entries(COLUMN_GROUPS)) {
    for (const branch of BRANCHES) {
        COLUMN_DEFINITIONS.set(`${group}_${branch}`, {
            label: branch.toUpperCase(),
            group,
            groupLabel
        });
    }
}

function normalizeLaboratory(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();
}

function validateColumns(includeColumns) {
    if (!Array.isArray(includeColumns) || !includeColumns.length) {
        throw new Error("Selecione ao menos uma coluna para exportação.");
    }

    const invalidColumns = includeColumns.filter((column) => {
        return typeof column !== "string" || !COLUMN_DEFINITIONS.has(column);
    });

    if (invalidColumns.length) {
        throw new Error(
            `Colunas inválidas para exportação: ${invalidColumns.map(String).join(", ")}.`
        );
    }

    return [...new Set(includeColumns)];
}

function filterRowsByIds(rows, rowIds) {
    if (rowIds === undefined) {
        return rows;
    }

    if (!Array.isArray(rowIds)) {
        throw new Error("A lista de registros para exportação é inválida.");
    }

    const selectedIds = new Set(rowIds.map((id) => String(id)));

    return rows.filter((row) => selectedIds.has(String(row.id)));
}

function writeWorkbook(filePath, rows, columns) {
    if (typeof filePath !== "string" || !filePath.trim()) {
        throw new Error("Informe um caminho válido para salvar o arquivo Excel.");
    }

    const firstHeader = columns.map((column) => {
        const definition = COLUMN_DEFINITIONS.get(column);
        return definition.groupLabel || definition.label;
    });

    const secondHeader = columns.map((column) => {
        const definition = COLUMN_DEFINITIONS.get(column);
        return definition.group ? definition.label : "";
    });

    const values = rows.map((row) => {
        return columns.map((column) => String(row[column] ?? ""));
    });

    const worksheet = XLSX.utils.aoa_to_sheet([
        firstHeader,
        secondHeader,
        ...values
    ]);

    const merges = [];

    for (let start = 0; start < columns.length;) {
        const definition = COLUMN_DEFINITIONS.get(columns[start]);

        if (!definition.group) {
            merges.push({
                s: { r: 0, c: start },
                e: { r: 1, c: start }
            });
            start += 1;
            continue;
        }

        let end = start;

        while (
            end + 1 < columns.length &&
            COLUMN_DEFINITIONS.get(columns[end + 1]).group === definition.group
        ) {
            end += 1;
        }

        if (end > start) {
            merges.push({
                s: { r: 0, c: start },
                e: { r: 0, c: end }
            });

            for (let index = start + 1; index <= end; index += 1) {
                delete worksheet[XLSX.utils.encode_cell({ r: 0, c: index })];
            }
        }

        start = end + 1;
    }

    worksheet["!merges"] = merges;
    worksheet["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rows.length + 1, c: columns.length - 1 }
    });

    worksheet["!cols"] = columns.map((column, index) => {
        const definition = COLUMN_DEFINITIONS.get(column);
        const minimum = definition.group ? 14 : definition.label.length + 2;
        const width = values.reduce((largest, row) => {
            const length = row[index].split(/\r?\n/).reduce((max, line) => {
                return Math.max(max, line.length);
            }, 0);
            return Math.max(largest, length + 2);
        }, minimum);

        return { wch: Math.min(width, 55) };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Preços e Pendências");

    const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "buffer"
    });

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, excelBuffer);
}

function exportToExcel({
    filePath,
    includeColumns = [...COLUMN_DEFINITIONS.keys()],
    rowIds
} = {}) {
    const columns = validateColumns(includeColumns);
    const allRows = listRows();

    if (!allRows.length) {
        throw new Error("Nenhuma linha encontrada para exportação.");
    }

    const rows = filterRowsByIds(allRows, rowIds);

    if (!rows.length) {
        throw new Error("Nenhum registro encontrado para exportação com os filtros atuais.");
    }

    writeWorkbook(filePath, rows, columns);

    return {
        success: true,
        filePath,
        rows: rows.length,
        columns: columns.length
    };
}

function exportToExcelByLaboratory({ filePath, laboratory } = {}) {
    const normalizedLaboratory = normalizeLaboratory(laboratory);

    if (!normalizedLaboratory) {
        throw new Error("Laboratório obrigatório para exportação.");
    }

    const rows = listRows().filter((row) => {
        return normalizeLaboratory(row.laboratory) === normalizedLaboratory;
    });

    if (!rows.length) {
        throw new Error(`Nenhuma linha encontrada para o laboratório: ${laboratory}`);
    }

    const columns = [...COLUMN_DEFINITIONS.keys()];
    writeWorkbook(filePath, rows, columns);

    return {
        success: true,
        filePath,
        rows: rows.length,
        columns: columns.length
    };
}

module.exports = {
    exportToExcel,
    exportToExcelByLaboratory
};
