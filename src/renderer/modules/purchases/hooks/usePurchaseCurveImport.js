import { useState, useCallback } from 'react';
import {
  loadPurchaseCurveSummary,
  runPurchaseCurveImport
} from '../services/purchaseCurveImport.service';

/**
 * Hook de importação da Curva de Compras.
 *
 * Gerencia estado de loading, resumo, produtos não encontrados, logs e erros.
 */
export function usePurchaseCurveImport() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [notFoundProducts, setNotFoundProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  const addLog = useCallback((message) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    setNotFoundProducts([]);
    setLogs([]);

    try {
      addLog('Carregando resumo da importação...');

      const result = await loadPurchaseCurveSummary();

      setSummary({
        totalRows: result.totalRows || 0,
        inserted: result.inserted || 0,
        updated: result.updated || 0,
        notFoundProducts: result.notFoundProducts || 0,
        errors: result.errors || 0
      });

      setNotFoundProducts(result.notFoundProductsList || []);

      addLog(`Resumo carregado: ${result.totalRows} linhas.`);
    } catch (err) {
      addLog(`Erro ao carregar resumo: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  const runImport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      addLog('Iniciando importação da Curva de Compras...');

      const result = await runPurchaseCurveImport();

      setSummary({
        totalRows: result.totalRows || 0,
        inserted: result.inserted || 0,
        updated: result.updated || 0,
        notFoundProducts: result.notFoundProducts || 0,
        errors: result.errors || 0
      });

      setNotFoundProducts(result.notFoundProductsList || []);

      addLog('Importação concluída.');
    } catch (err) {
      addLog(`Erro na importação: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  const reset = useCallback(() => {
    setLoading(false);
    setSummary(null);
    setNotFoundProducts([]);
    setLogs([]);
    setError(null);
  }, []);

  return {
    loading,
    summary,
    notFoundProducts,
    logs,
    error,
    loadSummary,
    runImport,
    reset
  };
}
