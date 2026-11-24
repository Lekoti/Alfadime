# Importação NF — consulta compacta de controles

## Estado atual — 24/11/2026, parte 2A
Esta etapa altera somente a apresentação do painel de controles. Base: main, commit 780e2ba01db4fecb0f0998fd6a452329b4ce4505, com a parte 1 confirmada no GitHub.

### Cores e densidade
Cabeçalho azul, linhas alternadas, quantidade NF e código com fundo azul-claro. Saldo exato verde; menor ou empate amarelo; maior azul-claro; código não encontrado, ausência de saldo ou bloqueio vermelho-claro. O texto de situação permanece: cor não representa vínculo ou operação concluída. Fonte herdada do módulo, corpo da tabela 11px e espaçamentos menores, sem alterar tipografia global.

### Largura
Retirada a largura mínima de 900px da tabela de controles. Cinco colunas percentuais somam 100%; table-layout fixed, cabeçalhos, produtos e valores longos podem quebrar linha, sem truncar códigos ou números. Tabela de alternativas e prévia também usam largura fluida. Não se usa overflow-x hidden para esconder informação. A ação de expandir alternativas permanece clicável.
Em janelas estreitas aumenta a altura das linhas para manter conteúdo acessível. Muitas linhas continuam exigindo rolagem vertical.

### Escopo e arquivos
Atualizados somente styles/nf-purchase-compact.css e esta documentação, ambos completos. Limpeza, apenas nesse CSS, de seletores da antiga confirmação/unidade e avisos que o componente da parte 1 já não renderiza.
Sem mudança em JSX, hook, código editável, parser TXT/XML, sugestão, saldo Pendente, banco, main/preload, rotas, permissões ou importação/varredura ComErros.
A TABELA PRINCIPAL DE ITENS DA NF ainda conserva o layout anterior, incluindo sua rolagem horizontal. A reorganização dessa tabela, remoção dos textos gerais e botões Diagnóstico/Relatório no topo pertencem à próxima entrega. Esta parte não promete acomodar todo o módulo numa única tela.

## Comportamento preservado da parte 1
Cinco colunas: Produto, Quantidade NF, Saldo controle, Código produto e Controle sugerido. Saldo é Pendente do TXT, sem reservas entre notas. Código e controle preservam zeros à esquerda.
Igualdade exata primeiro; depois, menor diferença absoluta para a quantidade TOTAL da NF. Saldo menor indica falta; maior indica excedente. Empate não escolhe controle. Filial/código/grupo inválidos mantêm bloqueio da sugestão.
Para vários controles, + abre somente uma lista de códigos, controles, produtos e saldos. Sem quantidade a vincular, registro interno, reserva, confirmação de unidade ou envio ao sistema externo. O TXT não informa a unidade do produto; não há conversão automática.
Código manual, importação/colagem/codificações, prévia do relatório, parser e detalhes fiscais preservados. Estado temporário em memória, perdido ao sair do módulo/fechar o app. Reimportar TXT atualizado para refletir operações externas.
Veja README-importacao-nf-pedidos.md para regras de leitura e consulta.

## Aplicação e testes
Instalador local verifica SHA Git do CSS, desta documentação e das dependências relacionadas; lê fontes completos, prepara comparativos no VS Code e pede APLICAR. Revalida antes de copiar, cria backup e imprime reversão. Divergência interrompe antes de substituir. Não faz commit/push.
Validação entregue é estática: sintaxe CSS, seletores, propriedades de largura/quebra de linha e percentuais. Não substitui renderização no Electron nem comprova ausência de overflow em toda resolução.
No computador: npm run build; se passar, npm start. Testar painel largo/estreito, código/controle de 20 dígitos, quantidade longa, descrição extensa, empate, alternativas expandidas, prévia e importação TXT. Confirmar que nada foi cortado e cores não alteraram a interpretação de saldo. A tabela principal da NF fica para a próxima etapa.

## Histórico
2026-11-23: painel compacto com simulação de vínculos e reservas.
2026-11-24 — parte 1: consulta somente; retirada de operações internas e reservas, mantendo código manual e sugestões.
2026-11-24 — parte 2A: cores, densidade e largura fluida somente nas tabelas do painel de controles. Sem mudanças funcionais. Sem alterações remotas.
