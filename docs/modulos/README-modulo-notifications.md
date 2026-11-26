# Módulo Notificações

## Finalidade

O módulo **Notificações** centraliza alertas e atualizações para os módulos do aplicativo.

## Localização backend

```text
src/main/modules/notifications/
├─ notifications-refresh.service.js
├─ notifications-refresh.worker.js
├─ notifications.constants.js
├─ notifications.ipc.js
├─ notifications.repository.js
├─ notifications.service.js
├─ price-pending-notifications.service.js
└─ product-audit-notifications.service.js
```

## Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `notifications-refresh.service.js` | Controla atualização de notificações. |
| `notifications-refresh.worker.js` | Executa atualização em segundo plano. |
| `notifications.constants.js` | Constantes do módulo. |
| `notifications.ipc.js` | Registra canais de notificações. |
| `notifications.repository.js` | Consulta e grava notificações. |
| `notifications.service.js` | Aplica regras de notificações. |
| `price-pending-notifications.service.js` | Gera notificações de Preços e Pendências. |
| `product-audit-notifications.service.js` | Gera notificações de Auditoria de Produtos. |

## Funcionalidades

- Notificações por módulo.
- Atualização automática.
- Atualização em segundo plano.
- Notificações de Preços e Pendências.
- Notificações de Auditoria de Produtos.

## Vínculos

### Preços e Pendências

Gera notificações relacionadas a preços e pendências.

### Auditoria de Produtos

Gera notificações relacionadas à auditoria de produtos.

## Regras para editar

Não remover a validação de permissões.

Não remover o controle de atualização.

## O que não fazer

Não gerar notificações sem vínculo com módulo ou usuário.
