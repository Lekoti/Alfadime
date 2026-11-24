# Importação NF — consulta compacta de controles

## 24/11/2026 — parte 1: somente consulta
Mantém as cinco colunas: Produto, Quantidade NF, Saldo controle, Código produto e Controle sugerido.
Saldo controle corresponde diretamente a Pendente do TXT. Nenhuma nota reserva ou reduz o saldo mostrado em outra nota. Código e controle do relatório mantêm zeros à esquerda.
Igualdade exata primeiro; depois, menor diferença absoluta para a quantidade TOTAL da NF. Saldo menor informa falta; maior informa excedente. Empate não seleciona controle. Filial/código/grupo inválidos mantêm bloqueio de sugestão.
Para mais de um controle, o sinal + abre somente a lista de controles, códigos, descrições e saldos. Não há quantidade a vincular, valor vinculado, ação informativa ou registro interno. Um único controle não abre formulário operacional. Os detalhes fiscais continuam no componente original da nota.
Removidos checkbox de unidade e todas as dependências funcionais de sua confirmação. Não foi criada confirmação automática nem conversão. O TXT não fornece unidade do produto; a comparação é informativa para a operação externa.
Não contém ações de baixa, vínculo, remoção de vínculo ou reservas. Operações reais são feitas externamente. Reimportar TXT atualizado para refletir novo saldo.
Código manual, importação/colagem/codificações, preview de relatório, limites e mensagens de erro do parser permanecem. Mensagens e dicas específicas da antiga simulação foram retiradas do painel e do título do campo de código.

## Limites desta entrega
Não reorganiza toda a página, não unifica tabelas, não altera as cores nem move diagnóstico/relatório ao topo. Esses ajustes ficam para a próxima parte, após teste. Os estilos atuais foram preservados.
Estado temporário em memória; sem banco, XML ou cadastro alterado, rede adicional ou envio ao sistema externo.
Instalador local com conferência SHA Git, revisão VS Code, backup e reversão. Sem commit/push.

## Arquivos
Alterados: NfPurchasePanel.jsx, NfCodeInput.jsx, useNfPurchaseSession.js, nfPurchaseMatch.service.js, nfPurchaseSuggestion.service.js e as duas documentações da consulta.
Removido: NfPurchaseAllocation.jsx.
Veja README-importacao-nf-pedidos.md para uso, arquitetura e testes completos.

## Histórico
2026-11-23: painel compacto de cinco colunas com simulação interna de vínculos e reservas de sessão.
2026-11-24 — parte 1: consulta de saldos e sugestões somente; retirada completa da simulação interna e correção das mensagens/documentação relacionadas.
