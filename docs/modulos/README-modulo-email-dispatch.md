# Módulo Envio de E-mails

## Finalidade

O módulo **Envio de E-mails** centraliza o envio, recebimento, processamento de planilhas, anexos e histórico de comunicações por e-mail.

## Localização backend

```text
src/main/modules/email-dispatch/
├─ email-dispatch-attachments.service.js
├─ email-dispatch-imap.service.js
├─ email-dispatch-processor.service.js
├─ email-dispatch-received.ipc.js
├─ email-dispatch-received.repository.js
├─ email-dispatch-received.service.js
├─ email-dispatch-smtp.service.js
├─ email-dispatch.config.js
├─ email-dispatch.constants.js
├─ email-dispatch.ipc.js
├─ email-dispatch.repository.js
├─ email-dispatch.service.js
└─ email-spreadsheet-processor.service.js
```

## Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `email-dispatch-attachments.service.js` | Processa anexos recebidos. |
| `email-dispatch-imap.service.js` | Lê caixa de entrada via IMAP. |
| `email-dispatch-processor.service.js` | Processa mensagens recebidas. |
| `email-dispatch-received.ipc.js` | Registra canais de e-mails recebidos. |
| `email-dispatch-received.repository.js` | Consulta e grava e-mails recebidos. |
| `email-dispatch-received.service.js` | Aplica regras de recebimento. |
| `email-dispatch-smtp.service.js` | Envia e-mails via SMTP. |
| `email-dispatch.config.js` | Configurações do módulo. |
| `email-dispatch.constants.js` | Constantes do módulo. |
| `email-dispatch.ipc.js` | Registra canais de envio. |
| `email-dispatch.repository.js` | Consultas e gravações de envio. |
| `email-dispatch.service.js` | Regras de envio. |
| `email-spreadsheet-processor.service.js` | Processa planilhas recebidas por e-mail. |

## Funcionalidades

- Envio de e-mails por SMTP.
- Leitura de e-mails por IMAP.
- Processamento de anexos.
- Processamento de planilhas.
- Histórico de envios e recebimentos.
- Vínculo com Preços e Pendências.

## Vínculos

### Preços e Pendências

Os e-mails podem atualizar status de recebimento de preços e pendências por laboratório e filial.

## Regras para editar

Não remover a validação de destinatários.

Não remover o controle de anexos.

Não permitir processamento de arquivos não reconhecidos.

## O que não fazer

Não enviar e-mails sem destinatário válido.

Não processar anexos sem validar o tipo de arquivo.
