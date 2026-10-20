const authDatabaseService = require("./authDatabaseService");

const crypto = require("node:crypto");
const os = require("node:os");

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

function getComputerId() {
    const uniqueString = [
        os.hostname(),
        os.platform(),
        os.arch()
    ].join("-");

    return crypto
        .createHash("sha256")
        .update(uniqueString)
        .digest("hex")
        .substring(0, 16);
}

class AuthHandler {
    constructor() {
        this.currentSession = null;
        this.computerId = getComputerId();
        this.heartbeatTimer = null;
    }

    getComputerName() {
        return os.hostname();
    }

    startHeartbeat() {
        this.stopHeartbeat();

        this.heartbeatTimer = setInterval(async () => {
            if (!this.currentSession) {
                this.stopHeartbeat();
                return;
            }

            try {
                await this.updateLastAccessHandler();
            } catch (error) {
                console.error(
                    "[AUTH] Erro ao atualizar última atividade:",
                    error
                );
            }
        }, HEARTBEAT_INTERVAL_MS);

        if (this.heartbeatTimer.unref) {
            this.heartbeatTimer.unref();
        }
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    async login(username, password, isPersistent = false) {
        const result = await authDatabaseService.login({
            username,
            password,
            isPersistent,
            computerId: this.computerId,
            computerName: this.getComputerName()
        });

        if (result?.success && result.data) {
            this.currentSession = result.data;
            this.startHeartbeat();
        }

        return result;
    }

    async register(payload) {
        return authDatabaseService.register(payload);
    }

    async logout() {
        const currentUser = this.getAuthenticatedUser();

        const result = await authDatabaseService.logout(
            currentUser?.id,
            this.computerId
        );

        this.stopHeartbeat();
        this.currentSession = null;

        return result;
    }

    async getCurrentSession() {
        const result = await authDatabaseService.getCurrentSession(
            this.computerId
        );

        if (result?.success && result.data) {
            this.currentSession = result.data;
            this.startHeartbeat();
        }

        return result;
    }

    async validateSession() {
        const result = await authDatabaseService.validateSession(
            this.computerId
        );

        if (result?.success && result.data) {
            this.currentSession = result.data;
            this.startHeartbeat();
        }

        return result;
    }

    async updateLastAccessHandler() {
        const currentUser = this.getAuthenticatedUser();

        return authDatabaseService.updateLastAccessHandler(
            currentUser?.id,
            this.computerId
        );
    }

    getAuthenticatedUser() {
        return this.currentSession?.user || null;
    }

    getComputerId() {
        return this.computerId;
    }
}

module.exports = new AuthHandler();