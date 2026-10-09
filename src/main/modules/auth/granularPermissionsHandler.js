const {
    getDatabase
} = require("../../database/connection");


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


function canManagePermissions(user) {
    return Boolean(
        user &&
        [
            "creator",
            "admin"
        ].includes(user.role)
    );
}


function listModules() {
    try {
        const database =
            getDatabase();

        const modules =
            database
                .prepare(`
                    SELECT *
                    FROM permission_modules
                    WHERE is_active = 1
                    ORDER BY module_label
                `)
                .all();

        return buildSuccess(modules);
    } catch (error) {
        console.error(
            "[PERMISSIONS] Erro ao listar módulos:",
            error
        );

        return buildError(
            error?.message ||
            "Não foi possível listar os módulos."
        );
    }
}


function listFunctions(moduleKey) {
    try {
        const database =
            getDatabase();

        const functions =
            database
                .prepare(`
                    SELECT *
                    FROM permission_functions
                    WHERE module_key = ?
                      AND is_active = 1
                    ORDER BY
                        CASE function_type
                            WHEN 'action' THEN 1
                            WHEN 'column_group' THEN 2
                            WHEN 'column' THEN 3
                            ELSE 4
                        END,
                        function_label
                `)
                .all(moduleKey);

        return buildSuccess(functions);
    } catch (error) {
        console.error(
            "[PERMISSIONS] Erro ao listar funções:",
            error
        );

        return buildError(
            error?.message ||
            "Não foi possível listar as funções."
        );
    }
}


function getRoleModulePermissions(role) {
    const database =
        getDatabase();

    return database
        .prepare(`
            SELECT *
            FROM role_module_permissions
            WHERE role = ?
        `)
        .all(role);
}


function getRoleFunctionPermissions(role) {
    const database =
        getDatabase();

    return database
        .prepare(`
            SELECT *
            FROM role_function_permissions
            WHERE role = ?
        `)
        .all(role);
}


function getUserModulePermissions(userId) {
    const database =
        getDatabase();

    return database
        .prepare(`
            SELECT *
            FROM user_module_permissions
            WHERE user_id = ?
        `)
        .all(userId);
}


function getUserFunctionPermissions(userId) {
    const database =
        getDatabase();

    return database
        .prepare(`
            SELECT *
            FROM user_function_permissions
            WHERE user_id = ?
        `)
        .all(userId);
}


function getPermissionsForUser(userId) {
    try {
        const database =
            getDatabase();

        const user =
            database
                .prepare(`
                    SELECT
                        id,
                        username,
                        display_name,
                        role,
                        is_active
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                `)
                .get(userId);

        if (!user) {
            return buildError(
                "Usuário não encontrado."
            );
        }

        const modules =
            database
                .prepare(`
                    SELECT *
                    FROM permission_modules
                    WHERE is_active = 1
                    ORDER BY module_label
                `)
                .all();

        const functions =
            database
                .prepare(`
                    SELECT *
                    FROM permission_functions
                    WHERE is_active = 1
                    ORDER BY module_key, function_label
                `)
                .all();

        const roleModules =
            getRoleModulePermissions(
                user.role
            );

        const roleFunctions =
            getRoleFunctionPermissions(
                user.role
            );

        const userModules =
            getUserModulePermissions(
                userId
            );

        const userFunctions =
            getUserFunctionPermissions(
                userId
            );

        const roleModuleMap =
            new Map(
                roleModules.map((item) => [
                    item.module_key,
                    item
                ])
            );

        const userModuleMap =
            new Map(
                userModules.map((item) => [
                    item.module_key,
                    item
                ])
            );

        const roleFunctionMap =
            new Map(
                roleFunctions.map((item) => [
                    `${item.module_key}:${item.function_key}`,
                    item
                ])
            );

        const userFunctionMap =
            new Map(
                userFunctions.map((item) => [
                    `${item.module_key}:${item.function_key}`,
                    item
                ])
            );

        const resolvedModules =
            modules.map((module) => {
                const rolePermission =
                    roleModuleMap.get(
                        module.module_key
                    );

                const userPermission =
                    userModuleMap.get(
                        module.module_key
                    );

                const effective =
                    userPermission ||
                    rolePermission ||
                    {};

                return {
                    module_key: module.module_key,
                    module_label: module.module_label,
                    route: module.route,
                    can_view: Boolean(
                        effective.can_view
                    ),
                    can_edit: Boolean(
                        effective.can_edit
                    ),
                    can_delete: Boolean(
                        effective.can_delete
                    ),
                    can_approve: Boolean(
                        effective.can_approve
                    ),
                    can_export: Boolean(
                        effective.can_export
                    ),
                    can_sync: Boolean(
                        effective.can_sync
                    ),
                    has_user_override:
                        Boolean(userPermission)
                };
            });

        const resolvedFunctions =
            functions.map((permissionFunction) => {
                const compositeKey =
                    `${permissionFunction.module_key}:${permissionFunction.function_key}`;

                const rolePermission =
                    roleFunctionMap.get(
                        compositeKey
                    );

                const userPermission =
                    userFunctionMap.get(
                        compositeKey
                    );

                const effective =
                    userPermission ||
                    rolePermission ||
                    {};

                return {
                    module_key:
                        permissionFunction.module_key,
                    function_key:
                        permissionFunction.function_key,
                    function_label:
                        permissionFunction.function_label,
                    function_type:
                        permissionFunction.function_type,
                    parent_key:
                        permissionFunction.parent_key,
                    can_view: Boolean(
                        effective.can_view
                    ),
                    can_edit: Boolean(
                        effective.can_edit
                    ),
                    can_execute: Boolean(
                        effective.can_execute
                    ),
                    has_user_override:
                        Boolean(userPermission)
                };
            });

        return buildSuccess({
            user,
            modules: resolvedModules,
            functions: resolvedFunctions
        });
    } catch (error) {
        console.error(
            "[PERMISSIONS] Erro ao carregar permissões:",
            error
        );

        return buildError(
            error?.message ||
            "Não foi possível carregar as permissões."
        );
    }
}


function getPermissionsForRole(role) {
    try {
        const database =
            getDatabase();

        const modules =
            database
                .prepare(`
                    SELECT *
                    FROM permission_modules
                    WHERE is_active = 1
                    ORDER BY module_label
                `)
                .all();

        const functions =
            database
                .prepare(`
                    SELECT *
                    FROM permission_functions
                    WHERE is_active = 1
                    ORDER BY module_key, function_label
                `)
                .all();

        const roleModules =
            getRoleModulePermissions(
                role
            );

        const roleFunctions =
            getRoleFunctionPermissions(
                role
            );

        const roleModuleMap =
            new Map(
                roleModules.map((item) => [
                    item.module_key,
                    item
                ])
            );

        const roleFunctionMap =
            new Map(
                roleFunctions.map((item) => [
                    `${item.module_key}:${item.function_key}`,
                    item
                ])
            );

        const resolvedModules =
            modules.map((module) => {
                const permission =
                    roleModuleMap.get(
                        module.module_key
                    ) ||
                    {};

                return {
                    module_key: module.module_key,
                    module_label: module.module_label,
                    route: module.route,
                    can_view: Boolean(
                        permission.can_view
                    ),
                    can_edit: Boolean(
                        permission.can_edit
                    ),
                    can_delete: Boolean(
                        permission.can_delete
                    ),
                    can_approve: Boolean(
                        permission.can_approve
                    ),
                    can_export: Boolean(
                        permission.can_export
                    ),
                    can_sync: Boolean(
                        permission.can_sync
                    ),
                    has_user_override: false
                };
            });

        const resolvedFunctions =
            functions.map((permissionFunction) => {
                const compositeKey =
                    `${permissionFunction.module_key}:${permissionFunction.function_key}`;

                const permission =
                    roleFunctionMap.get(
                        compositeKey
                    ) ||
                    {};

                return {
                    module_key:
                        permissionFunction.module_key,
                    function_key:
                        permissionFunction.function_key,
                    function_label:
                        permissionFunction.function_label,
                    function_type:
                        permissionFunction.function_type,
                    parent_key:
                        permissionFunction.parent_key,
                    can_view: Boolean(
                        permission.can_view
                    ),
                    can_edit: Boolean(
                        permission.can_edit
                    ),
                    can_execute: Boolean(
                        permission.can_execute
                    ),
                    has_user_override: false
                };
            });

        return buildSuccess({
            role,
            modules: resolvedModules,
            functions: resolvedFunctions
        });
    } catch (error) {
        console.error(
            "[PERMISSIONS] Erro ao carregar permissões do perfil:",
            error
        );

        return buildError(
            error?.message ||
            "Não foi possível carregar as permissões do perfil."
        );
    }
}


function saveRoleModulePermission(
    role,
    moduleKey,
    permissions
) {
    const database =
        getDatabase();

    const now =
        new Date().toISOString();

    database
        .prepare(`
            INSERT INTO role_module_permissions (
                role,
                module_key,
                can_view,
                can_edit,
                can_delete,
                can_approve,
                can_export,
                can_sync,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(role, module_key)
            DO UPDATE SET
                can_view = excluded.can_view,
                can_edit = excluded.can_edit,
                can_delete = excluded.can_delete,
                can_approve = excluded.can_approve,
                can_export = excluded.can_export,
                can_sync = excluded.can_sync,
                updated_at = excluded.updated_at
        `)
        .run(
            role,
            moduleKey,
            permissions.can_view ? 1 : 0,
            permissions.can_edit ? 1 : 0,
            permissions.can_delete ? 1 : 0,
            permissions.can_approve ? 1 : 0,
            permissions.can_export ? 1 : 0,
            permissions.can_sync ? 1 : 0,
            now,
            now
        );
}


function saveRoleFunctionPermission(
    role,
    moduleKey,
    functionKey,
    permissions
) {
    const database =
        getDatabase();

    const now =
        new Date().toISOString();

    database
        .prepare(`
            INSERT INTO role_function_permissions (
                role,
                module_key,
                function_key,
                can_view,
                can_edit,
                can_execute,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(role, module_key, function_key)
            DO UPDATE SET
                can_view = excluded.can_view,
                can_edit = excluded.can_edit,
                can_execute = excluded.can_execute,
                updated_at = excluded.updated_at
        `)
        .run(
            role,
            moduleKey,
            functionKey,
            permissions.can_view ? 1 : 0,
            permissions.can_edit ? 1 : 0,
            permissions.can_execute ? 1 : 0,
            now,
            now
        );
}


function saveUserModulePermission(
    userId,
    moduleKey,
    permissions
) {
    const database =
        getDatabase();

    const now =
        new Date().toISOString();

    database
        .prepare(`
            INSERT INTO user_module_permissions (
                user_id,
                module_key,
                can_view,
                can_edit,
                can_delete,
                can_approve,
                can_export,
                can_sync,
                override_role,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(user_id, module_key)
            DO UPDATE SET
                can_view = excluded.can_view,
                can_edit = excluded.can_edit,
                can_delete = excluded.can_delete,
                can_approve = excluded.can_approve,
                can_export = excluded.can_export,
                can_sync = excluded.can_sync,
                override_role = 1,
                updated_at = excluded.updated_at
        `)
        .run(
            userId,
            moduleKey,
            permissions.can_view ? 1 : 0,
            permissions.can_edit ? 1 : 0,
            permissions.can_delete ? 1 : 0,
            permissions.can_approve ? 1 : 0,
            permissions.can_export ? 1 : 0,
            permissions.can_sync ? 1 : 0,
            now,
            now
        );
}


function saveUserFunctionPermission(
    userId,
    moduleKey,
    functionKey,
    permissions
) {
    const database =
        getDatabase();

    const now =
        new Date().toISOString();

    database
        .prepare(`
            INSERT INTO user_function_permissions (
                user_id,
                module_key,
                function_key,
                can_view,
                can_edit,
                can_execute,
                override_role,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(user_id, module_key, function_key)
            DO UPDATE SET
                can_view = excluded.can_view,
                can_edit = excluded.can_edit,
                can_execute = excluded.can_execute,
                override_role = 1,
                updated_at = excluded.updated_at
        `)
        .run(
            userId,
            moduleKey,
            functionKey,
            permissions.can_view ? 1 : 0,
            permissions.can_edit ? 1 : 0,
            permissions.can_execute ? 1 : 0,
            now,
            now
        );
}


function savePermissions(payload, currentUser) {
    try {
        if (!canManagePermissions(currentUser)) {
            return buildError(
                "Você não tem permissão para configurar permissões."
            );
        }

        const targetType =
            payload.target_type;

        const targetValue =
            payload.target_value;

        const modulePermissions =
            Array.isArray(
                payload.module_permissions
            )
                ? payload.module_permissions
                : [];

        const functionPermissions =
            Array.isArray(
                payload.function_permissions
            )
                ? payload.function_permissions
                : [];

        if (
            ![
                "role",
                "user"
            ].includes(targetType)
        ) {
            return buildError(
                "Tipo de destino inválido."
            );
        }

        if (!targetValue) {
            return buildError(
                "Destino da permissão não informado."
            );
        }

        const database =
            getDatabase();

        if (targetType === "user") {
            const user =
                database
                    .prepare(`
                        SELECT id
                        FROM users
                        WHERE id = ?
                        LIMIT 1
                    `)
                    .get(targetValue);

            if (!user) {
                return buildError(
                    "Usuário não encontrado."
                );
            }
        }

        const saveModule =
            targetType === "role"
                ? saveRoleModulePermission
                : saveUserModulePermission;

        const saveFunction =
            targetType === "role"
                ? saveRoleFunctionPermission
                : saveUserFunctionPermission;

        for (const permission of modulePermissions) {
            if (
                !permission.module_key
            ) {
                continue;
            }

            saveModule(
                targetValue,
                permission.module_key,
                {
                    can_view: permission.can_view,
                    can_edit: permission.can_edit,
                    can_delete: permission.can_delete,
                    can_approve: permission.can_approve,
                    can_export: permission.can_export,
                    can_sync: permission.can_sync
                }
            );
        }

        for (const permission of functionPermissions) {
            if (
                !permission.module_key ||
                !permission.function_key
            ) {
                continue;
            }

            saveFunction(
                targetValue,
                permission.module_key,
                permission.function_key,
                {
                    can_view: permission.can_view,
                    can_edit: permission.can_edit,
                    can_execute: permission.can_execute
                }
            );
        }

        return buildSuccess({
            saved: true
        });
    } catch (error) {
        console.error(
            "[PERMISSIONS] Erro ao salvar permissões:",
            error
        );

        return buildError(
            error?.message ||
            "Não foi possível salvar as permissões."
        );
    }
}


function clearUserOverrides(userId, currentUser) {
    try {
        if (!canManagePermissions(currentUser)) {
            return buildError(
                "Você não tem permissão para remover overrides."
            );
        }

        const database =
            getDatabase();

        database
            .prepare(`
                DELETE FROM user_module_permissions
                WHERE user_id = ?
            `)
            .run(userId);

        database
            .prepare(`
                DELETE FROM user_function_permissions
                WHERE user_id = ?
            `)
            .run(userId);

        return buildSuccess({
            cleared: true
        });
    } catch (error) {
        console.error(
            "[PERMISSIONS] Erro ao remover overrides:",
            error
        );

        return buildError(
            error?.message ||
            "Não foi possível remover os overrides."
        );
    }
}


module.exports = {
    listModules,
    listFunctions,
    getPermissionsForUser,
    getPermissionsForRole,
    savePermissions,
    clearUserOverrides
};