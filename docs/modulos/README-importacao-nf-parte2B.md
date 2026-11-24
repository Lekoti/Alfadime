# Importação NF — parte 2B, 24/11/2026

## Base e escopo
Parte 1 confirmada no GitHub, main 780e2ba01db4fecb0f0998fd6a452329b4ce4505. Parte 2A aplicada localmente pelo usuário e preservada; ainda não constava no último commit consultado. Esta entrega não substitui seu CSS nem sua documentação.
Altera apenas apresentação da NF aberta, painel para abrir relatório pelo topo e documentação. Sem parser, motor de saldo/sugestão, hook da sessão, IPC, banco, main/preload, rotas, permissões ou rede novos.

## Organização
Uma barra reúne Importação NF, número/série, Importar XML, Relatório, Diagnóstico com contagem e Voltar à lista. Relatório fica desabilitado até existir TXT. O resumo tem emissor/CNPJ, filial e emissão. Os seis totais originais permanecem numa faixa compacta. Arquivo, natureza e demais dados gerais estão no diagnóstico.
Tabela principal: Item, Produto, UN tributável, Qtd. NF (qTrib), Vlr. unit. (vUnTrib), Código interno editável e Total do produto (vProd). Não calcula conversão, não troca qTrib por qCom e não recalcula valores. Mesmos formatadores numéricos da versão anterior.
EAN, código do fornecedor, EAN tributável, unidade/quantidade/valor comercial, dados tributáveis, impostos e QTD CX indefinida permanecem nos detalhes do item. Mantém cadastro/filiais, lotes, ANVISA e avisos individuais. A regra de destino e os callbacks de edição/restauração de código permanecem iguais.
Sete colunas percentuais somam 100%, sem mínimo de 1753px. Cabeçalhos e valores podem quebrar linha; código editável usa largura da célula. Estilos novos são exclusivos da NF aberta, preservando a lista ComErros. Cabeçalho azul, linhas alternadas e código azul-claro seguem a parte 2A.

## Diálogos
NfInfoDialog usa dialog nativo modal: fechar por botão ou Escape; navegação de foco e restauração ao acionador são nativas. Diagnóstico de XML ilegível abre automaticamente, como o bloco que antes iniciava expandido. Conteúdo de protocolo, chave, retorno, destinatário, adicionais e motivo ComErros mantido.
Relatório preserva nome/filial/codificação no painel e a mesma prévia de até 200 linhas no diálogo, sem alterar a participação de todas as linhas válidas na sugestão. Informações da conferência deixam de ocupar um bloco expansível no rodapé. Erros de TXT e operação permanecem visíveis na página.
Removidos da NF aberta os textos de somente leitura, legenda técnica de EAN/qTrib e dica repetida abaixo dos itens. As dicas da antiga simulação já foram retiradas na parte 1. A lista inicial/ComErros e suas mensagens continuam exatamente como antes.

## Arquivos
Atualizados completos: components/NfInvoiceDetails.jsx; components/NfPurchasePanel.jsx; pages/NfImportPage.jsx.
Novos: components/NfInfoDialog.jsx; styles/nf-invoice-compact.css; este documento.
NfCodeInput, motor, parser e CSS 2A não são substituídos. As tabelas de itens e de pedidos continuam separadas, sem agrupar informações fiscais de modo incorreto. Muitas linhas e detalhes expandidos ainda podem exigir rolagem vertical; não se promete todos os itens simultaneamente em qualquer resolução.

## Aplicação e reversão
Instalador confere SHA Git dos três arquivos alterados e de dependências conhecidas. Confere presença dos estilos da parte 2A sem sobrescrevê-los; captura hash completo local para impedir mudança durante revisão. Lê arquivos relacionados, gera prévia completa, abre fontes e comparativos no VS Code e exige APLICAR. Backup em Downloads; reversão restaura três originais e remove os três novos arquivos. Sem commit/push. Arquivo divergente ou novo já existente interrompe antes de copiar.

## Testes obrigatórios no computador
npm run build; se passar, npm start. Conferir janela maximizada e menor, nomes longos, códigos/controles de 20 dígitos, quantidades longas, itens repetidos, tabela sem itens e NF ilegível.
Editar/restaurar código; abrir/fechar detalhes; importar/colar/reimportar TXT; consultar alternativas/empates e conferir cores 2A. Abrir Relatório e Diagnóstico; fechar por botão e Escape; conferir foco, avisos e todas as informações fiscais. Voltar à lista e testar XML/varredura ComErros, filtros e erros. Não aplicar pacotes antigos por cima.
Validação automatizada do pacote descrita em VALIDACAO.json não substitui build, renderização Electron ou instalação/reversão completas em Windows.

## Histórico
2026-11-24 — parte 2B: tabela fiscal principal de sete colunas fluidas; dados secundários nos detalhes; resumo/totais compactos; botões Relatório/Diagnóstico no topo; modal nativo reutilizável. Preservadas consulta, código manual, regras e cores 2A. Sem alterações remotas.
