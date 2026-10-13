const os = require("node:os");
const crypto = require("node:crypto");

const API_BASE_URL = (
    process.env.ALFADIME_API_URL ||
    "http://10.0.0.178:5178"
).replace(/\/$/, "");

const REQUEST_TIMEOUT_MS = Number(
    process.env.ALFADIME_API_TIMEOUT || 10000
);

let authToken = null;

function getComputerId() {
    const uniqueString = [
        os.hostname(),
        os.platform(),
        os.arch()
    ].join("-");

    return crypto
        .createHash("sha256")
        .update(uniqueString)
        .digest("hex")
        .substring(0, 16);
}

function getComputerName() {
    return os.hostname();
}

function setAuthToken(token) {
    authToken = token || null;
}

function getAuthToken() {
    return authToken;
}

async function request(method, pathname, body = null) {
    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
    );

    const headers = {
        "Content-Type": "application/json"
    };

    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${pathname}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                success: false,
                error: payload?.error ||
                    `Erro na API (${response.status}).`
            };
        }

        return payload;
    } catch (error) {
        if (error?.name === "AbortError") {
            return {
                success: false,
                error: "Servidor de usuários não respondeu."
            };
        }

        return {
            success: false,
            error: error?.message ||
                "Não foi possível conectar ao servidor de usuários."
        };
    } finally {
        clearTimeout(timeout);
    }
}

function get(pathname) {
    return request("GET", pathname);
}

function post(pathname, body) {
    return request("POST", pathname, body);
}

function put(pathname, body) {
    return request("PUT", pathname, body);
}

function patch(pathname, body) {
    return request("PATCH", pathname, body);
}

function del(pathname, body) {
    return request("DELETE", pathname, body);
}

module.exports = {
    API_BASE_URL,
    getComputerId,
    getComputerName,
    setAuthToken,
    getAuthToken,
    get,
    post,
    put,
    patch,
    del
};