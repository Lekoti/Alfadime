DROP TABLE IF EXISTS industry_contacts;

CREATE TABLE industry_contacts (
    id TEXT PRIMARY KEY,

    laboratory_name TEXT NOT NULL,
    laboratory_key TEXT NOT NULL,

    branch TEXT NOT NULL DEFAULT '',
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    service_region TEXT,
    notes TEXT,
    cargo TEXT,

    spreadsheet_row INTEGER,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    UNIQUE(laboratory_key, branch)
);

CREATE INDEX idx_industry_contacts_laboratory_name
    ON industry_contacts(laboratory_name);

CREATE INDEX idx_industry_contacts_laboratory_key
    ON industry_contacts(laboratory_key);

CREATE INDEX idx_industry_contacts_branch
    ON industry_contacts(branch);

CREATE INDEX idx_industry_contacts_email
    ON industry_contacts(email);

CREATE INDEX idx_industry_contacts_service_region
    ON industry_contacts(service_region);

CREATE INDEX idx_industry_contacts_cargo
    ON industry_contacts(cargo);