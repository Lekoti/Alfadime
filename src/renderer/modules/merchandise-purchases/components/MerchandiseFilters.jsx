import {DEFAULT_FILTERS,STATUS_OPTIONS} from "../constants/merchandise-purchases.constants";
function SelectField({label,value,allLabel,items=[],onChange}){return <div className="mp-filter-field"><label>{label}</label><select value={value||""} onChange={e=>onChange(e.target.value)}><option value="">{allLabel}</option>{items.map(item=><option key={item} value={item}>{item}</option>)}</select></div>;}
export default function MerchandiseFilters({filters,options,onChange}){
    const update=(key,value)=>onChange({...filters,[key]:value});
    return <section className="mp-filters">
        <div className="mp-search-field"><label>Buscar</label><input type="search" value={filters.search} placeholder="Código, EAN, descrição ou fabricante global" onChange={e=>update("search",e.target.value)}/></div>
        <SelectField label="Empresa" value={filters.company} allLabel="Todas" items={options.companies} onChange={v=>update("company",v)}/>
        <SelectField label="Laboratório (Fabr_Global)" value={filters.laboratory} allLabel="Todos" items={options.laboratories} onChange={v=>update("laboratory",v)}/>
        <SelectField label="Tipo de produto" value={filters.group} allLabel="Todos" items={options.groups} onChange={v=>update("group",v)}/>
        <SelectField label="Curva" value={filters.curve} allLabel="Todas" items={options.curves} onChange={v=>update("curve",v)}/>
        <SelectField label="Origem do preço utilizado" value={filters.priceOrigin} allLabel="Todas" items={options.priceOrigins} onChange={v=>update("priceOrigin",v)}/>
        <div className="mp-filter-field"><label>Situação</label><select value={filters.status} onChange={e=>update("status",e.target.value)}>{STATUS_OPTIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <button type="button" className="mp-clear-button" onClick={()=>onChange(DEFAULT_FILTERS)}>Limpar</button>
    </section>;
}
