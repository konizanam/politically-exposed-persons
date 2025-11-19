-- Disable foreign key checks temporarily (PostgreSQL doesn't support this globally, so we use CASCADE)
-- First, delete all child records that reference PIPs

-- Delete all notifications related to PIPs
DELETE FROM notifications WHERE pip_id IS NOT NULL;

-- Delete all foreign PIP records
DELETE FROM foreign_pips;

-- Delete all PIP associates
DELETE FROM pip_associates;

-- Delete all PIP institutions
DELETE FROM pip_institutions;

-- Now delete all PIP records
DELETE FROM pips;

-- Reset all the sequences to start from 1
ALTER SEQUENCE pips_id_seq RESTART WITH 1;
ALTER SEQUENCE pip_institutions_id_seq RESTART WITH 1;
ALTER SEQUENCE pip_associates_id_seq RESTART WITH 1;
ALTER SEQUENCE foreign_pips_id_seq RESTART WITH 1;

-- If you also want to reset the notifications sequence (optional)
-- ALTER SEQUENCE notifications_id_seq RESTART WITH 1;

-- Verify the deletion
SELECT 'PIPs table count: ' || COUNT(*) FROM pips
UNION ALL
SELECT 'PIP institutions count: ' || COUNT(*) FROM pip_institutions
UNION ALL
SELECT 'PIP associates count: ' || COUNT(*) FROM pip_associates
UNION ALL
SELECT 'Foreign PIPs count: ' || COUNT(*) FROM foreign_pips;