CREATE TABLE IF NOT EXISTS industry_contacts (
    id TEXT PRIMARY KEY,

    laboratory_name TEXT NOT NULL,
    laboratory_key TEXT NOT NULL UNIQUE,

    contact_name TEXT,
    phone TEXT,
    email TEXT,
    service_region TEXT,
    notes TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_industry_contacts_laboratory_name
    ON industry_contacts(laboratory_name);

CREATE INDEX IF NOT EXISTS idx_industry_contacts_laboratory_key
    ON industry_contacts(laboratory_key);

CREATE INDEX IF NOT EXISTS idx_industry_contacts_email
    ON industry_contacts(email);

CREATE INDEX IF NOT EXISTS idx_industry_contacts_service_region
    ON industry_contacts(service_region);