function getUsersApi() {
    if (
        !window.alfadime ||
        !window.alfadime.users
    ) {
        throw new Error(
            "API de usuários não disponível."
        );
    }


    return window.alfadime.users;
}


export const settingsUsersService = {
    async list() {
        return getUsersApi().list();
    },


    async create(data) {
        return getUsersApi().create(data);
    },


    async update(id, data) {
        return getUsersApi().update(id, data);
    },


    async delete(id) {
        return getUsersApi().delete(id);
    },


    async setActive(id, isActive) {
        return getUsersApi().setActive(id, isActive);
    },


    async listPermissions() {
        return getUsersApi().listPermissions();
    }
};


export default settingsUsersService;