# Testes — Compras de Mercadorias

## Checklist manual

- Importar base válida e verificar produtos carregados.
- Aplicar filtros de empresa, laboratório, curva, origem e situação.
- Alterar quantidade manual e confirmar valor da compra principal.
- Alterar base da sugestão alternativa e confirmar valor da compra alternativa.
- Conferir médias 3M, 6M, 9M e 12M com meses fechados.
- Conferir gráfico por laboratório.
- Exportar conforme o app e conferir produtos e colunas.
- Exportar completo e conferir todos os produtos e colunas.
- Conferir Planilha1 com a base original.
- Conferir Apoio oculta.

## Testes automatizados de referência

- `testes-nova-etapa-9.mjs` — gráficos e tabelas do Excel.
- `testes-nova-etapa-10.mjs` — limpeza e relatórios.
- `testes-nova-etapa-11.mjs` — política comercial e robustez.
- `testes-nova-etapa-12.mjs` — médias móveis e overrides.
- `testes-nova-etapa-13.mjs` — rótulos mensais e intervalos.

## Comandos

```bash
npm run build
npm test
```
