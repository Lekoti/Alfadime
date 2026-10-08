ALTER TABLE price_pending_rows
ADD COLUMN observation TEXT NOT NULL DEFAULT '';

ALTER TABLE price_pending_rows
ADD COLUMN manual_cells TEXT NOT NULL DEFAULT '{}';

ALTER TABLE price_pending_rows
ADD COLUMN pending_external_updates TEXT NOT NULL DEFAULT '{}';

ALTER TABLE price_pending_rows
ADD COLUMN external_updated_at TEXT NOT NULL DEFAULT '';