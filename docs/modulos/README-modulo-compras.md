# Módulo Compras

## Finalidade

O módulo **Compras** calcula sugestões de compra a partir da curva de compras, estoque, média de venda, cobertura e preços por filial.

Ele também permite importar a curva, aplicar quantidade manual, exportar dados e acompanhar o histórico de importações.

## Localização backend

```text
src/main/modules/purchases/
├─ purchases-calculation.service.js
├─ purchases-export.service.js
├─ purchases-file-monitor.service.js
├─ purchases-import.service.js
├─ purchases-normalization.js
├─ purchases.config.js
├─ purchases.constants.js
├─ purchases.ipc.js
├─ purchases.repository.js
└─ purchases.service.js
```

## Localização frontend

```text
src/renderer/modules/purchases/
├─ components/
├─ constants/
├─ hooks/
├─ pages/
├─ services/
└─ styles/
```

## Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `purchases-calculation.service.js` | Calcula curva, cobertura, sugestão e preços. |
| `purchases.repository.js` | Consultas, filtros, importação e gravações. |
| `purchases.service.js` | Regras de listagem, status e resumo. |
| `purchases-import.service.js` | Importação da curva. |
| `purchases-export.service.js` | Exportação dos dados. |
| `purchases-file-monitor.service.js` | Monitoramento de arquivo. |
| `purchases-normalization.js` | Normalização dos dados importados. |
| `purchases.ipc.js` | Registro dos canais IPC. |

## Filiais suportadas

| Código | Empresa |
|---|---|
| `DPR` | DIMEBRAS PR |
| `AMS` | ALFAMED MS |
| `DMT` | DIMEBRAS MT |
| `DMS` | DIMEBRAS MS |
| `DSC` | DIMEBRAS SC |

## Curvas

| Curva | Média utilizada | Dias padrão |
|---|---:|---:|
| A | 3 meses | 90 |
| B | 6 meses | 60 |
| C | 12 meses | 30 |
| D | 12 meses | 30 |
| E | 12 meses | 30 |
| F | 12 meses | 30 |
| G | 12 meses | 30 |

A curva efetiva considera a curva do produto e a curva da unidade, priorizando a curva de menor prioridade numérica.

## Cálculo da sugestão

1. O sistema identifica a curva efetiva.
2. Define a média de venda conforme a curva.
3. Calcula estoque disponível somando estoque atual e bloqueado.
4. Calcula a meta em dias conforme a curva.
5. Calcula a necessidade de compra.
6. Arredonda a quantidade para a caixa padrão, quando existir.
7. Calcula cobertura, preço e valor total.

## Status de compra

| Status | Regra |
|---|---|
| `suggestion` | Existe quantidade sugerida. |
| `belowtarget` | Cobertura abaixo da meta. |
| `critical` | Cobertura até 15 dias. |
| `nobuy` | Cobertura igual ou maior que a meta. |
| `excessstock` | Cobertura igual ou maior que o dobro da meta. |
| `promotion` | Cobertura igual ou maior que o triplo da meta. |
| `nosales` | Não há média de venda suficiente. |
| `noprice` | Existe sugestão, mas não há preço para calcular o total. |

## Importação

A importação grava dados em:

```text
purchase_curve_products
product_purchase_curve
purchase_curve_import_history
```

O vínculo com o catálogo é feito por:

1. Filial e código do produto.
2. Filial e EAN, quando o código não encontrar o produto.

Registros sem alteração são identificados pelo hash SHA-256 e não são gravados novamente.

## Filtros

Os filtros utilizam whitelist de campos.

Campos inválidos são rejeitados.

As opções de filtro são limitadas a 500 valores.

## Quantidade manual

O usuário pode definir uma quantidade manual por produto.

A quantidade manual tem prioridade sobre a quantidade calculada.

## Vínculos

### Produtos

A curva é vinculada ao catálogo por filial, código e EAN.

### Auditoria de Produtos

A curva fornece o código global utilizado na auditoria.

### Correções de Produtos

As correções podem alterar campos do catálogo que influenciam a identificação e análise dos produtos.

## Regras para editar

Não remover a whitelist de campos nos filtros.

Não remover o limite de 500 opções nos filtros.

Não alterar o cálculo de curva sem validar o impacto nas sugestões.

Não remover o hash SHA-256 da importação.

## O que não fazer

Não importar curva sem filial ou código do produto.

Não vincular produto por EAN sem respeitar a filial.

Não permitir filtro SQL livre.

Não remover o histórico de importação.
