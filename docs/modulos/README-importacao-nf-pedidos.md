# Importação NF — códigos manuais e pedidos de compra

Data: 23/11/2026. Atualização sobre a versão de layout já enviada ao GitHub pelo usuário. Sem novos IPCs, dependências ou alterações no banco.

## Arquivos e arquitetura
Novos: constants/nfPurchase.constants.js; services/nfPurchaseReport.service.js; services/nfPurchaseMatch.service.js; hooks/useNfPurchaseSession.js; components/NfCodeInput.jsx; components/NfPurchasePanel.jsx; components/NfPurchaseAllocation.jsx. Alterados: NfInvoiceDetails.jsx, NfImportPage.jsx, nf-import.css. Esta documentação registra as modificações. Hooks de leitura de XML/rede, parser fiscal, main/preload, produtos e permissões não são modificados.

## Uso
1. Abrir uma NF. Na coluna Código interno, editar o valor se necessário. O campo aceita até 20 dígitos e preserva zeros. Restaurar consulta desfaz a informação manual.
2. Importar TXT ou colar relatório completo com cabeçalho da filial. A escolha do TXT é feita por input de arquivo do navegador: somente leitura em memória, sem caminho arbitrário de disco.
3. Conferir nome, filial, quantidade de linhas e prévia do relatório. Se acentos estiverem incorretos, selecionar UTF-8, Windows-1252 ou OEM 850 e importar novamente. Automático tenta UTF-8 e depois Windows-1252; não detecta OEM 850 automaticamente.
4. Confirmar manualmente que os saldos do TXT estão na mesma unidade tributável qTrib/uTrib da NF. O relatório não fornece unidade; o app NÃO presume ou converte caixas.
5. No painel de pedidos, escolher quantidade por controle e clicar Vincular na conferência. Nenhuma ação é enviada ao ERP.
6. Remover desfaz um vínculo. Remover vínculos da sessão libera todos os saldos simulados de todas as notas.

## Dados temporários
Código manual não é cadastro validado, não altera XML nem banco do Alfadime. Relatório, códigos e vínculos são mantidos no componente da página durante a sessão do módulo. Voltar à lista mantém esses dados. Sair do módulo, atualizar a janela ou fechar o app perde tudo. Não usa localStorage, arquivos temporários de relatório ou gravações no banco.
O relatório é um retrato do saldo, sem sincronização em tempo real com o sistema externo. Saldos reservados são apenas da sessão.

## Leitura do TXT
Lê de trás para frente as seis colunas de quantidade/código/controle por expressão ancorada: descrição, Pendente Ant, Q.Atendida, Q.Cancelada, Pendente, código, controle. O saldo é a coluna Pendente final; não subtrai atendida/cancelada novamente. Ponto é milhar e vírgula é decimal. '-' equivale a zero nas colunas numéricas do relatório.
Reconhece filiais 0001 DPR, 0002 AMS, 0003 DMT, 0005 DMS, 0006 DSC pelo cabeçalho (0001.001). O sufixo/unidade do relatório é preservado na prévia, mas não prova a unidade comercial/tributável dos produtos.
Ignora separadores, cabeçalhos repetidos, rodapé LWHELP e caractere de fim de arquivo. Limites: 5 MB, 50.000 linhas, 2.048 caracteres por linha. A prévia mostra 200 linhas, mas todas as linhas válidas são consideradas.
Linha desconhecida, filial não mapeada, relatório sem itens, múltiplas filiais e mesmo código/controle repetido na filial bloqueiam a utilização. Não descarta silenciosamente nem soma duplicatas: corrigir o relatório ou o texto colado.
Se a leitura falhar por arquivo excessivo/codificação inválida, o relatório anterior continua identificado pelo nome e uma mensagem de erro é exibida. Relatório analisado com inconsistências substitui o anterior, mas fica bloqueado.

## Correspondência e quantidades
Compara filial e código interno numérico; 00696 e 696 equivalem para comparar, mas o texto original permanece visível. Não cruza por descrição aproximada ou código do fornecedor. O código manual é responsabilidade da conferência do usuário.
Agrupa linhas da NF pelo mesmo código somando qTrib uma única vez. Exige unidade tributável informada e igual em todas as linhas desse grupo; divergência/ausência bloqueia. Não calcula quantidades ausentes.
Quantidades calculadas como inteiros BigInt em escala de seis casas decimais, sem comparação monetária. Máximo suportado por quantidade: 1 trilhão. Campos da NF são decimais XML (ponto decimal), campos digitados/TXT usam formato brasileiro.
A soma dos vínculos de um código não ultrapassa a quantidade da NF. A soma por controle, considerando também outras notas desta sessão, não ultrapassa o saldo do relatório. Mesma chave de NF e mesmos itens, mesmo com outro nome de arquivo, reutilizam a identidade da conferência; sem chave válida utiliza metadados e assinatura dos itens. XML de mesmo documento com conteúdo de itens diferente é tratado como outra conferência: revisar/liberar a anterior antes de substituir XML alterado.
Nenhum controle é escolhido por ordem numérica ou suposta data. Usuário distribui explicitamente. Os dados do TXT não confirmam vínculo com fornecedor/CNPJ do emissor: conferir descrições e origem do relatório manualmente.

## Invalidação das escolhas
Editar/restaurar qualquer código remove todos os vínculos desta NF para recalcular com segurança. Importar/substituir/limpar relatório remove todos os vínculos da sessão e exige nova confirmação de unidades; códigos manuais permanecem. Desmarcar confirmação de unidades remove os vínculos da NF atual.

## Aplicação e reversão
Um único ZIP, sem depender de pacotes anteriores. O instalador verifica os SHAs Git dos três arquivos alterados e de três dependências lidas na versão atual do GitHub. Se houver divergência, para sem substituir. Prepara fontes completos, abre VS Code com comparativos, pede APLICAR, revalida hashes de revisão e faz backup em Downloads. Reversão é impressa no terminal. Não executa commit/push.

## Testes locais obrigatórios
Executar npm run build e depois npm start se o build passar. Testar código ausente, código manual 00696, restaurar consulta, TXT de duas páginas, filial diferente, relatório com problema, ausência de unidade/quantidade, mesmo código em duas linhas, produto em vários controles, saldo insuficiente, reserva entre duas NFs, reimportação e retorno à lista. Conferir que importação de XMLs e contagem de ComErros permanecem iguais.
Os testes Node incluídos verificam o parser de TXT e o motor de conferência. Não substituem build JSX/Vite, Electron, Windows, acesso ao banco e rede reais.

## Histórico
2026-11-23: campo manual com origem explícita; parser TXT/colagem com prévia e bloqueios; unidade confirmada; distribuição manual por controle; prevenção de excedentes e duplicidades de consumo dentro da sessão; estado temporário; instalador com hashes/backup/reversão. Nenhuma alteração remota.
