const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logAuditTrail = require('../utils/logAuditTrail');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const xlsx = require('xlsx');

const upload = multer({ dest: 'uploads/' });

// Normalize pip_type to allowed values
function normalizePipType(input) {
  const val = (input || '').toString().trim().toLowerCase();
  if (!val) return 'Domestic PIP';
  if (['local', 'domestic', 'domestic pip', 'domestic_pip'].includes(val)) return 'Domestic PIP';
  if (['foreign', 'foreign pip', 'foreign_pip'].includes(val)) return 'Foreign PIP';
  if ([
    'international organization pip',
    'international organization',
    'international_organization_pip',
    'international_org',
    'international organisation pip',
    'international organisation'
  ].includes(val)) return 'International Organisation PIP';
  // Fallback to Domestic if unrecognized
  return 'Domestic PIP';
}


// Fetch PIPs
router.get('/pipsfetch', async (req, res) => {
  const user = req.user || {};
  const query = (req.query.query || '').toLowerCase();
  const filter = req.query.filter || 'all';

  const fetchPipsWithDetails = async (ids) => {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

    // Check user privileges for filtering inactive PIPs
    const isPrivilegedUser = user.is_system_admin || 
      (user.permissions && user.permissions.includes('data_capturer')) ||
      (user.roles && user.roles.some(r => r.toLowerCase().includes('data capturer') || r.toLowerCase() === 'admin'));

    // Add WHERE condition to filter inactive PIPs for non-privileged users
    const pipsResult = await pool.query(`
      SELECT p.*, 
        fp.country AS foreign_country, 
        fp.additional_notes,
        CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name
      FROM pips p
      LEFT JOIN foreign_pips fp ON p.id = fp.pip_id
      WHERE p.id IN (${placeholders})
      ${!isPrivilegedUser ? 'AND (p.is_active IS NULL OR p.is_active = TRUE)' : ''}
      ORDER BY p.id
    `, ids);

    const pipIds = pipsResult.rows.map(r => r.id);

    const [associatesResult, institutionsResult] = await Promise.all([
      pool.query(`SELECT * FROM pip_associates WHERE pip_id IN (${placeholders})`, ids),
      pool.query(`SELECT * FROM pip_institutions WHERE pip_id IN (${placeholders})`, ids)
    ]);

    const associatesByPip = {};
    associatesResult.rows.forEach(a => {
      if (!associatesByPip[a.pip_id]) associatesByPip[a.pip_id] = [];
      associatesByPip[a.pip_id].push(a);
    });

    const institutionsByPip = {};
    institutionsResult.rows.forEach(inst => {
      if (!institutionsByPip[inst.pip_id]) institutionsByPip[inst.pip_id] = [];
      institutionsByPip[inst.pip_id].push(inst);
    });

    return pipsResult.rows.map(pip => {
      // Get all positions for this PIP from institutions
      const positions = (institutionsByPip[pip.id] || [])
        .map(inst => inst.position)
        .filter(Boolean);

      return {
        ...pip,
        associates: associatesByPip[pip.id] || [],
        institutions: institutionsByPip[pip.id] || [],
        position: positions.join(', '), // <-- Add this line
        country: pip.is_foreign ? (pip.foreign_country || 'Unknown') : 'Namibia',
        foreign: pip.is_foreign ? {
          country: pip.foreign_country,
          additional_notes: pip.additional_notes
        } : null
      };
    });
  };

  try {
    // Get search limit info FIRST (before checking limits)
    let searchLimitInfo = null;
    if (user.organisation_id) {
      const orgInfoRes = await pool.query(`
        SELECT o.package_id, p.name AS package_name, p.onboarding_screening_limit, p.batch_screening_limit
        FROM organisations o
        LEFT JOIN packages p ON o.package_id = p.id
        WHERE o.id = $1
      `, [user.organisation_id]);
      
      const orgInfo = orgInfoRes.rows[0];
      
      if (orgInfo) {
        // Regular screenings (exclude bulk searches)
        const screeningsDoneRes = await pool.query(
          'SELECT COUNT(*) FROM pip_search_logs WHERE organisation_id = $1 AND (is_bulk_search = false OR is_bulk_search IS NULL)', 
          [user.organisation_id]
        );
        const screeningsDone = parseInt(screeningsDoneRes.rows[0].count, 10);
        
        // Batch screenings - COUNT PROPERLY
        const batchScreeningsDoneRes = await pool.query(
          `SELECT COUNT(DISTINCT bs.id) as count
           FROM batch_screenings bs 
           JOIN users u ON bs.user_id = u.id 
           WHERE u.organisation_id = $1`, 
          [user.organisation_id]
        );
        const batchScreeningsDone = parseInt(batchScreeningsDoneRes.rows[0].count, 10);
        
        searchLimitInfo = {
          package: orgInfo.package_name || 'Free',
          screeningLimit: orgInfo.onboarding_screening_limit,
          screeningsDone: screeningsDone,
          screeningsLeft: orgInfo.onboarding_screening_limit ? 
            Math.max(0, orgInfo.onboarding_screening_limit - screeningsDone) : 
            'Unlimited',
          batchScreeningLimit: orgInfo.batch_screening_limit,
          batchScreeningsDone: batchScreeningsDone,
          batchScreeningsLeft: orgInfo.batch_screening_limit ? 
            Math.max(0, orgInfo.batch_screening_limit - batchScreeningsDone) : 
            'Unlimited'
        };
      }
    }

    // Check search limit if a query is provided
    if (query && user.organisation_id && searchLimitInfo) {
      if (searchLimitInfo.screeningLimit !== null && searchLimitInfo.screeningsLeft === 0) {
        return res.status(403).json({ 
          error: 'Search limit reached', 
          message: 'Your organisation has reached the maximum number of searches allowed by your package. Please contact your administrator to upgrade your package.',
          limit: searchLimitInfo.screeningLimit,
          used: searchLimitInfo.screeningsDone,
          searchLimitInfo: searchLimitInfo
        });
      }
    }
    
    if (!query) {
      const allPips = await pool.query('SELECT id FROM pips ORDER BY id');
      const allIds = allPips.rows.map(r => r.id);
      const data = await fetchPipsWithDetails(allIds);

      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Search',
        module_name: 'PIPs',
        target: `Query="${query}"`,
        result_summary: `${allIds.length} matches`,
        metadata: { query }
      });

      return res.json({ data: data, searchLimitInfo: searchLimitInfo });
    }

    const term = `%${query}%`;

      // Enhanced: match if any word in query matches any part of the name (out-of-order, partial)
      const queryWords = query.split(/\s+/).filter(Boolean);
      const likeClauses = queryWords.map((w, i) => `LOWER(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)) LIKE $${i + 1}`).join(' OR ');
      const likeParams = queryWords.map(w => `%${w}%`);
      const nationalIdClauses = queryWords.map((w, i) => `p.national_id ILIKE $${i + 1 + queryWords.length}`).join(' OR ');
      const nationalIdParams = queryWords.map(w => `%${w}%`);

      let direct = [];
      let associate = [];

      // Check user privileges for filtering inactive PIPs
      const isPrivilegedUser = user.is_system_admin || 
        (user.permissions && user.permissions.includes('data_capturer')) ||
        (user.roles && user.roles.some(r => r.toLowerCase().includes('data capturer') || r.toLowerCase() === 'admin'));
        
      if (filter === 'all' || filter === 'pip' || filter === 'local' || filter === 'foreign') {
        let directQuery = `
          SELECT p.id FROM pips p
          LEFT JOIN foreign_pips fp ON p.id = fp.pip_id
          WHERE (${likeClauses}${nationalIdClauses ? ' OR ' + nationalIdClauses : ''})
        `;
        if (filter === 'local') {
          directQuery += ` AND fp.pip_id IS NULL`;
        } else if (filter === 'foreign') {
          directQuery += ` AND fp.pip_id IS NOT NULL`;
        }
        
        // Add filter for active PIPs for non-privileged users
        if (!isPrivilegedUser) {
          directQuery += ` AND (p.is_active IS NULL OR p.is_active = TRUE)`;
        }
        
        direct = await pool.query(directQuery, [...likeParams, ...nationalIdParams]);
      }

      if (filter === 'all' || filter === 'associate') {
        const assocLikeClauses = queryWords.map((w, i) => `LOWER(CONCAT_WS(' ', first_name, middle_name, last_name)) LIKE $${i + 1}`).join(' OR ');
        const assocLikeParams = queryWords.map(w => `%${w}%`);
        const assocIdClauses = queryWords.map((w, i) => `national_id ILIKE $${i + 1 + queryWords.length}`).join(' OR ');
        const assocIdParams = queryWords.map(w => `%${w}%`);
        let associateQuery = `
          SELECT DISTINCT pip_id AS id FROM pip_associates
          WHERE (${assocLikeClauses}${assocIdClauses ? ' OR ' + assocIdClauses : ''})
        `;
        associate = await pool.query(associateQuery, [...assocLikeParams, ...assocIdParams]);
      }

    // Merge IDs without duplication
    const matchedIds = Array.from(new Set([
      ...direct.rows.map(r => r.id),
      ...associate.rows.map(r => r.id)
    ]));

    const data = await fetchPipsWithDetails(matchedIds);

    await logAuditTrail({
      req,
      user_id: user.id,
      action_type: 'Search',
      module_name: 'PIPs',
      target: `Query="${query}"`,
      result_summary: `${data.length} direct matches`,
      metadata: { query }
    });

    // Log the search in pip_search_logs (exclude bulk searches)
    try {
      await pool.query(
        `INSERT INTO pip_search_logs (user_id, organisation_id, search_query, search_result, is_bulk_search)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, user.organisation_id || null, query, JSON.stringify(data), false]
      );
    } catch (logErr) {
      console.error('Failed to log PIP search:', logErr);
    }
    
    // Return data with searchLimitInfo
    res.json({ data: data, searchLimitInfo: searchLimitInfo });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Server error fetching PIPs' });
  }
});

// PIP Search Dashboard
router.get('/searchdashboard', async (req, res) => {
  try {
    const user = req.user || {};
    const isAdmin = user.is_system_admin;
    const orgId = isAdmin ? (req.query.orgId || null) : user.organisation_id;

  // For admin, get all organisations for filter dropdown
    let allOrgs = [];
    if (isAdmin) {
      const orgsRes = await pool.query(
        `SELECT o.id, o.name, p.onboarding_screening_limit
         FROM organisations o
         LEFT JOIN packages p ON o.package_id = p.id
         ORDER BY o.name`
      );
      allOrgs = orgsRes.rows;
    }

    // Get org and package info for selected org
    let org = null;
    if (orgId) {
      const orgRes = await pool.query(
        `SELECT o.id, o.name, o.package_id, p.onboarding_screening_limit
         FROM organisations o
         LEFT JOIN packages p ON o.package_id = p.id
         WHERE o.id = $1`,
        [orgId]
      );
      org = orgRes.rows[0];
    }

    // Get total searches made
    let totalSearches = 0;
    if (orgId) {
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM pip_search_logs WHERE organisation_id = $1`,
        [orgId]
      );
      totalSearches = parseInt(countRes.rows[0].count, 10);
    }

    // Get search history (exclude bulk searches)
    let logs = [];
    if (orgId) {
      const logsRes = await pool.query(
        `SELECT l.*, u.email AS user_email, o.name AS organisation_name
         FROM pip_search_logs l
         LEFT JOIN users u ON l.user_id = u.id
         LEFT JOIN organisations o ON l.organisation_id = o.id
         WHERE l.organisation_id = $1
           AND (l.is_bulk_search = false OR l.is_bulk_search IS NULL)
         ORDER BY l.searched_at DESC`,
        [orgId]
      );
      logs = logsRes.rows;
    } else if (isAdmin) {
      // If admin and no orgId, show all logs (exclude bulk searches)
      const logsRes = await pool.query(
        `SELECT l.*, u.email AS user_email, o.name AS organisation_name
         FROM pip_search_logs l
         LEFT JOIN users u ON l.user_id = u.id
         LEFT JOIN organisations o ON l.organisation_id = o.id
         WHERE (l.is_bulk_search = false OR l.is_bulk_search IS NULL)
         ORDER BY l.searched_at DESC`
      );
      logs = logsRes.rows;
    }

    res.json({
      is_admin: isAdmin,
      all_organisations: allOrgs,
      selected_org: org,
      onboarding_limit: org?.onboarding_screening_limit,
      total_searches: totalSearches,
      searches_left: org?.onboarding_screening_limit == null
        ? 'Unlimited'
        : Math.max(0, (org?.onboarding_screening_limit || 0) - totalSearches),
      logs
    });
  } catch (err) {
    console.error('Error fetching PIP search dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});


// Create PIP (enforce onboarding screening limit)
router.post('/create', async (req, res) => {
  const client = await pool.connect();
  const user = req.user || {};

  try {
    // Enforce onboarding screening limit
    let orgId = user.organisation_id;
    if (orgId) {
      const orgResult = await client.query('SELECT package_id FROM organisations WHERE id = $1', [orgId]);
      if (orgResult.rows.length > 0) {
        const packageId = orgResult.rows[0].package_id;
        if (packageId) {
          const pkgResult = await client.query('SELECT onboarding_screening_limit FROM packages WHERE id = $1', [packageId]);
          if (pkgResult.rows.length > 0 && pkgResult.rows[0].onboarding_screening_limit !== null) {
            const onboardingLimit = pkgResult.rows[0].onboarding_screening_limit;
            const pipCountResult = await client.query('SELECT COUNT(*) FROM pips WHERE id IN (SELECT p.id FROM pips p JOIN users u ON u.organisation_id = $1)', [orgId]);
            const pipCount = parseInt(pipCountResult.rows[0].count, 10);
            if (pipCount >= onboardingLimit) {
              return res.status(400).json({ error: `Onboarding screening limit (${onboardingLimit}) reached for this organisation.` });
            }
          }
        }
      }
    }

    const {
      first_name, middle_name, last_name, national_id, pip_type,
      reason, is_foreign, associates, institutions, foreign
    } = req.body;

    const normalizedType = normalizePipType(pip_type);

    await client.query('BEGIN');

    const pipRes = await client.query(
      `INSERT INTO pips (first_name, middle_name, last_name, national_id, pip_type, reason, is_foreign)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [first_name, middle_name, last_name, national_id, normalizedType, reason, is_foreign]
    );

    const pipId = pipRes.rows[0].id;

    if (Array.isArray(associates)) {
      for (const a of associates) {
        await client.query(
          `INSERT INTO pip_associates (pip_id, first_name, middle_name, last_name, relationship_type, national_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pipId, a.first_name, a.middle_name || null, a.last_name, a.relationship_type || null, a.national_id || null]
        );
      }
    }

    if (Array.isArray(institutions)) {
      for (const inst of institutions) {
        await client.query(
          `INSERT INTO pip_institutions (pip_id, institution_name, institution_type, position, start_date, end_date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pipId, inst.institution_name, inst.institution_type || null, inst.position || null, 
           inst.start_date || null, inst.end_date || null]
        );
      }
    }

    if (is_foreign && foreign?.country) {
      await client.query(
        `INSERT INTO foreign_pips (pip_id, country, additional_notes)
         VALUES ($1, $2, $3)`,
        [pipId, foreign.country, foreign.additional_notes || null]
      );
    }

    await client.query('COMMIT');

    await logAuditTrail({
      req,
      user_id: user.id,
      action_type: 'Create',
      module_name: 'PIPs',
      target: `${first_name} ${last_name}`,
      result_summary: 'PIP created successfully',
      metadata: req.body
    });

    res.status(201).json({ message: 'PIP created successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create error:', err);
    await logAuditTrail({
      req,
      user_id: user.id,
      action_type: 'Create',
      module_name: 'PIPs',
      target: `${req.body?.first_name || ''} ${req.body?.last_name || ''}`,
      result_summary: err.message,
      status: 'error',
      metadata: req.body
    });
    res.status(500).json({ error: 'Server error while creating PIP' });
  } finally {
    client.release();
  }
});

// Update PIP
router.put('/update/:id', async (req, res) => {
  const client = await pool.connect();
  const user = req.user || {};
  const pipId = req.params.id;

  try {
    await client.query('BEGIN');

    // Check if PIP exists
    const pipCheck = await client.query('SELECT * FROM pips WHERE id = $1', [pipId]);
    if (pipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'PIP not found' });
    }

    const updateData = req.body;

  // Update personal information if provided
  if (updateData.first_name !== undefined || updateData.last_name !== undefined || 
    updateData.middle_name !== undefined || updateData.national_id !== undefined || 
    updateData.reason !== undefined || updateData.pip_type !== undefined) {
      
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (updateData.first_name !== undefined) {
        updateFields.push(`first_name = $${paramIndex++}`);
        values.push(updateData.first_name);
      }
      if (updateData.middle_name !== undefined) {
        updateFields.push(`middle_name = $${paramIndex++}`);
        values.push(updateData.middle_name);
      }
      if (updateData.last_name !== undefined) {
        updateFields.push(`last_name = $${paramIndex++}`);
        values.push(updateData.last_name);
      }
      if (updateData.national_id !== undefined) {
        updateFields.push(`national_id = $${paramIndex++}`);
        values.push(updateData.national_id);
      }
      if (updateData.pip_type !== undefined) {
        updateFields.push(`pip_type = $${paramIndex++}`);
        values.push(normalizePipType(updateData.pip_type));
      }
      if (updateData.reason !== undefined) {
        updateFields.push(`reason = $${paramIndex++}`);
        values.push(updateData.reason);
      }

      if (updateFields.length > 0) {
        values.push(pipId);
        await client.query(
          `UPDATE pips SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }
    }

    // Update foreign details if provided
    if (updateData.foreign !== undefined) {
      // Check if foreign_pips record exists
      const foreignCheck = await client.query('SELECT * FROM foreign_pips WHERE pip_id = $1', [pipId]);
      
      if (foreignCheck.rows.length > 0) {
        // Update existing record
        await client.query(
          'UPDATE foreign_pips SET country = $1, additional_notes = $2 WHERE pip_id = $3',
          [updateData.foreign.country, updateData.foreign.additional_notes, pipId]
        );
      } else if (updateData.foreign.country) {
        // Insert new record
        await client.query(
          'INSERT INTO foreign_pips (pip_id, country, additional_notes) VALUES ($1, $2, $3)',
          [pipId, updateData.foreign.country, updateData.foreign.additional_notes]
        );
      }
    }

    // Update institutions if provided
    if (updateData.institutions !== undefined && Array.isArray(updateData.institutions)) {
      // Delete existing institutions
      await client.query('DELETE FROM pip_institutions WHERE pip_id = $1', [pipId]);
      
      // Insert new institutions
      for (const inst of updateData.institutions) {
        if (inst.institution_name?.trim()) {
          await client.query(
            `INSERT INTO pip_institutions (pip_id, institution_name, institution_type, position, start_date, end_date)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [pipId, inst.institution_name, inst.institution_type || null, inst.position || null, 
             inst.start_date || null, inst.end_date || null]
          );
        }
      }
    }

    // Update associates if provided
    if (updateData.associates !== undefined && Array.isArray(updateData.associates)) {
      // Delete existing associates
      await client.query('DELETE FROM pip_associates WHERE pip_id = $1', [pipId]);
      
      // Insert new associates
      for (const assoc of updateData.associates) {
        if (assoc.first_name?.trim() || assoc.last_name?.trim() || assoc.national_id?.trim()) {
          await client.query(
            `INSERT INTO pip_associates (pip_id, first_name, middle_name, last_name, relationship_type, national_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [pipId, assoc.first_name || null, assoc.middle_name || null, assoc.last_name || null,
             assoc.relationship_type || null, assoc.national_id || null]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Log the update action
    await logAuditTrail({
      req,
      user_id: user.id,
      action_type: 'Update',
      module_name: 'PIPs',
      target: `PIP ID: ${pipId}`,
      result_summary: 'PIP updated successfully',
      metadata: updateData
    });

    res.json({ success: true, message: 'PIP updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update error:', err);
    
    await logAuditTrail({
      req,
      user_id: user.id,
      action_type: 'Update',
      module_name: 'PIPs',
      target: `PIP ID: ${pipId}`,
      result_summary: err.message,
      status: 'error',
      metadata: updateData
    });
    
    res.status(500).json({ error: 'Server error while updating PIP' });
  } finally {
    client.release();
  }
});

// Import route - fixed version without SSE
router.post('/import', upload.single('file'), async (req, res) => {
  const results = [];
  const successCount = { count: 0 };
  const failedRows = [];
  const user = req.user || {};

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      const client = await pool.connect();
      const totalRecords = results.length;

      try {
        await client.query('BEGIN');

        for (let rowIndex = 0; rowIndex < results.length; rowIndex++) {
          const row = results[rowIndex];
          
          try {
            // Validate required fields
            if (!row.first_name || !row.last_name || !row.reason) {
              throw new Error('Missing required fields: first_name, last_name, or reason');
            }

            // Insert PIP
            const pipResult = await client.query(
              'INSERT INTO pips (first_name, middle_name, last_name, national_id, pip_type, reason, is_foreign, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id',
              [
                row.first_name.trim(),
                row.middle_name ? row.middle_name.trim() : null,
                row.last_name.trim(),
                row.national_id ? row.national_id.trim() : null,
                normalizePipType(row.pip_type || 'Domestic PIP'),
                row.reason.trim(),
                row.is_foreign === 'TRUE' || row.is_foreign === 'true' || row.is_foreign === true
              ]
            );

            const pipId = pipResult.rows[0].id;

            // Insert institutions
            for (let i = 1; i <= 5; i++) {
              if (row[`institution_${i}_name`]) {
                await client.query(
                  'INSERT INTO pip_institutions (pip_id, institution_name, institution_type, position, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6)',
                  [
                    pipId,
                    row[`institution_${i}_name`].trim(),
                    row[`institution_${i}_type`] || null,
                    row[`institution_${i}_position`] || null,
                    row[`institution_${i}_start`] || null,
                    row[`institution_${i}_end`] || null
                  ]
                );
              }
            }

            // Insert associates
            for (let i = 1; i <= 5; i++) {
              if (row[`associate_${i}_first`] && row[`associate_${i}_last`]) {
                await client.query(
                  'INSERT INTO pip_associates (pip_id, first_name, middle_name, last_name, relationship_type, national_id) VALUES ($1, $2, $3, $4, $5, $6)',
                  [
                    pipId,
                    row[`associate_${i}_first`].trim(),
                    row[`associate_${i}_middle`] || null,
                    row[`associate_${i}_last`].trim(),
                    row[`associate_${i}_relationship`] || null,
                    row[`associate_${i}_national_id`] || null
                  ]
                );
              }
            }

            // Handle foreign PIPs
            if (row.is_foreign === 'TRUE' || row.is_foreign === 'true' || row.is_foreign === true) {
              await client.query(
                'INSERT INTO foreign_pips (pip_id, country, additional_notes) VALUES ($1, $2, $3)',
                [pipId, row.country || null, row.additional_notes || null]
              );
            }

            successCount.count++;
          } catch (err) {
            await client.query('ROLLBACK');
            await client.query('BEGIN');
            
            failedRows.push({
              row: rowIndex + 2, // +2 because Excel rows start at 1 and we skip header
              pip_reference: `${row.first_name || ''} ${row.last_name || ''} (${row.national_id || 'No ID'})`,
              reason: err.message
            });
          }
        }

        await client.query('COMMIT');

        // If there are failures, stream a CSV download instead of saving a file
        if (failedRows.length > 0) {
          const errorCsvContent = [
            ['Row', 'PIP Reference', 'Error Reason'],
            ...failedRows.map(f => [f.row, f.pip_reference, f.reason])
          ].map(row => row.join(',')).join('\n');

          const nowTs = Date.now();
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="import_errors_${nowTs}.csv"`);
          // Provide summary via headers for client UIs to show counts
          res.setHeader('X-Import-Total', String(totalRecords));
          res.setHeader('X-Import-Success', String(successCount.count));
          res.setHeader('X-Import-Failed', String(failedRows.length));
          res.setHeader('X-Import-Message', `Import completed: ${successCount.count} successful, ${failedRows.length} failed`);

          // Log audit trail before sending
          if (user.id) {
            await logAuditTrail({
              req,
              user_id: user.id,
              action_type: 'Bulk Import',
              module_name: 'Data Capturer',
              target: 'PIPs Import',
              result_summary: `Imported: ${successCount.count} successful, ${failedRows.length} failed`,
              status: 'success'
            });
          }

          return res.status(200).send(errorCsvContent);
        }

        // Log audit trail
        if (user.id) {
          await logAuditTrail({
            req,
            user_id: user.id,
            action_type: 'Bulk Import',
            module_name: 'Data Capturer',
            target: 'PIPs Import',
            result_summary: `Imported: ${successCount.count} successful, ${failedRows.length} failed`,
            status: 'success'
          });
        }

        res.json({
          success: true,
          message: `Import completed: ${successCount.count} successful, ${failedRows.length} failed`,
          total_processed: totalRecords,
          success_count: successCount.count,
          failed_count: failedRows.length,
          errors: failedRows
        });

      } catch (outerErr) {
        await client.query('ROLLBACK');
        console.error('Import error:', outerErr);
        res.status(500).json({ error: outerErr.message });
      } finally {
        client.release();
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      res.status(400).json({ error: 'Failed to parse CSV file' });
    });
});

// Bulk search
router.post('/bulk-search', upload.single('file'), async (req, res) => {
  const user = req.user || {};
  const filePath = req.file.path;
  const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

  let rows = [];
  try {
    // Parse file based on type
    if (fileExtension === 'csv') {
      rows = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', (err) => reject(err));
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      return res.status(400).json({ error: 'Invalid file format. Only CSV or Excel files are allowed.' });
    }

    // Validate columns (make middle_name optional; national_id optional as well)
    const requiredColumns = ['first_name', 'last_name'];
    const firstRow = rows[0] || {};
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: `Invalid file structure. Missing required columns: ${missingColumns.join(', ')}. Required columns are: first_name, last_name` 
      });
    }

    // Check BATCH screening limits BEFORE processing
    if (user.organisation_id) {
      const orgRes = await pool.query(`
        SELECT o.id, o.name, o.package_id, p.name AS package_name, p.batch_screening_limit
        FROM organisations o
        LEFT JOIN packages p ON o.package_id = p.id
        WHERE o.id = $1
      `, [user.organisation_id]);
      
      const org = orgRes.rows[0];
      
      if (org && org.batch_screening_limit !== null) {
        // Count batch screenings done
        const batchScreeningsDoneRes = await pool.query(
          `SELECT COUNT(DISTINCT bs.id) as count
           FROM batch_screenings bs 
           JOIN users u ON bs.user_id = u.id 
           WHERE u.organisation_id = $1`, 
          [user.organisation_id]
        );
        const batchScreeningsDone = parseInt(batchScreeningsDoneRes.rows[0].count, 10);
        const remainingBatchScreenings = org.batch_screening_limit - batchScreeningsDone;
        
        // Check if we have enough remaining screenings for all rows
        if (remainingBatchScreenings < rows.length) {
          return res.status(403).json({ 
            error: 'Insufficient batch screening limit', 
            message: `Your organisation needs ${rows.length} batch screenings but only has ${remainingBatchScreenings} remaining. Please contact your administrator to upgrade your package.`,
            limit: org.batch_screening_limit,
            used: batchScreeningsDone,
            remaining: remainingBatchScreenings,
            required: rows.length
          });
        }
      }
    }

    // Collect all unique PIPs from bulk search and track unmatched keywords (word-level)
    const allPipIds = new Set();
    const unmatchedKeywordsSet = new Set();
    const bulkSearchTerm = `Bulk search: ${rows.length} records`;

    // Pre-fetch all PIP and associate names and national_ids for fast word-level matching
    const pipNamesRes = await pool.query(`SELECT LOWER(first_name) AS first_name, LOWER(middle_name) AS middle_name, LOWER(last_name) AS last_name, LOWER(national_id) AS national_id FROM pips`);
    const associateNamesRes = await pool.query(`SELECT LOWER(first_name) AS first_name, LOWER(middle_name) AS middle_name, LOWER(last_name) AS last_name, LOWER(national_id) AS national_id FROM pip_associates`);
    const allNames = [];
    pipNamesRes.rows.forEach(r => {
      if (r.first_name) allNames.push(r.first_name);
      if (r.middle_name) allNames.push(r.middle_name);
      if (r.last_name) allNames.push(r.last_name);
      if (r.national_id) allNames.push(r.national_id);
    });
    associateNamesRes.rows.forEach(r => {
      if (r.first_name) allNames.push(r.first_name);
      if (r.middle_name) allNames.push(r.middle_name);
      if (r.last_name) allNames.push(r.last_name);
      if (r.national_id) allNames.push(r.national_id);
    });

    // Process each row and search for PIPs
    for (const row of rows) {
      const { first_name, middle_name, last_name, national_id } = row;
      // Build search query
      const searchTerms = [];
      if (first_name) searchTerms.push(first_name);
      if (middle_name) searchTerms.push(middle_name);
      if (last_name) searchTerms.push(last_name);
      const fullNameSearch = searchTerms.join(' ').toLowerCase();

      // Search for direct PIPs matches
      const pipQuery = `
        SELECT DISTINCT p.id
        FROM pips p
        WHERE (
          ($1 <> '' AND (LOWER(p.first_name) LIKE $1 OR LOWER(p.middle_name) LIKE $1 OR LOWER(p.last_name) LIKE $1))
          OR ($2 <> '' AND (LOWER(p.first_name) LIKE $2 OR LOWER(p.middle_name) LIKE $2 OR LOWER(p.last_name) LIKE $2))
          OR ($3 <> '' AND (LOWER(p.first_name) LIKE $3 OR LOWER(p.middle_name) LIKE $3 OR LOWER(p.last_name) LIKE $3))
          OR ($4 <> '' AND p.national_id ILIKE $4)
        )
      `;
      const pipResults = await pool.query(
        pipQuery,
        [
          first_name ? `%${first_name.toLowerCase()}%` : '',
          middle_name ? `%${middle_name.toLowerCase()}%` : '',
          last_name ? `%${last_name.toLowerCase()}%` : '',
          national_id ? `%${national_id}%` : ''
        ]
      );

      // Search for associates
      const associateQuery = `
        SELECT DISTINCT p.id
        FROM pip_associates a
        JOIN pips p ON a.pip_id = p.id
        WHERE (
          LOWER(CONCAT_WS(' ', a.first_name, a.middle_name, a.last_name)) LIKE $1
          OR a.national_id = $2
          OR (a.first_name ILIKE $3 AND a.last_name ILIKE $4)
        )
      `;

      const associateResults = await pool.query(
        associateQuery, 
        [`%${fullNameSearch}%`, national_id || '', first_name || '', last_name || '']
      );

      // Add to set
      pipResults.rows.forEach(r => allPipIds.add(r.id));
      associateResults.rows.forEach(r => allPipIds.add(r.id));

      // Word-level unmatched logic
      const wordsToCheck = [first_name, middle_name, last_name, national_id]
        .map(x => (x || '').trim())
        .filter(Boolean)
        .flatMap(x => x.split(/\s+/));
      for (const word of wordsToCheck) {
        const wordLower = word.toLowerCase();
        if (wordLower && !allNames.includes(wordLower)) {
          unmatchedKeywordsSet.add(word);
        }
      }
    }

    // CREATE BATCH SCREENING RECORDS FOR EACH ROW
    // Use a transaction to ensure all records are created together
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create one batch screening record for each row in the file
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const description = `Bulk search row ${i + 1}: ${row.first_name || ''} ${row.middle_name || ''} ${row.last_name || ''} (${row.national_id || 'No ID'})`;
        
        await client.query(
          'INSERT INTO batch_screenings (user_id, description, screened_at) VALUES ($1, $2, NOW())',
          [user.id, description]
        );
      }
      
      await client.query('COMMIT');
      console.log(`Created ${rows.length} batch screening records for user ${user.id}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Now fetch all PIPs with their associates
    let pipsData = [];
    if (allPipIds.size > 0) {
      const pipIdsArray = Array.from(allPipIds);
      
      const pipsQuery = `
        SELECT DISTINCT p.*, 
          fp.country AS foreign_country, 
          fp.additional_notes,
          CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name
        FROM pips p
        LEFT JOIN foreign_pips fp ON p.id = fp.pip_id
        WHERE p.id = ANY($1)
        ORDER BY CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)
      `;
      
      const pipsResult = await pool.query(pipsQuery, [pipIdsArray]);
      
      // Fetch associates for each PIP
      for (const pip of pipsResult.rows) {
        const associatesResult = await pool.query(
          'SELECT * FROM pip_associates WHERE pip_id = $1',
          [pip.id]
        );
        
        pipsData.push({
          ...pip,
          associates: associatesResult.rows,
          country: pip.foreign_country || 'Namibia'
        });
      }
    }

    // Also log in pip_search_logs for consistency
    await pool.query(
      'INSERT INTO pip_search_logs (user_id, organisation_id, search_query, search_result, is_bulk_search) VALUES ($1, $2, $3, $4, $5)',
      [user.id, user.organisation_id || null, bulkSearchTerm, JSON.stringify(pipsData), true]
    );

    // Get updated search statistics including batch screening info
    let searchLimitInfo = null;
    if (user.organisation_id) {
      const orgInfoRes = await pool.query(`
        SELECT o.package_id, p.name AS package_name, p.onboarding_screening_limit, p.batch_screening_limit
        FROM organisations o
        LEFT JOIN packages p ON o.package_id = p.id
        WHERE o.id = $1
      `, [user.organisation_id]);
      
      const orgInfo = orgInfoRes.rows[0];
      
      if (orgInfo) {
        // Regular screenings
        const screeningsDoneRes = await pool.query(
          'SELECT COUNT(*) FROM pip_search_logs WHERE organisation_id = $1 AND (is_bulk_search = false OR is_bulk_search IS NULL)', 
          [user.organisation_id]
        );
        const screeningsDone = parseInt(screeningsDoneRes.rows[0].count, 10);
        
        // Batch screenings - count all records
        const batchScreeningsDoneRes = await pool.query(
          `SELECT COUNT(DISTINCT bs.id) as count
           FROM batch_screenings bs 
           JOIN users u ON bs.user_id = u.id 
           WHERE u.organisation_id = $1`, 
          [user.organisation_id]
        );
        const batchScreeningsDone = parseInt(batchScreeningsDoneRes.rows[0].count, 10);
        
        searchLimitInfo = {
          package: orgInfo.package_name || 'Free',
          screeningLimit: orgInfo.onboarding_screening_limit,
          screeningsDone: screeningsDone,
          screeningsLeft: orgInfo.onboarding_screening_limit ? 
            Math.max(0, orgInfo.onboarding_screening_limit - screeningsDone) : 
            'Unlimited',
          batchScreeningLimit: orgInfo.batch_screening_limit,
          batchScreeningsDone: batchScreeningsDone,
          batchScreeningsLeft: orgInfo.batch_screening_limit ? 
            Math.max(0, orgInfo.batch_screening_limit - batchScreeningsDone) : 
            'Unlimited'
        };
      }
    }

    res.json({ 
      data: pipsData,
      searchLimitInfo: searchLimitInfo,
      bulkSearchInfo: {
        totalSearched: rows.length,
        totalMatches: pipsData.length,
        recordsProcessed: rows.length,
        unmatchedKeywords: Array.from(unmatchedKeywordsSet) // List of unmatched individual keywords
      }
    });

  } catch (err) {
    console.error('Bulk search error:', err);
    res.status(500).json({ error: 'Failed to process the file: ' + err.message });
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

// Toggle PIP active status
router.put('/toggle-status/:id', async (req, res) => {
  const client = await pool.connect();
  const user = req.user || {};
  const pipId = req.params.id;
  const { is_active } = req.body;

  try {
    // Check user permissions - only privileged users should toggle status
    const isPrivilegedUser = user.is_system_admin || 
      (user.permissions && user.permissions.includes('data_capturer'));
    
    if (!isPrivilegedUser) {
      return res.status(403).json({ error: 'Permission denied: Only privileged users can activate/deactivate PIPs' });
    }

    await client.query('BEGIN');

    // Check if PIP exists
    const pipCheck = await client.query('SELECT * FROM pips WHERE id = $1', [pipId]);
    if (pipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'PIP not found' });
    }

    // Update the is_active status
    await client.query('UPDATE pips SET is_active = $1 WHERE id = $2', [is_active, pipId]);
    await client.query('COMMIT');
    
    // Log the action in the audit trail
    const actionType = is_active ? 'Activate' : 'Deactivate';
    const pipName = `${pipCheck.rows[0].first_name} ${pipCheck.rows[0].last_name}`;
    
    await logAuditTrail({
      req,
      user_id: user.id,
      action_type: actionType,
      module_name: 'PIPs',
      target: `PIP ID: ${pipId} - ${pipName}`,
      result_summary: `PIP ${is_active ? 'activated' : 'deactivated'} successfully`,
      metadata: { pipId, is_active }
    });

    return res.json({ 
      success: true, 
      message: `PIP ${is_active ? 'activated' : 'deactivated'} successfully`,
      is_active
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Toggle PIP status error:', err);
    
    await logAuditTrail({
      req,
      user_id: user.id,
      action_type: 'Toggle Status',
      module_name: 'PIPs',
      target: `PIP ID: ${pipId}`,
      result_summary: err.message,
      status: 'error'
    });
    
    return res.status(500).json({ error: 'Server error while updating PIP status' });
  } finally {
    client.release();
  }
});

// Batch screening creation (enforce batch screening limit)
router.post('/batch_screenings', async (req, res) => {
  const client = await pool.connect();
  const user = req.user || {};
  try {
    let orgId = user.organisation_id;
    if (orgId) {
      const orgResult = await client.query('SELECT package_id FROM organisations WHERE id = $1', [orgId]);
      if (orgResult.rows.length > 0) {
        const packageId = orgResult.rows[0].package_id;
        if (packageId) {
          const pkgResult = await client.query('SELECT batch_screening_limit FROM packages WHERE id = $1', [packageId]);
          if (pkgResult.rows.length > 0 && pkgResult.rows[0].batch_screening_limit !== null) {
            const batchLimit = pkgResult.rows[0].batch_screening_limit;
            const batchCountResult = await client.query('SELECT COUNT(*) FROM batch_screenings WHERE user_id IN (SELECT id FROM users WHERE organisation_id = $1)', [orgId]);
            const batchCount = parseInt(batchCountResult.rows[0].count, 10);
            if (batchCount >= batchLimit) {
              return res.status(400).json({ error: `Batch screening limit (${batchLimit}) reached for this organisation.` });
            }
          }
        }
      }
    }
    const { description } = req.body;
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO batch_screenings (user_id, description) VALUES ($1, $2) RETURNING *`,
      [user.id, description || null]
    );
    await client.query('COMMIT');
    res.json({ message: 'Batch screening created', batch: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create batch screening' });
  } finally {
    client.release();
  }
});

module.exports = router;