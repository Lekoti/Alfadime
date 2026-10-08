import { useEffect, useState } from "react";
import { getFilterOptions } from "../services/products.service";


function ProductFilters({ filters, onFiltersChange }) {
    const [options, setOptions] = useState({
        branch: [],
        laboratory: [],
        group_code: [],
        category_code: []
    });


    useEffect(() => {
        let active = true;


        async function loadOptions() {
            try {
                const fields = [
                    "branch",
                    "laboratory",
                    "group_code",
                    "category_code"
                ];


                const entries = await Promise.all(
                    fields.map(async (field) => {
                        const values = await getFilterOptions(field);


                        return [
                            field,
                            Array.isArray(values) ? values : []
                        ];
                    })
                );


                if (active) {
                    setOptions(Object.fromEntries(entries));
                }
            } catch (error) {
                console.error(
                    "Erro ao carregar filtros de produtos:",
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
            [key]: value
        });
    }


    function clearFilters() {
        onFiltersChange({
            search: "",
            branch: "",
            brand: "",
            group_code: "",
            category_code: "",
            controls_lot: "",
            active: "",
            page: 1,
            pageSize: 50
        });
    }


    return (
        <section className="products-filters">
            <div className="products-search-field">
                <label>Buscar</label>
                <input
                    type="search"
                    value={filters.search}
                    placeholder="Código, EAN, nome comercial ou marca"
                    onChange={(event) =>
                        update("search", event.target.value)
                    }
                />
            </div>


            <div className="products-filter-field">
                <label>Filial</label>
                <select
                    value={filters.branch}
                    onChange={(event) =>
                        update("branch", event.target.value)
                    }
                >
                    <option value="">Todas</option>
                    {options.branch.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>
            </div>


            <div className="products-filter-field">
                <label>Laboratório</label>
                <select
                    value={filters.laboratory}
                    onChange={(event) =>
                        update("laboratory", event.target.value)
                    }
                >
                    <option value="">Todas</option>
                    {options.laboratory.map((item) => (
                        <option key={item.code} value={item.code}>
                            {item.name}
                        </option>
                    ))}
                </select>
            </div>


            <div className="products-filter-field">
                <label>Grupo</label>
                <select
                    value={filters.group_code}
                    onChange={(event) =>
                        update("group_code", event.target.value)
                    }
                >
                    <option value="">Todos</option>
                    {options.group_code.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>
            </div>


            <div className="products-filter-field">
                <label>Categoria</label>
                <select
                    value={filters.category_code}
                    onChange={(event) =>
                        update("category_code", event.target.value)
                    }
                >
                    <option value="">Todas</option>
                    {options.category_code.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>
            </div>


            <div className="products-filter-field">
                <label>Controla lote</label>
                <select
                    value={filters.controls_lot}
                    onChange={(event) =>
                        update("controls_lot", event.target.value)
                    }
                >
                    <option value="">Todos</option>
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                </select>
            </div>


            <div className="products-filter-field">
                <label>Status</label>
                <select
                    value={filters.active}
                    onChange={(event) =>
                        update("active", event.target.value)
                    }
                >
                    <option value="">Todos</option>
                    <option value="1">Ativos</option>
                    <option value="0">Inativos</option>
                </select>
            </div>


            <button
                type="button"
                className="products-clear-filters"
                onClick={clearFilters}
            >
                Limpar filtros
            </button>
        </section>
    );
}


export default ProductFilters;