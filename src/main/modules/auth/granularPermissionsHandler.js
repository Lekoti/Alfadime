const apiClient = require("./apiClient");

function listModules() {
    return apiClient.get("/permissions/modules");
}

function listFunctions(moduleKey) {
    return apiClient.get(
        `/permissions/functions?moduleKey=${encodeURIComponent(moduleKey)}`
    );
}

function getPermissionsForUser(userId) {
    return apiClient.get(
        `/permissions/user?userId=${encodeURIComponent(userId)}`
    );
}

function getPermissionsForRole(role) {
    return apiClient.get(
        `/permissions/role?role=${encodeURIComponent(role)}`
    );
}

function savePermissions(payload, currentUser) {
    return apiClient.post("/permissions/save", {
        payload,
        currentUser
    });
}

function clearUserOverrides(userId, currentUser) {
    return apiClient.post("/permissions/clear-overrides", {
        userId,
        currentUser
    });
}

module.exports = {
    listModules,
    listFunctions,
    getPermissionsForUser,
    getPermissionsForRole,
    savePermissions,
    clearUserOverrides
};