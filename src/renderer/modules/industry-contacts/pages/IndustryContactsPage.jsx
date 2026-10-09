import {
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";


import {
    Download,
    Mail,
    Plus,
    SlidersHorizontal
} from "lucide-react";


import {
    listIndustryContacts,
    saveIndustryContact,
    deleteIndustryContact,
    prepareIndustryContactCharge,
    sendIndustryContactCharge
} from "../services/industry-contacts.service";


import IndustryContactsFilters from
    "../components/IndustryContactsFilters";


import IndustryContactsForm from
    "../components/IndustryContactsForm";


import IndustryContactsTable from
    "../components/IndustryContactsTable";


import {
    EMPTY_INDUSTRY_CONTACT_FILTERS,
    EMPTY_INDUSTRY_CONTACT_FORM,
    INDUSTRY_CONTACT_BRANCHES,
    INDUSTRY_CONTACT_EXPORT_COLUMNS
} from "../constants/industry-contacts.constants";


import usePermissions from "../../auth/hooks/usePermissions";


import "../styles/industry-contacts.css";


const CHARGE_TYPES = {
    PRICES: "prices",
    PENDING: "pending",
    BOTH: "both"
};


const CHARGE_LABELS = {
    [CHARGE_TYPES.PRICES]:
        "Cobrar preços",
    [CHARGE_TYPES.PENDING]:
        "Cobrar pendências",
    [CHARGE_TYPES.BOTH]:
        "Cobrar preços e pendências"
};


const PERMISSION_MODULE_KEY =
    "industry-contacts";


function IndustryContactsPage() {
    const {
        isLoading: isLoadingPermissions,
        can
    } = usePermissions();


    const canEdit =
        can(
            PERMISSION_MODULE_KEY,
            "can_edit"
        );

    const canDelete =
        can(
            PERMISSION_MODULE_KEY,
            "can_delete"
        );

    const canExport =
        can(
            PERMISSION_MODULE_KEY,
            "can_export"
        );

    const canCharge =
        can(
            PERMISSION_MODULE_KEY,
            "can_approve"
        );

    const [rows, setRows] =
        useState([]);


    const [filters, setFilters] =
        useState({
            ...EMPTY_INDUSTRY_CONTACT_FILTERS
        });


    const [form, setForm] =
        useState({
            ...EMPTY_INDUSTRY_CONTACT_FORM
        });


    const [filtersOpen, setFiltersOpen] =
        useState(false);


    const [formOpen, setFormOpen] =
        useState(false);


    const [loading, setLoading] =
        useState(true);


    const [saving, setSaving] =
        useState(false);


    const [exporting, setExporting] =
        useState(false);


    const [deleting, setDeleting] =
        useState(false);


    const [charging, setCharging] =
        useState(false);


    const [chargeRow, setChargeRow] =
        useState(null);


    const [chargeMenuOpen, setChargeMenuOpen] =
        useState(false);


    const [previewOpen, setPreviewOpen] =
        useState(false);


    const [chargeType, setChargeType] =
        useState("");


    const [chargePreview, setChargePreview] =
        useState(null);


    const [error, setError] =
        useState("");


    const [success, setSuccess] =
        useState("");


    const loadingRef =
        useRef(false);


    const requestIdRef =
        useRef(0);


    async function loadData() {
        if (
            loadingRef.current
        ) {
            return;
        }


        const requestId =
            requestIdRef.current +
            1;


        requestIdRef.current =
            requestId;


        loadingRef.current =
            true;


        setLoading(true);
        setError("");


        try {
            const result =
                await listIndustryContacts();


            if (
                requestId !==
                requestIdRef.current
            ) {
                return;
            }


            setRows(
                Array.isArray(
                    result?.rows
                )
                    ? result.rows
                    : []
            );
        } catch (
            loadError
        ) {
            if (
                requestId !==
                requestIdRef.current
            ) {
                return;
            }


            console.error(
                "Erro ao carregar contatos:",
                loadError
            );


            setError(
                "Não foi possível carregar os contatos."
            );
        } finally {
            if (
                requestId ===
                requestIdRef.current
            ) {
                setLoading(false);
            }


            loadingRef.current =
                false;
        }
    }


    useEffect(() => {
        if (
            isLoadingPermissions
        ) {
            return;
        }


        loadData();
    }, [
        isLoadingPermissions
    ]);


    const branches = useMemo(() => {
        const values = new Set(
            rows
                .map(
                    (row) =>
                        row.branch
                )
                .filter(Boolean)
        );


        INDUSTRY_CONTACT_BRANCHES.forEach(
            (branch) =>
                values.add(
                    branch
                )
        );


        return Array.from(
            values
        ).sort(
            (
                left,
                right
            ) =>
                left.localeCompare(
                    right,
                    "pt-BR"
                )
        );
    }, [rows]);


    const cargos = useMemo(() => {
        return Array.from(
            new Set(
                rows
                    .map(
                        (row) =>
                            row.cargo
                    )
                    .filter(Boolean)
            )
        ).sort(
            (
                left,
                right
            ) =>
                left.localeCompare(
                    right,
                    "pt-BR"
                )
        );
    }, [rows]);


    const filteredRows = useMemo(() => {
        const search =
            filters.search
                .trim()
                .toLocaleLowerCase(
                    "pt-BR"
                );


        return rows.filter(
            (row) => {
                const searchableValues = [
                    row.industry_global_code,
                    row.global_code,
                    row.laboratory_name,
                    row.branch,
                    row.contact_name,
                    row.phone,
                    row.email,
                    row.cargo,
                    row.automatic_observation,
                    row.status_label,
                    row.price_pending_status,
                    row.notes
                ];


                const matchesSearch =
                    !search ||
                    searchableValues
                        .filter(Boolean)
                        .some(
                            (value) =>
                                String(
                                    value
                                )
                                    .toLocaleLowerCase(
                                        "pt-BR"
                                    )
                                    .includes(
                                        search
                                    )
                        );


                const status =
                    String(
                        row.status_label ||
                            ""
                    ).trim();


                const matchesStatus =
                    filters.status ===
                        "all" ||
                    (
                        filters.status ===
                            "with-contact" &&
                        row.has_contact ===
                            1
                    ) ||
                    (
                        filters.status ===
                            "without-contact" &&
                        row.has_contact ===
                            0
                    ) ||
                    filters.status ===
                        status;


                const matchesBranch =
                    !filters.branch ||
                    row.branch ===
                        filters.branch;


                const matchesCargo =
                    !filters.cargo ||
                    row.cargo ===
                        filters.cargo;


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesBranch &&
                    matchesCargo
                );
            }
        );
    }, [
        rows,
        filters
    ]);


    const summary = useMemo(() => {
        const total =
            rows.length;


        const withContact =
            rows.filter(
                (row) =>
                    row.has_contact ===
                    1
            ).length;


        return {
            total,
            withContact,
            withoutContact:
                total -
                withContact
        };
    }, [rows]);


    function clearFilters() {
        setFilters({
            ...EMPTY_INDUSTRY_CONTACT_FILTERS
        });
    }


    function openCreateForm() {
        if (
            !canEdit
        ) {
            setError(
                "Você não tem permissão para criar contatos."
            );


            return;
        }


        setError("");
        setSuccess("");


        setForm({
            ...EMPTY_INDUSTRY_CONTACT_FORM
        });


        setFormOpen(true);
    }


    function editRow(
        row
    ) {
        if (
            !canEdit
        ) {
            setError(
                "Você não tem permissão para editar contatos."
            );


            return;
        }


        setError("");
        setSuccess("");


        setForm({
            id:
                row.contact_id ||
                row.id ||
                "",
            laboratory_name:
                row.laboratory_name ||
                "",
            laboratory_key:
                row.laboratory_key ||
                "",
            branch:
                row.branch ||
                "",
            contact_name:
                row.contact_name ||
                "",
            phone:
                row.phone ||
                "",
            email:
                row.email ||
                "",
            notes:
                row.notes ||
                "",
            cargo:
                row.cargo ||
                ""
        });


        setFormOpen(true);
    }


    async function handleSubmit(
        event
    ) {
        event.preventDefault();


        if (
            !canEdit
        ) {
            setError(
                "Você não tem permissão para salvar contatos."
            );


            return;
        }


        setSaving(true);
        setError("");
        setSuccess("");


        try {
            await saveIndustryContact(
                form
            );


            setForm({
                ...EMPTY_INDUSTRY_CONTACT_FORM
            });


            setFormOpen(false);


            setSuccess(
                "Contato salvo com sucesso."
            );


            await loadData();
        } catch (
            saveError
        ) {
            console.error(
                "Erro ao salvar contato:",
                saveError
            );


            setError(
                saveError?.message ||
                    "Não foi possível salvar o contato."
            );
        } finally {
            setSaving(false);
        }
    }


    async function handleDelete(
        row
    ) {
        if (
            !canDelete
        ) {
            setError(
                "Você não tem permissão para excluir contatos."
            );


            return;
        }


        const contactId =
            row?.contact_id ||
            row?.id;


        if (
            !contactId
        ) {
            setError(
                "Não foi possível identificar o contato."
            );


            return;
        }


        const laboratory =
            row?.laboratory_name ||
            "este contato";


        const confirmed =
            window.confirm(
                `Deseja excluir o contato de ${laboratory}?`
            );


        if (
            !confirmed
        ) {
            return;
        }


        setDeleting(true);
        setError("");
        setSuccess("");


        try {
            const result =
                await deleteIndustryContact(
                    contactId
                );


            if (
                result?.success ===
                false
            ) {
                throw new Error(
                    "O contato não foi excluído."
                );
            }


            setSuccess(
                "Contato excluído com sucesso."
            );


            await loadData();
        } catch (
            deleteError
        ) {
            console.error(
                "Erro ao excluir contato:",
                deleteError
            );


            setError(
                deleteError?.message ||
                    "Não foi possível excluir o contato."
            );
        } finally {
            setDeleting(false);
        }
    }


    function getChargeBlockMessage(
        row,
        type
    ) {
        if (
            !row?.email?.trim()
        ) {
            return (
                "O contato não possui e-mail cadastrado."
            );
        }


        const priceStatus =
            String(
                row.price_pending_status ||
                    ""
            );


        if (
            type ===
                CHARGE_TYPES.PRICES &&
            priceStatus ===
                "Preços e pendências atualizados"
        ) {
            return (
                "Os preços já estão atualizados."
            );
        }


        if (
            type ===
                CHARGE_TYPES.PENDING &&
            priceStatus ===
                "Preços e pendências atualizados"
        ) {
            return (
                "As pendências já estão atualizadas."
            );
        }


        return "";
    }


    function handleCharge(
        row
    ) {
        if (
            !canCharge
        ) {
            setError(
                "Você não tem permissão para enviar cobranças."
            );


            return;
        }


        setError("");
        setSuccess("");
        setChargeRow(row);
        setChargeMenuOpen(true);
        setPreviewOpen(false);
        setChargePreview(null);
        setChargeType("");
    }


    async function handleSelectCharge(
        type
    ) {
        const blockMessage =
            getChargeBlockMessage(
                chargeRow,
                type
            );


        if (
            blockMessage
        ) {
            setError(
                blockMessage
            );
            setChargeMenuOpen(false);


            return;
        }


        setCharging(true);
        setError("");
        setSuccess("");


        try {
            const preview =
                await prepareIndustryContactCharge({
                    contact_id:
                        chargeRow.contact_id ||
                        chargeRow.id,
                    laboratory_key:
                        chargeRow.laboratory_key,
                    branch:
                        chargeRow.branch,
                    charge_type:
                        type
                });


            setChargeType(
                type
            );


            setChargePreview(
                preview
            );


            setChargeMenuOpen(
                false
            );


            setPreviewOpen(
                true
            );
        } catch (
            chargeError
        ) {
            console.error(
                "Erro ao preparar cobrança:",
                chargeError
            );


            setError(
                chargeError?.message ||
                    "Não foi possível preparar a cobrança."
            );


            setChargeMenuOpen(
                false
            );
        } finally {
            setCharging(
                false
            );
        }
    }


    async function handleSendCharge() {
        if (
            !canCharge
        ) {
            setError(
                "Você não tem permissão para enviar cobranças."
            );


            return;
        }


        if (
            !chargePreview
        ) {
            setError(
                "A prévia da cobrança não está disponível."
            );


            return;
        }


        const confirmed =
            window.confirm(
                "Confirma o envio desta cobrança?"
            );


        if (
            !confirmed
        ) {
            return;
        }


        setCharging(true);
        setError("");
        setSuccess("");


        try {
            const result =
                await sendIndustryContactCharge({
                    contact_id:
                        chargeRow.contact_id ||
                        chargeRow.id,
                    laboratory_key:
                        chargeRow.laboratory_key,
                    branch:
                        chargeRow.branch,
                    charge_type:
                        chargeType
                });


            setSuccess(
                result?.recipient
                    ? `Cobrança enviada para ${result.recipient}.`
                    : "Cobrança enviada com sucesso."
            );


            closeChargePreview();
        } catch (
            sendError
        ) {
            console.error(
                "Erro ao enviar cobrança:",
                sendError
            );


            setError(
                sendError?.message ||
                    "Não foi possível enviar a cobrança."
            );
        } finally {
            setCharging(
                false
            );
        }
    }


    function closeChargePreview() {
        setChargeMenuOpen(
            false
        );


        setPreviewOpen(
            false
        );


        setChargeRow(
            null
        );


        setChargeType(
            ""
        );


        setChargePreview(
            null
        );
    }


    async function handleExport() {
        if (
            !canExport
        ) {
            setError(
                "Você não tem permissão para exportar contatos."
            );


            return;
        }


        if (
            !rows.length
        ) {
            setError(
                "Não existem contatos para exportar."
            );


            return;
        }


        setExporting(
            true
        );


        setError("");
        setSuccess("");


        try {
            const exportRows =
                filteredRows.map(
                    (row) => ({
                        ...row
                    })
                );


            const result =
                await window.alfadime.export
                    .industryContacts(
                        {},
                        INDUSTRY_CONTACT_EXPORT_COLUMNS,
                        exportRows
                    );


            if (
                !result?.cancelled
            ) {
                setSuccess(
                    `${result.totalRows} contato(s) ` +
                        "exportado(s) com sucesso."
                );
            }
        } catch (
            exportError
        ) {
            console.error(
                "Erro ao exportar contatos:",
                exportError
            );


            setError(
                exportError.message ||
                    "Não foi possível exportar os contatos."
            );
        } finally {
            setExporting(
                false
            );
        }
    }


    function closeActionsPanel() {
        setFiltersOpen(
            false
        );


        setFormOpen(
            false
        );
    }


    if (
        isLoadingPermissions
    ) {
        return (
            <main className="industry-contacts-page">
                <div>
                    Carregando permissões...
                </div>
            </main>
        );
    }


    return (
        <main className="industry-contacts-page">
            <header className="industry-contacts-header">
                <h1>
                    Contatos
                </h1>


                <button
                    type="button"
                    className={
                        "industry-contacts-header-button"
                    }
                    onClick={() =>
                        setFiltersOpen(
                            (
                                current
                            ) =>
                                !current
                        )
                    }
                >
                    <SlidersHorizontal
                        size={15}
                        strokeWidth={1.9}
                    />


                    {
                        filtersOpen
                            ? "Fechar filtros e ações"
                            : "Filtros e ações"
                    }
                </button>
            </header>


            {filtersOpen && (
                <section
                    className={
                        "industry-contacts-actions-panel"
                    }
                >
                    <div
                        className={
                            "industry-contacts-actions-header"
                        }
                    >
                        <button
                            type="button"
                            className={
                                "industry-contacts-close-button"
                            }
                            onClick={
                                closeActionsPanel
                            }
                            aria-label={
                                "Fechar filtros e ações"
                            }
                            title="Fechar"
                        >
                            ×
                        </button>
                    </div>


                    <div
                        className={
                            "industry-contacts-actions-buttons"
                        }
                    >
                        {canEdit && (
                            <button
                                type="button"
                                className={
                                    "industry-contacts-action-button"
                                }
                                onClick={
                                    openCreateForm
                                }
                                disabled={
                                    loading ||
                                    saving ||
                                    deleting
                                }
                            >
                                <Plus
                                    size={15}
                                    strokeWidth={1.9}
                                />


                                Novo contato
                            </button>
                        )}


                        {canExport && (
                            <button
                                type="button"
                                className={
                                    "industry-contacts-action-button primary"
                                }
                                onClick={
                                    handleExport
                                }
                                disabled={
                                    loading ||
                                    exporting ||
                                    !rows.length
                                }
                            >
                                <Download
                                    size={15}
                                    strokeWidth={1.9}
                                />


                                {
                                    exporting
                                        ? "Exportando..."
                                        : "Exportar Excel"
                                }
                            </button>
                        )}
                    </div>


                    <IndustryContactsFilters
                        filters={
                            filters
                        }
                        branches={
                            branches
                        }
                        cargos={
                            cargos
                        }
                        summary={
                            summary
                        }
                        onFiltersChange={
                            setFilters
                        }
                        onClear={
                            clearFilters
                        }
                    />


                    {formOpen && (
                        <IndustryContactsForm
                            form={
                                form
                            }
                            saving={
                                saving
                            }
                            onChange={
                                setForm
                            }
                            onSubmit={
                                handleSubmit
                            }
                            onCancel={() => {
                                setFormOpen(
                                    false
                                );


                                setForm({
                                    ...EMPTY_INDUSTRY_CONTACT_FORM
                                });
                            }}
                        />
                    )}
                </section>
            )}


            {error && (
                <div
                    className={
                        "industry-contacts-message error"
                    }
                >
                    {error}
                </div>
            )}


            {success && (
                <div
                    className={
                        "industry-contacts-message success"
                    }
                >
                    {success}
                </div>
            )}


            <section
                className={
                    "industry-contacts-list-panel"
                }
            >
                <div
                    className={
                        "industry-contacts-list-header"
                    }
                >
                    <div>
                        <h2>
                            Lista de contatos
                        </h2>


                        <span>
                            {loading
                                ? "Carregando contatos..."
                                : `${filteredRows.length} registro(s) encontrado(s)`}
                        </span>
                    </div>
                </div>


                <IndustryContactsTable
                    rows={
                        filteredRows
                    }
                    loading={
                        loading
                    }
                    deleting={
                        deleting
                    }
                    charging={
                        charging
                    }
                    canEdit={
                        canEdit
                    }
                    canDelete={
                        canDelete
                    }
                    canCharge={
                        canCharge
                    }
                    onEdit={
                        editRow
                    }
                    onDelete={
                        handleDelete
                    }
                    onCharge={
                        handleCharge
                    }
                />
            </section>


            {chargeMenuOpen &&
                chargeRow && (
                    <div
                        className={
                            "industry-contacts-charge-overlay"
                        }
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className={
                                "industry-contacts-charge-modal"
                            }
                        >
                            <div
                                className={
                                    "industry-contacts-charge-header"
                                }
                            >
                                <div>
                                    <h2>
                                        Cobrar contato
                                    </h2>


                                    <span>
                                        {
                                            chargeRow.laboratory_name
                                        }
                                    </span>
                                </div>


                                <button
                                    type="button"
                                    className={
                                        "industry-contacts-close-button"
                                    }
                                    onClick={
                                        closeChargePreview
                                    }
                                    aria-label="Fechar"
                                >
                                    ×
                                </button>
                            </div>


                            <p>
                                Selecione o tipo de cobrança:
                            </p>


                            <div
                                className={
                                    "industry-contacts-charge-options"
                                }
                            >
                                <button
                                    type="button"
                                    className={
                                        "industry-contacts-charge-option"
                                    }
                                    onClick={() =>
                                        handleSelectCharge(
                                            CHARGE_TYPES.PRICES
                                        )
                                    }
                                    disabled={
                                        charging
                                    }
                                >
                                    <Mail
                                        size={15}
                                        strokeWidth={1.9}
                                    />


                                    Cobrar preços
                                </button>


                                <button
                                    type="button"
                                    className={
                                        "industry-contacts-charge-option"
                                    }
                                    onClick={() =>
                                        handleSelectCharge(
                                            CHARGE_TYPES.PENDING
                                        )
                                    }
                                    disabled={
                                        charging
                                    }
                                >
                                    <Mail
                                        size={15}
                                        strokeWidth={1.9}
                                    />


                                    Cobrar pendências
                                </button>


                                <button
                                    type="button"
                                    className={
                                        "industry-contacts-charge-option primary"
                                    }
                                    onClick={() =>
                                        handleSelectCharge(
                                            CHARGE_TYPES.BOTH
                                        )
                                    }
                                    disabled={
                                        charging
                                    }
                                >
                                    <Mail
                                        size={15}
                                        strokeWidth={1.9}
                                    />


                                    Cobrar ambos
                                </button>
                            </div>


                            <button
                                type="button"
                                className={
                                    "industry-contacts-cancel-button"
                                }
                                onClick={
                                    closeChargePreview
                                }
                                disabled={
                                    charging
                                }
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}


            {previewOpen &&
                chargeRow &&
                chargePreview && (
                    <div
                        className={
                            "industry-contacts-charge-overlay"
                        }
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className={
                                "industry-contacts-charge-modal"
                            }
                        >
                            <div
                                className={
                                    "industry-contacts-charge-header"
                                }
                            >
                                <div>
                                    <h2>
                                        Prévia da cobrança
                                    </h2>


                                    <span>
                                        {
                                            CHARGE_LABELS[
                                                chargeType
                                            ]
                                        }
                                    </span>
                                </div>


                                <button
                                    type="button"
                                    className={
                                        "industry-contacts-close-button"
                                    }
                                    onClick={
                                        closeChargePreview
                                    }
                                    aria-label="Fechar"
                                    disabled={
                                        charging
                                    }
                                >
                                    ×
                                </button>
                            </div>


                            <div
                                className={
                                    "industry-contacts-charge-preview"
                                }
                            >
                                <label>
                                    <span>
                                        Para
                                    </span>


                                    <input
                                        type="email"
                                        value={
                                            chargePreview.to ||
                                            ""
                                        }
                                        readOnly
                                    />
                                </label>


                                <label>
                                    <span>
                                        Assunto
                                    </span>


                                    <input
                                        type="text"
                                        value={
                                            chargePreview.subject ||
                                            ""
                                        }
                                        readOnly
                                    />
                                </label>


                                <label>
                                    <span>
                                        Anexos
                                    </span>


                                    <textarea
                                        value={
                                            Array.isArray(
                                                chargePreview.attachments
                                            )
                                                ? chargePreview.attachments
                                                      .map(
                                                          (
                                                              attachment
                                                          ) =>
                                                              attachment.fileName ||
                                                              attachment.filename ||
                                                              attachment.path ||
                                                              ""
                                                      )
                                                      .filter(
                                                          Boolean
                                                      )
                                                      .join(
                                                          "\n"
                                                      )
                                                : ""
                                        }
                                        readOnly
                                        rows="3"
                                    />
                                </label>


                                <label>
                                    <span>
                                        Mensagem
                                    </span>


                                    <textarea
                                        value={
                                            chargePreview.body ||
                                            ""
                                        }
                                        readOnly
                                        rows="12"
                                    />
                                </label>
                            </div>


                            <div
                                className={
                                    "industry-contacts-charge-actions"
                                }
                            >
                                <button
                                    type="button"
                                    className={
                                        "industry-contacts-cancel-button"
                                    }
                                    onClick={
                                        closeChargePreview
                                    }
                                    disabled={
                                        charging
                                    }
                                >
                                    Cancelar
                                </button>


                                <button
                                    type="button"
                                    className={
                                        "industry-contacts-save-button"
                                    }
                                    onClick={
                                        handleSendCharge
                                    }
                                    disabled={
                                        charging
                                    }
                                >
                                    {
                                        charging
                                            ? "Enviando..."
                                            : "Enviar cobrança"
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </main>
    );
}


export default IndustryContactsPage;