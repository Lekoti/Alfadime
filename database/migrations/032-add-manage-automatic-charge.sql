-- Migration 032: Permissao para gerenciar a cobranca automatica
-- Cadastra a funcao manage_automatic_charge no modulo Preços e Pendências
-- e concede execucao ao Criador e Administrador.

INSERT OR IGNORE INTO permission_functions
    (module_key, function_key, function_label, function_type, parent_key, is_active)
VALUES
    ('price-pending', 'manage_automatic_charge', 'Gerenciar cobrança automática', 'action', NULL, 1);

INSERT OR IGNORE INTO role_function_permissions
    (role, module_key, function_key, can_view, can_edit, can_execute)
VALUES
    ('creator', 'price-pending', 'manage_automatic_charge', 1, 0, 1),
    ('admin', 'price-pending', 'manage_automatic_charge', 1, 0, 1);
