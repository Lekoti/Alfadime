const http = require("node:http");


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
    console.log("[API] Banco de usuários centralizado na rede.");
});



process.on("SIGINT", () => {
    closeDatabase();
    server.close(() => process.exit(0));
});



process.on("SIGTERM", () => {
    closeDatabase();
    server.close(() => process.exit(0));
});