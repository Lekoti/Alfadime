CREATE INDEX IF NOT EXISTS idx_product_corrections_status_updated
ON product_corrections (status, updated_at);
