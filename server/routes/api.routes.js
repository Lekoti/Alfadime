const authService = require("../services/authService");
const permissionsService = require("../services/permissionsService");
const usersService = require("../services/usersService");

function send(res, statusCode, payload) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(payload));
}

function unauthorized(res) {
    send(res, 401, {
        success: false,
        error: "Sessão inválida ou expirada."
    });
}

function notFound(res) {
    send(res, 404, {
        success: false,
        error: "Rota não encontrada."
    });
}

function getAuth(req) {
    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ")
        ? header.slice(7)
        : "";

    return authService.verifyToken(token);
}

async function handleRequest(req, res, body) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const route = `${req.method} ${url.pathname}`;
    const auth = getAuth(req);

    switch (route) {
        case "POST /auth/login":
            return send(res, 200, await authService.login(body));

        case "POST /auth/register":
            return send(res, 200, authService.register(body));

        case "GET /auth/session":
            return send(res, 200, await authService.getCurrentSession(
                url.searchParams.get("computerId")
            ));

        case "GET /auth/session/validate":
            return send(res, 200, await authService.validateSession(
                url.searchParams.get("computerId")
            ));

        default:
            break;
    }

    if (!auth) {
        return unauthorized(res);
    }

    const currentUser = {
        id: auth.userId,
        username: auth.username,
        role: auth.role
    };

    switch (route) {
        case "POST /auth/logout":
            return send(res, 200, authService.logout(
                auth.userId,
                auth.computerId
            ));

        case "POST /auth/session/last-access":
            return send(res, 200, authService.updateLastAccessHandler(
                auth.userId,
                auth.computerId
            ));

        case "GET /users":
            return send(res, 200, usersService.listUsers());

        case "POST /users":
            return send(res, 200, usersService.createUser(
                body.data,
                currentUser
            ));

        case "PUT /users":
            return send(res, 200, usersService.updateUser(
                body.id,
                body.data,
                currentUser
            ));

        case "DELETE /users":
            return send(res, 200, usersService.deleteUser(
                body.id,
                currentUser
            ));

        case "PATCH /users/active":
            return send(res, 200, usersService.setUserActive(
                body.id,
                body.isActive,
                currentUser
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
                currentUser
            ));

        case "POST /permissions/clear-overrides":
            return send(res, 200, permissionsService.clearUserOverrides(
                body.userId,
                currentUser
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