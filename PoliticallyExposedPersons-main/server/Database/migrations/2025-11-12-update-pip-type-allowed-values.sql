-- Migration: Update allowed pip_type values and enforce constraint
-- Date: 2025-11-12

BEGIN;

-- 1) Map legacy values to new allowed set
-- Local -> Domestic PIP, Foreign -> Foreign PIP
UPDATE pips SET pip_type = 'Domestic PIP' WHERE pip_type IS NULL OR pip_type ILIKE 'local%';
UPDATE pips SET pip_type = 'Foreign PIP' WHERE pip_type ILIKE 'foreign%';
-- Leave any already-correct values as-is, e.g. 'International Organization PIP'

-- 2) Drop existing constraint if present, then add new CHECK constraint
ALTER TABLE pips DROP CONSTRAINT IF EXISTS chk_pips_pip_type_allowed;
ALTER TABLE pips ADD CONSTRAINT chk_pips_pip_type_allowed
  CHECK (pip_type IN ('Domestic PIP', 'Foreign PIP', 'International Organisation PIP'));

COMMIT;
