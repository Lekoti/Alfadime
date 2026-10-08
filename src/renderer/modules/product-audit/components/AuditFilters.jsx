import {
    useEffect,
    useState
} from "react";


import AuditCheckboxGroup from
    "./AuditCheckboxGroup";


import {
    getAuditFilterOptions
} from "../services/product-audit.service";


const ISSUE_TYPES = [
    {
        value: "ean_audit",
        label: "Divergencias entre filiais"
    },


    {
        value: "divergent_commercial_name",
        label: "Nome comercial diferente entre filiais"
    },


    {
        value: "divergent_active_ingredient",
        label: "Principio ativo diferente entre filiais"
    },


    {
        value: "divergent_brand",
        label: "Marca / industria diferente entre filiais"
    },


    {
        value: "divergent_sirius_code",
        label: "Codigo Sirius diferente entre filiais"
    },


    {
        value: "divergent_sap_code",
        label: "Codigo SAP diferente entre filiais"
    },


    {
        value: "divergent_group_code",
        label: "Grupo diferente entre filiais"
    },


    {
        value: "divergent_category_code",
        label: "Categoria diferente entre filiais"
    },


    {
        value: "divergent_unit",
        label: "Unidade diferente entre filiais"
    },


    {
        value: "divergent_standard_box",
        label: "Caixa padrao diferente entre filiais"
    },


    {
        value: "divergent_controls_lot",
        label: "Controle de lote diferente entre filiais"
    },


    {
        value: "divergent_ms_registration",
        label: "Registro MS diferente entre filiais"
    },


    {
        value: "divergent_reference_code",
        label: "Codigo de referencia diferente entre filiais"
    },


    {
        value: "divergent_therapeutic_class",
        label: "Classe terapeutica diferente entre filiais"
    },


    {
        value: "divergent_height",
        label: "Altura diferente entre filiais"
    },


    {
        value: "divergent_width",
        label: "Largura diferente entre filiais"
    },


    {
        value: "divergent_length",
        label: "Comprimento diferente entre filiais"
    },


    {
        value: "divergent_active",
        label: "Status ativo diferente entre filiais"
    },


    {
        value: "missing_commercial_name",
        label: "Nome comercial ausente"
    },


    {
        value: "missing_active_ingredient",
        label: "Principio ativo ausente"
    },


    {
        value: "missing_brand",
        label: "Marca / industria ausente"
    },


    {
        value: "missing_sirius_code",
        label: "Codigo Sirius ausente"
    },


    {
        value: "missing_sap_code",
        label: "Codigo SAP ausente"
    },


    {
        value: "missing_group_code",
        label: "Grupo ausente"
    },


    {
        value: "missing_category_code",
        label: "Categoria ausente"
    },


    {
        value: "missing_unit",
        label: "Unidade ausente"
    },


    {
        value: "missing_ms_registration",
        label: "Registro MS ausente"
    },


    {
        value: "missing_reference_code",
        label: "Codigo de referencia ausente"
    },


    {
        value: "missing_therapeutic_class",
        label: "Classe terapeutica ausente"
    },


    {
        value: "missing_dimensions",
        label: "Dimensoes ausentes"
    },


    {
        value: "invalid_ean",
        label: "EAN ausente ou invalido"
    },


    {
        value: "duplicate_ean_branch",
        label: "EAN repetido na mesma filial"
    }
];


const SEVERITIES = [
    {
        value: "error",
        label: "Alta prioridade"
    },
    {
        value: "warning",
        label: "Conferir"
    }
];


const AUDIT_FIELDS = [
    {
        key: "sirius_code",
        label: "Cod Sirius"
    },
    {
        key: "sap_code",
        label: "Codigo SAP"
    },
    {
        key: "group_code",
        label: "Grupo"
    },
    {
        key: "active_ingredient",
        label: "Principio Ativo"
    },
    {
        key: "commercial_name",
        label: "Nome Comercial"
    },
    {
        key: "manufacturer_code",
        label: "Codigo Fabricante"
    },
    {
        key: "brand",
        label: "Industria / Marca"
    },
    {
        key: "unit",
        label: "Unidade"
    },
    {
        key: "standard_box",
        label: "Caixa Padrao"
    },
    {
        key: "controls_lot",
        label: "Controla Lote"
    },
    {
        key: "ms_registration",
        label: "Registro MS"
    },
    {
        key: "reference_code",
        label: "Codigo Referencia"
    },
    {
        key: "therapeutic_class_code",
        label: "Classe Terapeutica"
    },
    {
        key: "height",
        label: "Altura"
    },
    {
        key: "width",
        label: "Largura"
    },
    {
        key: "length",
        label: "Comprimento"
    },
    {
        key: "category_code",
        label: "Categoria"
    },
    {
        key: "active",
        label: "Ativo"
    }
];


const FILTER_CONFIG = [
    {
        key: "branch",
        stateKey: "branches",
        label: "Filiais"
    },
    {
        key: "brand",
        stateKey: "brands",
        label: "Industria / Marca"
    },
    {
        key: "manufacturer_code",
        stateKey: "manufacturerCodes",
        label: "Codigo Fabricante"
    },
    {
        key: "group_code",
        stateKey: "groupCodes",
        label: "Grupos"
    },
    {
        key: "category_code",
        stateKey: "categoryCodes",
        label: "Categorias"
    },
    {
        key: "unit",
        stateKey: "units",
        label: "Unidades"
    },
    {
        key: "therapeutic_class_code",
        stateKey: "therapeuticClasses",
        label: "Classes Terapeuticas"
    }
];


function AuditFilters({
    filters,
    onFiltersChange
}) {
    const [options, setOptions] = useState({});
    const [showAdvanced, setShowAdvanced] =
        useState(false);


    useEffect(() => {
        let mounted = true;


        async function loadOptions() {
            try {
                const results = await Promise.all(
                    FILTER_CONFIG.map(
                        async (config) => {
                            const values =
                                await getAuditFilterOptions(
                                    config.key
                                );


                            return [
                                config.key,
                                Array.isArray(values)
                                    ? values
                                    : []
                            ];
                        }
                    )
                );


                if (mounted) {
                    setOptions(
                        Object.fromEntries(results)
                    );
                }
            } catch (error) {
                console.error(
                    "Erro ao carregar filtros:",
                    error
                );
            }
        }


        loadOptions();


        return () => {
            mounted = false;
        };
    }, []);


    function updateFilter(key, value) {
        onFiltersChange({
            ...filters,
            [key]: value
        });
    }


    function clearFilters() {
        onFiltersChange({
            search: "",
            types: [],
            severities: [],
            branches: [],
            brands: [],
            manufacturerCodes: [],
            groupCodes: [],
            categoryCodes: [],
            units: [],
            therapeuticClasses: [],
            divergentFields: [],
            missingFields: [],
            controlsLot: "",
            productActive: "",
            minBranches: "",
            page: 1,
            pageSize: 50
        });
    }


    function getSelectedValue(values) {
        return values && values.length === 1
            ? values[0]
            : "";
    }


    function selectSingleOrClear(
        stateKey,
        value
    ) {
        updateFilter(
            stateKey,
            value ? [value] : []
        );
    }


    return (
        <section className="audit-filters products-style-filters">
            <div className="audit-search-field">
                <label htmlFor="audit-search">
                    Busca geral
                </label>


                <input
                    id="audit-search"
                    type="search"
                    value={filters.search || ""}
                    placeholder="EAN, filial, codigo, nome, industria ou valor"
                    onChange={(event) =>
                        updateFilter(
                            "search",
                            event.target.value
                        )
                    }
                />
            </div>


            <div className="audit-filter-field audit-type-filter-field">
                <label htmlFor="audit-type">
                    Tipo de pendencia
                </label>


                <select
                    id="audit-type"
                    value={getSelectedValue(
                        filters.types
                    )}
                    onChange={(event) =>
                        selectSingleOrClear(
                            "types",
                            event.target.value
                        )
                    }
                >
                    <option value="">
                        Todos
                    </option>


                    <optgroup label="Divergencias entre filiais">
                        {ISSUE_TYPES
                            .filter((item) =>
                                item.value.startsWith(
                                    "divergent_"
                                ) ||
                                item.value === "ean_audit"
                            )
                            .map((item) => (
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </option>
                            ))}
                    </optgroup>


                    <optgroup label="Informacoes ausentes">
                        {ISSUE_TYPES
                            .filter((item) =>
                                item.value.startsWith(
                                    "missing_"
                                )
                            )
                            .map((item) => (
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </option>
                            ))}
                    </optgroup>


                    <optgroup label="Problemas de identificacao">
                        {ISSUE_TYPES
                            .filter((item) =>
                                item.value === "invalid_ean" ||
                                item.value === "duplicate_ean_branch"
                            )
                            .map((item) => (
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </option>
                            ))}
                    </optgroup>
                </select>
            </div>


            <div className="audit-filter-field">
                <label htmlFor="audit-severity">
                    Prioridade
                </label>


                <select
                    id="audit-severity"
                    value={getSelectedValue(
                        filters.severities
                    )}
                    onChange={(event) =>
                        selectSingleOrClear(
                            "severities",
                            event.target.value
                        )
                    }
                >
                    <option value="">
                        Todas
                    </option>


                    {SEVERITIES.map((item) => (
                        <option
                            key={item.value}
                            value={item.value}
                        >
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>


            <div className="audit-filter-field">
                <label htmlFor="audit-controls-lot">
                    Controla lote
                </label>


                <select
                    id="audit-controls-lot"
                    value={filters.controlsLot || ""}
                    onChange={(event) =>
                        updateFilter(
                            "controlsLot",
                            event.target.value
                        )
                    }
                >
                    <option value="">Todos</option>
                    <option value="1">Sim</option>
                    <option value="0">Nao</option>
                </select>
            </div>


            <div className="audit-filter-field">
                <label htmlFor="audit-product-active">
                    Produto ativo
                </label>


                <select
                    id="audit-product-active"
                    value={filters.productActive || ""}
                    onChange={(event) =>
                        updateFilter(
                            "productActive",
                            event.target.value
                        )
                    }
                >
                    <option value="">Todos</option>
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                </select>
            </div>


            <div className="audit-filter-field">
                <label htmlFor="audit-min-branches">
                    Minimo de filiais
                </label>


                <select
                    id="audit-min-branches"
                    value={filters.minBranches || ""}
                    onChange={(event) =>
                        updateFilter(
                            "minBranches",
                            event.target.value
                        )
                    }
                >
                    <option value="">Qualquer quantidade</option>
                    <option value="2">2 ou mais</option>
                    <option value="3">3 ou mais</option>
                    <option value="4">4 ou mais</option>
                    <option value="5">5 ou mais</option>
                </select>
            </div>


            <button
                type="button"
                className="audit-advanced-button"
                onClick={() =>
                    setShowAdvanced(
                        !showAdvanced
                    )
                }
            >
                {showAdvanced
                    ? "Ocultar filtros avancados"
                    : "Mais filtros"}
            </button>


            <button
                type="button"
                className="audit-clear-button"
                onClick={clearFilters}
            >
                Limpar filtros
            </button>


            {showAdvanced && (
                <div className="audit-advanced-filters">
                    <AuditCheckboxGroup
                        title="Tipos de pendencia"
                        options={ISSUE_TYPES.map(
                            (item) => ({
                                value: item.value,
                                label: item.label
                            })
                        )}
                        selectedValues={
                            filters.types || []
                        }
                        onChange={(values) =>
                            updateFilter(
                                "types",
                                values
                            )
                        }
                    />


                    <AuditCheckboxGroup
                        title="Campos divergentes"
                        options={AUDIT_FIELDS.map(
                            (field) => ({
                                value: field.key,
                                label: field.label
                            })
                        )}
                        selectedValues={
                            filters.divergentFields || []
                        }
                        onChange={(values) =>
                            updateFilter(
                                "divergentFields",
                                values
                            )
                        }
                    />


                    <AuditCheckboxGroup
                        title="Campos ausentes"
                        options={AUDIT_FIELDS.map(
                            (field) => ({
                                value: field.key,
                                label: field.label
                            })
                        )}
                        selectedValues={
                            filters.missingFields || []
                        }
                        onChange={(values) =>
                            updateFilter(
                                "missingFields",
                                values
                            )
                        }
                    />


                    {FILTER_CONFIG.map((config) => (
                        <AuditCheckboxGroup
                            key={config.key}
                            title={config.label}
                            options={(
                                options[config.key] || []
                            ).map((value) => ({
                                value: String(value),
                                label: String(value)
                            }))}
                            selectedValues={
                                filters[
                                    config.stateKey
                                ] || []
                            }
                            onChange={(values) =>
                                updateFilter(
                                    config.stateKey,
                                    values
                                )
                            }
                        />
                    ))}
                </div>
            )}
        </section>
    );
}


export default AuditFilters;