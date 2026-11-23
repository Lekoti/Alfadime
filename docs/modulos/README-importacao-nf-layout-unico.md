# Importação NF — atualização independente do ZIP antigo

Pacote único para atualizar a primeira versão já instalada. Não precisa baixar ou recriar nenhum ZIP anterior.

## Alterações
Resumo fiscal compacto e tabela estilo Excel. Código fornecedor (cProd) separado do código interno do destino. Qtd 1 = qCom; QTD 2 e quantidade do destino = qTrib; valor unitário = vUnTrib. EAN tributável prioritário. Impostos lidos do grupo ICMS presente, sem estimar campos ausentes. QTD CX permanece sem cálculo. Lotes, ANVISA, sugestões e pendências são mantidos nos detalhes. A nota ocupa tela própria; voltar preserva lista/filtros.

## Preservado
Sem alteração em main, preload, rede, contagem de XMLs, banco, permissões, serviços de consulta e hook de leitura. Sem dependências novas. Nenhuma gravação em XMLs ou dados de produtos. Nenhuma duplicação automática. Nenhum commit ou push.

## Aplicação
Fechar o app. Executar Atualizar.ps1 com Node.js e comando code disponíveis. O instalador lê os arquivos completos instalados, verifica âncoras da primeira versão e prepara arquivos completos para revisão. Não equivale a comparar todo o repositório ou a verificar hash contra um ZIP anterior. Quatro arquivos de interface/parser serão atualizados e este registro será acrescentado.
Se detectar atualização anterior ou âncora ausente/duplicada, cancela. O script abre a prévia completa e as quatro diferenças no VS Code. Após APLICAR, confere novamente os hashes capturados na preparação e faz backup antes de substituir. Se algo mudou durante a revisão, cancela. O comando para desfazer é impresso ao final.

## Limitações e testes
Versão candidata: build Vite/React, compilação JSX, execução no Electron, acesso ao banco real e à rede precisam ser testados localmente. O motivo real da rejeição do ERP não é conhecido sem logs. Não valida XSD, assinatura ou situação SEFAZ. Atualização manual das pastas permanece.
Executar npm run build; se passar, npm start. Conferir a mesma NF na planilha, sobretudo notas com qCom diferente de qTrib. Testar cadastro ausente/ambíguo/inativo, XML inválido e retorno à lista. Só depois autorizar commit/push.

## Histórico
2026-11-23: pacote independente para eliminar a exigência do ZIP anterior. Quatro arquivos alterados com prévia, backup, hashes de sessão e reversão. Dados e lógica de leitura da rede preservados.
