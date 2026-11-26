# Módulo Configurações

## Finalidade

O módulo **Configurações** centraliza as configurações gerais, usuários, permissões, contatos de indústrias e Preços e Pendências.

## Localização frontend

```text
src/renderer/modules/settings/
├─ pages/
├─ services/
└─ styles/
```

## Páginas

| Arquivo | Responsabilidade |
|---|---|
| `SettingsLayout.jsx` | Layout e navegação das abas. |
| `SettingsGeneralPage.jsx` | Configurações gerais. |
| `SettingsUsersPage.jsx` | Gestão de usuários. |
| `SettingsPermissionsPage.jsx` | Permissões granulares. |
| `SettingsContactsPage.jsx` | Configurações de contatos de indústrias. |
| `SettingsPricePendingPage.jsx` | Configurações de Preços e Pendências. |

## Abas

| Aba | Função |
|---|---|
| Geral | Configurações gerais do aplicativo. |
| Usuários | Cadastro, edição e controle de usuários. |
| Permissões | Permissões por módulo, função e coluna. |
| Contatos | Configurações de contatos de indústrias. |
| Preços e Pendências | Configurações de pastas e banco compartilhado. |

## Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `SettingsLayout.jsx` | Organiza as abas de configuração. |
| `SettingsGeneralPage.jsx` | Mantém configurações gerais. |
| `SettingsUsersPage.jsx` | Mantém usuários e perfis. |
| `SettingsPermissionsPage.jsx` | Mantém permissões granulares. |
| `SettingsContactsPage.jsx` | Mantém configurações de contatos. |
| `SettingsPricePendingPage.jsx` | Mantém configurações de Preços e Pendências. |

## Vínculos

### Autenticação

Usuários e permissões são vinculados ao módulo de autenticação.

### Contatos de Indústrias

A aba de contatos configura dados usados pelo módulo de contatos.

### Preços e Pendências

A aba de Preços e Pendências configura pastas de leitura e banco compartilhado.

## Regras para editar

Não remover a validação de permissões.

Não permitir alteração de configurações sem autorização.

## O que não fazer

Não expor configurações sensíveis sem controle de acesso.
