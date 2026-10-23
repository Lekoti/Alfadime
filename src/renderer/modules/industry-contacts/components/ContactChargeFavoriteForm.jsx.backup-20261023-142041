import { useMemo, useState } from "react";
import { Paperclip, Save, X } from "lucide-react";
import {
    CONTACT_CHARGE_TYPES,
    CONTACT_CHARGE_TYPE_LABELS,
    EMPTY_CONTACT_CHARGE_FAVORITE
} from "../constants/contacts.constants";


export default function ContactChargeFavoriteForm({
    form,
    contacts = [],
    saving = false,
    onChange,
    onSubmit,
    onCancel
}) {
    const [contactSearch, setContactSearch] = useState("");
    const [industrySearch, setIndustrySearch] = useState("");


    function updateField(field, value) {
        onChange((current) => ({
            ...current,
            [field]: value
        }));
    }


    function toggleContact(contact) {
        onChange((current) => {
            const contactId = contact.contact_id || contact.id;
            const exists = current.recipients.some(
                (item) => (item.contact_id || item.id) === contactId
            );


            return {
                ...current,
                recipients: exists
                    ? current.recipients.filter(
                        (item) => (item.contact_id || item.id) !== contactId
                    )
                    : [
                        ...current.recipients,
                        {
                            contact_id: contactId,
                            laboratory_name: contact.laboratory_name,
                            laboratory_key: contact.laboratory_key,
                            branch: contact.branch,
                            email: contact.email
                        }
                    ]
            };
        });
    }


    function toggleIndustry(industry) {
        onChange((current) => {
            const code = industry.industry_global_code || industry.global_code || industry.code;
            const exists = current.industries.some(
                (item) => (item.industry_global_code || item.code) === code
            );


            return {
                ...current,
                industries: exists
                    ? current.industries.filter(
                        (item) => (item.industry_global_code || item.code) !== code
                    )
                    : [
                        ...current.industries,
                        {
                            industry_global_code: code,
                            industry_name: industry.laboratory_name || industry.name
                        }
                    ]
            };
        });
    }


    function addAttachments(files) {
        const newAttachments = Array.from(files || []).map((file) => ({
            file_name: file.name,
            file_path: file.path,
            file_size: file.size,
            mime_type: file.type
        }));


        onChange((current) => ({
            ...current,
            attachments: [
                ...current.attachments,
                ...newAttachments
            ]
        }));
    }


    function removeAttachment(index) {
        onChange((current) => ({
            ...current,
            attachments: current.attachments.filter(
                (_item, itemIndex) => itemIndex !== index
            )
        }));
    }


    const filteredContacts = useMemo(() => {
        const search = contactSearch.trim().toLocaleLowerCase("pt-BR");


        if (!search) return contacts;


        return contacts.filter((contact) => {
            const values = [
                contact.laboratory_name,
                contact.contact_name,
                contact.email,
                contact.branch,
                contact.cargo
            ];


            return values
                .filter(Boolean)
                .some((value) =>
                    String(value).toLocaleLowerCase("pt-BR").includes(search)
                );
        });
    }, [contacts, contactSearch]);


    const industries = useMemo(() => {
        const map = new Map();


        contacts.forEach((contact) => {
            const code = contact.industry_global_code || contact.global_code;
            const name = contact.laboratory_name;


            if (!code || !name) return;


            map.set(code, {
                industry_global_code: code,
                laboratory_name: name
            });
        });


        return Array.from(map.values());
    }, [contacts]);


    const filteredIndustries = useMemo(() => {
        const search = industrySearch.trim().toLocaleLowerCase("pt-BR");


        if (!search) return industries;


        return industries.filter((industry) =>
            String(industry.laboratory_name || "")
                .toLocaleLowerCase("pt-BR")
                .includes(search)
        );
    }, [industries, industrySearch]);


    const selectedContactIds = new Set(
        form.recipients.map((item) => item.contact_id || item.id)
    );


    const selectedIndustryCodes = new Set(
        form.industries.map((item) => item.industry_global_code || item.code)
    );


    return (
        <form
            className="contacts-charge-favorite-form"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit(form);
            }}
        >
            <div className="contacts-charge-form-grid">
                <label>
                    <span>Nome do favorito</span>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(event) => updateField("name", event.target.value)}
                        required
                    />
                </label>


                <label>
                    <span>Tipo de cobrança</span>
                    <select
                        value={form.charge_type}
                        onChange={(event) => updateField("charge_type", event.target.value)}
                    >
                        {Object.values(CONTACT_CHARGE_TYPES).map((type) => (
                            <option key={type} value={type}>
                                {CONTACT_CHARGE_TYPE_LABELS[type]}
                            </option>
                        ))}
                    </select>
                </label>
            </div>


            <label>
                <span>Assunto do e-mail</span>
                <input
                    type="text"
                    value={form.subject}
                    onChange={(event) => updateField("subject", event.target.value)}
                    required
                />
            </label>


            <label>
                <span>Corpo do e-mail</span>
                <textarea
                    value={form.body}
                    onChange={(event) => updateField("body", event.target.value)}
                    rows={10}
                    required
                />
            </label>


            <label className="contacts-charge-checkbox">
                <input
                    type="checkbox"
                    checked={Boolean(form.save_recipients)}
                    onChange={(event) => updateField("save_recipients", event.target.checked)}
                />


                <span>
                    Salvar a lista de contatos selecionada neste favorito
                </span>
            </label>


            <div className="contacts-charge-selection">
                <div className="contacts-charge-selection-column">
                    <h3>Indústrias</h3>


                    <input
                        type="text"
                        placeholder="Buscar indústria"
                        value={industrySearch}
                        onChange={(event) => setIndustrySearch(event.target.value)}
                    />


                    <div className="contacts-charge-selection-list">
                        {filteredIndustries.map((industry) => {
                            const code = industry.industry_global_code;


                            return (
                                <button
                                    type="button"
                                    key={code}
                                    className={
                                        selectedIndustryCodes.has(code)
                                            ? "selected"
                                            : ""
                                    }
                                    onClick={() => toggleIndustry(industry)}
                                >
                                    {industry.laboratory_name}
                                </button>
                            );
                        })}
                    </div>
                </div>


                <div className="contacts-charge-selection-column">
                    <h3>Contatos</h3>


                    <input
                        type="text"
                        placeholder="Buscar contato"
                        value={contactSearch}
                        onChange={(event) => setContactSearch(event.target.value)}
                    />


                    <div className="contacts-charge-selection-list">
                        {filteredContacts.map((contact) => {
                            const contactId = contact.contact_id || contact.id;


                            return (
                                <button
                                    type="button"
                                    key={contactId}
                                    className={
                                        selectedContactIds.has(contactId)
                                            ? "selected"
                                            : ""
                                    }
                                    onClick={() => toggleContact(contact)}
                                >
                                    <strong>
                                        {contact.laboratory_name}
                                    </strong>


                                    <span>
                                        {contact.contact_name || "Sem contato"} • {contact.email || "Sem e-mail"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>


            <div className="contacts-charge-attachments">
                <h3>Anexos</h3>


                <label className="contacts-charge-attachment-button">
                    <Paperclip size={15} strokeWidth={1.9} />


                    Adicionar anexos


                    <input
                        type="file"
                        multiple
                        onChange={(event) => addAttachments(event.target.files)}
                        hidden
                    />
                </label>


                <div className="contacts-charge-attachment-list">
                    {form.attachments.map((attachment, index) => (
                        <div key={`${attachment.file_path}-${index}`}>
                            <span>
                                {attachment.file_name}
                            </span>


                            <button
                                type="button"
                                onClick={() => removeAttachment(index)}
                                aria-label="Remover anexo"
                            >
                                <X size={14} strokeWidth={2} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>


            <label>
                <span>Observações internas</span>
                <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={3}
                />
            </label>


            <div className="contacts-charge-form-actions">
                <button
                    type="button"
                    className="contacts-charge-cancel-button"
                    onClick={onCancel}
                    disabled={saving}
                >
                    Cancelar
                </button>


                <button
                    type="submit"
                    className="contacts-charge-save-button"
                    disabled={saving}
                >
                    <Save size={15} strokeWidth={1.9} />


                    {saving ? "Salvando..." : "Salvar favorito"}
                </button>
            </div>
        </form>
    );
}
