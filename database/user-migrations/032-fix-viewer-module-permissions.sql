-- Migration 032: Garante visualizacao de todos os modulos para o perfil viewer

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
VALUES
    ('viewer', 'home', 1, 0, 0, 0, 0, 0, datetime('now'), datetime('now')),
    ('viewer', 'products', 1, 0, 0, 0, 0, 0, datetime('now'), datetime('now')),
    ('viewer', 'product-audit', 1, 0, 0, 0, 0, 0, datetime('now'), datetime('now')),
    ('viewer', 'product-corrections', 1, 0, 0, 0, 0, 0, datetime('now'), datetime('now')),
    ('viewer', 'price-pending', 1, 0, 0, 0, 0, 0, datetime('now'), datetime('now')),
    ('viewer', 'purchases', 1, 0, 0, 0, 0, 0, datetime('now'), datetime('now')),
    ('viewer', 'industry-contacts', 1, 0, 0, 0, 0, 0, datetime('now'), datetime('now')),
    ('viewer', 'notifications', 1, 0, 0, 0, 0, 0, datetime('now'), datetime('now')),
    ('viewer', 'email', 1, 0, 0, 0, 0, 0, datetime('now'), datetime('now')),
    ('viewer', 'settings', 1, 0, 0, 0, 0, 0, datetime('now'), datetime('now'))
ON CONFLICT(role, module_key)
DO UPDATE SET
    can_view = 1,
    can_edit = 0,
    can_delete = 0,
    can_approve = 0,
    can_export = 0,
    can_sync = 0,
    updated_at = datetime('now');