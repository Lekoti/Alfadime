-- Migration 030: Tabela de usuários, sessões e permissões
-- Alfadime User Management System

-- Tabela principal de usuários
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'pending',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT,
    metadata TEXT
);

-- Tabela de sessões persistentes por computador
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    computer_id TEXT NOT NULL,
    computer_name TEXT,
    is_persistent INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_access_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, computer_id)
);

-- Tabela de permissões por módulo e role
CREATE TABLE IF NOT EXISTS module_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    module_key TEXT NOT NULL,
    can_view INTEGER NOT NULL DEFAULT 0,
    can_create INTEGER NOT NULL DEFAULT 0,
    can_edit INTEGER NOT NULL DEFAULT 0,
    can_delete INTEGER NOT NULL DEFAULT 0,
    can_approve INTEGER NOT NULL DEFAULT 0,
    UNIQUE(role, module_key)
);

-- Inserir usuário Criador padrão (sLekoti)
INSERT OR IGNORE INTO users (id, username, display_name, role, is_active) 
VALUES (1, 'sLekoti', 'sLekoti (Criador)', 'creator', 1);

-- Permissões para Creator (acesso total)
INSERT OR IGNORE INTO module_permissions (role, module_key, can_view, can_create, can_edit, can_delete, can_approve) VALUES
('creator', 'home', 1, 1, 1, 1, 1),
('creator', 'products', 1, 1, 1, 1, 1),
('creator', 'purchases', 1, 1, 1, 1, 1),
('creator', 'price-pending', 1, 1, 1, 1, 1),
('creator', 'product-corrections', 1, 1, 1, 1, 1),
('creator', 'product-audit', 1, 1, 1, 1, 1),
('creator', 'industry-contacts', 1, 1, 1, 1, 1),
('creator', 'email-dispatch', 1, 1, 1, 1, 1),
('creator', 'notifications', 1, 1, 1, 1, 1),
('creator', 'settings', 1, 1, 1, 1, 1);

-- Permissões para Admin
INSERT OR IGNORE INTO module_permissions (role, module_key, can_view, can_create, can_edit, can_delete, can_approve) VALUES
('admin', 'home', 1, 1, 1, 1, 1),
('admin', 'products', 1, 1, 1, 1, 1),
('admin', 'purchases', 1, 1, 1, 1, 1),
('admin', 'price-pending', 1, 1, 1, 1, 1),
('admin', 'product-corrections', 1, 1, 1, 1, 1),
('admin', 'product-audit', 1, 1, 1, 1, 1),
('admin', 'industry-contacts', 1, 1, 1, 1, 1),
('admin', 'email-dispatch', 1, 1, 1, 1, 1),
('admin', 'notifications', 1, 1, 1, 1, 1),
('admin', 'settings', 1, 1, 1, 0, 1);

-- Permissões para Editor
INSERT OR IGNORE INTO module_permissions (role, module_key, can_view, can_create, can_edit, can_delete, can_approve) VALUES
('editor', 'home', 1, 1, 1, 0, 0),
('editor', 'products', 1, 1, 1, 0, 0),
('editor', 'purchases', 1, 1, 1, 0, 0),
('editor', 'price-pending', 1, 1, 1, 0, 0),
('editor', 'product-corrections', 1, 1, 1, 0, 0),
('editor', 'product-audit', 1, 0, 1, 0, 0),
('editor', 'industry-contacts', 1, 1, 1, 0, 0),
('editor', 'email-dispatch', 1, 0, 1, 0, 0),
('editor', 'notifications', 1, 0, 0, 0, 0),
('editor', 'settings', 1, 0, 0, 0, 0);

-- Permissões para Viewer
INSERT OR IGNORE INTO module_permissions (role, module_key, can_view, can_create, can_edit, can_delete, can_approve) VALUES
('viewer', 'home', 1, 0, 0, 0, 0),
('viewer', 'products', 1, 0, 0, 0, 0),
('viewer', 'purchases', 1, 0, 0, 0, 0),
('viewer', 'price-pending', 1, 0, 0, 0, 0),
('viewer', 'product-corrections', 1, 0, 0, 0, 0),
('viewer', 'product-audit', 1, 0, 0, 0, 0),
('viewer', 'industry-contacts', 1, 0, 0, 0, 0),
('viewer', 'email-dispatch', 1, 0, 0, 0, 0),
('viewer', 'notifications', 1, 0, 0, 0, 0),
('viewer', 'settings', 1, 0, 0, 0, 0);

-- Permissões para Pending
INSERT OR IGNORE INTO module_permissions (role, module_key, can_view, can_create, can_edit, can_delete, can_approve) VALUES
('pending', 'home', 1, 0, 0, 0, 0),
('pending', 'notifications', 1, 0, 0, 0, 0);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_computer ON user_sessions(computer_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_role ON module_permissions(role);
CREATE INDEX IF NOT EXISTS idx_module_permissions_module ON module_permissions(module_key);