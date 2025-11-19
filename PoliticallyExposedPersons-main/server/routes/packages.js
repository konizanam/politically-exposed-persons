const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logAuditTrail = require('../utils/logAuditTrail');
const authenticateToken = require('../middleware/authenticateToken');
const attachUserRoles = require('../middleware/attachUserRoles');
const authorizeRoles = require('../middleware/authorizeRoles');
const authorizePermission = require('../middleware/authorizePermission');

// GET all packages
router.get('/packagesfetch', authorizePermission('manage_packages'), async (req, res) => {
  const user = req.user || {};
  try {
    const result = await pool.query('SELECT * FROM packages ORDER BY id');
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Read',
        module_name: 'Packages',
        target: 'All Packages',
        result_summary: `${result.rows.length} packages fetched`,
        status: 'success',
      });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching packages:', err);
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Read',
        module_name: 'Packages',
        target: 'All Packages',
        result_summary: err.message,
        status: 'error',
      });
    }
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// POST create package
router.post('/packageadd',  authorizePermission('manage_packages'), async (req, res) => {
  const { name, user_limit, onboarding_screening_limit, batch_screening_limit, price_monthly, price_annual, allow_export, allow_audit_trail, allow_batch_screening, allow_system_integration, notes } = req.body;
  const user = req.user || {};
  try {
    const result = await pool.query(
      `INSERT INTO packages (name, user_limit, onboarding_screening_limit, batch_screening_limit, price_monthly, price_annual, allow_export, allow_audit_trail, allow_batch_screening, allow_system_integration, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, user_limit, onboarding_screening_limit, batch_screening_limit, price_monthly, price_annual, allow_export, allow_audit_trail, allow_batch_screening, allow_system_integration, notes]
    );
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Create',
        module_name: 'Packages',
        target: name,
        result_summary: 'Package created',
        status: 'success',
      });
    }
    res.json({ message: 'Package added successfully', package: result.rows[0] });
  } catch (err) {
    console.error('Error adding package:', err);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

// PUT update package
router.put('/packageupdate/:id', authorizePermission('manage_packages'), async (req, res) => {
  const { id } = req.params;
  const { name, user_limit, onboarding_screening_limit, batch_screening_limit, price_monthly, price_annual, allow_export, allow_audit_trail, allow_batch_screening, allow_system_integration, notes } = req.body;
  const user = req.user || {};
  try {
    const result = await pool.query(
      `UPDATE packages SET
        name = $1,
        user_limit = $2,
        onboarding_screening_limit = $3,
        batch_screening_limit = $4,
        price_monthly = $5,
        price_annual = $6,
        allow_export = $7,
        allow_audit_trail = $8,
        allow_batch_screening = $9,
        allow_system_integration = $10,
        notes = $11
      WHERE id = $12 RETURNING *`,
      [name, user_limit, onboarding_screening_limit, batch_screening_limit, price_monthly, price_annual, allow_export, allow_audit_trail, allow_batch_screening, allow_system_integration, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Update',
        module_name: 'Packages',
        target: name,
        result_summary: 'Package updated',
        status: 'success',
      });
    }
    res.json({ message: 'Package updated', package: result.rows[0] });
  } catch (err) {
    console.error('Error updating package:', err);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// PATCH toggle package active/inactive
router.patch('/packagetoggle/:id', attachUserRoles, authorizeRoles('Admin'), async (req, res) => {
  const { id } = req.params;
  const user = req.user || {};
  try {
    const result = await pool.query(
      `UPDATE packages SET is_active = NOT is_active WHERE id = $1 RETURNING id, name, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    const pkg = result.rows[0];
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Update',
        module_name: 'Packages',
        target: pkg.name,
        result_summary: `Toggled to ${pkg.is_active ? 'active' : 'inactive'}`,
        status: 'success',
      });
    }
    res.json({ message: `Package is now ${pkg.is_active ? 'active' : 'inactive'}` });
  } catch (err) {
    console.error('Error toggling package:', err);
    res.status(500).json({ error: 'Failed to toggle package' });
  }
});

// DELETE (soft delete) package
router.delete('/packagedelete/:id', authenticateToken, attachUserRoles, authorizeRoles('Admin'), async (req, res) => {
  const { id } = req.params;
  const user = req.user || {};
  try {
    const result = await pool.query(
      'UPDATE packages SET is_active = FALSE WHERE id = $1 RETURNING name',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Delete',
        module_name: 'Packages',
        target: result.rows[0].name,
        result_summary: 'Package marked as inactive',
        status: 'success',
      });
    }
    res.json({ message: 'Package marked as inactive' });
  } catch (err) {
    console.error('Error disabling package:', err);
    res.status(500).json({ error: 'Failed to disable package' });
  }
});

module.exports = router;
