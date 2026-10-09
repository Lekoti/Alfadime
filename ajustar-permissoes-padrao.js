const Database = require("better-sqlite3");

const db = new Database(
    "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\USUARIOS\\alfadime-users.db"
);

const adjust = db.transaction(() => {
    db.prepare(`
        UPDATE users
        SET role = 'viewer'
        WHERE role = 'pending'
    `).run();

    db.prepare(`
        DELETE FROM role_module_permissions
        WHERE role IN ('creator', 'admin', 'editor', 'viewer', 'pending')
    `).run();

    db.prepare(`
        DELETE FROM role_function_permissions
        WHERE role IN ('creator', 'admin', 'editor', 'viewer', 'pending')
    `).run();

    db.prepare(`
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
        SELECT
            'creator',
            module_key,
            1,
            1,
            1,
            1,
            1,
            1,
            datetime('now'),
            datetime('now')
        FROM permission_modules
        WHERE is_active = 1
    `).run();

    db.prepare(`
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
        SELECT
            'admin',
            module_key,
            1,
            1,
            1,
            1,
            1,
            1,
            datetime('now'),
            datetime('now')
        FROM permission_modules
        WHERE is_active = 1
    `).run();

    db.prepare(`
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
        SELECT
            'editor',
            module_key,
            1,
            1,
            0,
            0,
            1,
            0,
            datetime('now'),
            datetime('now')
        FROM permission_modules
        WHERE is_active = 1
    `).run();

    db.prepare(`
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
        SELECT
            'viewer',
            module_key,
            1,
            0,
            0,
            0,
            0,
            0,
            datetime('now'),
            datetime('now')
        FROM permission_modules
        WHERE is_active = 1
    `).run();

    db.prepare(`
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
        SELECT
            'creator',
            module_key,
            function_key,
            1,
            1,
            1,
            datetime('now'),
            datetime('now')
        FROM permission_functions
        WHERE is_active = 1
    `).run();

    db.prepare(`
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
        SELECT
            'admin',
            module_key,
            function_key,
            1,
            1,
            1,
            datetime('now'),
            datetime('now')
        FROM permission_functions
        WHERE is_active = 1
    `).run();

    db.prepare(`
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
        SELECT
            'editor',
            module_key,
            function_key,
            1,
            1,
            0,
            datetime('now'),
            datetime('now')
        FROM permission_functions
        WHERE is_active = 1
    `).run();

    db.prepare(`
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
        SELECT
            'viewer',
            module_key,
            function_key,
            1,
            0,
            0,
            datetime('now'),
            datetime('now')
        FROM permission_functions
        WHERE is_active = 1
    `).run();
});

adjust();

db.close();

console.log("Permissões padrão atualizadas com sucesso.");