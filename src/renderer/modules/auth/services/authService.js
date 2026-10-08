const getAuthApi = () => {
    if (!window.alfadime?.auth) {
        throw new Error(
            "API de autenticação não disponível."
        );
    }

    return window.alfadime.auth;
};

export const authService = {
    async login(
        username,
        isPersistent = false
    ) {
        return getAuthApi().login(
            username.trim(),
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

export default authService;