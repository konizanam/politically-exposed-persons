-- Fix all sequences
SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM permissions));
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('organisations_id_seq', (SELECT MAX(id) FROM organisations));
SELECT setval('packages_id_seq', (SELECT MAX(id) FROM packages));
SELECT setval('pips_id_seq', (SELECT MAX(id) FROM pips));
SELECT setval('pip_institutions_id_seq', (SELECT MAX(id) FROM pip_institutions));
SELECT setval('pip_associates_id_seq', (SELECT MAX(id) FROM pip_associates));
SELECT setval('audit_trail_id_seq', (SELECT MAX(id) FROM audit_trail));