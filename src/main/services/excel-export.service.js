const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const {
    app,
    dialog
} = require("electron");

function sanitizeFileName(value) {
    return String(value || "EXPORTACAO")
        .replace(/[<>:"/\\|?*]+/g, "-")
        .replace(/\s+/g, "-")
        .trim();
}

function createDefaultFileName(moduleKey) {
    const date = new Date()
        .toISOString()
        .slice(0, 10);

    return [
        sanitizeFileName(moduleKey),
        date
    ].join("-") + ".xlsx";
}

async function exportRowsToExcel({
    moduleKey,
    sheetName,
    columns,
    rows
}) {
    if (!Array.isArray(columns) || !columns.length) {
        throw new Error(
            "Selecione ao menos uma coluna para exportar."
        );
    }

    if (!Array.isArray(rows) || !rows.length) {
        throw new Error(
            "Nao existem dados para exportar."
        );
    }

    const headers = columns.map(
        (column) => column.label
    );

    const data = rows.map((row) => {
        const result = {};

        for (const column of columns) {
            result[column.label] =
                row[column.key] ?? "";
        }

        return result;
    });

    const worksheet = XLSX.utils.json_to_sheet(
        data,
        {
            header: headers
        }
    );

    worksheet["!cols"] = columns.map(
        (column) => ({
            wch: Math.min(
                Math.max(
                    String(column.label).length + 3,
                    Number(column.width) || 18
                ),
                60
            )
        })
    );

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        String(sheetName || "Exportacao")
            .slice(0, 31)
    );

    const result = await dialog.showSaveDialog({
        title: "Exportar Excel",
        defaultPath: path.join(
            app.getPath("documents"),
            createDefaultFileName(moduleKey)
        ),
        filters: [
            {
                name: "Planilha Excel",
                extensions: ["xlsx"]
            }
        ]
    });

    if (result.canceled || !result.filePath) {
        return {
            cancelled: true
        };
    }

    XLSX.writeFile(
        workbook,
        result.filePath
    );

    if (!fs.existsSync(result.filePath)) {
        throw new Error(
            "Nao foi possivel criar o arquivo Excel."
        );
    }

    return {
        cancelled: false,
        filePath: result.filePath,
        totalRows: rows.length
    };
}

module.exports = {
    exportRowsToExcel
};
