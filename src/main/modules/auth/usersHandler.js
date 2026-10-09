const {
    getDatabase
} = require("../../database/connection");

const {
    USER_ROLES
} = require("./userRoles.constants");


const ALLOWED_ROLES = [
    USER_ROLES.CREATOR,
    USER_ROLES.ADMIN,
    USER_ROLES.EDITOR,
    USER_ROLES.VIEWER,
    USER_ROLES.PENDING
];


function normalizeText(value) {
    return String(
        value || ""
    ).trim();
}


function validateRole(role) {
    return ALLOWED_ROLES.includes(role);
}


function buildSuccess(data) {
    return {
        success: true,
        data
    };
}


function buildError(message) {
    return {
        success: false,
        error: message
    };
}


function listUsers() {
    try {
        const database =
            getDatabase();

        const users =
            database
                .prepare(`
                    SELECT
                        id,
                        username,
                        display_name,
                        role,
                        is_active,
                        created_at,
                        updated_at,
                        last_login_at
                    FROM users
                    ORDER BY display_name
                `)
                .all();

        return buildSuccess(users);
    } catch (error) {
        console.error(
            "[USERS] Erro ao listar usuários:",
            error
        );

        return buildError(
            error?.message ||
            "Não foi possível listar os usuários."
        );
    }
}


function getUserById(id) {
    const database =
        getDatabase();

    return database
        .prepare(`
            SELECT
                id,
                username,
                display_name,
                role,
                is_active,
                created_at,
                updated_at,
                last_login_at
            FROM users
            WHERE id = ?
            LIMIT 1
        `)
        .get(id);
}


function getUserByUsername(username) {
    const database =
        getDatabase();

    return database
        .prepare(`
            SELECT
                id,
                username,
                display_name,
                role,
                is_active
            FROM users
            WHERE username = ?
            LIMIT 1
        `)
        .get(username);
}


function createUser(data, currentUser) {
    try {
        if (
            !currentUser ||
            ![
                USER_ROLES.CREATOR,
                USER_ROLES.ADMIN
            ].includes(currentUser.role)
        ) {
            return buildError(
                "Você não tem permissão para criar usuários."
            );
        }

        const username =
            normalizeText(data.username);

        const displayName =
            normalizeText(data.display_name);

        const role =
            normalizeText(data.role) ||
            USER_ROLES.PENDING;

        const isActive =
            Number(data.is_active ?? 1) ? 1 : 0;

        if (!username) {
            return buildError(
                "Informe o nome de usuário."
            );
        }

        if (!displayName) {
            return buildError(
                "Informe o nome de exibição."
            );
        }

        if (!validateRole(role)) {
            return buildError(
                "Perfil inválido."
            );
        }

        if (
            role === USER_ROLES.CREATOR &&
            currentUser.role !== USER_ROLES.CREATOR
        ) {
            return buildError(
                "Somente o Criador pode criar outro usuário Criador."
            );
        }

        const database =
            getDatabase();

        const existingUser =
            getUserByUsername(username);

        if (existingUser) {
            return buildError(
                "Já existe um usuário com este nome."
            );
        }

        const result =
            database
                .prepare(`
                    INSERT INTO users (
                        username,
                        display_name,
                        role,
                        is_active,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `)
                .run(
                    username,
                    displayName,
                    role,
                    isActive,
                    new Date().toISOString(),
                    new Date().toISOString()
                );

        const createdUser =
            getUserById(
                result.lastInsertRowid
            );

        return buildSuccess(createdUser);
    } catch (error) {
        console.error(
            "[USERS] Erro ao criar usuário:",
            error
        );

        return buildError(
            error?.message ||
            "Não foi possível criar o usuário."
        );
    }
}


function updateUser(id, data, currentUser) {
    try {
        if (
            !currentUser ||
            ![
                USER_ROLES.CREATOR,
                USER_ROLES.ADMIN
            ].includes(currentUser.role)
        ) {
            return buildError(
                "Você não tem permissão para editar usuários."
            );
        }

        const userId =
            Number(id);

        const targetUser =
            getUserById(userId);

        if (!targetUser) {
            return buildError(
                "Usuário não encontrado."
            );
        }

        const username =
            normalizeText(data.username);

        const displayName =
            normalizeText(data.display_name);

        const role =
            normalizeText(data.role) ||
            targetUser.role;

        const isActive =
            Number(data.is_active ?? targetUser.is_active) ? 1 : 0;

        if (!username) {
            return buildError(
                "Informe o nome de usuário."
            );
        }

        if (!displayName) {
            return buildError(
                "Informe o nome de exibição."
            );
        }

        if (!validateRole(role)) {
            return buildError(
                "Perfil inválido."
            );
        }

        if (
            targetUser.role === USER_ROLES.CREATOR &&
            role !== USER_ROLES.CREATOR
        ) {
            return buildError(
                "O perfil do usuário Criador não pode ser alterado."
            );
        }

        if (
            role === USER_ROLES.CREATOR &&
            currentUser.role !== USER_ROLES.CREATOR
        ) {
            return buildError(
                "Somente o Criador pode definir outro usuário como Criador."
            );
        }

        if (
            targetUser.role === USER_ROLES.CREATOR &&
            isActive === 0
        ) {
            return buildError(
                "O usuário Criador não pode ser desativado."
            );
        }

        const database =
            getDatabase();

        const existingUser =
            getUserByUsername(username);

        if (
            existingUser &&
            existingUser.id !== userId
        ) {
            return buildError(
                "Já existe um usuário com este nome."
            );
        }

        database
            .prepare(`
                UPDATE users
                SET
                    username = ?,
                    display_name = ?,
                    role = ?,
                    is_active = ?,
                    updated_at = ?
                WHERE id = ?
            `)
            .run(
                username,
                displayName,
                role,
                isActive,
                new Date().toISOString(),
                userId
            );

        return buildSuccess(
            getUserById(userId)
        );
    } catch (error) {
        console.error(
            "[USERS] Erro ao atualizar usuário:",
            error
        );

        return buildError(
            error?.message ||
            "Não foi possível atualizar o usuário."
        );
    }
}


function setUserActive(id, isActive, currentUser) {
    try {
        if (
            !currentUser ||
            ![
                USER_ROLES.CREATOR,
                USER_ROLES.ADMIN
            ].includes(currentUser.role)
        ) {
            return buildError(
                "Você não tem permissão para alterar o status de usuários."
            );
        }

        const userId =
            Number(id);

        const targetUser =
            getUserById(userId);

        if (!targetUser) {
            return buildError(
                "Usuário não encontrado."
            );
        }

        if (
            targetUser.id === currentUser.id
        ) {
            return buildError(
                "Não é possível alterar o status do usuário conectado."
            );
        }

        if (
            targetUser.role === USER_ROLES.CREATOR
        ) {
            return buildError(
                "O usuário Criador não pode ser desativado."
            );
        }

        const database =
            getDatabase();

        database
            .prepare(`
                UPDATE users
                SET
                    is_active = ?,
                    updated_at = ?
                WHERE id = ?
            `)
            .run(
                isActive ? 1 : 0,
                new Date().toISOString(),
                userId
            );

        return buildSuccess(
            getUserById(userId)
        );
    } catch (error) {
        console.error(
            "[USERS] Erro ao alterar status:",
            error
        );

        return buildError(
            error?.message ||
            "Não foi possível alterar o status do usuário."
        );
    }
}


function listPermissions() {
    try {
        const database =
            getDatabase();

        const permissions =
            database
                .prepare(`
                    SELECT *
                    FROM module_permissions
                    ORDER BY role, module_key
                `)
                .all();

        return buildSuccess(permissions);
    } catch (error) {
        console.error(
            "[USERS] Erro ao listar permissões:",
            error
        );

        return buildError(
            error?.message ||
            "Não foi possível listar as permissões."
        );
    }
}


module.exports = {
    listUsers,
    createUser,
    updateUser,
    setUserActive,
    listPermissions
};