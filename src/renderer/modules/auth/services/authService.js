function getAuthApi() {
    if (
        !window.alfadime ||
        !window.alfadime.auth
    ) {
        throw new Error(
            "API de autenticação não disponível."
        );
    }

    return window.alfadime.auth;
}


const authService = {
    async login(
        username,
        isPersistent = false
    ) {
        return getAuthApi().login(
            username,
            isPersistent
        );
    },

    async logout() {
        return getAuthApi().logout();
    },

    async getCurrentSession() {
        return getAuthApi().getCurrentSession();
    },

    async getComputerId() {
        return getAuthApi().getComputerId();
    },

    async validateSession() {
        return getAuthApi().validateSession();
    },

    async updateLastAccess() {
        return getAuthApi().updateLastAccess();
    }
};

export {
    authService
};

export default authService;