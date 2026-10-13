const crypto = require("node:crypto");

const {
    getUsersDatabase
} = require("../../src/main/database/connection");

const permissionsService = require("./permissionsService");
const {
    USER_ROLES
} = require("../../src/main/modules/auth/userRoles.constants");

function normalizeText(value) {
    return String(value || "").trim();
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto
        .scryptSync(password, salt, 64)
        .toString("hex");

    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    if (!storedHash) {
        return false;
    }

    const [salt, hash] = String(storedHash).split(":");

    if (!salt || !hash) {
        return false;
    }

    const candidate = crypto.scryptSync(password, salt, 64);
    const stored = Buffer.from(hash, "hex");

    if (candidate.length !== stored.length) {
        return false;
    }

    return crypto.timingSafeEqual(candidate, stored);
}

function getUserByUsername(username) {
    return getUsersDatabase()
        .prepare(`
            SELECT *
            FROM users
            WHERE username = ?
            LIMIT 1
        `)
        .get(normalizeText(username));
}

async function getUserPermissions(user) {
    if (
        user.role === USER_ROLES.CREATOR ||
        user.role === USER_ROLES.ADMIN
    ) {
        const result = await permissionsService.getPermissionsForRole(
            user.role
        );

        if (result?.success) {
            return result.data.modules.map((module) => ({
                ...module,
                can_view: true,
                can_edit: true,
                can_delete: true,
                can_approve: true,
                can_export: true,
                can_sync: true
            }));
        }
    }

    const result = await permissionsService.getPermissionsForUser(
        user.id
    );

    return result?.success ? result.data.modules : [];
}

function buildSession(user, permissions, computerId) {
    return {
        user: {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            role: user.role,
            is_active: user.is_active
        },
        permissions,
        computerId
    };
}

function createOrUpdateSession(userId, computerId, computerName, isPersistent) {
    const database = getUsersDatabase();
    const now = new Date().toISOString();

    database
        .prepare(`
            INSERT INTO user_sessions (
                user_id,
                computer_id,
                computer_name,
                is_persistent,
                created_at,
                last_access_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, computer_id)
            DO UPDATE SET
                computer_name = excluded.computer_name,
                is_persistent = excluded.is_persistent,
                last_access_at = excluded.last_access_at
        `)
        .run(
            userId,
            computerId,
            computerName,
            isPersistent ? 1 : 0,
            now,
            now
        );
}

function updateUserLastLogin(userId) {
    const now = new Date().toISOString();

    getUsersDatabase()
        .prepare(`
            UPDATE users
            SET last_login_at = ?,
                updated_at = ?
            WHERE id = ?
        `)
        .run(now, now, userId);
}

function updateLastAccess(userId, computerId) {
    getUsersDatabase()
        .prepare(`
            UPDATE user_sessions
            SET last_access_at = ?
            WHERE user_id = ?
             AND computer_id = ?
        `)
        .run(new Date().toISOString(), userId, computerId);
}

function getSessionByComputer(computerId) {
    return getUsersDatabase()
        .prepare(`
            SELECT
                us.*,
                u.username,
                u.display_name,
                u.role,
                u.is_active
            FROM user_sessions us
            INNER JOIN users u
                ON u.id = us.user_id
            WHERE us.computer_id = ?
             AND us.is_persistent = 1
             AND u.is_active = 1
            ORDER BY us.last_access_at DESC
            LIMIT 1
        `)
        .get(computerId);
}

async function login(payload) {
    try {
        const username = normalizeText(payload.username);
        const password = String(payload.password || "");
        const computerId = normalizeText(payload.computerId);
        const computerName = normalizeText(payload.computerName);
        const isPersistent = Boolean(payload.isPersistent);

        if (!computerId) {
            return { success: false, error: "Computador não identificado." };
        }

        if (!username) {
            return { success: false, error: "Informe o nome de usuário." };
        }

        if (!password) {
            return { success: false, error: "Informe a senha." };
        }

        const user = getUserByUsername(username);

        if (!user || !user.is_active) {
            return { success: false, error: "Usuário ou senha inválidos." };
        }

        if (!user.password_hash) {
            if (password.length < 6) {
                return {
                    success: false,
                    error: "Defina uma senha com pelo menos 6 caracteres."
                };
            }

            const newPasswordHash = hashPassword(password);

            getUsersDatabase()
                .prepare(`
                    UPDATE users
                    SET password_hash = ?,
                        updated_at = ?
                    WHERE id = ?
                `)
                .run(newPasswordHash, new Date().toISOString(), user.id);

            user.password_hash = newPasswordHash;
        }

        if (!verifyPassword(password, user.password_hash)) {
            return { success: false, error: "Usuário ou senha inválidos." };
        }

        const permissions = await getUserPermissions(user);

        createOrUpdateSession(
            user.id,
            computerId,
            computerName,
            isPersistent
        );

        updateUserLastLogin(user.id);
        updateLastAccess(user.id, computerId);

        return {
            success: true,
            data: buildSession(user, permissions, computerId)
        };
    } catch (error) {
        console.error("[API][AUTH] Erro ao fazer login:", error);

        return {
            success: false,
            error: error?.message || "Não foi possível realizar o login."
        };
    }
}

function register(payload) {
    try {
        const username = normalizeText(payload.username);
        const displayName = normalizeText(payload.displayName);
        const password = String(payload.password || "");

        if (!username) {
            return { success: false, error: "Informe o nome de usuário." };
        }

        if (!displayName) {
            return { success: false, error: "Informe o nome de exibição." };
        }

        if (password.length < 6) {
            return {
                success: false,
                error: "Defina uma senha com pelo menos 6 caracteres."
            };
        }

        if (getUserByUsername(username)) {
            return {
                success: false,
                error: "Já existe um usuário com este nome."
            };
        }

        const now = new Date().toISOString();

        getUsersDatabase()
            .prepare(`
                INSERT INTO users (
                    username,
                    display_name,
                    role,
                    is_active,
                    password_hash,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
                username,
                displayName,
                USER_ROLES.VIEWER,
                1,
                hashPassword(password),
                now,
                now
            );

        return {
            success: true,
            data: { username }
        };
    } catch (error) {
        console.error("[API][AUTH] Erro ao criar conta:", error);

        return {
            success: false,
            error: error?.message || "Não foi possível criar a conta."
        };
    }
}

async function getCurrentSession(computerId) {
    try {
        const session = getSessionByComputer(computerId);

        if (!session) {
            return { success: true, data: null };
        }

        const permissions = await getUserPermissions({
            id: session.user_id,
            role: session.role
        });

        updateLastAccess(session.user_id, computerId);

        return {
            success: true,
            data: buildSession(
                {
                    id: session.user_id,
                    username: session.username,
                    display_name: session.display_name,
                    role: session.role,
                    is_active: session.is_active
                },
                permissions,
                computerId
            )
        };
    } catch (error) {
        console.error("[API][AUTH] Erro ao recuperar sessão:", error);

        return {
            success: false,
            error: error?.message || "Não foi possível recuperar a sessão."
        };
    }
}

async function validateSession(computerId) {
    const result = await getCurrentSession(computerId);

    if (!result.success || !result.data) {
        return { success: false, error: "Nenhuma sessão ativa." };
    }

    return result;
}

function logout(userId, computerId) {
    try {
        if (userId && computerId) {
            getUsersDatabase()
                .prepare(`
                    DELETE FROM user_sessions
                    WHERE user_id = ?
                     AND computer_id = ?
                `)
                .run(userId, computerId);
        }

        return { success: true };
    } catch (error) {
        console.error("[API][AUTH] Erro ao sair:", error);

        return {
            success: false,
            error: error?.message || "Não foi possível encerrar a sessão."
        };
    }
}

function updateLastAccessHandler(userId, computerId) {
    try {
        if (userId && computerId) {
            updateLastAccess(userId, computerId);
        }

        return { success: true };
    } catch (error) {
        console.error("[API][AUTH] Erro ao atualizar acesso:", error);

        return {
            success: false,
            error: error?.message || "Não foi possível atualizar o acesso."
        };
    }
}

module.exports = {
    login,
    register,
    getCurrentSession,
    validateSession,
    logout,
    updateLastAccessHandler
};