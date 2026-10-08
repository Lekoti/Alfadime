import {
    useEffect,
    useMemo,
    useState
} from "react";


import {
    createBulkCorrections,
    getBulkCorrectionTargets,
    getPendingCorrectionsByProducts
} from "../../product-corrections/services/product-corrections.service";


const NON_BULK_FIELDS = new Set([
    "sirius_code",
    "code",
    "internal_code"
]);


function getStatusLabel(status) {
    const labels = {
        consistent: "Correto",
        divergent: "Divergente",
        missing: "Ausente",
        divergent_and_missing: "Divergente e ausente"
    };


    return labels[status] || status;
}


function getStatusClass(status) {
    if (status === "consistent") {
        return "consistent";
    }


    if (status === "missing") {
        return "missing";
    }


    return "divergent";
}


function formatGroupOrCategory(fieldName, value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }


    const text = String(value).trim();


    if (
        [
            "group_code",
            "category_code"
        ].includes(fieldName) &&
        /^\d$/.test(text)
    ) {
        return text.padStart(2, "0");
    }


    return text;
}


function displayValue(value, type) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }


    if (type === "boolean") {
        return Number(value) === 1
            ? "Sim"
            : "Não";
    }


    return String(value);
}


function AuditDetailsModal({
    issue,
    onClose,
    onCorrectionsSaved
}) {
    const [pendingCorrections, setPendingCorrections] =
        useState([]);

    const [bulkValues, setBulkValues] = useState({});
    const [bulkTargets, setBulkTargets] = useState([]);
    const [selectedTargetIds, setSelectedTargetIds] =
        useState([]);
    const [showBranchSelector, setShowBranchSelector] =
        useState(false);
    const [savingBulk, setSavingBulk] = useState(false);
    const [bulkError, setBulkError] = useState("");
    const [bulkSuccess, setBulkSuccess] = useState("");

    const comparisons = issue?.comparisons || [];


    const correctableComparisons = useMemo(
        () =>
            comparisons.filter(
                (comparison) =>
                    !NON_BULK_FIELDS.has(
                        comparison.key
                    )
            ),
        [comparisons]
    );


    const preparedFields = useMemo(
        () =>
            Object.entries(bulkValues)
                .filter(([, value]) =>
                    String(value ?? "").trim()
                )
                .map(([fieldName]) => fieldName),
        [bulkValues]
    );


    const selectedTargets = useMemo(
        () =>
            bulkTargets.filter((target) =>
                selectedTargetIds.includes(target.id)
            ),
        [bulkTargets, selectedTargetIds]
    );


    useEffect(() => {
        let mounted = true;


        async function loadPendingCorrections() {
            if (!issue?.products?.length) {
                setPendingCorrections([]);
                return;
            }


            try {
                const productIds = issue.products.map(
                    (product) => product.id
                );


                const result =
                    await getPendingCorrectionsByProducts(
                        productIds
                    );


                if (mounted) {
                    setPendingCorrections(
                        Array.isArray(result)
                            ? result
                            : []
                    );
                }
            } catch (error) {
                console.error(
                    "Erro ao carregar correções pendentes:",
                    error
                );
            }
        }


        loadPendingCorrections();


        return () => {
            mounted = false;
        };
    }, [issue?.id]);


    useEffect(() => {
        setBulkValues({});
        setBulkTargets([]);
        setSelectedTargetIds([]);
        setShowBranchSelector(false);
        setSavingBulk(false);
        setBulkError("");
        setBulkSuccess("");
    }, [issue?.id]);


    useEffect(() => {
        let mounted = true;


        async function loadTargets() {
            if (
                !issue?.ean ||
                preparedFields.length === 0
            ) {
                setBulkTargets([]);
                setSelectedTargetIds([]);
                return;
            }


            try {
                const targets =
                    await getBulkCorrectionTargets(
                        issue.ean,
                        preparedFields
                    );


                if (!mounted) {
                    return;
                }


                const nextTargets = Array.isArray(targets)
                    ? targets
                    : [];


                setBulkTargets(nextTargets);

                setSelectedTargetIds(
                    nextTargets.map((target) => target.id)
                );
            } catch (error) {
                console.error(
                    "Erro ao localizar filiais:",
                    error
                );


                if (mounted) {
                    setBulkError(
                        error.message ||
                        "Não foi possível localizar as filiais."
                    );
                }
            }
        }


        loadTargets();


        return () => {
            mounted = false;
        };
    }, [
        issue?.ean,
        preparedFields.join("|")
    ]);


    useEffect(() => {
        if (!issue) {
            return undefined;
        }


        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }


        window.addEventListener("keydown", handleKeyDown);


        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [issue, onClose]);


    if (!issue) {
        return null;
    }


    function getPendingCorrection(
        productId,
        fieldName
    ) {
        return pendingCorrections.find(
            (correction) =>
                correction.product_id === productId &&
                correction.field_name === fieldName
        );
    }


    function setBulkValue(fieldName, value) {
        setBulkValues((currentValues) => ({
            ...currentValues,
            [fieldName]: value
        }));

        setBulkError("");
        setBulkSuccess("");
    }


    function useAsStandard(fieldName, value) {
        const formattedValue =
            value === null || value === undefined
                ? ""
                : [
                    "group_code",
                    "category_code"
                ].includes(fieldName) &&
                /^\d$/.test(String(value).trim())
                    ? String(value).trim().padStart(2, "0")
                    : String(value);


        setBulkValue(
            fieldName,
            formattedValue
        );
    }


    function selectAllTargets() {
        setSelectedTargetIds(
            bulkTargets.map((target) => target.id)
        );
    }


    function toggleTarget(productId) {
        setSelectedTargetIds((currentIds) =>
            currentIds.includes(productId)
                ? currentIds.filter(
                    (id) => id !== productId
                )
                : [...currentIds, productId]
        );
    }


    async function applyBulkCorrections(
        applyToAll = false
    ) {
        if (!preparedFields.length) {
            setBulkError(
                "Defina ao menos um valor na coluna Correção."
            );

            return;
        }


        const targetIds = applyToAll
            ? bulkTargets.map((target) => target.id)
            : selectedTargetIds;


        if (!targetIds.length) {
            setBulkError(
                "Selecione ao menos uma filial."
            );

            return;
        }


        const fields = preparedFields.reduce(
            (result, fieldName) => {
                result[fieldName] =
                    String(
                        bulkValues[fieldName] ?? ""
                    ).trim();

                return result;
            },
            {}
        );


        const fieldLabels = correctableComparisons
            .filter((comparison) =>
                preparedFields.includes(
                    comparison.key
                )
            )
            .map((comparison) => comparison.label)
            .join(", ");


        const confirmed = window.confirm(
            `Aplicar ${fieldLabels} em ${targetIds.length} filial(is)?`
        );


        if (!confirmed) {
            return;
        }


        try {
            setSavingBulk(true);
            setBulkError("");
            setBulkSuccess("");


            const result = await createBulkCorrections({
                ean: issue.ean,
                product_ids: targetIds,
                fields
            });


            setBulkSuccess(
                `${result.created} correção(ões) registrada(s) em ${targetIds.length} filial(is).`
            );


            if (typeof onCorrectionsSaved === "function") {
                await onCorrectionsSaved();
            }


            const productIds = issue.products.map(
                (product) => product.id
            );


            const pending =
                await getPendingCorrectionsByProducts(
                    productIds
                );


            setPendingCorrections(
                Array.isArray(pending)
                    ? pending
                    : []
            );
        } catch (error) {
            console.error(
                "Erro ao aplicar correções em lote:",
                error
            );


            setBulkError(
                error.message ||
                "Não foi possível aplicar as correções."
            );
        } finally {
            setSavingBulk(false);
        }
    }


    return (
        <div
            className="audit-modal-backdrop"
            onMouseDown={onClose}
        >
            <section
                className="audit-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="audit-details-title"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <header className="audit-modal-header">
                    <div>
                        <span>
                            Detalhes da auditoria
                        </span>

                        <h2 id="audit-details-title">
                            {issue.ean ||
                                "EAN ausente ou inválido"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                    >
                        Fechar
                    </button>
                </header>

                <div className="audit-modal-message">
                    {issue.message}
                </div>

                <div className="audit-correction-info">
                    Escolha um valor correto em uma filial usando{" "}
                    <strong>Usar como padrão</strong> ou digite
                    manualmente na coluna{" "}
                    <strong>Correção</strong>. Código Sirius e
                    Código Interno permanecem apenas para consulta.
                </div>

                {comparisons.length > 0 ? (
                    <>
                        <div className="audit-comparison-wrapper">
                            <table className="audit-comparison-table">
                                <thead>
                                    <tr>
                                        <th>Campo</th>

                                        <th className="audit-correction-column">
                                            Correção
                                        </th>

                                        {issue.products.map(
                                            (product) => (
                                                <th key={product.id}>
                                                    {product.branch}

                                                    <small>
                                                        Cód:{" "}
                                                        {product.code ||
                                                            "-"}
                                                    </small>
                                                </th>
                                            )
                                        )}

                                        <th>Situação</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {comparisons.map(
                                        (comparison) => {
                                            const isBulkAllowed =
                                                !NON_BULK_FIELDS.has(
                                                    comparison.key
                                                );

                                            const correctionValue =
                                                bulkValues[
                                                    comparison.key
                                                ] ?? "";

                                            return (
                                                <tr
                                                    key={
                                                        comparison.key
                                                    }
                                                    className={
                                                        comparison.status ===
                                                        "consistent"
                                                            ? "consistent-row"
                                                            : "problem-row"
                                                    }
                                                >
                                                    <td className="audit-comparison-field-cell">
                                                        <strong>
                                                            {
                                                                comparison.label
                                                            }
                                                        </strong>
                                                    </td>

                                                    <td className="audit-correction-cell">
                                                        {isBulkAllowed ? (
                                                            <input
                                                                type="text"
                                                                value={
                                                                    correctionValue
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setBulkValue(
                                                                        comparison.key,
                                                                        event.target.value
                                                                    )
                                                                }
                                                                placeholder="Valor correto"
                                                                disabled={
                                                                    savingBulk
                                                                }
                                                            />
                                                        ) : (
                                                            <span className="audit-not-bulk-label">
                                                                Não replicar
                                                            </span>
                                                        )}
                                                    </td>

                                                    {issue.products.map(
                                                        (product) => {
                                                            const pendingCorrection =
                                                                getPendingCorrection(
                                                                    product.id,
                                                                    comparison.key
                                                                );

                                                            const value =
                                                                product[
                                                                    comparison.key
                                                                ];

                                                            return (
                                                                <td
                                                                    key={
                                                                        product.id
                                                                    }
                                                                    className="audit-product-value-cell"
                                                                >
                                                                    <div className="audit-cell-value">
                                                                        <span>
                                                                            {formatGroupOrCategory(
                                                                                comparison.key,
                                                                                displayValue(
                                                                                    value,
                                                                                    comparison.type
                                                                                )
                                                                            )}
                                                                        </span>

                                                                        {pendingCorrection && (
                                                                            <small
                                                                                className={
                                                                                    pendingCorrection.status ===
                                                                                    "sent_internal"
                                                                                        ? "audit-correction-applied"
                                                                                        : "audit-pending-correction"
                                                                                }
                                                                            >
                                                                                {pendingCorrection.status ===
                                                                                "sent_internal"
                                                                                    ? `Atualizado — anterior: ${pendingCorrection.old_value || "-"}`
                                                                                    : `Correção pendente: ${pendingCorrection.new_value}`}
                                                                            </small>
                                                                        )}
                                                                    </div>

                                                                    {isBulkAllowed && (
                                                                        <button
                                                                            type="button"
                                                                            className="audit-use-standard-button"
                                                                            onClick={() =>
                                                                                useAsStandard(
                                                                                    comparison.key,
                                                                                    value
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                savingBulk ||
                                                                                value === null ||
                                                                                value === undefined ||
                                                                                value === ""
                                                                            }
                                                                        >
                                                                            Usar como padrão
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            );
                                                        }
                                                    )}

                                                    <td className="audit-status-cell">
                                                        <span
                                                            className={
                                                                "audit-field-status " +
                                                                getStatusClass(
                                                                    comparison.status
                                                                )
                                                            }
                                                        >
                                                            {getStatusLabel(
                                                                comparison.status
                                                            )}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <section className="audit-bulk-actions">
                            <div>
                                <strong>
                                    Correções preparadas:{" "}
                                    {preparedFields.length}
                                </strong>

                                <span>
                                    {bulkTargets.length} filial(is)
                                    com este EAN
                                </span>
                            </div>

                            <div className="audit-bulk-buttons">
                                <button
                                    type="button"
                                    className="audit-apply-all-button"
                                    onClick={() =>
                                        applyBulkCorrections(true)
                                    }
                                    disabled={
                                        savingBulk ||
                                        !preparedFields.length ||
                                        !bulkTargets.length
                                    }
                                >
                                    {savingBulk
                                        ? "Aplicando..."
                                        : `Aplicar em todas (${bulkTargets.length})`}
                                </button>

                                <button
                                    type="button"
                                    className="audit-select-branches-button"
                                    onClick={() =>
                                        setShowBranchSelector(
                                            (open) => !open
                                        )
                                    }
                                    disabled={
                                        savingBulk ||
                                        !preparedFields.length ||
                                        !bulkTargets.length
                                    }
                                >
                                    Escolher filiais
                                </button>
                            </div>

                            {showBranchSelector && (
                                <div className="audit-branch-selector">
                                    <header>
                                        <strong>
                                            Filiais para aplicar
                                        </strong>

                                        <button
                                            type="button"
                                            onClick={
                                                selectAllTargets
                                            }
                                        >
                                            Selecionar todas
                                        </button>
                                    </header>

                                    {bulkTargets.map((target) => (
                                        <label key={target.id}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTargetIds.includes(
                                                    target.id
                                                )}
                                                onChange={() =>
                                                    toggleTarget(
                                                        target.id
                                                    )
                                                }
                                                disabled={savingBulk}
                                            />

                                            <span>
                                                {target.branch} — Cód:{" "}
                                                {target.code}
                                            </span>
                                        </label>
                                    ))}

                                    <button
                                        type="button"
                                        className="audit-apply-selected-button"
                                        onClick={() =>
                                            applyBulkCorrections(false)
                                        }
                                        disabled={
                                            savingBulk ||
                                            selectedTargets.length === 0
                                        }
                                    >
                                        Aplicar em{" "}
                                        {selectedTargets.length} filial(is)
                                    </button>
                                </div>
                            )}

                            {bulkError && (
                                <div className="audit-bulk-error">
                                    {bulkError}
                                </div>
                            )}

                            {bulkSuccess && (
                                <div className="audit-bulk-success">
                                    {bulkSuccess}
                                </div>
                            )}
                        </section>
                    </>
                ) : (
                    <div className="audit-details-table-wrapper">
                        <table className="audit-details-table">
                            <thead>
                                <tr>
                                    <th>Filial</th>
                                    <th>Cód.</th>
                                    <th>EAN</th>
                                    <th>Cód. Sirius</th>
                                    <th>Nome Comercial</th>
                                </tr>
                            </thead>

                            <tbody>
                                {issue.products.map(
                                    (product) => (
                                        <tr key={product.id}>
                                            <td>
                                                {product.branch || "-"}
                                            </td>

                                            <td>
                                                {product.code || "-"}
                                            </td>

                                            <td>
                                                {product.ean || "-"}
                                            </td>

                                            <td>
                                                {product.sirius_code ||
                                                    "-"}
                                            </td>

                                            <td>
                                                {product.commercial_name ||
                                                    "-"}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="audit-modal-note">
                    A correção será registrada no histórico do Alfadime
                    para cada filial selecionada. O valor exibido
                    continuará sendo o valor da planilha até a
                    atualização do sistema interno.
                </p>
            </section>
        </div>
    );
}


export default AuditDetailsModal;