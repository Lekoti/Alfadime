const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

const USERS_DB_DIRECTORY = process.env.ALFADIME_SERVER_USERS_DB_PATH
    ? path.resolve(process.env.ALFADIME_SERVER_USERS_DB_PATH)
    : path.join(__dirname, "data");

process.env.ALFADIME_USERS_DB_PATH = USERS_DB_DIRECTORY;

if (!fs.existsSync(USERS_DB_DIRECTORY)) {
    fs.mkdirSync(USERS_DB_DIRECTORY, { recursive: true });
}

const { closeDatabase } = require("../src/main/database/connection");
const { handleRequest } = require("./routes/api.routes");

const PORT = Number(process.env.ALFADIME_API_PORT || 5178);
const HOST = process.env.ALFADIME_API_HOST || "0.0.0.0";

function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = "";

        req.on("data", (chunk) => {
            raw += chunk;

            if (raw.length > 1024 * 1024) {
                reject(new Error("Corpo da requisição muito grande."));
                req.destroy();
            }
        });

        req.on("end", () => {
            if (!raw) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(raw));
            } catch {
                reject(new Error("JSON inválido."));
            }
        });

        req.on("error", reject);
    });
}

const server = http.createServer(async (req, res) => {
    try {
        const body = await readBody(req);

        await handleRequest(req, res, body);
    } catch (error) {
        console.error("[API] Erro na requisição:", error);

        res.writeHead(400, {
            "Content-Type": "application/json; charset=utf-8"
        });

        res.end(JSON.stringify({
            success: false,
            error: error?.message || "Requisição inválida."
        }));
    }
});

server.listen(PORT, HOST, () => {
    console.log(`[API] Alfadime Users API ativa em http://${HOST}:${PORT}`);
    console.log(`[API] Banco de usuários: ${USERS_DB_DIRECTORY}`);
});

process.on("SIGINT", () => {
    closeDatabase();
    server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
    closeDatabase();
    server.close(() => process.exit(0));
});