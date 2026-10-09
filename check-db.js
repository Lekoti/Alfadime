const Database = require("better-sqlite3");

const db = new Database(
    "C:/Users/USER/AppData/Roaming/alfadime/data/alfadime.db"
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