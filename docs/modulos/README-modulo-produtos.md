# Módulo Produtos

## Finalidade

O módulo **Produtos** centraliza o cadastro, consulta, filtros, exportação e integração do catálogo de produtos do Alfadime.

Ele trabalha com o catálogo por filial, códigos internos, EAN, dados comerciais, classificação e vínculo com a curva de compras.

## Localização backend

```text
src/main/modules/products/
├─ constants/
├─ ipc/
├─ mappers/
├─ repositories/
└─ services/
```

## Responsabilidades

| Pasta | Responsabilidade |
|---|---|
| `constants/` | Campos, configurações e valores fixos do módulo. |
| `ipc/` | Registro dos canais IPC entre frontend e backend. |
| `mappers/` | Conversão e padronização de dados. |
| `repositories/` | Consultas, filtros, gravações e integração com o banco. |
| `services/` | Regras de negócio, exportação e orquestração. |

## Banco de dados

O módulo utiliza principalmente a tabela:

```text
product_catalog
```

Os produtos são organizados por:

- Filial
- Código do produto
- EAN
- Código Sirius
- Laboratório
- Marca
- Grupo
- Categoria
- Unidade
- Caixa padrão
- Situação ativo/inativo

## Integração com Curva de Compras

O catálogo pode receber o código global da curva de compras por meio de:

```text
product_purchase_curve.cod_prod_global
```

Quando esse valor existe e é válido, ele tem prioridade sobre o campo `sirius_code` do catálogo.

## Regras importantes

- Um produto pertence a uma filial.
- O mesmo EAN pode existir em mais de uma filial.
- O código interno pode variar entre filiais.
- Produtos inativos não devem ser considerados em auditorias e sugestões de compra.
- A exportação deve respeitar os filtros aplicados na listagem.

## Vínculos

### Auditoria de Produtos

A Auditoria utiliza os produtos ativos do catálogo para identificar:

- EAN inválido
- EAN duplicado na mesma filial
- Divergências entre filiais
- Divergências em campos auditáveis

### Correções de Produtos

As correções alteram campos permitidos do catálogo e registram histórico em:

```text
product_change_history
```

### Compras

A Curva de Compras utiliza filial e código do produto para vincular os registros da curva ao catálogo.

## Regras para editar

Não alterar a estrutura de filial, código e EAN sem verificar:

- Auditoria de Produtos
- Correções de Produtos
- Curva de Compras
- Exportações
- Índices do banco

Não remover campos utilizados pela auditoria, correções ou curva de compras.

## O que não fazer

Não cadastrar produto sem filial.

Não permitir EAN duplicado na mesma filial.

Não aplicar correção em campo fora da lista de campos permitidos.

Não remover o vínculo com a curva de compras sem verificar o impacto em Compras e Auditoria.
