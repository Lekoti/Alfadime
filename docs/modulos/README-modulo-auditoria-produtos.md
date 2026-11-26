# Módulo Auditoria de Produtos

## Finalidade

O módulo **Auditoria de Produtos** identifica inconsistências no catálogo de produtos entre filiais.

Ele compara produtos ativos por EAN, valida campos auditáveis e apresenta problemas que podem exigir correção.

## Localização backend

```text
src/main/modules/products/
├─ product-audit.service.js
├─ product-audit.repository.js
├─ product-audit-export.service.js
└─ product-audit.ipc.js
```

## Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `product-audit.repository.js` | Busca produtos ativos e valores distintos para filtros. |
| `product-audit.service.js` | Monta os problemas por EAN e aplica filtros. |
| `product-audit-export.service.js` | Exporta o resultado da auditoria para Excel. |
| `product-audit.ipc.js` | Registra os canais IPC do módulo. |

## O que é auditado

A auditoria verifica:

- EAN inválido
- EAN duplicado na mesma filial
- Divergências entre filiais
- Divergências em campos auditáveis
- Vínculo com o código Sirius da curva de compras

## Funcionamento

1. O sistema busca apenas produtos ativos.
2. Os produtos são agrupados por EAN.
3. Os campos auditáveis são comparados entre filiais.
4. Os problemas são montados por EAN.
5. Os filtros são aplicados sobre os problemas encontrados.
6. O usuário pode exportar o resultado para Excel.

## Filtros

Os filtros utilizam valores distintos do catálogo.

Os valores distintos são limitados a 500 opções por campo.

## Exportação

A exportação gera arquivo Excel com os problemas da auditoria.

A exportação deve respeitar os filtros aplicados na tela.

## Vínculos

### Produtos

A auditoria lê os produtos ativos da tabela:

```text
product_catalog
```

### Curva de Compras

A auditoria utiliza o código global da curva de compras para complementar a análise por EAN.

### Correções de Produtos

Problemas identificados na auditoria podem gerar correções no módulo de Correções de Produtos.

## Regras para editar

Não remover a limitação de 500 valores nos filtros.

Não permitir campos livres na consulta de valores distintos.

Não alterar a busca por EAN sem verificar o impacto nas divergências entre filiais.

## O que não fazer

Não auditar produtos inativos.

Não misturar produtos de filiais diferentes sem agrupar por EAN.

Não exportar dados sem aplicar os filtros da tela.
