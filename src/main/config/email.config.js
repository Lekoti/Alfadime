/**
 * Configurações centralizadas do módulo de e-mail (constantes de negócio antes hardcoded
 * dentro dos serviços de email-dispatch).
 */

// Mapeamento filial -> código da empresa, usado ao montar a planilha de preços/pendências.
const BRANCH_TO_COMPANY = Object.freeze({
    DPR: 1,
    AMS: 2,
    DMT: 3,
    DMS: 5,
    DSC: 6
});

// Pasta de rede padrão para onde as planilhas de preços processadas são exportadas.
const PRICE_DESTINATION =
    '\\\\10.0.0.20\\Compras\\1.COMPRAS\\PRECOS SUBIDOS SIRIUS\\FALTA SUBIR';

module.exports = {
    BRANCH_TO_COMPANY,
    PRICE_DESTINATION
};
