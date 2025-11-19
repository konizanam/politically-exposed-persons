-- Migration to add is_active column to pips table
ALTER TABLE pips ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index on is_active for better query performance
CREATE INDEX IF NOT EXISTS idx_pips_is_active ON pips(is_active);

-- Update any existing rows to have is_active = true (just to be safe)
UPDATE pips SET is_active = TRUE WHERE is_active IS NULL;

-- Add audit tracking for deactivations
COMMENT ON COLUMN pips.is_active IS 'Determines if a PIP is active or deactivated';
