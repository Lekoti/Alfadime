# Módulo Correções de Produtos

## Finalidade

O módulo **Correções de Produtos** registra, aplica, reverte, cancela e confirma correções feitas nos campos do catálogo de produtos.

Ele mantém histórico completo das alterações e controla o status de cada correção.

## Localização backend

```text
src/main/modules/products/repositories/
└─ products-corrections.repository.js
```

## Tabelas utilizadas

```text
product_corrections
product_change_history
product_catalog
```

## Status da correção

| Status | Significado |
|---|---|
| `pending_excel` | Correção pendente de confirmação na planilha. |
| `sent_internal` | Correção aplicada no banco do Alfadime. |
| `confirmed_in_excel` | Correção confirmada após sincronização com o Excel. |
| `cancelled` | Correção cancelada ou excluída. |

## Funcionamento

1. O usuário cria uma correção.
2. O sistema valida o campo e o produto.
3. Se já existir correção pendente para o mesmo produto e campo, ela é atualizada.
4. A correção é registrada como `pending_excel`.
5. Ao marcar como feito, o valor é aplicado no catálogo.
6. O status passa para `sent_internal`.
7. A sincronização com Excel pode confirmar a correção.
8. A correção pode ser revertida ou cancelada.

## Regras de cancelamento

Somente correções com status `pending_excel` podem ser canceladas.

Correções já aplicadas devem ser revertidas antes de serem canceladas.

## Regras de reversão

Somente correções com status `sent_internal` podem ser revertidas.

A reversão restaura o valor anterior no catálogo e retorna a correção para `pending_excel`.

## Histórico

Cada ação gera registro em `product_change_history`.

As ações registradas incluem:

- Criação de correção
- Atualização de correção
- Cancelamento
- Reversão
- Aplicação no banco local
- Confirmação pelo Excel

## Filtros

Os filtros de filial e campo são limitados a 500 opções.

A listagem suporta paginação de até 500 registros por página.

## Vínculos

### Produtos

As correções alteram campos permitidos da tabela `product_catalog`.

### Auditoria de Produtos

A auditoria identifica problemas que podem gerar correções.

### Excel

A confirmação compara o valor atual do produto com o valor corrigido registrado na correção.

## Regras para editar

Não permitir alteração em campo fora da lista de campos corretíveis.

Não remover o histórico de alterações.

Não permitir cancelamento de correção já aplicada sem reversão prévia.

## O que não fazer

Não alterar diretamente o catálogo sem registrar correção e histórico.

Não permitir duas correções pendentes para o mesmo produto e campo.

Não remover a validação de campo antes de gravar no banco.
