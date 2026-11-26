# Módulo Contatos de Indústrias

## Finalidade

O módulo **Contatos de Indústrias** gerencia contatos, cobranças, favoritos, histórico, configurações e exportação de dados das indústrias.

## Localização backend

```text
src/main/modules/industry-contacts/
├─ contacts-charge-coordination.js
├─ contacts-charge-execution.repository.js
├─ contacts-charge-execution.service.js
├─ contacts-charge-favorites.repository.js
├─ contacts-charge-favorites.service.js
├─ contacts-charge-policy.js
├─ contacts-charge-run.repository.js
├─ contacts-charge-run.service.js
├─ contacts-charge.ipc.js
├─ industry-contacts-charge-history.repository.js
├─ industry-contacts-charge-view.service.js
├─ industry-contacts-charge.constants.js
├─ industry-contacts-charge.service.js
├─ industry-contacts-config.repository.js
├─ industry-contacts-export.service.js
├─ industry-contacts.database.js
├─ industry-contacts.ipc.js
├─ industry-contacts.repository.js
└─ industry-contacts.service.js
```

## Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `contacts-charge-coordination.js` | Coordena cobranças. |
| `contacts-charge-execution.repository.js` | Consulta e grava execuções. |
| `contacts-charge-execution.service.js` | Aplica regras de execução. |
| `contacts-charge-favorites.repository.js` | Consulta e grava favoritos. |
| `contacts-charge-favorites.service.js` | Aplica regras de favoritos. |
| `contacts-charge-policy.js` | Define política de cobrança. |
| `contacts-charge-run.repository.js` | Consulta e grava execuções de cobrança. |
| `contacts-charge-run.service.js` | Controla execuções de cobrança. |
| `contacts-charge.ipc.js` | Registra canais de cobrança. |
| `industry-contacts-charge-history.repository.js` | Consulta histórico de cobranças. |
| `industry-contacts-charge-view.service.js` | Prepara visualização de cobranças. |
| `industry-contacts-charge.constants.js` | Constantes de cobrança. |
| `industry-contacts-charge.service.js` | Aplica regras de cobrança. |
| `industry-contacts-config.repository.js` | Consulta e grava configurações. |
| `industry-contacts-export.service.js` | Exporta dados. |
| `industry-contacts.database.js` | Gerencia banco do módulo. |
| `industry-contacts.ipc.js` | Registra canais do módulo. |
| `industry-contacts.repository.js` | Consultas e gravações. |
| `industry-contacts.service.js` | Regras de contatos. |

## Funcionalidades

- Cadastro e consulta de contatos.
- Cobranças por indústria.
- Favoritos.
- Histórico de cobranças.
- Configurações.
- Exportação.

## Vínculos

### Preços e Pendências

A cobrança automática utiliza permissões e dados de Preços e Pendências.

### Envio de E-mails

A cobrança pode utilizar envio de e-mails.

## Regras para editar

Não remover a validação de permissões.

Não remover o histórico de cobranças.

Não permitir cobrança sem destinatário válido.

## O que não fazer

Não alterar regras de cobrança sem validar o impacto no histórico.
