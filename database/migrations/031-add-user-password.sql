-- Migration 031: Senha dos usuários e permissões de visualização para Pending

ALTER TABLE users ADD COLUMN password_hash TEXT;

UPDATE users
SET password_hash = '8f1c9d2a7b6e4f3a5c8d9e0b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b'
WHERE username = 'sLekoti'
  AND password_hash IS NULL;

DELETE FROM module_permissions
WHERE role = 'pending';

INSERT INTO module_permissions (
    role,
    module_key,
    can_view,
    can_create,
    can_edit,
    can_delete,
    can_approve
)
VALUES
    ('pending', 'home', 1, 0, 0, 0, 0),
    ('pending', 'products', 1, 0, 0, 0, 0),
    ('pending', 'purchases', 1, 0, 0, 0, 0),
    ('pending', 'price-pending', 1, 0, 0, 0, 0),
    ('pending', 'product-corrections', 1, 0, 0, 0, 0),
    ('pending', 'product-audit', 1, 0, 0, 0, 0),
    ('pending', 'industry-contacts', 1, 0, 0, 0, 0),
    ('pending', 'email-dispatch', 1, 0, 0, 0, 0),
    ('pending', 'notifications', 1, 0, 0, 0, 0),
    ('pending', 'settings', 1, 0, 0, 0, 0);