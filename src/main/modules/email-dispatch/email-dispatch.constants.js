/**
 * Constantes do módulo de envio e recebimento de e-mails.
 */

const EMAIL_STATUS = {
    PENDING: 'pending',
    SENT: 'sent',
    REPLIED: 'replied',
    ERROR: 'error'
};

const EMAIL_FILE_TYPE = {
    PRICES: 'prices',
    PENDING: 'pending'
};

const EMAIL_SECURE_MODES = {
    NONE: 'none',
    STARTTLS: 'starttls',
    TLS: 'tls'
};

const DEFAULT_SEND_INTERVAL_MS = 2000; // 2 segundos entre envios
const DEFAULT_IMAP_POLL_INTERVAL_MS = 60000; // 1 minuto entre verificações

module.exports = {
    EMAIL_STATUS,
    EMAIL_FILE_TYPE,
    EMAIL_SECURE_MODES,
    DEFAULT_SEND_INTERVAL_MS,
    DEFAULT_IMAP_POLL_INTERVAL_MS
};
