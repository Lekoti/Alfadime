/**
 * Serviço de importação da Curva de Compras (lado renderer).
 */

export async function loadPurchaseCurveSummary() {
  if (!window.alfadime?.purchaseCurve) {
    throw new Error('API de Curva de Compras não disponível no preload.');
  }

  return window.alfadime.purchaseCurve.loadSummary();
}

export async function runPurchaseCurveImport() {
  if (!window.alfadime?.purchaseCurve) {
    throw new Error('API de Curva de Compras não disponível no preload.');
  }

  return window.alfadime.purchaseCurve.runImport();
}
