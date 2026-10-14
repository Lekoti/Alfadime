const CHARGE_TYPES = {
    PRICES: "prices",
    PENDING: "pending",
    BOTH: "both"
};

const CHARGE_SUBJECTS = {
    [CHARGE_TYPES.PRICES]:
        "ATUALIZAÇÃO - Preços",

    [CHARGE_TYPES.PENDING]:
        "ATUALIZAÇÃO - Pendências",

    [CHARGE_TYPES.BOTH]:
        "ATUALIZAÇÃO - Preços e Pendências"
};

const PRICES_ATTACHMENT_PATH =
    "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\ANEXOS\\precos.xlsx";

const PENDING_ATTACHMENT_DIRECTORY =
    "\\\\10.0.0.20\\Compras\\1.COMPRAS\\SAULO\\ALFADIME\\ANEXOS\\pendencias.xlsx";

const PRICES_EMAIL_BODY = `
Olá, tudo bem?

Solicitamos, por gentileza, o preenchimento e devolução do arquivo de Preços anexado.

Para que o processo ocorra corretamente, pedimos atenção às orientações abaixo.

ARQUIVO DE PREÇOS

Preencha uma linha para cada produto, mantendo a primeira linha com os títulos das colunas.

Campos obrigatórios:

* CODIGO DE BARRAS (EAN 13):
Informar o código de barras completo do produto. Preencher somente com números, sem espaços, pontos, hífens ou casas decimais.

* PRECO (COMPRA DIMEBRAS E ALFAMED):
Informar o preço de compra do produto.
Utilizar somente valor numérico, com vírgula ou ponto decimal.
Exemplo: 15,90

* FILIAL (DPR, DMT, DSC, DMS, AMS):
Informar a filial correspondente utilizando uma das siglas abaixo:
DPR — Dimebras Paraná
AMS — Alfamed Mato Grosso do Sul
DMT — Dimebras Mato Grosso
DMS — Dimebras Mato Grosso do Sul
DSC — Dimebras Santa Catarina

* NOME LABORATORIO:
Nome do laboratório ou indústria do produto.

* DATA DE VALIDADE DOS PRECOS:
Data final da condição comercial ou do preço informado.
Preferencialmente preencher no formato DD/MM/AAAA.
Exemplo: 31/12/2026

IMPORTANTE

* Não alterar o nome do arquivo.
* Não alterar os nomes das colunas existentes no arquivo.
* Não excluir colunas, mesmo quando não houver informação para preencher.
* Não criar novas colunas ou abas ou alterar o formato do arquivo.
* Não mesclar células.
* Não enviar códigos EAN em formato científico, por exemplo: 7,89012E+12.
* Produtos sem EAN, filial ou preço poderão ser ignorados no processo.
* Salvar e devolver o arquivo preferencialmente em formato Excel (.xlsx).

Após o preenchimento, responda este e-mail com o arquivo atualizado em anexo.

Agradecemos a colaboração.
`.trim();

const PENDING_EMAIL_BODY = `
Olá, tudo bem?

Solicitamos, por gentileza, o preenchimento e devolução do arquivo de Pendências anexado.

Para que o processo ocorra corretamente, pedimos atenção às orientações abaixo.

ARQUIVO DE PENDÊNCIAS

Preencha uma linha para cada produto pendente.

Campos obrigatórios:

* CODIGO DE BARRAS (EAN 13):
Informar o código de barras completo do produto, somente números.

* QUANTIDADE PENDENTE PRA FATURAR:
Informar a quantidade que está pendente para faturar.

* FILIAL (DPR, DMT, DSC, DMS, AMS):
Informar a filial correspondente utilizando uma das siglas abaixo:
DPR — Dimebras Paraná
AMS — Alfamed Mato Grosso do Sul
DMT — Dimebras Mato Grosso
DMS — Dimebras Mato Grosso do Sul
DSC — Dimebras Santa Catarina

* NOME LABORATORIO:
Nome do laboratório ou indústria.

IMPORTANTE

* Não alterar o nome do arquivo.
* Não alterar os nomes das colunas existentes no arquivo.
* Não excluir colunas, mesmo quando não houver informação para preencher.
* Não criar novas colunas ou abas ou alterar o formato do arquivo.
* Não mesclar células.
* Não enviar códigos EAN em formato científico, por exemplo: 7,89012E+12.
* Salvar e devolver o arquivo preferencialmente em formato Excel (.xlsx).

Após o preenchimento, responda este e-mail com o arquivo atualizado em anexo.

Agradecemos a colaboração.
`.trim();

const BOTH_EMAIL_BODY = `
Olá, tudo bem?

Solicitamos, por gentileza, o preenchimento e devolução dos arquivos de Preços e Pendências anexados.

Para que o processo ocorra corretamente, pedimos atenção às orientações abaixo.

${PRICES_EMAIL_BODY
    .replace(
        "Olá, tudo bem?",
        ""
    )
    .replace(
        "Após o preenchimento, responda este e-mail com o arquivo atualizado em anexo.",
        ""
    )
    .replace(
        "Agradecemos a colaboração.",
        ""
    )
    .trim()}

${PENDING_EMAIL_BODY
    .replace(
        "Olá, tudo bem?",
        ""
    )
    .replace(
        "Após o preenchimento, responda este e-mail com o arquivo atualizado em anexo.",
        ""
    )
    .replace(
        "Agradecemos a colaboração.",
        ""
    )
    .trim()}

IMPORTANTE

* Não alterar os nomes dos arquivos.
* Não alterar os nomes das colunas existentes nos arquivos.
* Não excluir colunas, mesmo quando não houver informação para preencher.
* Não criar novas colunas ou abas ou alterar o formato dos arquivos.
* Não mesclar células.
* Não enviar códigos EAN em formato científico, por exemplo: 7,89012E+12.
* Salvar e devolver os arquivos preferencialmente em formato Excel (.xlsx).

Após o preenchimento, responda este e-mail com os arquivos atualizados em anexo.

Agradecemos a colaboração.
`.trim();

const CHARGE_EMAIL_BODIES = {
    [CHARGE_TYPES.PRICES]:
        PRICES_EMAIL_BODY,

    [CHARGE_TYPES.PENDING]:
        PENDING_EMAIL_BODY,

    [CHARGE_TYPES.BOTH]:
        BOTH_EMAIL_BODY
};

module.exports = {
    CHARGE_TYPES,
    CHARGE_SUBJECTS,
    CHARGE_EMAIL_BODIES,
    PRICES_ATTACHMENT_PATH,
    PENDING_ATTACHMENT_DIRECTORY
};