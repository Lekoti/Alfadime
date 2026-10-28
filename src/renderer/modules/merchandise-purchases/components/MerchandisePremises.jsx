import {
    MONTH_LABELS,
    PERIOD_REFERENCES,
    PRICE_CRITERIA,
    PRICE_SOURCES
} from "../constants/merchandise-purchases.constants";

const CURVES = [
    { key: "A", label: "Curva A" },
    { key: "B", label: "Curva B" },
    { key: "C", label: "Curva C" },
    { key: "OTHER", label: "D E F (Outros)" }
];

export default function MerchandisePremises({ premises, onChange }) {
    function updateDays(key, value) {
        const days = Math.max(0, Number(value) || 0);

        onChange({
            ...premises,
            curveDays: { ...premises.curveDays, [key]: days }
        });
    }

    function update(key, value) {
        onChange({ ...premises, [key]: value });
    }

    return (
        <div className="mp-premises">
            <div className="mp-curve-grid">
                {CURVES.map((curve) => (
                    <div key={curve.key} className="mp-curve-target">
                        <span className="mp-curve-name">{curve.label}</span>
                        <input
                            type="number"
                            min="0"
                            value={premises.curveDays[curve.key]}
                            onChange={(event) => updateDays(curve.key, event.target.value)}
                        />
                        <small>
                            dias · {(premises.curveDays[curve.key] / 30).toFixed(1)} meses
                        </small>
                    </div>
                ))}
            </div>

            <div className="mp-premises-selects">
                <div className="mp-filter-field">
                    <label>Último mês fechado</label>
                    <select
                        value={premises.closedMonth}
                        onChange={(event) => update("closedMonth", Number(event.target.value))}
                    >
                        {MONTH_LABELS.map((label, index) => (
                            <option key={label} value={index + 1}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mp-filter-field">
                    <label>Fonte do preço</label>
                    <select
                        value={premises.priceSource}
                        onChange={(event) => update("priceSource", event.target.value)}
                    >
                        {PRICE_SOURCES.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mp-filter-field">
                    <label>Critério de preço</label>
                    <select
                        value={premises.priceCriteria}
                        onChange={(event) => update("priceCriteria", event.target.value)}
                    >
                        {PRICE_CRITERIA.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mp-filter-field">
                    <label>Referência da sugestão por período</label>
                    <select
                        value={premises.periodReference}
                        onChange={(event) => update("periodReference", event.target.value)}
                    >
                        {PERIOD_REFERENCES.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
