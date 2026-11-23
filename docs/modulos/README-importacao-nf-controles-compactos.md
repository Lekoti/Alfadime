# Importação NF — controles em tabela compacta

Atualização de 23/11/2026 sobre o pacote Alfadime-NF-Pedidos-TXT-20261123, instalado e testado pelo usuário.

## Mudanças
Substitui os cartões por uma tabela de cinco colunas: Produto, Quantidade NF, Quantidade controle, Código produto e Controle sugerido. Uma linha por código agrupado da NF. O produto principal é a descrição do relatório quando há sugestão; a descrição da NF permanece no título do produto e nos detalhes.
Quantidade NF é a soma de qTrib das linhas do mesmo código, conforme o motor existente. Quantidade controle é o saldo Pendente do TXT menos os vínculos de outras notas desta sessão. Código e controle originais do TXT, incluindo zeros, permanecem visíveis.
O sinal + no produto expande os outros controles, saldos, quantidades e todas as ações de vínculo já existentes. O diagnóstico, a importação/colagem do TXT, codificações, confirmação de unidade, remoção de vínculos, prévia do relatório e avisos são mantidos. Informações extensas da sessão ficam recolhidas.

## Regra exata da sugestão
1. Considerar apenas a mesma filial e o mesmo código interno normalizado.
2. Calcular saldo disponível para esta NF descontando reservas de outras notas; não descontar os vínculos desta própria NF.
3. Ignorar controles sem saldo positivo para sugerir, mas mantê-los visíveis nos detalhes.
4. Comparar com a quantidade TOTAL da NF para esse código, não com o restante a vincular.
5. Priorizar igualdade exata (diferença zero), depois menor diferença absoluta. Um saldo menor pode ser sugerido e mostra quanto falta. Um maior mostra o excedente.
6. Se dois ou mais controles têm a mesma menor diferença, não escolher automaticamente. A tabela indica empate e os detalhes permitem a escolha.
7. Produto sem código/unidade/quantidade válidos, relatório inconsistente ou filial divergente não recebe sugestão.
8. Ordenação do número de controle serve somente para exibir alternativas; não representa antiguidade ou prioridade de compra.

Exemplo: NF 500, controles com saldos 300/480/700 → sugere o de 480 e informa que faltam 20. NF 500, saldos 480/520 → empate, sem escolha automática. Nenhuma sugestão é gravada como vínculo; usuário continua confirmando quantidades nos detalhes. O limite do pedido e da NF continua validado pelo motor já existente.

## Arquivos
Alterado: components/NfPurchasePanel.jsx (fonte completa).
Novos: services/nfPurchaseSuggestion.service.js; styles/nf-purchase-compact.css; este documento.
Não modifica código manual, hook da sessão, parser de TXT, engine de vínculos, parser de XML, rede, banco, main/preload, rotas ou permissões.
Mantém a separação de componentes, serviços e estilos. Sem novas dependências.

## Instalação
Um ZIP único, sem dependência de arquivos ZIP anteriores. O instalador confere o SHA-256 normalizado do painel da versão anterior gerada nesta conversa, lê dependências relacionadas, verifica integridade do pacote, gera a prévia completa, abre o painel antigo/novo no VS Code e pede APLICAR. Revalida hashes, faz backup em Downloads e aplica.
Arquivos locais diferentes ou arquivos novos já existentes interrompem antes de sobrescrever. O comando de reversão é impresso. Nada é enviado ao GitHub.

## Validação
Testes isolados verificam ranking, igualdade, diferenças, empate, saldos da sessão, filial, código, bloqueios e BigInt. Teste do instalador usa a fonte completa anterior como fixture, com dependências simuladas somente para a operação de cópia. Isso não equivale a build ou execução do React/Electron.
Obrigatório no computador: npm run build; se passar, npm start. Reimportar TXT e conferir notas com saldo exato, menor, maior e empate. Abrir + e confirmar que vínculo, remoção e bloqueios permanecem funcionais. Voltar à lista e conferir código manual e leitura ComErros.

## Limites preservados
Estado apenas na sessão, perdido ao sair do módulo ou fechar o app. O relatório é um retrato do saldo, não consulta ao ERP em tempo real. Confirmar unidades antes de vincular. Sem envio ao sistema externo, alteração de banco, baixa de pedidos ou cadastro de produtos.

## Histórico
2026-11-23: painel compacto de cinco colunas e sugestão pelo saldo mais próximo da NF, diferenças explícitas e empate sem escolha silenciosa; funções anteriores preservadas nos detalhes.
