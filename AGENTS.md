# Regras de trabalho do projeto Alfadime

## Objetivo

Este arquivo define as regras que qualquer IA deve seguir antes de analisar, corrigir, criar ou atualizar código neste projeto.

## Regras obrigatórias

1. Antes de alterar qualquer módulo, leia a documentação correspondente em `docs/modulos/`.
2. Antes de editar, leia os arquivos relacionados ao módulo para não perder funções.
3. Não remova funções, rotas, permissões, IPC, serviços ou componentes sem confirmação.
4. Não crie código novo sem necessidade real.
5. Mantenha o padrão visual, de fonte, texto, tamanho e layout dos módulos existentes.
6. Mantenha a estrutura profissional dos módulos.
7. Ao criar um novo módulo, separe os arquivos em pastas:
   - `components`
   - `constants`
   - `pages`
   - `services`
   - `styles`
8. Não coloque lógica de negócio em páginas.
9. Não faça chamadas diretas ao banco de dados em componentes React.
10. Use IPC apenas quando necessário.
11. Após qualquer alteração, gere os arquivos corrigidos para download.
12. Gere comando PowerShell para aplicar as alterações a partir de `C:\Users\USER\Downloads`.
13. Não envie alterações diretamente ao GitHub sem autorização.
14. Após build e teste local, gere comando PowerShell para commit e push.
15. Antes de enviar ao GitHub, confirme que o build passou.

## Estrutura de documentação

```text
docs/
├─ README.md
└─ modulos/
   ├─ README-modulo-inicio.md
   ├─ README-modulo-produtos.md
   └─ ...
```

## Fluxo de trabalho

1. Ler `AGENTS.md`.
2. Ler a documentação do módulo.
3. Ler os arquivos do módulo.
4. Identificar problemas.
5. Propor correções.
6. Gerar arquivos para download.
7. Gerar script PowerShell de aplicação.
8. Aguardar build e teste.
9. Gerar script PowerShell de commit e push.

## Módulo Início

A documentação do módulo Início está em:

```text
docs/modulos/README-modulo-inicio.md
```

## Regras de Git

Use mensagens de commit curtas e claras.

Exemplo:

```text
refactor(home): padroniza módulo Início, remove CSS órfão e corrige estados
```

## Regras de segurança

Não commitar:

- Senhas
- Tokens
- Chaves de API
- Arquivos de banco de dados
- Arquivos temporários
- Pastas `node_modules`
- Pastas de build
