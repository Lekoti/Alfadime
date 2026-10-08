/**
 * CORREÇÃO: Normalização de nomenclatura (camelCase vs snake_case)
 * 
 * Problema: Backend retorna dados com formatos inconsistentes
 * - suggestedquantity vs suggestedQuantity
 * - effectivecurve vs effectiveCurve
 * - lastpurchaseprice vs lastPurchasePrice
 * 
 * Solução: Criar função de normalização centralizada
 */

// ============================================================================
// FUNÇÃO DE NORMALIZAÇÃO (usar no service ou repository)
// ============================================================================

/**
 * Normaliza um objeto de produto de compras para formato consistente
 * @param {Object} row - Dados crus do banco/API
 * @returns {Object} - Dados normalizados em camelCase
 */
function normalizePurchaseRow(row) {
  if (!row) {
    return null;
  }
  
  return {
    // Identificadores
    id: row.id,
    company: row.company,
    productcode: row.product_code ?? row.productcode ?? row.code ?? "",
    
    // Informações do produto
    barcode: row.barcode ?? row.ean ?? "",
    description: row.description,
    laboratoryname: row.laboratory_name ?? row.laboratoryname ?? "",
    
    // Estoque
    currentstock: toSafeNumber(row.current_stock ?? row.currentstock ?? row.currentStock),
    blockedstock: toSafeNumber(row.blocked_stock ?? row.blockedstock ?? row.blockedStock),
    
    // Vendas médias
    averagesale12m: toSafeNumber(row.average_sale_12m ?? row.averagesale12m ?? row.averageSale12m),
    averagesale6m: toSafeNumber(row.average_sale_6m ?? row.averagesale6m ?? row.averageSale6m),
    averagesale3m: toSafeNumber(row.average_sale_3m ?? row.averagesale3m ?? row.averageSale3m),
    
    // Preços de compra (últimas 3 compras)
    lastpurchaseprice: toNullableNumber(row.last_purchase_price ?? row.lastpurchaseprice ?? row.lastPurchasePrice),
    penultimatepurchaseprice: toNullableNumber(row.penultimate_purchase_price ?? row.penultimatepurchaseprice ?? row.penultimatePurchasePrice),
    antepenultimatepurchaseprice: toNullableNumber(row.antepenultimate_purchase_price ?? row.antepenultimatepurchaseprice ?? row.antepenultimatePurchasePrice),
    averagecost: toNullableNumber(row.average_cost ?? row.averagecost ?? row.averageCost),
    
    // Preços por filial
    lastpurchasepricedpr: toNullableNumber(row.lastpurchasepricedpr || row.lastPurchasePriceDPR),
    lastpurchasepriceams: toNullableNumber(row.lastpurchasepriceams || row.lastPurchasePriceAMS),
    lastpurchasepricedmt: toNullableNumber(row.lastpurchasepricedmt || row.lastPurchasePriceDMT),
    lastpurchasepricedms: toNullableNumber(row.lastpurchasepricedms || row.lastPurchasePriceDMS),
    lastpurchasepricedsc: toNullableNumber(row.lastpurchasepricedsc || row.lastPurchasePriceDSC),
    
    // Curva
    curvevalue: row.curve_value ?? row.curvevalue ?? row.curveValue ?? null,
    curveunit: row.curve_unit ?? row.curveunit ?? row.curveUnit ?? null,
    effectivecurve: normalizeCurve(row.effective_curve ?? row.effectivecurve ?? row.effectiveCurve),
    
    // Caixa padrão
    standardbox: toSafeNumber(row.standard_box ?? row.standardbox ?? row.standardBox),
    
    // Quantidades mensais
    janquantity: toSafeNumber(row.jan_quantity ?? row.janquantity ?? row.janQuantity),
    febquantity: toSafeNumber(row.feb_quantity ?? row.febquantity ?? row.febQuantity),
    marquantity: toSafeNumber(row.mar_quantity ?? row.marquantity ?? row.marQuantity),
    aprquantity: toSafeNumber(row.apr_quantity ?? row.aprquantity ?? row.aprQuantity),
    mayquantity: toSafeNumber(row.may_quantity ?? row.mayquantity ?? row.mayQuantity),
    junquantity: toSafeNumber(row.jun_quantity ?? row.junquantity ?? row.junQuantity),
    julquantity: toSafeNumber(row.jul_quantity ?? row.julquantity ?? row.julQuantity),
    augquantity: toSafeNumber(row.aug_quantity ?? row.augquantity ?? row.augQuantity),
    sepquantity: toSafeNumber(row.sep_quantity ?? row.sepquantity ?? row.sepQuantity),
    octquantity: toSafeNumber(row.oct_quantity ?? row.octquantity ?? row.octQuantity),
    novquantity: toSafeNumber(row.nov_quantity ?? row.novquantity ?? row.novQuantity),
    decquantity: toSafeNumber(row.dec_quantity ?? row.decquantity ?? row.decQuantity),
    
    // Metadados
    sourcefilename: row.source_file_name ?? row.sourcefilename ?? row.sourceFilename ?? "",
    importedat: row.imported_at ?? row.importedat ?? row.importedAt ?? null,
    createdat: row.created_at ?? row.createdat ?? row.createdAt ?? null,
    updatedat: row.updated_at ?? row.updatedat ?? row.updatedAt ?? null
  };
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function toSafeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  
  const parsed = Number(value);
  
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  
  return parsed;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const parsed = Number(value);
  
  if (!Number.isFinite(parsed)) {
    return null;
  }
  
  return parsed;
}

function normalizeCurve(value) {
  if (!value) {
    return null;
  }
  
  const curve = String(value).trim().toUpperCase();
  
  if (!/^[A-Z]$/.test(curve)) {
    return null;
  }
  
  return curve;
}

// ============================================================================
// VERSÃO SIMPLIFICADA (para componentes React)
// ============================================================================

/**
 * Para uso em componentes onde performance é crítica
 * @param {Object} row - Dados crus
 * @returns {Object} - Dados com campos essenciais normalizados
 */
function normalizePurchaseRowMinimal(row) {
  if (!row) {
    return null;
  }
  
  return {
    ...row,
    effectivecurve: normalizeCurve(row.effective_curve ?? row.effectivecurve ?? row.effectiveCurve),
    suggestedquantity: toSafeNumber(row.suggestedquantity || row.suggestedQuantity),
    currentstock: toSafeNumber(row.current_stock ?? row.currentstock ?? row.currentStock),
    blockedstock: toSafeNumber(row.blocked_stock ?? row.blockedstock ?? row.blockedStock),
    standardbox: toSafeNumber(row.standardbox || row.standardBox)
  };
}

// ============================================================================
// EXEMPLO DE USO NO SERVICE
// ============================================================================

/*
// purchases.service.js
const repository = require('./purchases.repository');
const calculatePurchaseSuggestion = require('./purchases-calculation.service');

async function listPurchaseSuggestions(filters) {
  const result = await repository.listCurveProducts(filters);
  
  // NORMALIZAR TODOS OS REGISTROS
  const normalizedRows = result.rows.map(row => normalizePurchaseRow(row));
  
  // Calcular sugestões com dados normalizados
  const rows = normalizedRows.map(row => 
    calculatePurchaseSuggestion(row, {}, filters.curveDays)
  );
  
  // Filtrar por status
  const filteredRows = rows.filter(row => {
    const status = filters.status;
    const coverageDays = row.coverageDays;
    const targetDays = Number(row.targetDays) || 0;
    const suggestedQuantity = Number(row.suggestedquantity) || 0;
    const hasCoverage = coverageDays !== null && coverageDays !== undefined;
    const hasPrice = row.unitprice !== null && row.unitprice !== undefined && Number(row.unitprice) > 0;
    
    if (status === 'suggestion') return suggestedQuantity > 0;
    if (status === 'belowtarget') return hasCoverage && coverageDays < targetDays;
    if (status === 'critical') return hasCoverage && coverageDays < 15;
    if (status === 'nobuy') return hasCoverage && coverageDays >= targetDays;
    if (status === 'excessstock') return hasCoverage && targetDays > 0 && coverageDays > targetDays * 2;
    if (status === 'promotion') return hasCoverage && targetDays > 0 && coverageDays > targetDays * 3;
    if (status === 'nosales') return !hasCoverage;
    if (status === 'noprice') return suggestedQuantity > 0 && !hasPrice;
    
    return true;
  });
  
  const summary = filteredRows.reduce((total, row) => ({
    products: total.products + 1,
    suggestedQuantity: total.suggestedQuantity + Number(row.suggestedquantity) || 0,
    suggestedValue: total.suggestedValue + Number(row.totalsuggestionvalue) || 0,
    criticalProducts: total.criticalProducts + (row.isCritical ? 1 : 0)
  }), { products: 0, suggestedQuantity: 0, suggestedValue: 0, criticalProducts: 0 });
  
  return {
    rows: filteredRows,
    summary,
    pagination: result.pagination
  };
}
*/

module.exports = {
  normalizePurchaseRow,
  normalizePurchaseRowMinimal,
  toSafeNumber,
  toNullableNumber,
  normalizeCurve
};