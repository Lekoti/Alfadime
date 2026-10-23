import ContactSaveConflictModal from "../components/ContactSaveConflictModal";
import {
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { useNavigate } from "react-router-dom";


import {
    Download,
    Mail,
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


import ContactFavoritePickerModal from
    "../components/ContactFavoritePickerModal";


import ContactChargeModal from
    "../components/ContactChargeModal";


import {
    EMPTY_INDUSTRY_CONTACT_FILTERS,
    EMPTY_INDUSTRY_CONTACT_FORM,
    INDUSTRY_CONTACT_BRANCHES,
    INDUSTRY_CONTACT_EXPORT_COLUMNS
} from "../constants/industry-contacts.constants";


import usePermissions from "../../auth/hooks/usePermissions";


import { useModuleState } from "../../../hooks/useModuleState";


import IndustryContactsChargePreview from "../components/IndustryContactsChargePreview";
import { matchesChargeUpdate, formatChargeDate } from "../utils/industry-contacts-charge.utils";
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


const MODULE_ID =
    "industry-contacts";


const INITIAL_STATE = {
    filters: {
        ...EMPTY_INDUSTRY_CONTACT_FILTERS
    },
    filtersOpen: false
};


function IndustryContactsPage() {
    const navigate = useNavigate();


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


    const [
        moduleState,
        setModuleField
    ] = useModuleState(
        MODULE_ID,
        INITIAL_STATE
    );


    const filters =
        moduleState.filters ||
        {
            ...EMPTY_INDUSTRY_CONTACT_FILTERS
        };


    const [form, setForm] =
        useState({
            ...EMPTY_INDUSTRY_CONTACT_FORM
        });


    const filtersOpen = Boolean(
        moduleState.filtersOpen
    );


    function setFilters(next) {
        setModuleField(
            "filters",
            typeof next === "function"
                ? next(filters)
                : next
        );
    }


    function setFiltersOpen(next) {
        setModuleField(
            "filtersOpen",
            typeof next === "function"
                ? next(filtersOpen)
                : Boolean(next)
        );
    }


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


    const [favoritePickerOpen, setFavoritePickerOpen] =
        useState(false);


    const [favoriteChargeRow, setFavoriteChargeRow] =
        useState(null);


    const [selectedFavorite, setSelectedFavorite] =
        useState(null);


    const [favoriteChargeOpen, setFavoriteChargeOpen] =
        useState(false);


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
                    matchesCargo &&
                    matchesChargeUpdate(row, filters.charge_update)
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


    const [saveConflictRequest, setSaveConflictRequest] = useState(null);
    const saveConflictResolver = useRef(null);
    const saveConflictSequence = useRef(0);

    useEffect(() => () => {
        saveConflictResolver.current?.(null);
        saveConflictResolver.current = null;
    }, []);

    function resolveSaveConflict(choice) {
        const resolve = saveConflictResolver.current;
        saveConflictResolver.current = null;
        setSaveConflictRequest(null);
        resolve?.(choice);
    }

    async function saveWithConflictConfirmation(data) {
        const snapshot = { ...data, branches: Array.isArray(data.branches) ? [...data.branches] : [] };
        let result = await saveIndustryContact(snapshot);
        while (result?.confirmation_required) {
            const choice = await new Promise((resolve) => {
                saveConflictResolver.current = resolve;
                saveConflictSequence.current += 1;
                setSaveConflictRequest({ data: snapshot, preview: result, sequence: saveConflictSequence.current });
            });
            if (!choice) return null;
            result = await saveIndustryContact({ ...snapshot, conflict_resolution: choice });
        }
        return result;
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
            const result =
                await saveWithConflictConfirmation(form);


            if (!result) return;

            const savedContact = result?.contact;


            if (savedContact) {
                setRows((currentRows) => {
                    const savedId =
                        savedContact.contact_id ||
                        savedContact.id;


                    const existingIndex =
                        currentRows.findIndex((row) => {
                            const rowId =
                                row.contact_id ||
                                row.id;


                            return rowId === savedId;
                        });


                    if (existingIndex === -1) {
                        return [
                            ...currentRows,
                            savedContact
                        ];
                    }


                    return currentRows.map((row, index) => {
                        return index === existingIndex
                            ? savedContact
                            : row;
                    });
                });
            } else {
                await loadData();
            }


            setForm({
                ...EMPTY_INDUSTRY_CONTACT_FORM
            });


            setFormOpen(false);


            await loadData();


            setSuccess(result?.save_summary?.message || "Contato salvo com sucesso.");
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


            setRows((currentRows) => {
                return currentRows.filter((row) => {
                    const rowId =
                        row.contact_id ||
                        row.id;


                    return rowId !== contactId;
                });
            });


            setSuccess(
                "Contato excluído com sucesso."
            );
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
                    preview_token: chargePreview.preview_token,
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


            closeChargePreview();
            await loadData();
            const failures = (result.results || []).filter((item) => !item.success);
            const warnings = (result.results || []).flatMap((item) =>
                [item.historyWarning, item.sentCopyError].filter(Boolean)
            );
            setSuccess(`${result.sent} de ${result.expected} e-mail(s) enviado(s) para ${result.recipient}.`);
            if (failures.length || warnings.length) {
                setError([
                    ...failures.map((item) => `${item.charge_type}: ${item.error}`),
                    ...warnings
                ].join(" | "));
            }
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


    function handleChargeFavorite(
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


        setFavoriteChargeRow(row);
        setFavoritePickerOpen(true);
    }


    function handleSelectFavorite(
        favorite
    ) {
        setSelectedFavorite(favorite);
        setFavoritePickerOpen(false);
        setFavoriteChargeOpen(true);
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
                        ...row,
                        last_prices_charge_at: formatChargeDate(row.last_prices_charge_at),
                        last_pending_charge_at: formatChargeDate(row.last_pending_charge_at)
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
            {saveConflictRequest && (
                <ContactSaveConflictModal key={saveConflictRequest.sequence}
                    request={saveConflictRequest} onResolve={resolveSaveConflict} />
            )}
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


                    <IndustryContactsFilters
                        filters={filters}
                        branches={branches}
                        cargos={cargos}
                        summary={summary}
                        canEdit={canEdit}
                        canExport={canExport}
                        canCharge={canCharge}
                        loading={loading}
                        saving={saving}
                        deleting={deleting}
                        exporting={exporting}
                        charging={charging}
                        hasRows={rows.length > 0}
                        hasFilteredRows={filteredRows.length > 0}
                        onFiltersChange={setFilters}
                        onClear={clearFilters}
                        onCreate={openCreateForm}
                        onExport={handleExport}
                        onOpenChargeFavorites={() =>
                            navigate("/contacts/charge-favorites")
                        }
                    />
                </section>
            )}


            {formOpen && (
                <section
                    className={
                        "industry-contacts-actions-panel industry-contacts-form-panel"
                    }
                >
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
                    onChargeFavorite={
                        handleChargeFavorite
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
                                    disabled={
                                        charging
                                    }
                                >
                                    ×
                                </button>
                            </div>


                            <IndustryContactsChargePreview preview={chargePreview} />


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


            <ContactFavoritePickerModal
                open={favoritePickerOpen}
                row={favoriteChargeRow}
                onClose={() => setFavoritePickerOpen(false)}
                onSelect={handleSelectFavorite}
            />


            <ContactChargeModal
                open={favoriteChargeOpen}
                favorite={selectedFavorite}
                contacts={rows}
                onClose={() => setFavoriteChargeOpen(false)}
                onCompleted={loadData}
            />
        </main>
    );
}


export default IndustryContactsPage;
