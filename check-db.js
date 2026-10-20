const Database = require("better-sqlite3");


const db = new Database(
    "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS\\alfadime.db",
    { readonly: true }
);


console.log("MIGRATIONS REGISTRADAS:");


console.log(
    db
        .prepare("SELECT * FROM schema_migrations ORDER BY id")
        .all()
);


console.log("ESTRUTURA DA TABELA module_permissions:");


console.log(
    db
        .prepare("PRAGMA table_info(module_permissions)")
        .all()
);


db.close();