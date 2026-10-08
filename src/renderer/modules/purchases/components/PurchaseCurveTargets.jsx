import React from 'react';

const CURVES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
    .format(value || 0);
}

function PurchaseCurveTargets({ curveDays, rows, onCurveDaysChange }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  
  const summaryByCurve = CURVES.reduce((summary, curve) => {
    summary[curve] = { products: 0, suggestedQuantity: 0 };
    return summary;
  }, {});
  
  safeRows.forEach(row => {
    const curve = String(row.effectivecurve || row.effectiveCurve || '')
      .trim()
      .toUpperCase();
    
    if (!summaryByCurve[curve]) {
      return;
    }
    
    summaryByCurve[curve].products += 1;
    summaryByCurve[curve].suggestedQuantity += Number(row.suggestedquantity || row.suggestedQuantity || 0);
  });
  
  function changeDays(curve, value) {
    const parsed = Number(value);
    const days = Number.isFinite(parsed) 
      ? Math.min(365, Math.max(1, Math.round(parsed))) 
      : 1;
    
    onCurveDaysChange({
      ...curveDays,
      [curve]: days
    });
  }
  
  return (
    <section className="purchases-curve-targets">
      <div className="purchases-curve-targets-title">
        <strong>Meta de estoque por curva</strong>
        <span>Defina os dias de cobertura desejados.</span>
      </div>
      
      <div className="purchases-curve-targets-grid">
        {CURVES.map(curve => (
          <label className="purchases-curve-target" key={curve}>
            <span className="purchases-curve-name">
              Curva {curve}
            </span>
            <input
              type="number"
              min="1"
              max="365"
              value={curveDays[curve] || 30}
              onChange={(event) => changeDays(curve, event.target.value)}
            />
            <small>
              {formatNumber(summaryByCurve[curve].products)} itens • 
              {formatNumber(summaryByCurve[curve].suggestedQuantity)} un.
            </small>
          </label>
        ))}
      </div>
    </section>
  );
}

export default PurchaseCurveTargets;