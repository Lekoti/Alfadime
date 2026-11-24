# Importação NF — limpeza de CSS legado

Data: 24/11/2026. Base conferida: main, commit fb8ceee11a5c80685052e924424e21cc5c3b18bb, partes 1/2A/2B presentes.

## Escopo
Substitui somente styles/nf-import.css pelo fonte completo limpo. Acrescenta este registro de alteração. Não modifica JSX, hooks, parser, motor de sugestões, dados, rotas, permissões, banco, IPC ou layout atual. Não consolida a documentação das partes anteriores; isso fica separado desta limpeza.

## Remoções e preservações
Retirados 57 seletores associados a 30 classes antigas: tabela nf-sheet com mínimo de 1753px, identidade/totais antigos, legenda/ajuda, antigo diagnóstico em bloco, confirmação de unidade, cartões da antiga distribuição, campo de alocação, liberação e avisos de vínculos.
Preservados 58 seletores com as mesmas declarações e ordem relativa: base compartilhada, lista ComErros, botões, foco, erros, cartões, filtros, tabelas, código interno, colagem TXT, tabelas de relatório/alternativas, base nf-invoice e nf-break. Seletores compartilhados são preservados conservadoramente, inclusive regras-base antigas cujo uso fora dos componentes revisados não foi descartado. Não é uma tentativa de remover cada seletor potencialmente redundante do projeto.
Em regras agrupadas, remove somente os seletores inativos: mantém nf-break e nf-paste summary. Retira media queries exclusivamente antigas. Os CSS nf-purchase-compact.css e nf-invoice-compact.css NÃO são substituídos; continuam responsáveis pelas cores e larguras da versão atual.
Tamanho UTF-8: 9303 para 4335 bytes. Nenhum valor ou declaração dos seletores preservados foi alterado.

## Conferência de referências
A busca indexada do GitHub retornou um trecho anterior ao commit atual. Por isso a decisão não foi baseada nessa ocorrência desatualizada: foram considerados os fontes completos obtidos pelo SHA fb8ceee, as classes dos componentes atuais e uma verificação local obrigatória antes de aplicar.
O instalador verifica SHA Git do CSS-base e dos componentes relacionados. Lê os arquivos de código/estilo em src e interrompe se encontrar referência literal a qualquer classe retirada, fora do próprio nf-import.css. Limites de palavra impedem confundir nf-diagnostic com a classe ativa nf-diagnostic-alert. Essa análise literal não é uma prova geral para nomes construídos dinamicamente; nenhuma remoção adicional é feita com base em suposição de prefixos.
Na revisão, captura todos os hashes dos arquivos examinados; antes de copiar repete a conferência para impedir alteração/adição/remoção de arquivos durante a revisão.

## Aplicação
App fechado. Instalador prepara fontes completos, abre VS Code e o comparativo, exige APLICAR, faz backup em Downloads e imprime reversão. Se um arquivo divergir ou um seletor ainda tiver referência, pare e envie a mensagem. Sem commit/push.

## Validação
Sintaxe e declarações CSS verificadas. Comparação dos seletores retidos com os originais deve ser idêntica; seletores removidos sempre associados à lista explícita de classes legadas. Detalhes e limites no VALIDACAO.json.
No computador: npm run build; se passar, npm start. Conferir lista/filtros/varredura ComErros; NF aberta, edição/restauração de código, detalhes fiscais; TXT/colagem, cores/sugestões; Relatório e Diagnóstico com Fechar/Escape. Aparência deve permanecer igual à versão 2B. Nenhuma alteração visual nova foi solicitada.
Testes estáticos não substituem Electron ou instalação/reversão completa no Windows.

## Histórico
2026-11-24: limpeza conservadora de seletores legados do CSS-base após partes 2A/2B. Cores, layout e funções atuais preservados. Sem alteração remota.
