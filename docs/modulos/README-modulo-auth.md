# Módulo Autenticação

## Finalidade

O módulo **Autenticação** controla usuários, sessões, perfis, permissões granulares e acesso aos módulos do aplicativo.

## Localização backend

```text
src/main/modules/auth/
├─ auth.ipc.js
├─ authDatabaseService.js
├─ authHandler.js
├─ granularPermissions.ipc.js
├─ granularPermissionsDatabaseService.js
├─ granularPermissionsHandler.js
├─ userRoles.constants.js
├─ users.ipc.js
├─ usersDatabaseService.js
└─ usersHandler.js
```

## Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `auth.ipc.js` | Registra canais de autenticação. |
| `authDatabaseService.js` | Gerencia usuários, sessões e autenticação. |
| `authHandler.js` | Mantém a sessão autenticada. |
| `granularPermissions.ipc.js` | Registra canais de permissões granulares. |
| `granularPermissionsDatabaseService.js` | Consulta e grava permissões por módulo, função e coluna. |
| `granularPermissionsHandler.js` | Expõe permissões para o frontend. |
| `userRoles.constants.js` | Define os perfis de usuário. |
| `users.ipc.js` | Registra canais de usuários. |
| `usersDatabaseService.js` | Gerencia cadastro e consultas de usuários. |
| `usersHandler.js` | Expõe operações de usuários. |

## Perfis

| Perfil | Uso |
|---|---|
| `CREATOR` | Acesso administrativo completo. |
| `ADMIN` | Administração do sistema. |
| `EDITOR` | Edição e execução de operações autorizadas. |
| `VIEWER` | Consulta, conforme permissões concedidas. |

## Permissões granulares

As permissões são avaliadas por:

1. Módulo.
2. Função.
3. Coluna.
4. Ação, como visualizar, editar ou executar.

Um usuário só recebe dados e ações autorizadas para o seu perfil.

## Vínculos

### Todos os módulos

A autenticação é a base de acesso do aplicativo.

### Preços e Pendências

Utiliza permissões granulares por coluna, grupo e função.

### Compras

Utiliza permissão para sincronizar a curva de compras.

## Regras para editar

Não remover a validação de sessão.

Não remover a validação de permissões granulares.

Não permitir acesso a dados sem autorização.

## O que não fazer

Não liberar funções administrativas para perfis sem permissão.

Não expor dados de usuários sem controle de acesso.
