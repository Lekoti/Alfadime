const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const {
    listRows,
    applyExternalCellUpdate
} = require("./price-pending.repository");

const {
    getPricePendingDatabase
} = require("./price-pending.database");

const {
    getFoldersConfig,
    DEFAULT_FOLDERS
} = require("./price-pending-folders-config.repository");

function getFolders() {
    try {
        return getFoldersConfig();
    } catch (error) {
        console.error(
            "[PricePending] Erro ao ler configuracao de pastas. Usando padrao.",
            error.message
        );

        return DEFAULT_FOLDERS;
    }
}

const BRANCHES = [
    "DPR",
    "AMS",
    "DMT",
    "DMS",
    "DSC"
];

const FILE_MONTHS = {
    JANEIRO: 1,
    FEVEREIRO: 2,
    MARCO: 3,
    ABRIL: 4,
    MAIO: 5,
    JUNHO: 6,
    JULHO: 7,
    AGOSTO: 8,
    SETEMBRO: 9,
    OUTUBRO: 10,
    NOVEMBRO: 11,
    DEZEMBRO: 12
};

const REFRESH_LOCK_KEY =
    "price-pending-manual-refresh";

const REFRESH_LOCK_DURATION_MS =
    5 * 60 * 1000;

function normalize(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/\.XLSX$|\.XLSM$|\.XLS$/g, "")
        .replace(/[^A-Z0-9]+/g, " ")
        .trim();
}

function getFileType(fileName) {
    const normalizedName = normalize(fileName);

    if (
        normalizedName.includes("PRECOS") ||
        normalizedName.includes("PRECO")
    ) {
        return "prices";
    }

    if (
        normalizedName.includes("PENDENCIAS") ||
        normalizedName.includes("PENDENCIA")
    ) {
        return "pending";
    }

    return null;
}

function getBranch(fileName) {
    const words = normalize(fileName).split(" ");

    return BRANCHES.find((branch) => {
        return words.includes(branch);
    }) || null;
}

function getFileMonth(fileName) {
    const normalizedName = normalize(fileName);
    const words = normalizedName.split(" ");

    const monthEntry = Object.entries(FILE_MONTHS)
        .find(([monthName]) => {
            return words.includes(monthName);
        });

    return monthEntry
        ? Number(monthEntry[1])
        : null;
}

function getFileYear(fileName, fileMtimeMs) {
    const normalizedName = normalize(fileName);

    const yearMatch = normalizedName.match(
        /(?:^|[^0-9])(20[0-9]{2})(?:$|[^0-9])/
    );

    if (yearMatch) {
        return Number(yearMatch[1]);
    }

    const fileDate = new Date(Number(fileMtimeMs));

    if (Number.isNaN(fileDate.getTime())) {
        throw new Error(
            "Data de modificação do arquivo inválida."
        );
    }

    return new Date().getFullYear();
}

function getFileDateParts(fileName, fileMtimeMs) {
    const fileDate = new Date(Number(fileMtimeMs));

    if (Number.isNaN(fileDate.getTime())) {
        throw new Error(
            "Data de modificação do arquivo inválida."
        );
    }

    const month = getFileMonth(fileName);

    if (!month) {
        throw new Error(
            "Mês não identificado no nome do arquivo."
        );
    }

    const day = fileDate.getDate();
    const year = getFileYear(
        fileName,
        fileMtimeMs
    );

    const formattedDay = String(day).padStart(2, "0");
    const formattedMonth = String(month).padStart(2, "0");

    return {
        day,
        month,
        year,
        value:
            `${formattedDay}/${formattedMonth}/${year}`
    };
}

function formatFileModificationDate(
    fileName,
    fileMtimeMs
) {
    return getFileDateParts(
        fileName,
        fileMtimeMs
    ).value;
}

function getLaboratoryName(row) {
    return normalize(row.laboratory)
        .replace(/^#\s*/, "")
        .replace(/(?:\s*-\s*|\s+)\d+\s*$/, "")
        .trim();
}

function findMatchingRows(fileName) {
    const normalizedFileName = normalize(fileName);
    const rows = listRows();

    return rows.filter((row) => {
        const laboratoryName = getLaboratoryName(row);

        return laboratoryName &&
            normalizedFileName.includes(laboratoryName);
    });
}

function getColumns(type, branch) {
    const branches = branch
        ? [branch]
        : BRANCHES;

    const columns = [];

    for (const currentBranch of branches) {
        const suffix = currentBranch.toLowerCase();

        if (type === "prices") {
            columns.push(
                `env_precos_${suffix}`,
                `precos_ok_${suffix}`
            );
        }

        if (type === "pending") {
            columns.push(
                `env_pend_${suffix}`,
                `pendencias_ok_${suffix}`
            );
        }
    }

    return columns;
}

function ensureRefreshControlTables(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS price_pending_processed_files (
            id TEXT PRIMARY KEY,
            file_path TEXT NOT NULL UNIQUE,
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            file_mtime_ms INTEGER NOT NULL,
            signature TEXT NOT NULL,
            processed_at TEXT NOT NULL,
            processed_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS
        idx_price_pending_processed_files_signature
        ON price_pending_processed_files (signature);

        CREATE TABLE IF NOT EXISTS price_pending_refresh_locks (
            lock_key TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL,
            owner_name TEXT,
            acquired_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS
        idx_price_pending_refresh_locks_expires_at
        ON price_pending_refresh_locks (expires_at);

        CREATE TABLE IF NOT EXISTS price_pending_updates (
            id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            finished_at TEXT NOT NULL,
            prices_found INTEGER NOT NULL DEFAULT 0,
            pending_found INTEGER NOT NULL DEFAULT 0,
            processed_count INTEGER NOT NULL DEFAULT 0,
            ignored_count INTEGER NOT NULL DEFAULT 0,
            failed_count INTEGER NOT NULL DEFAULT 0,
            executed_by TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS
        idx_price_pending_updates_started_at
        ON price_pending_updates (started_at);
    `);
}

function getFileSignature(filePath) {
    const stats = fs.statSync(filePath);

    return {
        fileSize: stats.size,
        fileMtimeMs: Math.floor(stats.mtimeMs),
        signature:
            `${stats.size}-${Math.floor(stats.mtimeMs)}`
    };
}

function listExcelFiles(folderPath) {
    if (!fs.existsSync(folderPath)) {
        throw new Error(
            `Pasta não encontrada: ${folderPath}`
        );
    }

    return fs
        .readdirSync(folderPath, {
            withFileTypes: true
        })
        .filter((entry) => {
            return entry.isFile() &&
                /\.(xlsx|xlsm|xls)$/i.test(entry.name);
        })
        .map((entry) => {
            const filePath = path.join(
                folderPath,
                entry.name
            );

            const signature =
                getFileSignature(filePath);

            return {
                name: entry.name,
                path: filePath,
                ...signature
            };
        });
}

function getProcessedFile(database, filePath) {
    return database
        .prepare(`
            SELECT
                id,
                signature
            FROM price_pending_processed_files
            WHERE file_path = ?
            LIMIT 1
        `)
        .get(filePath);
}

function wasFileAlreadyProcessed(database, file) {
    const saved = getProcessedFile(
        database,
        file.path
    );

    return Boolean(
        saved &&
        saved.signature === file.signature
    );
}

function saveProcessedFile(
    database,
    file,
    type,
    ownerId
) {
    const now = new Date().toISOString();

    const existing = getProcessedFile(
        database,
        file.path
    );

    if (existing) {
        database
            .prepare(`
                UPDATE price_pending_processed_files
                SET
                    file_name = ?,
                    file_type = ?,
                    file_size = ?,
                    file_mtime_ms = ?,
                    signature = ?,
                    processed_at = ?,
                    processed_by = ?,
                    updated_at = ?
                WHERE file_path = ?
            `)
            .run(
                file.name,
                type,
                file.fileSize,
                file.fileMtimeMs,
                file.signature,
                now,
                ownerId,
                now,
                file.path
            );

        return;
    }

    database
        .prepare(`
            INSERT INTO price_pending_processed_files (
                id,
                file_path,
                file_name,
                file_type,
                file_size,
                file_mtime_ms,
                signature,
                processed_at,
                processed_by,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
            crypto.randomUUID(),
            file.path,
            file.name,
            type,
            file.fileSize,
            file.fileMtimeMs,
            file.signature,
            now,
            ownerId,
            now,
            now
        );
}

function acquireRefreshLock(database, ownerId) {
    const now = new Date();
    const nowIso = now.toISOString();

    const expiresAt = new Date(
        now.getTime() + REFRESH_LOCK_DURATION_MS
    ).toISOString();

    database
        .prepare(`
            DELETE FROM price_pending_refresh_locks
            WHERE expires_at <= ?
        `)
        .run(nowIso);

    const existingLock = database
        .prepare(`
            SELECT
                owner_id,
                owner_name,
                acquired_at,
                expires_at
            FROM price_pending_refresh_locks
            WHERE lock_key = ?
            LIMIT 1
        `)
        .get(REFRESH_LOCK_KEY);

    if (existingLock) {
        return {
            acquired: false,
            lock: existingLock
        };
    }

    database
        .prepare(`
            INSERT INTO price_pending_refresh_locks (
                lock_key,
                owner_id,
                owner_name,
                acquired_at,
                expires_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(
            REFRESH_LOCK_KEY,
            ownerId,
            appOwnerName(),
            nowIso,
            expiresAt,
            nowIso
        );

    return {
        acquired: true,
        expiresAt
    };
}

function releaseRefreshLock(database, ownerId) {
    database
        .prepare(`
            DELETE FROM price_pending_refresh_locks
            WHERE lock_key = ?
              AND owner_id = ?
        `)
        .run(
            REFRESH_LOCK_KEY,
            ownerId
        );
}

function appOwnerName() {
    return process.env.COMPUTERNAME ||
        process.env.HOSTNAME ||
        "computador";
}

function processCurrentFile(file, expectedType) {
    const fileType = getFileType(file.name);

    if (fileType !== expectedType) {
        return {
            processed: false,
            fileName: file.name,
            reason: "tipo_incompativel"
        };
    }

    const rows = findMatchingRows(file.name);

    if (!rows.length) {
        return {
            processed: false,
            fileName: file.name,
            reason: "laboratorio_nao_encontrado"
        };
    }

    const branch = getBranch(file.name);
    const columns = getColumns(
        fileType,
        branch
    );

    const fileDate = getFileDateParts(
        file.name,
        file.fileMtimeMs
    );

    for (const row of rows) {
        for (const column of columns) {
            applyExternalCellUpdate({
                id: row.id,
                column,
                value: fileDate.value,
                fileName: file.name,
                fileMtimeMs: file.fileMtimeMs
            });
        }
    }

    return {
        processed: true,
        fileName: file.name,
        type: fileType,
        branch,
        value: fileDate.value,
        fileDate,
        fileMtimeMs: file.fileMtimeMs,
        rows: rows.length,
        columns
    };
}

function refreshFromFolders() {
    const database = getPricePendingDatabase();
    const ownerId = crypto.randomUUID();

    ensureRefreshControlTables(database);

    const lockResult = acquireRefreshLock(
        database,
        ownerId
    );

    if (!lockResult.acquired) {
        const expiresAt = lockResult.lock?.expires_at
            ? new Date(
                lockResult.lock.expires_at
            ).toLocaleTimeString("pt-BR")
            : "em breve";

        return {
            success: false,
            code: "REFRESH_IN_PROGRESS",
            message:
                "Outra atualização de Preços e Pendências " +
                "está em andamento em outro computador. " +
                "Tente novamente em alguns instantes.",
            lockedBy:
                lockResult.lock?.owner_name ||
                "outro computador",
            expiresAt
        };
    }

    try {
        const priceFiles = listExcelFiles(
            getFolders().prices
        );

        const pendingFiles = listExcelFiles(
            getFolders().pending
        );

        const allFiles = [
            ...priceFiles.map((file) => {
                return {
                    ...file,
                    expectedType: "prices"
                };
            }),
            ...pendingFiles.map((file) => {
                return {
                    ...file,
                    expectedType: "pending"
                };
            })
        ];

        const results = [];
        let newFiles = 0;
        let changedFiles = 0;
        let alreadyProcessed = 0;
        let failures = 0;

        for (const file of allFiles) {
            const previous = getProcessedFile(
                database,
                file.path
            );

            if (wasFileAlreadyProcessed(database, file)) {
                alreadyProcessed += 1;

                results.push({
                    processed: false,
                    fileName: file.name,
                    reason: "ja_processado"
                });

                continue;
            }

            if (previous) {
                changedFiles += 1;
            } else {
                newFiles += 1;
            }

            try {
                const result = processCurrentFile(
                    file,
                    file.expectedType
                );

                results.push(result);

                if (result.processed) {
                    saveProcessedFile(
                        database,
                        file,
                        file.expectedType,
                        ownerId
                    );
                }
            } catch (error) {
                failures += 1;

                results.push({
                    processed: false,
                    fileName: file.name,
                    reason: "erro_processamento",
                    error: String(
                        error?.message ||
                        "Falha desconhecida."
                    )
                });
            }
        }

        const processed = results.filter((item) => {
            return item.processed;
        });

        const ignored = results.filter((item) => {
            return !item.processed;
        });

        return {
            success: true,
            pricesFound: priceFiles.length,
            pendingFound: pendingFiles.length,
            filesFound: allFiles.length,
            newFiles,
            changedFiles,
            alreadyProcessed,
            processed: processed.length,
            failures,
            ignored,
            details: results
        };
    } finally {
        releaseRefreshLock(
            database,
            ownerId
        );
    }
}

class PricePendingFileMonitor {
    start() {
        console.log(
            "Monitor automático de Preços e Pendências desativado."
        );
    }

    stop() {
        console.log(
            "Monitor automático de Preços e Pendências permanece desativado."
        );
    }
}

module.exports = {
    PricePendingFileMonitor,
    getFolders,
    refreshFromFolders
};