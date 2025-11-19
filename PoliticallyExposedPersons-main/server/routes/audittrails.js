const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logAuditTrail = require('../utils/logAuditTrail'); // Audit trail logger

// Fetch dashboard info for Pip Search History page
router.get('/pipsearchdashboard', async (req, res) => {
  const user = req.user || {};
  // Use string comparison because the ID might be sent as a string
  const orgId = req.query.organisation_id ? parseInt(req.query.organisation_id, 10) : (user.organisation_id || null);
  
  try {
    if (!orgId) {
      return res.status(400).json({ error: 'No organisation selected' });
    }
    
  // Validate that the organisation ID is a valid integer
    if (isNaN(orgId) || orgId <= 0) {
      return res.status(400).json({ error: 'Invalid organisation ID' });
    }

    // Get organisation and package info
    const orgRes = await pool.query(`
      SELECT o.id, o.name, o.package_id, p.name AS package_name, p.user_limit, 
             p.onboarding_screening_limit, p.batch_screening_limit
      FROM organisations o
      LEFT JOIN packages p ON o.package_id = p.id
      WHERE o.id = $1
    `, [orgId]);
    const org = orgRes.rows[0];
    
    if (!org) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    // Get user count for org
    const userCountRes = await pool.query('SELECT COUNT(*) FROM users WHERE organisation_id = $1', [orgId]);
    const userCount = parseInt(userCountRes.rows[0].count, 10);

    // Get single screening stats (exclude bulk searches)
    const screeningLimit = org.onboarding_screening_limit;
    
    const screeningsDoneRes = await pool.query(
      'SELECT COUNT(*) FROM pip_search_logs WHERE organisation_id = $1 AND (is_bulk_search = false OR is_bulk_search IS NULL)', 
      [orgId]
    );
    const screeningsDone = parseInt(screeningsDoneRes.rows[0].count, 10);
    
    const screeningsLeft = screeningLimit == null ? 'Unlimited' : Math.max(0, screeningLimit - screeningsDone);

    // Get batch screening stats
    const batchScreeningLimit = org.batch_screening_limit;
    
    const batchScreeningsDoneRes = await pool.query(
      `SELECT COUNT(DISTINCT bs.id) as count
       FROM batch_screenings bs 
       JOIN users u ON bs.user_id = u.id 
       WHERE u.organisation_id = $1`, 
      [orgId]
    );
    const batchScreeningsDone = parseInt(batchScreeningsDoneRes.rows[0].count, 10);
    
    const batchScreeningsLeft = batchScreeningLimit == null ? 'Unlimited' : Math.max(0, batchScreeningLimit - batchScreeningsDone);

    const responseData = {
      organisation: org.name,
      package: org.package_name,
      user_limit: org.user_limit,
      user_count: userCount,
      screening_limit: screeningLimit,
      screenings_done: screeningsDone,
      screenings_left: screeningsLeft,
      batch_screening_limit: batchScreeningLimit,
      batch_screenings_done: batchScreeningsDone,
      batch_screenings_left: batchScreeningsLeft
    };
    
    res.json(responseData);
  } catch (err) {
    console.error('Error fetching pip search dashboard info:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard info' });
  }
});


// Fetch PIP Search History (from pip_search_logs)
router.get('/pipsearchhistory', async (req, res) => {
  const user = req.user || {};
  const orgId = req.query.organisation_id;
  
  try {
    let logsResult;
    
    // If the user is not authenticated at all, deny access
    if (!user.id) {
      return res.status(401).json({ error: 'Authentication required to view search history' });
    }
    
    // For system admins
    if (user.is_system_admin) {
      if (orgId) {
        // Admin with specific org filter
        logsResult = await pool.query(`
          SELECT l.*, u.email AS user_email, o.name AS organisation_name,
                 u.first_name, u.last_name
          FROM pip_search_logs l
          LEFT JOIN users u ON l.user_id = u.id
          LEFT JOIN organisations o ON l.organisation_id = o.id
          WHERE l.organisation_id = $1
          ORDER BY l.searched_at DESC
        `, [orgId]);
      } else {
        // Admin with no filter (see all)
        logsResult = await pool.query(`
          SELECT l.*, u.email AS user_email, o.name AS organisation_name,
                 u.first_name, u.last_name
          FROM pip_search_logs l
          LEFT JOIN users u ON l.user_id = u.id
          LEFT JOIN organisations o ON l.organisation_id = o.id
          ORDER BY l.searched_at DESC
        `);
      }
    } 
    // For regular users and org managers
    else if (user.organisation_id) {
      // Regular users see their org's search logs
      logsResult = await pool.query(`
        SELECT l.*, u.email AS user_email, o.name AS organisation_name,
               u.first_name, u.last_name
        FROM pip_search_logs l
        LEFT JOIN users u ON l.user_id = u.id
        LEFT JOIN organisations o ON l.organisation_id = o.id
        WHERE l.organisation_id = $1
        ORDER BY l.searched_at DESC
      `, [user.organisation_id]);
    } 
  // User has no organisation assigned
    else {
  return res.status(403).json({ error: 'No organisation assigned to your account' });
    }
    
    res.json(logsResult.rows);
  } catch (err) {
    console.error('PIP search history fetch error:', err);
    res.status(500).json({ error: 'Server error fetching PIP search history' });
  }
});


// Fetch Audit Trail Logs
router.get('/audittrailsfetch', async (req, res) => {
  const user = req.user || {};
  const query = (req.query.query || '').toLowerCase();

  try {
    let logsResult;
    const orgId = req.query.organisation_id;
    if (!user.is_system_admin && user.organisation_id) {
      // OrgManagers: only see audit logs for users in their org
      logsResult = await pool.query(`
        SELECT
          a.id,
          a.user_id,
          u.email AS user_email,
          a.action_type,
          a.module_name,
          a.target,
          a.result_summary,
          a.status,
          a.ip_address,
          a.user_agent,
          a.session_id,
          a.metadata,
          a.timestamp
        FROM audit_trail a
        INNER JOIN users u ON a.user_id = u.id
        WHERE u.organisation_id = $1
        ORDER BY a.timestamp DESC
      `, [user.organisation_id]);
    } else if (user.is_system_admin && orgId) {
  // Admin: filter by organisation if provided
      logsResult = await pool.query(`
        SELECT
          a.id,
          a.user_id,
          u.email AS user_email,
          a.action_type,
          a.module_name,
          a.target,
          a.result_summary,
          a.status,
          a.ip_address,
          a.user_agent,
          a.session_id,
          a.metadata,
          a.timestamp
        FROM audit_trail a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE u.organisation_id = $1
        ORDER BY a.timestamp DESC
      `, [orgId]);
    } else {
      // System admin: see all logs
      logsResult = await pool.query(`
        SELECT
          a.id,
          a.user_id,
          u.email AS user_email,
          a.action_type,
          a.module_name,
          a.target,
          a.result_summary,
          a.status,
          a.ip_address,
          a.user_agent,
          a.session_id,
          a.metadata,
          a.timestamp
        FROM audit_trail a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.timestamp DESC
      `);
    }

    const logs = logsResult.rows;

    await logAuditTrail({
      req,
      user_id: user?.id || null,
      action_type: 'Fetch',
      module_name: 'Audit Trail',
      target: query || 'All Logs',
      result_summary: `${logs.length} audit logs fetched`,
      metadata: { query }
    });

    res.json(logs);
  } catch (err) {
    console.error('Audit fetch error:', err);
    await logAuditTrail({
      req,
      user_id: user?.id || null,
      action_type: 'Fetch',
      module_name: 'Audit Trail',
      target: query || 'All Logs',
      result_summary: err.message,
      status: 'error',
      metadata: { query }
    });
    res.status(500).json({ error: 'Server error fetching audit logs' });
  }
});

module.exports = router;
