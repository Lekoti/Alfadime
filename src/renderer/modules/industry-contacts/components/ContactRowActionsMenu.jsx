import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";


export default function ContactRowActionsMenu({
    row,
    canEdit = true,
    canDelete = true,
    canCharge = true,
    disabled = false,
    onEdit,
    onDelete,
    onCharge,
    onChargeFavorite
}) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);


    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        }


        document.addEventListener("mousedown", handleClickOutside);


        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);


    function execute(action) {
        setOpen(false);
        action(row);
    }


    return (
        <div className="contacts-row-actions" ref={menuRef}>
            <button
                type="button"
                className="contacts-actions-button"
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                title="Ações"
            >
                <MoreHorizontal size={15} strokeWidth={2} />


                Ações
            </button>


            {open && (
                <div className="contacts-actions-menu">
                    {canCharge && (
                        <button
                            type="button"
                            onClick={() => execute(onCharge)}
                        >
                            Cobrar preços ou pendências
                        </button>
                    )}


                    {canCharge && (
                        <button
                            type="button"
                            onClick={() => execute(onChargeFavorite)}
                        >
                            Cobrar por favorito
                        </button>
                    )}


                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => execute(onEdit)}
                        >
                            Editar contato
                        </button>
                    )}


                    {canDelete && (
                        <button
                            type="button"
                            className="danger"
                            onClick={() => execute(onDelete)}
                        >
                            Excluir contato
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
