const path = require("node:path");
const { Worker } = require("node:worker_threads");
const { getDatabase, getDatabasePath } = require("../../database/connection");

let active = null;

function ensureState() {
    const database = getDatabase();
    database.exec(`
        CREATE TABLE IF NOT EXISTS notifications_refresh_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            last_success_at TEXT
        )
    `);
    return database;
}

function getRefreshStatus() {
    const row = ensureState().prepare(
        "SELECT last_success_at FROM notifications_refresh_state WHERE id = 1"
    ).get();
    return { running: Boolean(active), lastSuccessAt: row?.last_success_at || null };
}

function refreshNotifications() {
    if (active) return active;
    ensureState();
    const contactsPath = require("../industry-contacts/industry-contacts.database").getDatabasePath();
    const pricesConfig = require("../price-pending/price-pending.database").getEffectiveConfig();
    const localPath = getDatabasePath();
    const pricesPath = pricesConfig.mode === "shared" ? pricesConfig.path : localPath;
    const job = new Promise((resolve, reject) => {
        let worker;
        let result = null;
        let failure = null;
        try {
            worker = new Worker(path.join(__dirname, "notifications-refresh.worker.js"), {
                workerData: { localPath, contactsPath, pricesPath }
            });
        } catch (error) {
            reject(error);
            return;
        }
        worker.on("message", (message) => {
            if (message.success) result = message;
            else failure = new Error(message.error || "Falha ao atualizar notificações.");
        });
        worker.on("error", (error) => { failure = error; });
        worker.on("exit", (code) => {
            if (failure) reject(failure);
            else if (code !== 0 || !result) reject(new Error("A atualização terminou sem confirmação."));
            else resolve(result);
        });
    });
    active = job.finally(() => { active = null; });
    return active;
}

module.exports = { refreshNotifications, getRefreshStatus };
