import { useEffect, useState } from "react";
import { Mail, Pencil, Plus, Trash2 } from "lucide-react";
import {
    listContacts,
    listChargeFavorites,
    saveChargeFavorite,
    deleteChargeFavorite
} from "../services/contacts.service";
import {
    CONTACT_CHARGE_TYPE_LABELS,
    EMPTY_CONTACT_CHARGE_FAVORITE
} from "../constants/contacts.constants";
import ContactChargeFavoriteForm from "../components/ContactChargeFavoriteForm";
import ContactChargeModal from "../components/ContactChargeModal";


export default function ContactChargeFavoritesPage() {
    const [favorites, setFavorites] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_CONTACT_CHARGE_FAVORITE });
    const [chargeFavorite, setChargeFavorite] = useState(null);
    const [chargeOpen, setChargeOpen] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");


    async function loadData() {
        setLoading(true);
        setError("");


        try {
            const [favoritesResponse, contactsResponse] = await Promise.all([
                listChargeFavorites(),
                listContacts()
            ]);


            setFavorites(Array.isArray(favoritesResponse) ? favoritesResponse : []);
            setContacts(Array.isArray(contactsResponse?.rows) ? contactsResponse.rows : []);
        } catch (loadError) {
            console.error("Erro ao carregar favoritos de cobrança:", loadError);
            setError("Não foi possível carregar os favoritos de cobrança.");
        } finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        loadData();
    }, []);


    function openCreateForm() {
        setForm({ ...EMPTY_CONTACT_CHARGE_FAVORITE });
        setFormOpen(true);
        setError("");
        setSuccess("");
    }


    function openEditForm(favorite) {
        setForm({
            ...EMPTY_CONTACT_CHARGE_FAVORITE,
            ...favorite,
            save_recipients: Boolean(favorite.save_recipients)
        });
        setFormOpen(true);
        setError("");
        setSuccess("");
    }


    async function handleSubmit(data) {
        setSaving(true);
        setError("");
        setSuccess("");


        try {
            await saveChargeFavorite(data);
            await loadData();
            setFormOpen(false);
            setSuccess("Favorito de cobrança salvo com sucesso.");
        } catch (saveError) {
            console.error("Erro ao salvar favorito:", saveError);
            setError(saveError?.message || "Não foi possível salvar o favorito.");
        } finally {
            setSaving(false);
        }
    }


    async function handleDelete(favorite) {
        const confirmed = window.confirm(
            `Deseja excluir o favorito "${favorite.name}"?`
        );


        if (!confirmed) return;


        setError("");
        setSuccess("");


        try {
            await deleteChargeFavorite(favorite.id);
            await loadData();
            setSuccess("Favorito excluído com sucesso.");
        } catch (deleteError) {
            console.error("Erro ao excluir favorito:", deleteError);
            setError(deleteError?.message || "Não foi possível excluir o favorito.");
        }
    }


    function openCharge(favorite) {
        setChargeFavorite(favorite);
        setChargeOpen(true);
    }


    return (
        <main className="contacts-charge-favorites-page">
            <header className="contacts-charge-favorites-header">
                <div>
                    <h1>Favoritos de cobrança</h1>


                    <span>
                        Crie modelos rápidos para cobrar contatos ou indústrias.
                    </span>
                </div>


                <button
                    type="button"
                    className="contacts-charge-primary-button"
                    onClick={openCreateForm}
                >
                    <Plus size={15} strokeWidth={2} />


                    Novo favorito
                </button>
            </header>


            {error && (
                <div className="contacts-charge-message error">
                    {error}
                </div>
            )}


            {success && (
                <div className="contacts-charge-message success">
                    {success}
                </div>
            )}


            {formOpen && (
                <section className="contacts-charge-form-panel">
                    <h2>
                        {form.id ? "Editar favorito" : "Novo favorito"}
                    </h2>


                    <ContactChargeFavoriteForm
                        form={form}
                        contacts={contacts}
                        saving={saving}
                        onChange={setForm}
                        onSubmit={handleSubmit}
                        onCancel={() => setFormOpen(false)}
                    />
                </section>
            )}


            <section className="contacts-charge-favorites-list">
                {loading ? (
                    <div>Carregando favoritos...</div>
                ) : favorites.length === 0 ? (
                    <div>Nenhum favorito de cobrança cadastrado.</div>
                ) : (
                    favorites.map((favorite) => (
                        <article
                            key={favorite.id}
                            className="contacts-charge-favorite-card"
                        >
                            <div>
                                <h3>{favorite.name}</h3>


                                <span>
                                    {CONTACT_CHARGE_TYPE_LABELS[favorite.charge_type] || favorite.charge_type}
                                </span>


                                <p>
                                    {favorite.subject}
                                </p>


                                <small>
                                    {favorite.recipients.length} contato(s) salvo(s) •{" "}
                                    {favorite.industries.length} indústria(s) •{" "}
                                    {favorite.attachments.length} anexo(s)
                                </small>
                            </div>


                            <div className="contacts-charge-favorite-actions">
                                <button
                                    type="button"
                                    onClick={() => openCharge(favorite)}
                                    title="Enviar cobrança"
                                >
                                    <Mail size={15} strokeWidth={1.9} />
                                </button>


                                <button
                                    type="button"
                                    onClick={() => openEditForm(favorite)}
                                    title="Editar"
                                >
                                    <Pencil size={15} strokeWidth={1.9} />
                                </button>


                                <button
                                    type="button"
                                    onClick={() => handleDelete(favorite)}
                                    title="Excluir"
                                >
                                    <Trash2 size={15} strokeWidth={1.9} />
                                </button>
                            </div>
                        </article>
                    ))
                )}
            </section>


            <ContactChargeModal
                open={chargeOpen}
                favorite={chargeFavorite}
                contacts={contacts}
                onClose={() => setChargeOpen(false)}
                onCompleted={loadData}
            />
        </main>
    );
}
