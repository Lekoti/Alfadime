-- Migration 031: Permissões granulares por módulo, função, coluna e ação
-- Alfadime Granular Permissions System


-- Catálogo de módulos controláveis
CREATE TABLE IF NOT EXISTS permission_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_key TEXT UNIQUE NOT NULL,
    module_label TEXT NOT NULL,
    route TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);


-- Catálogo de funções, colunas e ações por módulo
CREATE TABLE IF NOT EXISTS permission_functions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_key TEXT NOT NULL,
    function_key TEXT NOT NULL,
    function_label TEXT NOT NULL,
    function_type TEXT NOT NULL DEFAULT 'action',
    parent_key TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(module_key, function_key),
    FOREIGN KEY (module_key) REFERENCES permission_modules(module_key) ON DELETE CASCADE
);


-- Permissões padrão por perfil: acesso ao módulo
CREATE TABLE IF NOT EXISTS role_module_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    module_key TEXT NOT NULL,
    can_view INTEGER NOT NULL DEFAULT 0,
    can_edit INTEGER NOT NULL DEFAULT 0,
    can_delete INTEGER NOT NULL DEFAULT 0,
    can_approve INTEGER NOT NULL DEFAULT 0,
    can_export INTEGER NOT NULL DEFAULT 0,
    can_sync INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(role, module_key),
    FOREIGN KEY (module_key) REFERENCES permission_modules(module_key) ON DELETE CASCADE
);


-- Permissões padrão por perfil: função, coluna ou ação
CREATE TABLE IF NOT EXISTS role_function_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    module_key TEXT NOT NULL,
    function_key TEXT NOT NULL,
    can_view INTEGER NOT NULL DEFAULT 0,
    can_edit INTEGER NOT NULL DEFAULT 0,
    can_execute INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(role, module_key, function_key),
    FOREIGN KEY (module_key, function_key) 
        REFERENCES permission_functions(module_key, function_key) 
        ON DELETE CASCADE
);


-- Permissão individual por usuário: acesso ao módulo
CREATE TABLE IF NOT EXISTS user_module_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    module_key TEXT NOT NULL,
    can_view INTEGER NOT NULL DEFAULT 0,
    can_edit INTEGER NOT NULL DEFAULT 0,
    can_delete INTEGER NOT NULL DEFAULT 0,
    can_approve INTEGER NOT NULL DEFAULT 0,
    can_export INTEGER NOT NULL DEFAULT 0,
    can_sync INTEGER NOT NULL DEFAULT 0,
    override_role INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, module_key),
    FOREIGN KEY (module_key) REFERENCES permission_modules(module_key) ON DELETE CASCADE
);


-- Permissão individual por usuário: função, coluna ou ação
CREATE TABLE IF NOT EXISTS user_function_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    module_key TEXT NOT NULL,
    function_key TEXT NOT NULL,
    can_view INTEGER NOT NULL DEFAULT 0,
    can_edit INTEGER NOT NULL DEFAULT 0,
    can_execute INTEGER NOT NULL DEFAULT 0,
    override_role INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, module_key, function_key),
    FOREIGN KEY (module_key, function_key) 
        REFERENCES permission_functions(module_key, function_key) 
        ON DELETE CASCADE
);


-- Registrar módulos controláveis
INSERT OR IGNORE INTO permission_modules 
    (module_key, module_label, route, is_active)
VALUES
    ('home', 'Início', '/', 1),
    ('products', 'Produtos', '/products', 1),
    ('product-audit', 'Auditoria de Produtos', '/product-audit', 1),
    ('product-corrections', 'Correções de Produtos', '/product-corrections', 1),
    ('price-pending', 'Preços e Pendências', '/price-pending', 1),
    ('purchases', 'Compras', '/purchases', 1),
    ('industry-contacts', 'Contatos', '/industry-contacts', 1),
    ('notifications', 'Notificações', '/notifications', 1),
    ('email', 'E-mail', '/email', 1),
    ('settings', 'Configurações', '/settings', 1);


-- Registrar funções do módulo Preços e Pendências
INSERT OR IGNORE INTO permission_functions
    (module_key, function_key, function_label, function_type, parent_key, is_active)
VALUES
    ('price-pending', 'view_table', 'Ver tabela', 'action', NULL, 1),
    ('price-pending', 'search_laboratory', 'Buscar laboratório', 'action', NULL, 1),
    ('price-pending', 'filter_updated', 'Filtrar atualizados', 'action', NULL, 1),
    ('price-pending', 'filter_outdated', 'Filtrar desatualizados', 'action', NULL, 1),
    ('price-pending', 'filter_branch', 'Filtrar por filial', 'action', NULL, 1),
    ('price-pending', 'add_laboratory', 'Adicionar laboratório', 'action', NULL, 1),
    ('price-pending', 'edit_laboratory', 'Editar laboratório', 'action', NULL, 1),
    ('price-pending', 'edit_observation', 'Editar observação', 'action', NULL, 1),
    ('price-pending', 'edit_values', 'Editar valores por filial', 'action', NULL, 1),
    ('price-pending', 'remove_laboratory', 'Remover laboratório', 'action', NULL, 1),
    ('price-pending', 'refresh_data', 'Atualizar planilhas', 'action', NULL, 1),
    ('price-pending', 'export_excel', 'Exportar Excel', 'action', NULL, 1),
    ('price-pending', 'view_ignored_files', 'Ver arquivos ignorados', 'action', NULL, 1),


    ('price-pending', 'industry_global_code', 'Código Global', 'column', NULL, 1),
    ('price-pending', 'laboratory', 'Laboratório', 'column', NULL, 1),
    ('price-pending', 'observation', 'Observação', 'column', NULL, 1),


    ('price-pending', 'env_precos', 'Preços Recebidos', 'column_group', NULL, 1),
    ('price-pending', 'env_precos_dpr', 'Preços Recebidos - DPR', 'column', 'env_precos', 1),
    ('price-pending', 'env_precos_ams', 'Preços Recebidos - AMS', 'column', 'env_precos', 1),
    ('price-pending', 'env_precos_dmt', 'Preços Recebidos - DMT', 'column', 'env_precos', 1),
    ('price-pending', 'env_precos_dms', 'Preços Recebidos - DMS', 'column', 'env_precos', 1),
    ('price-pending', 'env_precos_dsc', 'Preços Recebidos - DSC', 'column', 'env_precos', 1),


    ('price-pending', 'env_pend', 'Pendências Recebidas', 'column_group', NULL, 1),
    ('price-pending', 'env_pend_dpr', 'Pendências Recebidas - DPR', 'column', 'env_pend', 1),
    ('price-pending', 'env_pend_ams', 'Pendências Recebidas - AMS', 'column', 'env_pend', 1),
    ('price-pending', 'env_pend_dmt', 'Pendências Recebidas - DMT', 'column', 'env_pend', 1),
    ('price-pending', 'env_pend_dms', 'Pendências Recebidas - DMS', 'column', 'env_pend', 1),
    ('price-pending', 'env_pend_dsc', 'Pendências Recebidas - DSC', 'column', 'env_pend', 1),


    ('price-pending', 'precos_ok', 'Preços Atualizados', 'column_group', NULL, 1),
    ('price-pending', 'precos_ok_dpr', 'Preços Atualizados - DPR', 'column', 'precos_ok', 1),
    ('price-pending', 'precos_ok_ams', 'Preços Atualizados - AMS', 'column', 'precos_ok', 1),
    ('price-pending', 'precos_ok_dmt', 'Preços Atualizados - DMT', 'column', 'precos_ok', 1),
    ('price-pending', 'precos_ok_dms', 'Preços Atualizados - DMS', 'column', 'precos_ok', 1),
    ('price-pending', 'precos_ok_dsc', 'Preços Atualizados - DSC', 'column', 'precos_ok', 1),


    ('price-pending', 'pendencias_ok', 'Pendências Atualizadas', 'column_group', NULL, 1),
    ('price-pending', 'pendencias_ok_dpr', 'Pendências Atualizadas - DPR', 'column', 'pendencias_ok', 1),
    ('price-pending', 'pendencias_ok_ams', 'Pendências Atualizadas - AMS', 'column', 'pendencias_ok', 1),
    ('price-pending', 'pendencias_ok_dmt', 'Pendências Atualizadas - DMT', 'column', 'pendencias_ok', 1),
    ('price-pending', 'pendencias_ok_dms', 'Pendências Atualizadas - DMS', 'column', 'pendencias_ok', 1),
    ('price-pending', 'pendencias_ok_dsc', 'Pendências Atualizadas - DSC', 'column', 'pendencias_ok', 1);


-- Permissões padrão do Criador
INSERT OR IGNORE INTO role_module_permissions
    (role, module_key, can_view, can_edit, can_delete, can_approve, can_export, can_sync)
VALUES
    ('creator', 'home', 1, 1, 1, 1, 1, 1),
    ('creator', 'products', 1, 1, 1, 1, 1, 1),
    ('creator', 'product-audit', 1, 1, 1, 1, 1, 1),
    ('creator', 'product-corrections', 1, 1, 1, 1, 1, 1),
    ('creator', 'price-pending', 1, 1, 1, 1, 1, 1),
    ('creator', 'purchases', 1, 1, 1, 1, 1, 1),
    ('creator', 'industry-contacts', 1, 1, 1, 1, 1, 1),
    ('creator', 'notifications', 1, 1, 1, 1, 1, 1),
    ('creator', 'email', 1, 1, 1, 1, 1, 1),
    ('creator', 'settings', 1, 1, 1, 1, 1, 1);


-- Permissões padrão do Administrador
INSERT OR IGNORE INTO role_module_permissions
    (role, module_key, can_view, can_edit, can_delete, can_approve, can_export, can_sync)
VALUES
    ('admin', 'home', 1, 1, 1, 1, 1, 1),
    ('admin', 'products', 1, 1, 1, 1, 1, 1),
    ('admin', 'product-audit', 1, 1, 1, 1, 1, 1),
    ('admin', 'product-corrections', 1, 1, 1, 1, 1, 1),
    ('admin', 'price-pending', 1, 1, 1, 1, 1, 1),
    ('admin', 'purchases', 1, 1, 1, 1, 1, 1),
    ('admin', 'industry-contacts', 1, 1, 1, 1, 1, 1),
    ('admin', 'notifications', 1, 1, 1, 1, 1, 1),
    ('admin', 'email', 1, 1, 1, 1, 1, 1),
    ('admin', 'settings', 1, 1, 0, 1, 1, 1);


-- Permissões padrão do Editor
INSERT OR IGNORE INTO role_module_permissions
    (role, module_key, can_view, can_edit, can_delete, can_approve, can_export, can_sync)
VALUES
    ('editor', 'home', 1, 1, 0, 0, 1, 1),
    ('editor', 'products', 1, 1, 0, 0, 1, 1),
    ('editor', 'product-audit', 1, 1, 0, 0, 1, 0),
    ('editor', 'product-corrections', 1, 1, 0, 0, 1, 0),
    ('editor', 'price-pending', 1, 1, 0, 0, 1, 1),
    ('editor', 'purchases', 1, 1, 0, 0, 1, 1),
    ('editor', 'industry-contacts', 1, 1, 0, 0, 1, 0),
    ('editor', 'notifications', 1, 0, 0, 0, 0, 0),
    ('editor', 'email', 1, 1, 0, 0, 1, 0),
    ('editor', 'settings', 1, 0, 0, 0, 0, 0);


-- Permissões padrão do Visualizador
INSERT OR IGNORE INTO role_module_permissions
    (role, module_key, can_view, can_edit, can_delete, can_approve, can_export, can_sync)
VALUES
    ('viewer', 'home', 1, 0, 0, 0, 0, 0),
    ('viewer', 'products', 1, 0, 0, 0, 0, 0),
    ('viewer', 'product-audit', 1, 0, 0, 0, 0, 0),
    ('viewer', 'product-corrections', 1, 0, 0, 0, 0, 0),
    ('viewer', 'price-pending', 1, 0, 0, 0, 0, 0),
    ('viewer', 'purchases', 1, 0, 0, 0, 0, 0),
    ('viewer', 'industry-contacts', 1, 0, 0, 0, 0, 0),
    ('viewer', 'notifications', 1, 0, 0, 0, 0, 0),
    ('viewer', 'email', 1, 0, 0, 0, 0, 0),
    ('viewer', 'settings', 1, 0, 0, 0, 0, 0);


-- Permissões padrão do Pendente
INSERT OR IGNORE INTO role_module_permissions
    (role, module_key, can_view, can_edit, can_delete, can_approve, can_export, can_sync)
VALUES
    ('pending', 'home', 1, 0, 0, 0, 0, 0),
    ('pending', 'notifications', 1, 0, 0, 0, 0, 0);


-- Permissões padrão do Criador para Preços e Pendências
INSERT OR IGNORE INTO role_function_permissions
    (role, module_key, function_key, can_view, can_edit, can_execute)
SELECT
    'creator',
    function_key,
    function_key,
    1,
    CASE 
        WHEN function_key IN (
            'laboratory',
            'observation'
        ) THEN 1
        WHEN function_type = 'column' 
            AND function_key NOT IN ('industry_global_code') THEN 1
        ELSE 0
    END,
    CASE 
        WHEN function_type = 'action' THEN 1
        ELSE 0
    END
FROM permission_functions
WHERE module_key = 'price-pending';


-- Permissões padrão do Administrador para Preços e Pendências
INSERT OR IGNORE INTO role_function_permissions
    (role, module_key, function_key, can_view, can_edit, can_execute)
SELECT
    'admin',
    function_key,
    function_key,
    1,
    CASE 
        WHEN function_key IN (
            'laboratory',
            'observation'
        ) THEN 1
        WHEN function_type = 'column' 
            AND function_key NOT IN ('industry_global_code') THEN 1
        ELSE 0
    END,
    CASE 
        WHEN function_type = 'action' THEN 1
        ELSE 0
    END
FROM permission_functions
WHERE module_key = 'price-pending';


-- Permissões padrão do Editor para Preços e Pendências
INSERT OR IGNORE INTO role_function_permissions
    (role, module_key, function_key, can_view, can_edit, can_execute)
SELECT
    'editor',
    function_key,
    function_key,
    1,
    CASE 
        WHEN function_key IN (
            'laboratory',
            'observation'
        ) THEN 1
        WHEN function_type = 'column' 
            AND function_key NOT IN ('industry_global_code') THEN 1
        ELSE 0
    END,
    CASE 
        WHEN function_type = 'action' THEN 1
        ELSE 0
    END
FROM permission_functions
WHERE module_key = 'price-pending';


-- Permissões padrão do Visualizador para Preços e Pendências
INSERT OR IGNORE INTO role_function_permissions
    (role, module_key, function_key, can_view, can_edit, can_execute)
SELECT
    'viewer',
    function_key,
    function_key,
    1,
    0,
    CASE 
        WHEN function_key IN (
            'view_table',
            'search_laboratory',
            'filter_updated',
            'filter_outdated',
            'filter_branch'
        ) THEN 1
        ELSE 0
    END
FROM permission_functions
WHERE module_key = 'price-pending';


-- Permissões padrão do Pendente para Preços e Pendências
INSERT OR IGNORE INTO role_function_permissions
    (role, module_key, function_key, can_view, can_edit, can_execute)
SELECT
    'pending',
    function_key,
    function_key,
    0,
    0,
    0
FROM permission_functions
WHERE module_key = 'price-pending';


-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_permission_modules_key 
    ON permission_modules(module_key);


CREATE INDEX IF NOT EXISTS idx_permission_functions_module 
    ON permission_functions(module_key);


CREATE INDEX IF NOT EXISTS idx_permission_functions_type 
    ON permission_functions(function_type);


CREATE INDEX IF NOT EXISTS idx_role_module_permissions_role 
    ON role_module_permissions(role);


CREATE INDEX IF NOT EXISTS idx_role_module_permissions_module 
    ON role_module_permissions(module_key);


CREATE INDEX IF NOT EXISTS idx_role_function_permissions_role 
    ON role_function_permissions(role);


CREATE INDEX IF NOT EXISTS idx_role_function_permissions_module 
    ON role_function_permissions(module_key);


CREATE INDEX IF NOT EXISTS idx_user_module_permissions_user 
    ON user_module_permissions(user_id);


CREATE INDEX IF NOT EXISTS idx_user_module_permissions_module 
    ON user_module_permissions(module_key);


CREATE INDEX IF NOT EXISTS idx_user_function_permissions_user 
    ON user_function_permissions(user_id);


CREATE INDEX IF NOT EXISTS idx_user_function_permissions_module 
    ON user_function_permissions(module_key);