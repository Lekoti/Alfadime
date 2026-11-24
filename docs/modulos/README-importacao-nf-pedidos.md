# Importação NF — códigos manuais e consulta de pedidos

## Estado atual — 24/11/2026, parte 1
O Alfadime apenas lê e compara dados para o usuário realizar vínculos no sistema externo. Não registra vínculos, quantidades consumidas, reservas de saldo ou confirmação de unidade. Não altera XML, cadastro, estoque ou banco e não envia operações ao ERP.

## Uso
1. Abrir a NF e editar Código interno quando necessário. Até 20 dígitos, com zeros preservados; Restaurar consulta retorna ao cadastro consultado.
2. Importar TXT ou colar relatório com cabeçalho de filial. Permanecem UTF-8, Windows-1252 e OEM 850, limites e validações do parser existente.
3. Conferir produto, quantidade NF, saldo controle, código produto e controle sugerido. Saldo controle é exatamente a coluna Pendente do relatório, sem subtrair atendida/cancelada novamente e sem reservas entre notas.
4. Se houver vários controles, o sinal + mostra somente controle, código, produto e saldo. Não existem campos de quantidade ou ações de vínculo. Não existe expansão de operações para um único controle.
5. Realizar a operação no sistema externo. Para refletir um saldo posterior, gerar/importar outro TXT. A consulta não acompanha operações externas em tempo real.

## Correspondência e quantidades
Filial e código interno normalizado, sem busca aproximada por descrição ou código de fornecedor. 00696 e 696 equivalem na comparação; o texto original do TXT permanece exibido.
Agrupa linhas pelo mesmo código e soma qTrib. Exige quantidade válida e unidade tributável consistente no grupo. Não calcula valores ausentes ou conversão de caixas. O sufixo/unidade do cabeçalho do relatório NÃO informa a unidade de medida do produto; confirmar essa compatibilidade é responsabilidade da operação externa. Remover a caixa não equivale a validar a unidade do TXT.
Quantidades BigInt em seis casas decimais; parser preservado. Filial divergente, relatório inconsistente, código inválido e grupo com unidades incompatíveis continuam impedindo sugestão.

## Sugestão
Exata primeiro; depois, menor diferença absoluta entre Pendente do controle e quantidade TOTAL da NF. Saldo menor pode ser sugerido e mostra falta; maior mostra excedente. Controles sem saldo positivo não são sugeridos. Empate não escolhe automaticamente. Ordem numérica dos controles não indica data ou prioridade. Um saldo não muda ao abrir outra NF ou editar código. Descrições/fornecedor devem ser conferidos no sistema externo.

## Estado temporário
São mantidos apenas relatório e códigos manuais por identidade da NF, na sessão da página. Voltar à lista mantém os códigos. Sair do módulo, atualizar a janela ou fechar o app descarta os dados. Sem localStorage, arquivos de dados ou escrita no banco. Importar/limpar TXT preserva códigos manuais. Editar código apenas recalcula a consulta.

## Arquitetura e escopo da parte 1
Atualizados: services/nfPurchaseMatch.service.js; services/nfPurchaseSuggestion.service.js; hooks/useNfPurchaseSession.js; components/NfPurchasePanel.jsx; components/NfCodeInput.jsx; duas documentações.
Removido: components/NfPurchaseAllocation.jsx, que só renderizava operações internas autorizadas para retirada pelo usuário.
Mantidos: parser TXT e constantes, parser XML, detalhes fiscais, tabela de itens, rotas, permissões, main/preload, banco, importação/varredura ComErros e estilos. Os seletores legados de alocação no CSS não são usados; sua limpeza fica na etapa de layout.
A próxima parte tratará layout responsivo, cores e botões no topo. Não foram incluídos nesta entrega.

## Aplicação e testes
Instalador confere SHA Git dos arquivos atuais e dependências, prepara cópias completas para revisão no VS Code, exige APLICAR, revalida arquivos e cria backup. Também verifica referências aos símbolos removidos dentro do módulo. Arquivo divergente interrompe a instalação. Reversão restaura inclusive o componente removido. Sem commit/push.
Testes Node exercitam parser original, edição/restauração de código, agrupamento, estado sem operações e ranking de controles. Build JSX/Vite, Electron e PowerShell devem ser executados no computador do usuário.
Após instalar: npm run build; se passar, npm start. Testar código manual/zeros, restauração, TXT/colagem, várias NFs, vários controles/empate, filial divergente, quantidade/unidade ausentes, relatório inválido, retorno à lista e importação XML/ComErros.

## Histórico
2026-11-23: versão inicial com códigos manuais, parser TXT, confirmação de unidade e simulação de vínculos internos.
2026-11-24 — parte 1: retirada de vínculos internos, reservas, confirmação e componente de alocação. Saldo agora corresponde diretamente ao Pendente do TXT. Código editável, leitura e sugestões preservados. Sem alteração remota.
