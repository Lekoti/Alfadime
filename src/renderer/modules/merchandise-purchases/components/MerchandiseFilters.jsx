import {DEFAULT_FILTERS,STATUS_OPTIONS} from "../constants/merchandise-purchases.constants";

function MultiSelectField({id,label,values,allLabel,items=[],onChange}){
    const selected=Array.isArray(values)?values:[];

    function toggle(value){
        const next=selected.includes(value)
            ?selected.filter(item=>item!==value)
            :[...selected,value];

        onChange(next);
    }

    return (
        <div className="mp-filter-field mp-multi-filter">
            <label htmlFor={id}>{label}</label>

            <div className="mp-multi-select" id={id} role="group" aria-label={label}>
                <button
                    type="button"
                    className={`mp-multi-option${!selected.length?" mp-multi-option-active":""}`}
                    aria-pressed={!selected.length}
                    onClick={()=>onChange([])}
                >
                    {allLabel}
                </button>

                <div className="mp-multi-options">
                    {items.map(item=>(
                        <button
                            key={item}
                            type="button"
                            className={`mp-multi-option${selected.includes(item)?" mp-multi-option-active":""}`}
                            aria-pressed={selected.includes(item)}
                            onClick={()=>toggle(item)}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SelectField({id,label,value,allLabel,items=[],onChange}){
    return (
        <div className="mp-filter-field">
            <label htmlFor={id}>{label}</label>

            <select
                id={id}
                value={value||""}
                onChange={event=>onChange(event.target.value)}
            >
                <option value="">{allLabel}</option>

                {items.map(item=>(
                    <option key={item} value={item}>{item}</option>
                ))}
            </select>
        </div>
    );
}

export default function MerchandiseFilters({filters,options,onChange}){
    const update=(key,value)=>onChange({...filters,[key]:value});

    return (
        <section className="mp-filters" aria-label="Filtros de compras">
            <div className="mp-search-field">
                <label htmlFor="mp-search">Buscar</label>

                <input
                    id="mp-search"
                    type="search"
                    value={filters.search}
                    placeholder="Código, EAN, descrição ou fabricante global"
                    onChange={event=>update("search",event.target.value)}
                />
            </div>

            <MultiSelectField
                id="mp-company-filter"
                label="Empresa"
                values={filters.company}
                allLabel="Todas"
                items={options.companies}
                onChange={values=>update("company",values)}
            />

            <MultiSelectField
                id="mp-laboratory-filter"
                label="Laboratório (Fabr_Global)"
                values={filters.laboratory}
                allLabel="Todos"
                items={options.laboratories}
                onChange={values=>update("laboratory",values)}
            />

            <MultiSelectField
                id="mp-curve-filter"
                label="Curva"
                values={filters.curve}
                allLabel="Todas"
                items={options.curves}
                onChange={values=>update("curve",values)}
            />

            <SelectField
                id="mp-price-origin-filter"
                label="Origem do preço utilizado"
                value={filters.priceOrigin}
                allLabel="Todas"
                items={options.priceOrigins}
                onChange={value=>update("priceOrigin",value)}
            />

            <div className="mp-filter-field">
                <label htmlFor="mp-status-filter">Situação</label>

                <select
                    id="mp-status-filter"
                    value={filters.status}
                    onChange={event=>update("status",event.target.value)}
                >
                    {STATUS_OPTIONS.map(item=>(
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>

            <button
                type="button"
                className="mp-clear-button"
                aria-label="Limpar filtros"
                onClick={()=>onChange(DEFAULT_FILTERS)}
            >
                Limpar
            </button>
        </section>
    );
}
