const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logAuditTrail = require('../utils/logAuditTrail');

// GET all permissions
router.get('/permissionsfetch', async (req, res) => {
  const user = req.user || {};
  
  try {
    const result = await pool.query(
      'SELECT * FROM permissions ORDER BY name'
    );

    // Optional audit
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Read',
        module_name: 'Permissions',
        target: 'All Permissions',
        result_summary: `${result.rows.length} permissions fetched`,
        status: 'success'
      });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching permissions:', err);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// POST create new permission
router.post('/permissionadd', async (req, res) => {
  const { name, description } = req.body;
  const user = req.user || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Permission name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO permissions (name, description, updated_by, updated_date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *',
      [name.trim(), description || null, user.id || null]
    );

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Create',
        module_name: 'Permissions',
        target: name,
        result_summary: 'Permission created',
        status: 'success'
      });
    }

    res.json({ message: 'Permission created successfully', permission: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Permission name already exists' });
    } else {
      console.error('Error creating permission:', err);
      res.status(500).json({ error: 'Failed to create permission' });
    }
  }
});

// PUT update permission
router.put('/permissionupdate/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const user = req.user || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Permission name is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE permissions SET name = $1, description = $2, updated_by = $3, updated_date = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name.trim(), description || null, user.id || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Update',
        module_name: 'Permissions',
        target: name,
        result_summary: 'Permission updated',
        status: 'success'
      });
    }

    res.json({ message: 'Permission updated successfully', permission: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Permission name already exists' });
    } else {
      console.error('Error updating permission:', err);
      res.status(500).json({ error: 'Failed to update permission' });
    }
  }
});

// PUT toggle permission status
router.put('/permissiontoggle/:id', async (req, res) => {
  const { id } = req.params;
  const user = req.user || {};

  try {
    // First get current status
    const currentStatus = await pool.query(
      'SELECT is_active, name FROM permissions WHERE id = $1',
      [id]
    );

    if (currentStatus.rowCount === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    const newStatus = !currentStatus.rows[0].is_active;
    const permissionName = currentStatus.rows[0].name;

    // Check if permission is in use when deactivating
    if (!newStatus) {
      const checkUsage = await pool.query(
        `SELECT COUNT(*) FROM role_permissions rp
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE rp.permission_id = $1 AND ur.is_active = true`,
        [id]
      );

      if (parseInt(checkUsage.rows[0].count) > 0) {
        return res.status(400).json({ 
          error: 'Cannot deactivate permission that is actively assigned to users' 
        });
      }
    }

    // Update status
    const result = await pool.query(
      'UPDATE permissions SET is_active = $1, updated_by = $2, updated_date = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [newStatus, user.id || null, id]
    );

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Update',
        module_name: 'Permissions',
        target: permissionName,
        result_summary: `Permission ${newStatus ? 'activated' : 'deactivated'}`,
        status: 'success'
      });
    }

    res.json({ 
      message: `Permission ${newStatus ? 'activated' : 'deactivated'} successfully`, 
      permission: result.rows[0] 
    });
  } catch (err) {
    console.error('Error toggling permission status:', err);
    res.status(500).json({ error: 'Failed to toggle permission status' });
  }
});

// GET roles that use a specific permission
router.get('/permission/:id/roles', async (req, res) => {
  const { id } = req.params;
  const user = req.user || {};

  try {
    const result = await pool.query(
      `SELECT r.id, r.name, r.description 
       FROM roles r
       JOIN role_permissions rp ON r.id = rp.role_id
       WHERE rp.permission_id = $1
       ORDER BY r.name`,
      [id]
    );

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Read',
        module_name: 'Permissions',
        target: 'Permission Roles',
        result_summary: `Fetched ${result.rows.length} roles for permission`,
        status: 'success'
      });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching permission roles:', err);
    res.status(500).json({ error: 'Failed to fetch roles for permission' });
  }
});

module.exports = router;