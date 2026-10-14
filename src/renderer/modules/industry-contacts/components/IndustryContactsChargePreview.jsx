export default function IndustryContactsChargePreview({ preview }) {
    const messages = Array.isArray(preview?.messages) ? preview.messages : [preview];
    return (
        <>
            {messages.length > 1 && <p>Serão enviados dois e-mails separados, conforme as prévias abaixo.</p>}
            {messages.filter(Boolean).map((message, index) => (
                <div className="industry-contacts-charge-preview" key={`${message.charge_type}-${index}`}>
                    {messages.length > 1 && <strong>E-mail {index + 1} — {message.charge_label}</strong>}
                    <label><span>Para</span><input type="email" value={message.to || ""} readOnly /></label>
                    <label><span>Assunto</span><input type="text" value={message.subject || ""} readOnly /></label>
                    <label><span>Anexos</span><textarea rows="3" readOnly value={
                        (message.attachments || []).map((attachment) =>
                            attachment.fileName || attachment.filename || attachment.path || ""
                        ).filter(Boolean).join("\n")
                    } /></label>
                    <label><span>Mensagem</span><textarea rows="12" readOnly value={message.body || ""} /></label>
                </div>
            ))}
        </>
    );
}
