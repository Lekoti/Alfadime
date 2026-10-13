const authService = require("../services/authService");
const permissionsService = require("../services/permissionsService");
const usersService = require("../services/usersService");

function send(res, statusCode, payload) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(payload));
}

function notFound(res) {
    send(res, 404, {
        success: false,
        error: "Rota não encontrada."
    });
}

async function handleRequest(req, res, body) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const route = `${req.method} ${url.pathname}`;

    switch (route) {
        case "POST /auth/login":
            return send(res, 200, await authService.login(body));

        case "POST /auth/register":
            return send(res, 200, authService.register(body));

        case "POST /auth/logout":
            return send(res, 200, authService.logout(
                body.userId,
                body.computerId
            ));

        case "GET /auth/session":
            return send(res, 200, await authService.getCurrentSession(
                url.searchParams.get("computerId")
            ));

        case "GET /auth/session/validate":
            return send(res, 200, await authService.validateSession(
                url.searchParams.get("computerId")
            ));

        case "POST /auth/session/last-access":
            return send(res, 200, authService.updateLastAccessHandler(
                body.userId,
                body.computerId
            ));

        case "GET /users":
            return send(res, 200, usersService.listUsers());

        case "POST /users":
            return send(res, 200, usersService.createUser(
                body.data,
                body.currentUser
            ));

        case "PUT /users":
            return send(res, 200, usersService.updateUser(
                body.id,
                body.data,
                body.currentUser
            ));

        case "DELETE /users":
            return send(res, 200, usersService.deleteUser(
                body.id,
                body.currentUser
            ));

        case "PATCH /users/active":
            return send(res, 200, usersService.setUserActive(
                body.id,
                body.isActive,
                body.currentUser
            ));

        case "GET /permissions/modules":
            return send(res, 200, permissionsService.listModules());

        case "GET /permissions/functions":
            return send(res, 200, permissionsService.listFunctions(
                url.searchParams.get("moduleKey")
            ));

        case "GET /permissions/user":
            return send(res, 200, permissionsService.getPermissionsForUser(
                Number(url.searchParams.get("userId"))
            ));

        case "GET /permissions/role":
            return send(res, 200, permissionsService.getPermissionsForRole(
                url.searchParams.get("role")
            ));

        case "POST /permissions/save":
            return send(res, 200, permissionsService.savePermissions(
                body.payload,
                body.currentUser
            ));

        case "POST /permissions/clear-overrides":
            return send(res, 200, permissionsService.clearUserOverrides(
                body.userId,
                body.currentUser
            ));

        case "GET /permissions/legacy":
            return send(res, 200, usersService.listPermissions());

        default:
            return notFound(res);
    }
}

module.exports = {
    handleRequest
};