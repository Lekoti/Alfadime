ALTER TABLE purchase_curve_products ADD COLUMN antepenultimate_purchase_price NUMERIC;
ALTER TABLE purchase_curve_products ADD COLUMN average_cost NUMERIC;
ALTER TABLE purchase_curve_products ADD COLUMN last_purchase_price_dpr NUMERIC;
ALTER TABLE purchase_curve_products ADD COLUMN last_purchase_price_ams NUMERIC;
ALTER TABLE purchase_curve_products ADD COLUMN last_purchase_price_dms NUMERIC;
ALTER TABLE purchase_curve_products ADD COLUMN last_purchase_price_dmt NUMERIC;
ALTER TABLE purchase_curve_products ADD COLUMN last_purchase_price_dsc NUMERIC;

/* Legacy duplicate schema removed in migration 021. */
/*
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    productcode TEXT NOT NULL,
    barcode TEXT,
    description TEXT,
    laboratoryname TEXT,
    currentstock NUMERIC NOT NULL DEFAULT 0,
    blockedstock NUMERIC NOT NULL DEFAULT 0,
    averagesale12m NUMERIC NOT NULL DEFAULT 0,
    averagesale6m NUMERIC NOT NULL DEFAULT 0,
    averagesale3m NUMERIC NOT NULL DEFAULT 0,
    lastpurchaseprice NUMERIC,
    penultimatepurchaseprice NUMERIC,
    antepenultimatepurchaseprice NUMERIC,
    averagecost NUMERIC,
    lastpurchasepricedpr NUMERIC,
    lastpurchasepriceams NUMERIC,
    lastpurchasepricedms NUMERIC,
    lastpurchasepricedmt NUMERIC,
    lastpurchasepricedsc NUMERIC,
    curvevalue TEXT,
    curveunit TEXT,
    effectivecurve TEXT,
    standardbox NUMERIC,
    janquantity NUMERIC NOT NULL DEFAULT 0,
    febquantity NUMERIC NOT NULL DEFAULT 0,
    marquantity NUMERIC NOT NULL DEFAULT 0,
    aprquantity NUMERIC NOT NULL DEFAULT 0,
    mayquantity NUMERIC NOT NULL DEFAULT 0,
    junquantity NUMERIC NOT NULL DEFAULT 0,
    julquantity NUMERIC NOT NULL DEFAULT 0,
    augquantity NUMERIC NOT NULL DEFAULT 0,
    sepquantity NUMERIC NOT NULL DEFAULT 0,
    octquantity NUMERIC NOT NULL DEFAULT 0,
    novquantity NUMERIC NOT NULL DEFAULT 0,
    decquantity NUMERIC NOT NULL DEFAULT 0,
    sourcefilename TEXT,
    importedat TEXT,
    createdat TEXT NOT NULL,
    updatedat TEXT NOT NULL,
    UNIQUE(company, productcode)
);

CREATE TABLE IF NOT EXISTS purchasecurveimporthistory (
    id TEXT PRIMARY KEY,
    sourcefilename TEXT NOT NULL,
    sourcefilepath TEXT NOT NULL,
    totalrows INTEGER NOT NULL DEFAULT 0,
    validrows INTEGER NOT NULL DEFAULT 0,
    insertedrows INTEGER NOT NULL DEFAULT 0,
    updatedrows INTEGER NOT NULL DEFAULT 0,
    ignoredrows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    errormessage TEXT,
    startedat TEXT NOT NULL,
    finishedat TEXT,
    createdat TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchasecurve_company
ON purchasecurveproducts(company);

CREATE INDEX IF NOT EXISTS idx_purchasecurve_productcode
ON purchasecurveproducts(productcode);

CREATE INDEX IF NOT EXISTS idx_purchasecurve_laboratory
ON purchasecurveproducts(laboratoryname);

CREATE INDEX IF NOT EXISTS idx_purchasecurve_effectivecurve
ON purchasecurveproducts(effectivecurve);
*/