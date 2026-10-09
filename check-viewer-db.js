const Database = require("better-sqlite3");

const db = new Database(
    "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\USUARIOS\\alfadime-users.db",
    { readonly: true }
);

console.log("USUARIOS:");
console.log(
    db.prepare("SELECT id, username, role, is_active FROM users").all()
);

console.log("MIGRACOES:");
console.log(
    db.prepare("SELECT filename FROM schema_migrations ORDER BY filename").all()
);

console.log("PERMISSOES VIEWER:");
console.log(
    db.prepare("SELECT module_key, can_view FROM role_module_permissions WHERE role = 'viewer' ORDER BY module_key").all()
);

console.log("OVERRIDES POR USUARIO:");
console.log(
    db.prepare("SELECT user_id, module_key, can_view FROM user_module_permissions ORDER BY user_id, module_key").all()
);

db.close();