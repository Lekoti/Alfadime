const apiClient = require("./apiClient");

class AuthHandler {
    constructor() {
        this.currentSession = null;
        this.computerId = apiClient.getComputerId();
    }

    getComputerName() {
        return apiClient.getComputerName();
    }

    async login(username, password, isPersistent = false) {
        const result = await apiClient.post("/auth/login", {
            username,
            password,
            isPersistent,
            computerId: this.computerId,
            computerName: this.getComputerName()
        });

        if (result?.success) {
            this.currentSession = result.data;
        }

        return result;
    }

    async register(payload) {
        return apiClient.post("/auth/register", payload);
    }

    async logout() {
        const result = await apiClient.post("/auth/logout", {
            userId: this.currentSession?.user?.id || null,
            computerId: this.computerId
        });

        this.currentSession = null;

        return result;
    }

    async getCurrentSession() {
        const result = await apiClient.get(
            `/auth/session?computerId=${encodeURIComponent(this.computerId)}`
        );

        if (result?.success) {
            this.currentSession = result.data;
        }

        return result;
    }

    async validateSession() {
        const result = await apiClient.get(
            `/auth/session/validate?computerId=${encodeURIComponent(this.computerId)}`
        );

        if (result?.success) {
            this.currentSession = result.data;
        }

        return result;
    }

    async updateLastAccessHandler() {
        return apiClient.post("/auth/session/last-access", {
            userId: this.currentSession?.user?.id || null,
            computerId: this.computerId
        });
    }

    getAuthenticatedUser() {
        return this.currentSession?.user || null;
    }

    getComputerId() {
        return this.computerId;
    }
}

module.exports = new AuthHandler();