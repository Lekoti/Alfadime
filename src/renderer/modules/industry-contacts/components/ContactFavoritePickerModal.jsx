import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { listChargeFavorites } from "../services/contacts.service";
import {
    CONTACT_CHARGE_TYPE_LABELS
} from "../constants/contacts.constants";


export default function ContactFavoritePickerModal({
    open,
    row,
    onClose,
    onSelect
}) {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");


    useEffect(() => {
        if (!open) return;


        async function loadFavorites() {
            setLoading(true);
            setError("");


            try {
                const response = await listChargeFavorites();
                setFavorites(Array.isArray(response) ? response : []);
            } catch (loadError) {
                console.error("Erro ao carregar favoritos:", loadError);
                setError("Não foi possível carregar os favoritos de cobrança.");
            } finally {
                setLoading(false);
            }
        }


        loadFavorites();
        setSearch("");
    }, [open]);


    if (!open) return null;


    const filteredFavorites = favorites.filter((favorite) => {
        const term = search.trim().toLocaleLowerCase("pt-BR");


        if (!term) return true;


        return [
            favorite.name,
            favorite.subject,
            CONTACT_CHARGE_TYPE_LABELS[favorite.charge_type]
        ]
            .filter(Boolean)
            .some((value) =>
                String(value).toLocaleLowerCase("pt-BR").includes(term)
            );
    });


    return (
        <div className="contacts-charge-overlay" role="dialog" aria-modal="true">
            <div className="contacts-charge-modal contacts-favorite-picker-modal">
                <header className="contacts-charge-header">
                    <div>
                        <h2>Cobrar por favorito</h2>


                        <span>
                            {row?.laboratory_name || "Contato"}
                        </span>
                    </div>


                    <button
                        type="button"
                        className="contacts-charge-close-button"
                        onClick={onClose}
                        aria-label="Fechar"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                </header>


                <input
                    type="text"
                    placeholder="Buscar favorito"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />


                {error && (
                    <div className="contacts-charge-message error">
                        {error}
                    </div>
                )}


                <div className="contacts-favorite-picker-list">
                    {loading && (
                        <div>Carregando favoritos...</div>
                    )}


                    {!loading && filteredFavorites.length === 0 && (
                        <div>Nenhum favorito encontrado.</div>
                    )}


                    {!loading && filteredFavorites.map((favorite) => (
                        <button
                            type="button"
                            key={favorite.id}
                            onClick={() => onSelect(favorite)}
                        >
                            <strong>{favorite.name}</strong>


                            <span>
                                {CONTACT_CHARGE_TYPE_LABELS[favorite.charge_type] || favorite.charge_type}
                            </span>


                            <small>{favorite.subject}</small>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
