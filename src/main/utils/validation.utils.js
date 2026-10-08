/**
 * Utilitários de validação compartilhados (main process).
 */

// Regex simples e segura (sem grupos aninhados/backtracking catastrófico) para validar formato básico de e-mail.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Verifica se o valor informado é um e-mail com formato válido.
 * @param {*} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    return EMAIL_PATTERN.test(String(email || '').trim());
}

/**
 * Converte um valor para número, retornando um fallback seguro quando o resultado for NaN/infinito.
 * @param {*} value
 * @param {number} fallback
 * @returns {number}
 */
function toSafeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
    EMAIL_PATTERN,
    isValidEmail,
    toSafeNumber
};
