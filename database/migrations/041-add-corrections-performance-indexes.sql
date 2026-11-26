-- Migration 041: indices de performance para correcoes de produtos

CREATE INDEX IF NOT EXISTS idx_product_corrections_status_updated_at
    ON product_corrections(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_product_corrections_status_branch
    ON product_corrections(status, branch);

CREATE INDEX IF NOT EXISTS idx_product_corrections_product_field_status
    ON product_corrections(product_id, field_name, status);

CREATE INDEX IF NOT EXISTS idx_product_change_history_correction_id
    ON product_change_history(correction_id);