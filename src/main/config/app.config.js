/**
 * Configurações centralizadas do aplicativo.
 * 
 * Este arquivo concentra todas as configurações que podem variar por ambiente,
 * cliente ou instalação. Módulos devem importar daqui em vez de definir
 * constantes locais.
 */


const path = require('node:path');


// ==================== DADOS DO USUÁRIO ====================


function getAppUserData() {
    try {
        const { app } = require('electron');
        if (app && typeof app.getPath === 'function') {
            return app.getPath('userData');
        }
    } catch {
        // Electron não disponível ou app não inicializado
    }

    // Fallback: usar pasta do projeto
    const projectRoot = path.resolve(__dirname, '../../..');
    return path.join(projectRoot, 'app-data');
}


function getEmailDataPath() {
    return path.join(getAppUserData(), 'email');
}


function getEmailAttachmentsPath() {
    return path.join(getEmailDataPath(), 'attachments');
}


function getEmailDownloadsPath() {
    return path.join(getEmailDataPath(), 'downloads');
}


function getPendingProcessedPath() {
    return path.join(getEmailDownloadsPath(), 'processados', 'pendencias');
}


// ==================== CONFIGURAÇÕES DE REDE ====================
// Altere estes valores conforme o ambiente do cliente.


const NETWORK_CONFIG = {
    // Servidor de arquivos
    FILE_SERVER: '\\\\10.0.0.20',

    // Pastas compartilhadas
    PURCHASES_FOLDER: '\\Compras\\1.COMPRAS',

    // Subpastas específicas
    PRICES_SUBFOLDER: '\\PRECOS SUBIDOS SIRIUS\\PRECOS ATUALIZADOS',
    PENDING_SUBFOLDER: '\\PRECOS\\PENDENCIAS'
};


// ==================== CAMINHOS DERIVADOS ====================


const DESTINATION_FOLDERS = {
    PRICES: NETWORK_CONFIG.FILE_SERVER + NETWORK_CONFIG.PURCHASES_FOLDER + NETWORK_CONFIG.PRICES_SUBFOLDER,
    PENDING: NETWORK_CONFIG.FILE_SERVER + NETWORK_CONFIG.PURCHASES_FOLDER + NETWORK_CONFIG.PENDING_SUBFOLDER
};


// ==================== CONFIGURAÇÕES DE E-MAIL ====================


const EMAIL_CONFIG = {
    // Intervalo entre envios (ms)
    SEND_INTERVAL_MS: 2000,

    // Intervalo de verificação IMAP (ms)
    IMAP_POLL_INTERVAL_MS: 60000,

    // Timeout de conexão (ms)
    CONNECTION_TIMEOUT_MS: 30000,

    // Pasta de anexos enviados
    ATTACHMENTS_PATH: getEmailAttachmentsPath(),

    // Pasta de downloads (respostas)
    DOWNLOADS_PATH: getEmailDownloadsPath(),

    // Pasta de pendências processadas
    PENDING_PROCESSED_PATH: getPendingProcessedPath(),

    // Padrões de nome de arquivo para respostas
    FILE_NAME_PATTERNS: {
        PRICES: 'PREÇOS - {{laboratorio}} - {{mes}}-{{ano}}.xlsx',
        PENDING: 'PENDENCIAS - {{laboratorio}} - {{mes}}-{{ano}}.xlsx'
    },

    // Pastas de destino (serão sobrescritas pelas configurações de rede)
    DESTINATION_FOLDERS: DESTINATION_FOLDERS
};


// ==================== CONFIGURAÇÕES DE COMPRAS ====================


const PURCHASES_CONFIG = {
    // Curva padrão (dias)
    DEFAULT_CURVE_DAYS: {
        A: 90,
        B: 60,
        C: 30,
        D: 30,
        E: 30,
        F: 30,
        G: 30
    },

    // Filiais
    BRANCHES: {
        DPR: 'DIMEBRAS PR',
        AMS: 'ALFAMED MS',
        DMT: 'DIMEBRAS MT',
        DMS: 'DIMEBRAS MS',
        DSC: 'DIMEBRAS SC'
    }
};


// ==================== EXPORTAÇÕES ====================


module.exports = {
    // Caminhos
    getAppUserData,
    getEmailDataPath,
    getEmailAttachmentsPath,
    getEmailDownloadsPath,
    getPendingProcessedPath,

    // Configurações
    NETWORK_CONFIG,
    DESTINATION_FOLDERS,
    EMAIL_CONFIG,
    PURCHASES_CONFIG
};