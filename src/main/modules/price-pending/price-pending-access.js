const authHandler = require("../auth/authHandler");
const { USER_ROLES } = require("../auth/userRoles.constants");
function requireUser() {
    const user = authHandler.getAuthenticatedUser();
    if (!user) throw new Error("Usuário não autenticado. Entre novamente no aplicativo.");
    return user;
}
function requireEditor() {
    const user = requireUser();
    const role = String(user.role || "").toLowerCase();
    if (![USER_ROLES.CREATOR, USER_ROLES.ADMIN, USER_ROLES.EDITOR].includes(role)) throw new Error("Apenas Editor, Staff e Administrador podem executar esta operação.");
    return user;
}
function name(user) { return String(user?.username || user?.name || user?.id || "Não registrado"); }
module.exports = { requireUser, requireEditor, name };
