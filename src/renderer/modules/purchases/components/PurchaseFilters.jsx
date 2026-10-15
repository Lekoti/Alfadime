import { useEffect, useState } from "react";
import { getPurchaseFilterOptions } from "../services/purchases.service";

function PurchaseFilters({
    filters,
    onFiltersChange
}) {
    const [options, setOptions] = useState({
        laboratory: [],
        company: [],
        effectivecurve: []
    });

    useEffect(() => {
        let active = true;

        async function loadOptions() {
            try {
                const fields = [
                    "company",
                    "laboratoryname",
                    "effectivecurve"
                ];

                const entries = await Promise.all(
                    fields.map(async (field) => {
                        const values =
                            await getPurchaseFilterOptions(field);

                        return [
                            field === "laboratoryname"
                                ? "laboratory"
                                : field,
                            Array.isArray(values) ? values : []
                        ];
                    })
                );

                if (active) {
                    setOptions(Object.fromEntries(entries));
                }
            } catch (error) {
                console.error(
                    "Erro ao carregar filtros de Compras:",
                    error
                );
            }
        }

        loadOptions();

        return () => {
            active = false;
        };
    }, []);

    function update(key, value) {
        onFiltersChange({
            ...filters,
            [key]: value,
            page: 1
        });
    }

    function clear() {
        onFiltersChange({
            ...filters,
            search: "",
            company: "",
            laboratoryname: "",
            effectivecurve: "",
            status: "",
            page: 1
        });
    }

    return (
        <section className="purchases-filters">
            <div className="purchases-search-field">
                <label>Buscar</label>
                <input
                    type="search"
                    value={filters.search}
                    placeholder="Código, barras, descrição ou laboratório"
                    onChange={(event) =>
                        update("search", event.target.value)
                    }
                />
            </div>

            <div className="purchases-filter-field">
                <label>Empresa</label>
                <select
                    value={filters.company}
                    onChange={(event) =>
                        update("company", event.target.value)
                    }
                >
                    <option value="">Todas</option>
                    {options.company.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>
            </div>

            <div className="purchases-filter-field">
                <label>Laboratório</label>
                <select
                    value={filters.laboratoryname}
                    onChange={(event) =>
                        update("laboratoryname", event.target.value)
                    }
                >
                    <option value="">Todos</option>
                    {options.laboratory.map((item) => (
                        <option key={item.code} value={item.code}>
                            {item.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="purchases-filter-field">
                <label>Curva</label>
                <select
                    value={filters.effectivecurve}
                    onChange={(event) =>
                        update("effectivecurve", event.target.value)
                    }
                >
                    <option value="">Todas</option>
                    {options.effectivecurve.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>
            </div>

            <div className="purchases-filter-field">
                <label>Situação</label>
                <select
                    value={filters.status}
                    onChange={(event) =>
                        update("status", event.target.value)
                    }
                >
                    <option value="">Todas</option>
                    <option value="suggestion">Com sugestão de compra</option>
                    <option value="belowtarget">Abaixo da meta</option>
                    <option value="critical">Crítico (até 15 dias)</option>
                    <option value="nobuy">Não comprar agora</option>
                    <option value="excessstock">Estoque excedido</option>
                    <option value="promotion">Avaliar promoção</option>
                    <option value="nosales">Sem média de venda</option>
                    <option value="noprice">Sem preço para sugestão</option>
                </select>
            </div>

            <button
                type="button"
                className="purchases-clear-button"
                onClick={clear}
            >
                Limpar
            </button>
        </section>
    );
}

export default PurchaseFilters;