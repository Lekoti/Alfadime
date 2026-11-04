import {DEFAULT_FILTERS,STATUS_OPTIONS} from "../constants/merchandise-purchases.constants";

function MultiSelectField({label,values,allLabel,items=[],onChange}){
    function toggle(value){
        const current=Array.isArray(values)?values:[];
        const next=current.includes(value)
            ?current.filter(item=>item!==value)
            :[...current,value];
        onChange(next);
    }

    return (
        <div className="mp-filter-field">
            <label>{label}</label>
            <div className="mp-multi-select">
                <button
                    type="button"
                    className={`mp-multi-option${!values.length?" mp-multi-option-active":""}`}
                    onClick={()=>onChange([])}
                >
                    {allLabel}
                </button>

                {items.map(item=>(
                    <button
                        key={item}
                        type="button"
                        className={`mp-multi-option${values.includes(item)?" mp-multi-option-active":""}`}
                        onClick={()=>toggle(item)}
                    >
                        {item}
                    </button>
                ))}
            </div>
        </div>
    );
}

function SelectField({label,value,allLabel,items=[],onChange}){
    return (
        <div className="mp-filter-field">
            <label>{label}</label>
            <select value={value||""} onChange={event=>onChange(event.target.value)}>
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
        <section className="mp-filters">
            <div className="mp-search-field">
                <label>Buscar</label>
                <input
                    type="search"
                    value={filters.search}
                    placeholder="Código, EAN, descrição ou fabricante global"
                    onChange={event=>update("search",event.target.value)}
                />
            </div>

            <MultiSelectField
                label="Empresa"
                values={filters.company}
                allLabel="Todas"
                items={options.companies}
                onChange={values=>update("company",values)}
            />

            <MultiSelectField
                label="Laboratório (Fabr_Global)"
                values={filters.laboratory}
                allLabel="Todos"
                items={options.laboratories}
                onChange={values=>update("laboratory",values)}
            />

            <SelectField
                label="Tipo de produto"
                value={filters.group}
                allLabel="Todos"
                items={options.groups}
                onChange={value=>update("group",value)}
            />

            <MultiSelectField
                label="Curva"
                values={filters.curve}
                allLabel="Todas"
                items={options.curves}
                onChange={values=>update("curve",values)}
            />

            <SelectField
                label="Origem do preço utilizado"
                value={filters.priceOrigin}
                allLabel="Todas"
                items={options.priceOrigins}
                onChange={value=>update("priceOrigin",value)}
            />

            <div className="mp-filter-field">
                <label>Situação</label>
                <select value={filters.status} onChange={event=>update("status",event.target.value)}>
                    {STATUS_OPTIONS.map(item=>(
                        <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                </select>
            </div>

            <button
                type="button"
                className="mp-clear-button"
                onClick={()=>onChange(DEFAULT_FILTERS)}
            >
                Limpar
            </button>
        </section>
    );
}
