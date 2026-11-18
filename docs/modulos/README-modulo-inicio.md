# Módulo Início (home)

## Finalidade

O módulo **Início** é a tela inicial do Alfadime após o login. Ele funciona como um painel de atalhos para os módulos disponíveis ao usuário.

Ele não possui lógica de negócio, banco de dados, IPC ou serviços próprios. Sua função é apenas exibir os cards dos módulos que o usuário tem permissão para acessar e navegar para eles.

## Localização

```text
src/renderer/modules/home/
├─ components/
│  ├─ HomeCard.jsx
│  └─ HomeState.jsx
├─ constants/
│  └─ homeModules.js
├─ pages/
│  └─ HomePage.jsx
└─ styles/
   └─ home.css
```

## Arquivos e responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `pages/HomePage.jsx` | Página principal do módulo. Filtra os módulos por permissão e renderiza os cards. |
| `constants/homeModules.js` | Lista fixa dos módulos exibidos na tela Início. |
| `components/HomeCard.jsx` | Componente de card clicável de cada módulo. |
| `components/HomeState.jsx` | Componente de estado: carregando ou nenhum módulo disponível. |
| `styles/home.css` | Estilo exclusivo da tela Início. |

## Funcionamento

1. O usuário faz login.
2. O `App.jsx` renderiza a rota `/` dentro do `MainLayout`.
3. A rota `/` carrega `HomePage.jsx`.
4. `HomePage.jsx` chama `usePermissions()`.
5. O hook busca as permissões do usuário logado.
6. A lista `MODULES` é filtrada por `canAccessModule(module.moduleKey)`.
7. Somente os módulos com permissão de visualização são exibidos.
8. Ao clicar em um card, o usuário é navegado para a rota do módulo.

## Vínculos

### App.jsx

A rota do módulo Início é registrada como rota index:

```jsx
<Route
    index
    element={<HomePage />}
/>
```

Ela fica dentro de:

```jsx
<Route
    path="/"
    element={<MainLayout />}
>
```

Isso significa que a tela Início é a primeira tela exibida após o login.

### usePermissions

O módulo depende do hook:

```text
src/renderer/modules/auth/hooks/usePermissions.js
```

Ele fornece:

- `isLoading`
- `canAccessModule`

A permissão é verificada por `moduleKey`.

### MainLayout

A tela Início é renderizada dentro do layout principal:

```text
src/renderer/layouts/MainLayout.jsx
```

O layout fornece a sidebar e a área de conteúdo.

### Sidebar

A sidebar possui sua própria lista de menus. Ela não usa `homeModules.js`.

Isso significa que, ao criar, renomear ou ocultar um módulo, pode ser necessário atualizar:

- `App.jsx`
- `Sidebar.jsx`
- `homeModules.js`

## Módulos exibidos

A tela Início exibe estes módulos:

- Produtos
- Auditoria de Produtos
- Correções de Produtos
- Preços e Pendências
- Compras
- Compras de Mercadorias
- Contatos
- Notificações
- E-mail
- Configurações

O módulo **Início** não aparece como card, porque o usuário já está na tela Início.

## Permissões

Cada item usa um `moduleKey`:

| Card | moduleKey |
|---|---|
| Produtos | `products` |
| Auditoria de Produtos | `product-audit` |
| Correções de Produtos | `product-corrections` |
| Preços e Pendências | `price-pending` |
| Compras | `purchases` |
| Compras de Mercadorias | `purchases` |
| Contatos | `industry-contacts` |
| Notificações | `notifications` |
| E-mail | `email` |
| Configurações | `settings` |

Importante: **Compras** e **Compras de Mercadorias** usam o mesmo `moduleKey`, porque ambas dependem da permissão `purchases`.

## Estados da tela

### Carregando

Enquanto as permissões estão sendo carregadas:

```text
Carregando módulos...
```

### Nenhum módulo disponível

Se o usuário não tiver permissão para nenhum módulo:

```text
Nenhum módulo disponível para o seu usuário.
```

### Módulos disponíveis

Os cards são exibidos em grade responsiva.

## Estilo

O estilo usa:

- Fundo claro com degradê.
- Cards brancos com borda e sombra leve.
- Ícone, título e descrição em cada card.
- Grade de 4 colunas em telas grandes.
- 3 colunas até 1200px.
- 2 colunas até 900px.
- 1 coluna até 560px.
- Foco visível para navegação por teclado.

A variável CSS usada é:

```css
var(--home-wallpaper, none)
```

Se essa variável não estiver definida em outro lugar, o fundo fica apenas com o degradê.

## Regras para editar

Não remover:

- `usePermissions`
- `HomeCard`
- `HomeState`
- `homeModules.js`
- `home.css`

Não adicionar novamente:

- Card “Início”
- Propriedade `exact`
- CSS de `.home-header`, `.home-eyebrow` ou `.home-settings-tip`

Ao criar um novo módulo:

1. Criar a rota em `App.jsx`.
2. Criar o item no menu em `Sidebar.jsx`.
3. Adicionar o card em `homeModules.js`.
4. Usar o `moduleKey` correto.
5. Garantir que a permissão exista no sistema.

## O que não fazer

Não colocar lógica de negócio no módulo Início.

Não fazer chamadas diretas ao banco, IPC ou serviços dentro de `HomePage.jsx`.

Não duplicar a lista de módulos dentro do `HomePage.jsx`.

Não remover a filtragem por permissão.

Não alterar o `moduleKey` de “Compras de Mercadorias” sem verificar também `App.jsx` e as permissões do sistema.
