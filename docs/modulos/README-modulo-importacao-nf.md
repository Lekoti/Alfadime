# Importação NF — primeira versão para teste local

## Estado da entrega
Código candidato. Não equivale a auditoria integral do repositório. Foram lidos trechos do TXT do projeto e arquivos relacionados do GitHub; a ferramenta do projeto não disponibilizou todo o TXT de uma vez. O instalador exige SHA Git exato (normalizando CRLF) dos cinco arquivos existentes, e cancela se divergirem. O preload existente é preservado integralmente; apenas uma ponte isolada é acrescentada.

Build Electron/React e acesso à rede não executados neste ambiente. Teste local obrigatório antes de commit, distribuição ou produção. O pacote não envia nada ao GitHub.

## Escopo
- Consulta individual via diálogo nativo: botão Importar XML, sem gravar o XML.
- Leitura sob demanda de 0001, 0002, 0003, 0005, 0006 / ComErros.
- Pasta base inicial U:\unico\importa\Xml\IMPORTACAO_AUTOMATICA.
- Seleção alternativa apenas em memória; não persiste configurações.
- 0004 ignorada até identificação.
- Resumo e detalhes de NF, CNPJ, emissor, destinatário, itens, lotes e ANVISA quando presentes.
- Correspondência por EAN comercial e tributável (este último exige conferir unidade).
- Sem correspondência por descrição, fabricante ou código do fornecedor nesta versão. Sem EAN: conferência manual, não erro fiscal comprovado.
- Código interno obtido de product_purchase_curve.cod_prod somente quando empresa corresponde à filial do catálogo; não toma um código de outra empresa como código de destino.
- Cadastros inativos e ambiguidades ficam explícitos; não há duplicação nem correção automática.
- SEM INSERT, UPDATE, DELETE ou migrações no módulo. SQL de consulta somente SELECT sobre conexões já usadas pelo app.

## Permissão desta versão
A rota e os IPCs exigem can_view do módulo products, inclusive para administradores. Não cria novo registro de permissões para evitar gravações no banco. O menu segue a lista existente da Sidebar; a rota bloqueia acesso sem permissão. Permissão independente fica pendente de decisão posterior.

## Limites e diagnósticos
- Motivo exato da falha no ERP não é conhecido: não há logs na pasta.
- xMotivo/cStat são mostrados como retorno incluído no XML, não como causa comprovada da falha atual de importação.
- Não valida XSD, assinatura, regras fiscais completas, situação atual na SEFAZ ou dígitos verificadores de CNPJ/chave/EAN.
- Ausência de protocolo não é prova de rejeição. SEM GTIN é tratado como limitação de correspondência, não invalidade fiscal.
- A comparação de totais é apenas vProd dos itens com indTot diferente de 0 contra ICMSTot/vProd, tolerância informativa 0,02; não compara soma de produtos diretamente com vNF.
- Limite 10 MB por XML e 2.000 XMLs por atualização. A tela sinaliza resultados parciais e erros de cada pasta. Pastas sem acesso não são apresentadas como vazias.
- Leitura não recursiva, sem mover ou apagar arquivos. Arquivos ainda sendo escritos podem falhar: atualizar novamente.
- Sem monitoramento contínuo. Interrupção ocorre entre arquivos; não cancela uma operação de rede já em andamento. Rede indisponível pode demorar conforme timeout do Windows.
- Não usa DTD nem entidades externas. XML bruto é analisado por DOMParser, nunca inserido como HTML.

## Arquivos
Main: constants, files.service, repository, ipc em src/main/modules/nf-import.
Renderer: components, constants, hooks, pages, services, styles em src/renderer/modules/nf-import.
Integrações: main.js, preload.js, App.jsx, Sidebar.jsx, homeModules.js.

## Aplicação e reversão
Execute Aplicar-ImportacaoNF.ps1 com o projeto atual como diretório de trabalho. Ele abre comparações no VS Code e a prévia completa, pede APLICAR, faz backup em Downloads e aplica. O instalador revalida tudo antes de gravar; cancela em arquivos divergentes ou módulo já existente. Em erro de cópia tenta restaurar o backup. O comando de reversão é impresso na instalação; feche o app antes de reverter.

## Checklist obrigatório local
1. npm run build deve passar. npm test do projeto não garante cobertura: o package.json atual só imprime uma mensagem.
2. npm start; login, menu Início e demais módulos permanecem funcionais.
3. Verificar acesso negado sem permissão products.can_view e consulta permitida com ela.
4. Importar o XML real enviado e conferir NF, filial, lotes e ANVISA.
5. Testar XML vazio, malformado, DTD, destinatário desconhecido, nota sem itens, SEM GTIN, protocolo ausente e arquivo maior que 10 MB.
6. Conferir exemplos reais de EAN com vários códigos, cadastro inativo, código somente em outra filial e EAN tributável com unidade distinta.
7. Comparar códigos internos com o sistema externo; nenhuma sugestão substitui conferência manual.
8. Testar as cinco ComErros, pasta inexistente, permissão negada, rede indisponível e arquivo removido após listagem.
9. Testar busca, filtro, detalhes, interrupção e atualização novamente.
10. Confirmar que XMLs e bancos não sofreram alterações pelo módulo.
11. Somente depois aprovar commit e push. Não alterar a versão do app antes de validar.

## Histórico
2026-11-23: criação da versão candidata Importação NF, leitura manual, acesso pela permissão existente de Produtos, ponte preload isolada, instalação com SHA, prévia, backup e reversão. Sem alteração remota.
