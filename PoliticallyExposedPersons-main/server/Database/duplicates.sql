Select * from pips where first_name = 'Licky' and last_name = 'Erastus';

SELECT 
    first_name,
    middle_name,
    last_name,
    COUNT(*) as duplicate_count,
    STRING_AGG(CAST(id AS VARCHAR), ', ') as record_ids
FROM 
    pips
GROUP BY 
    first_name,
    middle_name,
    last_name
HAVING 
    COUNT(*) > 1
ORDER BY 
    duplicate_count DESC,
    first_name,
    last_name;


	-- Delete duplicate PIPs, prioritizing removal of those with 'member' or 'board' positions
DELETE FROM pips
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            p.id,
            ROW_NUMBER() OVER (
                PARTITION BY p.first_name, p.middle_name, p.last_name 
                ORDER BY 
                    -- Prioritize deletion: records with member/board positions get higher row numbers
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 
                            FROM pip_institutions pi 
                            WHERE pi.pip_id = p.id 
                            AND (
                                LOWER(pi.position) LIKE '%member%' 
                                OR LOWER(pi.position) LIKE '%board%'
                            )
                        ) THEN 1 
                        ELSE 0 
                    END DESC,
                    -- Then order by ID (keep older records)
                    p.id ASC
            ) as row_num
        FROM pips p
    ) t
    WHERE t.row_num > 1
);