const { getPricePendingDatabase } = require("./price-pending.database");
const crypto = require("node:crypto");

// Tempo que o lock fica valido (5 minutos)
const LOCK_EXPIRY_MS = 5 * 60 * 1000;

// Identificador unico deste PC (hostname + PID)
const LOCK_OWNER_ID = `${require("node:os").hostname()}-${process.pid}`;

/**
 * Tenta adquirir o lock exclusivo para atualizacao de precos e pendencias.
 * @returns {{ success: boolean, locked: boolean, message?: string, expiresAt?: string }}
 */
function acquireLock() {
    const database = getPricePendingDatabase();
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + LOCK_EXPIRY_MS).toISOString();

    try {
        // Verifica estado atual do lock
        const current = database
            .prepare("SELECT locked_by, locked_at, expires_at FROM price_pending_lock WHERE id = 1")
            .get();

        if (!current) {
            // Tabela vazia ou nao inicializada
            return {
                success: false,
                locked: false,
                message: "Tabela de lock nao inicializada."
            };
        }

        // Se ja estiver locked por este PC, renova
        if (current.locked_by === LOCK_OWNER_ID) {
            database.prepare(`
                UPDATE price_pending_lock
                SET locked_by = ?, locked_at = ?, expires_at = ?
                WHERE id = 1
            `).run(LOCK_OWNER_ID, nowIso, expiresAt);

            return {
                success: true,
                locked: true,
                message: "Lock renovado com sucesso.",
                expiresAt
            };
        }

        // Se estiver locked por outro PC e ainda nao expirou
        if (current.locked_by && current.locked_by !== LOCK_OWNER_ID) {
            const expiresAtDate = new Date(current.expires_at);
            if (expiresAtDate > now) {
                return {
                    success: false,
                    locked: false,
                    message: `Banco bloqueado por ${current.locked_by} ate ${expiresAtDate.toLocaleString()}.`,
                    expiresAt: current.expires_at
                };
            }
            // Lock expirado, pode assumir
        }

        // Adquire o lock
        database.prepare(`
            UPDATE price_pending_lock
            SET locked_by = ?, locked_at = ?, expires_at = ?
            WHERE id = 1
        `).run(LOCK_OWNER_ID, nowIso, expiresAt);

        return {
            success: true,
            locked: true,
            message: "Lock adquirido com sucesso.",
            expiresAt
        };
    } catch (error) {
        console.error("[PricePendingLock] Erro ao adquirir lock:", error.message);
        return {
            success: false,
            locked: false,
            message: `Erro ao adquirir lock: ${error.message}`
        };
    }
}

/**
 * Libera o lock exclusivo.
 * @returns {{ success: boolean, released: boolean, message?: string }}
 */
function releaseLock() {
    const database = getPricePendingDatabase();

    try {
        const current = database
            .prepare("SELECT locked_by FROM price_pending_lock WHERE id = 1")
            .get();

        if (!current || !current.locked_by) {
            return {
                success: true,
                released: false,
                message: "Lock ja estava liberado."
            };
        }

        if (current.locked_by !== LOCK_OWNER_ID) {
            return {
                success: false,
                released: false,
                message: `Lock pertence a ${current.locked_by}, nao pode ser liberado por este PC.`
            };
        }

        database.prepare(`
            UPDATE price_pending_lock
            SET locked_by = NULL, locked_at = NULL, expires_at = NULL
            WHERE id = 1
        `).run();

        return {
            success: true,
            released: true,
            message: "Lock liberado com sucesso."
        };
    } catch (error) {
        console.error("[PricePendingLock] Erro ao liberar lock:", error.message);
        return {
            success: false,
            released: false,
            message: `Erro ao liberar lock: ${error.message}`
        };
    }
}

/**
 * Verifica o estado atual do lock.
 * @returns {{ locked: boolean, lockedBy?: string, expiresAt?: string, isExpired?: boolean }}
 */
function getLockStatus() {
    const database = getPricePendingDatabase();

    try {
        const current = database
            .prepare("SELECT locked_by, locked_at, expires_at FROM price_pending_lock WHERE id = 1")
            .get();

        if (!current || !current.locked_by) {
            return {
                locked: false
            };
        }

        const expiresAtDate = new Date(current.expires_at);
        const now = new Date();
        const isExpired = expiresAtDate <= now;

        return {
            locked: !isExpired,
            lockedBy: current.locked_by,
            expiresAt: current.expires_at,
            isExpired
        };
    } catch (error) {
        console.error("[PricePendingLock] Erro ao verificar lock:", error.message);
        return {
            locked: false,
            error: error.message
        };
    }
}

/**
 * Executa uma funcao com o lock adquirido.
 * @template T
 * @param {() => T} fn - Funcao a ser executada com o lock.
 * @returns {{ success: boolean, result?: T, message?: string }}
 */
function withLock(fn) {
    const lockResult = acquireLock();

    if (!lockResult.success || !lockResult.locked) {
        return {
            success: false,
            message: lockResult.message
        };
    }

    try {
        const result = fn();
        return {
            success: true,
            result
        };
    } catch (error) {
        console.error("[PricePendingLock] Erro durante execucao com lock:", error.message);
        return {
            success: false,
            message: `Erro durante execucao: ${error.message}`
        };
    } finally {
        releaseLock();
    }
}

module.exports = {
    acquireLock,
    releaseLock,
    getLockStatus,
    withLock,
    LOCK_OWNER_ID,
    LOCK_EXPIRY_MS
};