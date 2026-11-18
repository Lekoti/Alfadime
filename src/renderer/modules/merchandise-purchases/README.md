# Compras de Mercadorias

Módulo de simulação de compras, preços, políticas comerciais, médias móveis, gráficos e exportação Excel.

## Estrutura

- `components` — componentes de interface.
- `constants` — constantes, colunas e configurações padrão.
- `hooks` — estado e regras de uso do módulo.
- `pages` — página principal do módulo.
- `services` — importação, cálculo, política comercial, relatórios, gráficos e Excel.
- `styles` — estilos específicos do módulo.

## Regras principais

- Laboratório de agrupamento: `Fabr_Global`.
- Quantidade manual: número inteiro maior ou igual a zero.
- Identidade do produto: empresa + código global do fabricante + EAN/código.
- Menor preço: calculado usando todas as linhas da base.
- Médias 3M, 6M, 9M e 12M: janela fixa de meses fechados.
- Gráficos do app e do Excel: somente por laboratório.
- Tabelas do app e do Excel: todos os relatórios visíveis.

## Exportação

- `Conforme o app`: produtos filtrados e colunas visíveis.
- `Completa`: todos os produtos e colunas.
- `Planilha1`: base original para conferência.
- `Apoio`: planilha oculta de fórmulas.

## Testes

- Consulte `TESTES.md` para o checklist manual e os testes automatizados de referência.
- Execute `npm run build` para validar a compilação.
- Execute `npm test` para o comando de testes do projeto.
