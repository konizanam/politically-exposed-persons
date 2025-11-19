const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logAuditTrail = require('../utils/logAuditTrail');

// GET all active organisations
router.get('/organisationsfetch', async (req, res) => {
  const user = req.user || {};
  
  try {
    let query = `SELECT o.*, p.name AS package_name
                FROM organisations o
                LEFT JOIN packages p ON o.package_id = p.id`;
    
    let params = [];
    
  // Non-admin users should only see their own organisation
    if (!user.is_system_admin && user.organisation_id) {
      query += ` WHERE o.id = $1`;
      params.push(user.organisation_id);
    }
    
    query += ` ORDER BY o.name`;
    
    const result = await pool.query(query, params);

    // Optional audit
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Read',
        module_name: 'Organisations',
        target: user.is_system_admin ? 'All Organisations' : 'Own Organisation',
        result_summary: `${result.rows.length} active organisations fetched`,
        status: 'success'
      });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching organisations:', err);
    res.status(500).json({ error: 'Failed to fetch organisations' });
  }
});

// PUT update an organisation
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, contact_email, contact_phone, address, package_id } = req.body;
  const user = req.user || {};

  try {
  // Security check: non-admin users can only update their own organisation
    if (!user.is_system_admin && user.organisation_id !== parseInt(id)) {
  return res.status(403).json({ error: 'You can only update your own organisation' });
    }
    
    const result = await pool.query(
      `UPDATE organisations
       SET name = $1, description = $2, contact_email = $3, contact_phone = $4, address = $5, package_id = $6
       WHERE id = $7
       RETURNING *`,
      [name.trim(), description || null, contact_email || null, contact_phone || null, address || null, package_id || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Update',
        module_name: 'Organisations',
        target: name,
        result_summary: 'Organisation updated',
        status: 'success'
      });
    }

    res.json({ message: 'Organisation updated', organisation: result.rows[0] });
  } catch (err) {
    console.error('Error updating organisation:', err);
    res.status(500).json({ error: 'Failed to update organisation' });
  }
});

// POST create a new organisation
router.post('/organisationadd', async (req, res) => {
  const { name, description, contact_email, contact_phone, address, package_id } = req.body;
  const user = req.user || {};

  try {
    const result = await pool.query(
      `INSERT INTO organisations (name, description, contact_email, contact_phone, address, package_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name.trim(), description || null, contact_email || null, contact_phone || null, address || null, package_id || null]
    );

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Create',
        module_name: 'Organisations',
        target: name,
        result_summary: 'Organisation created',
        status: 'success'
      });
    }

    res.json({ message: 'Organisation added successfully', organisation: result.rows[0] });
  } catch (err) {
    console.error('Error adding organisation:', err);
    res.status(500).json({ error: 'Failed to create organisation' });
  }
});

// PATCH toggle organisation active/inactive
router.patch('/toggle/:id', async (req, res) => {
  const { id } = req.params;
  const user = req.user || {};
  
  // Only system admins can toggle organisation status
  if (!user.is_system_admin) {
  return res.status(403).json({ error: 'Only system administrators can change organisation status' });
  }

  try {
    const result = await pool.query(
      `UPDATE organisations
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING id, name, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    const org = result.rows[0];

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Update',
        module_name: 'Organisations',
        target: org.name,
        result_summary: `Organisation ${org.is_active ? 'activated' : 'deactivated'}`,
        status: 'success'
      });
    }

    res.json({ message: `Organisation is now ${org.is_active ? 'active' : 'inactive'}` });
  } catch (err) {
    console.error('Error toggling organisation:', err);
    res.status(500).json({ error: 'Failed to toggle organisation status' });
  }
});

module.exports = router;
