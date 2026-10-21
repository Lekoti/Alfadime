const fs = require('node:fs');
const path = require('node:path');



const NETWORK_PATHS = Object.freeze({
    DATABASE: '\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\BANCO DE DADOS',
    EMAIL: '\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\EMAIL',
    PRODUCTS: '\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\PRODUTOS',
    PURCHASES: '\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\CURVA COMPRAS'
});



function checkPath(pathToCheck) {
    try {
        const accessible = fs.existsSync(pathToCheck);


        return {
            key: pathToCheck,
            path: pathToCheck,
            accessible,
            error: accessible
                ? null
                : 'Pasta não acessível.'
        };
    } catch (error) {
        return {
            key: pathToCheck,
            path: pathToCheck,
            accessible: false,
            error: error?.message || 'Erro ao verificar pasta.'
        };
    }
}



function getNetworkStatus() {
    const checks = Object.values(NETWORK_PATHS)
        .map((pathToCheck) => checkPath(pathToCheck));


    const accessiblePaths = checks.filter(
        (check) => check.accessible
    );


    const unavailablePaths = checks.filter(
        (check) => !check.accessible
    );


    let status = 'offline';


    if (accessiblePaths.length === checks.length) {
        status = 'online';
    } else if (accessiblePaths.length > 0) {
        status = 'parcial';
    }


    return {
        status,
        online: status === 'online',
        checkedAt: new Date().toISOString(),
        totalPaths: checks.length,
        accessibleCount: accessiblePaths.length,
        unavailableCount: unavailablePaths.length,
        checks,
        unavailablePaths,
        message: status === 'online'
            ? 'Conexão com a rede OK.'
            : status === 'parcial'
                ? 'Algumas pastas da rede não estão acessíveis.'
                : 'Rede indisponível. Verifique a conexão com o servidor.'
    };
}



function requireNetworkAccess(requiredPaths = []) {
    const status = getNetworkStatus();


    if (status.online) {
        return status;
    }


    const missing = requiredPaths.length
        ? status.checks.filter((check) => {
            return requiredPaths.includes(check.key) &&
                !check.accessible;
        })
        : status.unavailablePaths;


    const details = missing
        .map((check) => check.path)
        .join('\n');


    throw new Error(
        `Rede indisponível ou pasta não acessível.\n${details}`
    );
}



function isNetworkOnline() {
    return getNetworkStatus().online;
}



module.exports = {
    NETWORK_PATHS,
    getNetworkStatus,
    requireNetworkAccess,
    isNetworkOnline
};
