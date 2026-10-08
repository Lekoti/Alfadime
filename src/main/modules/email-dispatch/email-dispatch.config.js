/**
 * Configurações do módulo de e-mail.
 * Compatível com execução dentro e fora do Electron.
 * 
 * Este arquivo agora importa configurações centralizadas.
 */


const {
    getEmailDataPath,
    getEmailAttachmentsPath,
    getEmailDownloadsPath,
    EMAIL_CONFIG
} = require('../../config/app.config');


module.exports = {
    EMAIL_CONFIG,
    getEmailDataPath,
    getEmailAttachmentsPath,
    getEmailDownloadsPath
};