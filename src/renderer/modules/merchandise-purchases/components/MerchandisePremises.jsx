import {MONTH_LABELS,PERIOD_REFERENCES,PRICE_CRITERIA,PRICE_SOURCES} from "../constants/merchandise-purchases.constants";
const CURVES=[{key:"A",label:"Curva A"},{key:"B",label:"Curva B"},{key:"C",label:"Curva C"},{key:"OTHER",label:"D E F (Outros)"}];
export default function MerchandisePremises({premises,onChange}){
    const update=(key,value)=>onChange({...premises,[key]:value});
    return <div className="mp-premises"><div className="mp-curve-grid">{CURVES.map(curve=><div key={curve.key} className="mp-curve-target"><span className="mp-curve-name">{curve.label}</span><input type="number" min="0" value={premises.curveDays[curve.key]} onChange={e=>update("curveDays",{...premises.curveDays,[curve.key]:Math.max(0,Number(e.target.value)||0)})}/><small>dias · {(premises.curveDays[curve.key]/30).toFixed(1)} meses</small></div>)}</div>
    <div className="mp-premises-selects">
        <div className="mp-filter-field"><label>Vendas completas até</label><select value={premises.closedMonth} onChange={e=>update("closedMonth",Number(e.target.value))}>{MONTH_LABELS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select><small>Exclui meses incompletos das médias e análises. Média Mês da base é preservada.</small></div>
        <div className="mp-filter-field"><label>Fonte do preço</label><select value={premises.priceSource} onChange={e=>update("priceSource",e.target.value)}>{PRICE_SOURCES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select><small>Política → última → penúltima → antepenúltima → zero. Política vencida é usada com aviso.</small></div>
        <div className="mp-filter-field"><label>Empresa de referência do preço</label><select value={premises.priceCriteria} onChange={e=>update("priceCriteria",e.target.value)}>{PRICE_CRITERIA.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select><small>Usa o preço da empresa da linha ou o menor entre as empresas do mesmo produto.</small></div>
        <div className="mp-filter-field"><label>Base da sugestão alternativa</label><select value={premises.periodReference} onChange={e=>update("periodReference",e.target.value)}>{PERIOD_REFERENCES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select><small>Altera Sugestão Compra Período; não substitui automaticamente a quantidade principal.</small></div>
    </div></div>;
}
