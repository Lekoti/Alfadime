import React, { useState, useCallback } from 'react';
import { usePurchaseCurveImport } from '../hooks/usePurchaseCurveImport';

/**
 * Página de conferência de importação da Curva de Compras.
 *
 * Fluxo:
 * 1. Carregar resumo (simulado ou real via IPC).
 * 2. Exibir resumo e produtos não encontrados.
 * 3. Confirmar ou cancelar importação.
 * 4. Exibir resultado final.
 */
export function PurchaseCurveImportPage() {
  const {
    loading,
    summary,
    notFoundProducts,
    logs,
    error,
    loadSummary,
    runImport,
    reset
  } = usePurchaseCurveImport();

  const [step, setStep] = useState('preview'); // 'preview' | 'running' | 'result'

  const handleLoadSummary = useCallback(async () => {
    setStep('preview');
    await loadSummary();
  }, [loadSummary]);

  const handleRunImport = useCallback(async () => {
    setStep('running');
    await runImport();
    setStep('result');
  }, [runImport]);

  const handleReset = useCallback(() => {
    reset();
    setStep('preview');
  }, [reset]);

  return (
    <div className="purchase-curve-import-page">
      <header className="page-header">
        <h1>Importação da Curva de Compras</h1>
        <p>
          Conferência e execução da importação da planilha CURVA COMPRAS.xlsx
        </p>
      </header>

      <section className="import-actions">
        {step === 'preview' && (
          <button
            onClick={handleLoadSummary}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Carregando resumo...' : 'Carregar resumo da importação'}
          </button>
        )}

        {step === 'preview' && summary && (
          <button
            onClick={handleRunImport}
            disabled={loading}
            className="btn btn-success"
          >
            {loading ? 'Importando...' : 'Confirmar importação'}
          </button>
        )}

        {step === 'result' && (
          <button onClick={handleReset} className="btn btn-secondary">
            Nova importação
          </button>
        )}
      </section>

      {error && (
        <section className="import-error">
          <h2>Erro</h2>
          <pre>{error}</pre>
        </section>
      )}

      {summary && step === 'preview' && (
        <section className="import-summary">
          <h2>Resumo da importação</h2>

          <div className="summary-cards">
            <div className="card">
              <div className="card-label">Linhas lidas</div>
              <div className="card-value">{summary.totalRows}</div>
            </div>

            <div className="card">
              <div className="card-label">Inseridas</div>
              <div className="card-value">{summary.inserted}</div>
            </div>

            <div className="card">
              <div className="card-label">Atualizadas</div>
              <div className="card-value">{summary.updated}</div>
            </div>

            <div className="card card-warning">
              <div className="card-label">Produtos não encontrados</div>
              <div className="card-value">{summary.notFoundProducts}</div>
            </div>

            <div className="card card-danger">
              <div className="card-label">Erros</div>
              <div className="card-value">{summary.errors}</div>
            </div>
          </div>
        </section>
      )}

      {notFoundProducts && notFoundProducts.length > 0 && (
        <section className="not-found-products">
          <h2>Produtos não encontrados no catálogo</h2>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Cod Prod</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {notFoundProducts.slice(0, 200).map((row, index) => (
                  <tr key={index}>
                    <td>{row.empresa}</td>
                    <td>{row.cod_prod}</td>
                    <td>{row.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {notFoundProducts.length > 200 && (
            <p className="table-notice">
              Exibindo apenas os primeiros 200 registros.
            </p>
          )}
        </section>
      )}

      {logs && logs.length > 0 && (
        <section className="import-logs">
          <h2>Logs</h2>
          <pre className="logs-pre">
            {logs.join('\n')}
          </pre>
        </section>
      )}

      {step === 'result' && summary && (
        <section className="import-result">
          <h2>Resultado final</h2>

          <div className="summary-cards">
            <div className="card">
              <div className="card-label">Linhas lidas</div>
              <div className="card-value">{summary.totalRows}</div>
            </div>

            <div className="card">
              <div className="card-label">Inseridas</div>
              <div className="card-value">{summary.inserted}</div>
            </div>

            <div className="card">
              <div className="card-label">Atualizadas</div>
              <div className="card-value">{summary.updated}</div>
            </div>

            <div className="card card-warning">
              <div className="card-label">Produtos não encontrados</div>
              <div className="card-value">{summary.notFoundProducts}</div>
            </div>

            <div className="card card-danger">
              <div className="card-label">Erros</div>
              <div className="card-value">{summary.errors}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default PurchaseCurveImportPage;
