const apiClient = require("./apiClient");


const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;


class AuthHandler {
    constructor() {
        this.currentSession = null;
        this.computerId = apiClient.getComputerId();
        this.heartbeatTimer = null;
    }


    getComputerName() {
        return apiClient.getComputerName();
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


        // Não mantém o processo aberto apenas por causa do heartbeat.
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
        const result = await apiClient.post("/auth/login", {
            username,
            password,
            isPersistent,
            computerId: this.computerId,
            computerName: this.getComputerName()
        });


        if (result?.success && result.data?.token) {
            apiClient.setAuthToken(result.data.token);
            this.currentSession = result.data;
            this.startHeartbeat();
        }


        return result;
    }


    async register(payload) {
        return apiClient.post("/auth/register", payload);
    }


    async logout() {
        const result = await apiClient.post("/auth/logout", {});


        this.stopHeartbeat();
        apiClient.setAuthToken(null);
        this.currentSession = null;


        return result;
    }


    async getCurrentSession() {
        const result = await apiClient.get(
            `/auth/session?computerId=${encodeURIComponent(this.computerId)}`
        );


        if (result?.success && result.data?.token) {
            apiClient.setAuthToken(result.data.token);
            this.currentSession = result.data;
            this.startHeartbeat();
        }


        return result;
    }


    async validateSession() {
        const result = await apiClient.get(
            `/auth/session/validate?computerId=${encodeURIComponent(this.computerId)}`
        );


        if (result?.success && result.data?.token) {
            apiClient.setAuthToken(result.data.token);
            this.currentSession = result.data;
            this.startHeartbeat();
        }


        return result;
    }


    async updateLastAccessHandler() {
        return apiClient.post("/auth/session/last-access", {});
    }


    getAuthenticatedUser() {
        return this.currentSession?.user || null;
    }


    getComputerId() {
        return this.computerId;
    }
}


module.exports = new AuthHandler();