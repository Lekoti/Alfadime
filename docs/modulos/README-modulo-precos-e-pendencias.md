# Módulo Preços e Pendências

## Finalidade

O módulo **Preços e Pendências** controla a atualização de preços e pendências por laboratório e filial.

Ele permite cadastrar laboratórios, editar células, receber atualizações externas por arquivos Excel, controlar recebimentos, exportar dados e executar cobranças por e-mail.

## Localização

```text
src/main/modules/price-pending/
├─ migrations/
├─ commercial-policy.service.js
├─ price-pending-access.js
├─ price-pending-authorization.js
├─ price-pending-automatic-charge.ipc.js
├─ price-pending-automatic-charge.repository.js
├─ price-pending-automatic-charge.service.js
├─ price-pending-cell-edits.service.js
├─ price-pending-charge-result.js
├─ price-pending-db-config.repository.js
├─ price-pending-export.service.js
├─ price-pending-extensions.ipc.js
├─ price-pending-file-monitor.service.js
├─ price-pending-folders-config.repository.js
├─ price-pending-price-content.service.js
├─ price-pending-priority.repository.js
├─ price-pending-validation.js
├─ price-pending.controller.js
├─ price-pending.database.js
├─ price-pending.ipc.js
├─ price-pending.repository.js
└─ price-pending.routes.js

src/renderer/modules/price-pending/
├─ components/
├─ constants/
├─ hooks/
├─ pages/
├─ styles/
└─ utils/
```

## Arquivos e responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `pages/PricePendingPage.jsx` | Página principal do módulo. Monta filtros, resumo, tabela, exportação e cobrança. |
| `components/PricePendingTable.jsx` | Tabela de laboratórios e células editáveis. |
| `components/PricePendingFilters.jsx` | Filtros, busca, colunas visíveis, atualização e exportação. |
| `components/PricePendingToolbar.jsx` | Barra superior do módulo. |
| `components/PricePendingChargePanel.jsx` | Painel de cobrança manual e automática. |
| `components/PricePendingIgnoredFilesModal.jsx` | Exibe arquivos ignorados durante a atualização. |
| `components/PricePendingPolicyIssuesModal.jsx` | Exibe arquivos de preços fora do padrão. |
| `hooks/usePricePendingRows.js` | Carrega, atualiza e salva os dados da tabela. |
| `hooks/usePricePendingFilters.js` | Controla filtros, colunas visíveis e rolagem da tabela. |
| `hooks/usePricePendingPermissions.js` | Controla permissões do usuário no módulo. |
| `main/price-pending.repository.js` | Acesso ao banco, edição de células, atualizações externas e rascunhos. |
| `main/price-pending-file-monitor.service.js` | Processa arquivos Excel das pastas configuradas. |
| `main/price-pending-export.service.js` | Gera arquivos Excel de exportação. |
| `main/price-pending-automatic-charge.service.js` | Controla a cobrança automática. |
| `main/price-pending.ipc.js` | Registra os canais IPC do módulo. |

## Funcionamento

1. O usuário abre o módulo Preços e Pendências.
2. O sistema carrega os laboratórios ativos.
3. A tabela exibe as colunas autorizadas para o usuário.
4. O usuário pode editar células, remover laboratórios e atualizar recebimentos.
5. O sistema pode processar arquivos Excel das pastas de preços e pendências.
6. Atualizações externas respeitam células protegidas.
7. O resumo acima da tabela mostra a situação geral.
8. O usuário pode exportar os dados em Excel.
9. O usuário pode cobrar laboratórios manual ou automaticamente.

## Filiais

O módulo trabalha com as seguintes filiais:

| Sigla | Filial |
|---|---|
| `DPR` | Dimebras Paraná |
| `AMS` | Alfamed Mato Grosso do Sul |
| `DMT` | Dimebras Mato Grosso |
| `DMS` | Dimebras Mato Grosso do Sul |
| `DSC` | Dimebras Santa Catarina |

## Colunas

### Preços recebidos

- `env_precos_dpr`
- `env_precos_ams`
- `env_precos_dmt`
- `env_precos_dms`
- `env_precos_dsc`

### Pendências recebidas

- `env_pend_dpr`
- `env_pend_ams`
- `env_pend_dmt`
- `env_pend_dms`
- `env_pend_dsc`

### Preços atualizados

- `precos_ok_dpr`
- `precos_ok_ams`
- `precos_ok_dmt`
- `precos_ok_dms`
- `precos_ok_dsc`

### Pendências atualizadas

- `pendencias_ok_dpr`
- `pendencias_ok_ams`
- `pendencias_ok_dmt`
- `pendencias_ok_dms`
- `pendencias_ok_dsc`

## Resumo

O resumo acima da tabela exibe:

- Preços atualizados.
- Preços pendentes.
- Pendências atualizadas.
- Pendências pendentes.

Células com o valor `NAO TRABALHA` não são contadas como atualizadas nem como pendentes.

## Atualização externa

O módulo processa arquivos Excel das pastas configuradas.

Regras:

- O nome do arquivo deve identificar se é preços ou pendências.
- O nome do arquivo deve identificar a filial.
- O mês deve estar presente no nome do arquivo.
- A data de modificação do arquivo é usada para compor a data de atualização.
- Arquivos já processados não são processados novamente.
- Arquivos com laboratório ambíguo não são aplicados.
- Arquivos com nome contendo preços e pendências ao mesmo tempo são ignorados.

## Células protegidas

Uma célula pode ser protegida quando:

- Foi editada manualmente.
- Contém `NAO TRABALHA`.
- A observação contém `INDUSTRIA DESATIVADA`.

Quando uma célula protegida recebe uma atualização externa:

- O valor manual é preservado.
- A proposta externa fica pendente.
- O usuário pode aceitar ou manter o valor atual.

## Cobrança

O módulo permite cobrar laboratórios com preços e/ou pendências desatualizados.

### Cobrança manual

O usuário seleciona laboratórios ou utiliza o favorito fixo:

```text
Cobrar preços e pendências desatualizados
```

### Cobrança automática

A cobrança automática:

- Agrupa destinatários por e-mail.
- Evita envio duplicado para o mesmo e-mail.
- Reserva envio por e-mail e por identidade de indústria/filial.
- Possui histórico de execuções.
- Permite cancelamento.
- Registra falhas e resultados incertos.
- Permite configurar intervalo.
- Exibe status e próxima cobrança estimada.

## Deduplicação

A deduplicação garante que o mesmo contato não receba mais de uma cobrança na mesma execução.

O agrupamento é feito por:

- E-mail.
- Identidade de indústria/filial.

Se o mesmo e-mail aparecer em mais de uma indústria ou filial, o sistema envia apenas uma mensagem e registra todos os vínculos no campo `covered`.

## Exportação

A exportação pode ser:

- Completa.
- Por laboratório.
- Por seleção de linhas.

A exportação respeita permissões de coluna.

Colunas sem permissão de visualização não são exportadas.

## Vínculos

### Contatos

O módulo utiliza os contatos de indústrias para identificar destinatários de cobrança.

### Cobrança por e-mail

A cobrança utiliza o sistema de e-mail e SMTP para envio das mensagens.

### Política Comercial

O módulo verifica arquivos de preços fora do padrão e exibe alertas quando a Política Comercial não foi aplicada.

### Permissões

O módulo depende do sistema de permissões granulares.

## Permissões

Principais ações:

- Visualizar.
- Editar células.
- Criar laboratório.
- Remover laboratório.
- Atualizar recebimento.
- Exportar.
- Atualizar arquivos.
- Forçar atualização.
- Gerenciar cobrança automática.
- Gerenciar favoritos.
- Gerenciar contatos.

## Estados da tela

### Carregando

```text
Carregando laboratorios...
```

### Sem permissão de edição

A tabela é exibida em modo somente leitura.

### Erro

O módulo exibe mensagens de erro quando:

- A conexão com o banco falha.
- O usuário não tem permissão.
- O arquivo está fora do padrão.
- A exportação falha.
- A cobrança falha.

## Regras para editar

Não remover:

- `usePricePendingRows`
- `usePricePendingFilters`
- `usePricePendingPermissions`
- `PricePendingTable`
- `PricePendingFilters`
- `PricePendingChargePanel`
- `price-pending.repository.js`
- `price-pending.ipc.js`

Não alterar sem verificar:

- Permissões de coluna.
- Deduplicação de cobrança.
- Exportação por laboratório.
- Atualização externa.
- Células protegidas.
- Resumo acima da tabela.

## O que não fazer

Não permitir edição de coluna sem permissão.

Não exportar coluna sem permissão de visualização.

Não enviar cobrança duplicada para o mesmo e-mail.

Não aplicar atualização externa em célula protegida sem deixar a proposta pendente.

Não alterar o comportamento do resumo sem preservar a regra de `NAO TRABALHA`.

Não fazer chamadas diretas ao banco a partir dos componentes React.
