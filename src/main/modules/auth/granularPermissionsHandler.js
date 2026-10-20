const granularPermissionsDatabaseService = require("./granularPermissionsDatabaseService");

function listModules() {
    return granularPermissionsDatabaseService.listModules();
}

function listFunctions(moduleKey) {
    return granularPermissionsDatabaseService.listFunctions(moduleKey);
}

function getPermissionsForUser(userId) {
    return granularPermissionsDatabaseService.getPermissionsForUser(userId);
}

function getPermissionsForRole(role) {
    return granularPermissionsDatabaseService.getPermissionsForRole(role);
}

function savePermissions(payload, currentUser) {
    return granularPermissionsDatabaseService.savePermissions(payload, currentUser);
}

function clearUserOverrides(userId, currentUser) {
    return granularPermissionsDatabaseService.clearUserOverrides(userId, currentUser);
}

module.exports = {
    listModules,
    listFunctions,
    getPermissionsForUser,
    getPermissionsForRole,
    savePermissions,
    clearUserOverrides
};