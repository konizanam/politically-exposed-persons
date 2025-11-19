const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logAuditTrail = require('../utils/logAuditTrail');
const bcrypt = require('bcrypt');
const authenticateToken = require('../middleware/authenticateToken');
const attachUserRoles = require('../middleware/attachUserRoles');
const authorizeRoles = require('../middleware/authorizeRoles');
const authorizePermission = require('../middleware/authorizePermission');

// GET users with roles
// GET current user details
router.get('/me', authenticateToken, async (req, res) => {
  const user = req.user || {};
  if (!user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.is_active,
        u.is_system_admin,
        u.organisation_id,
        u.created_at,
        o.name AS organisation_name,
        o.package_id,
        ARRAY_REMOVE(ARRAY_AGG(r.name), NULL) AS roles
      FROM users u
      LEFT JOIN organisations o ON u.organisation_id = o.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
      LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = TRUE
      WHERE u.id = $1
      GROUP BY u.id, o.name, o.package_id
    `;
    
    const result = await pool.query(query, [user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log the access
    await logAuditTrail({
      req,
      user_id: user.id,
      action_type: 'Read',
      module_name: 'Users',
      target: 'Current User Details',
      result_summary: `User ${user.id} fetched their own details`,
    });
    
    // Format response to match the login response structure
    const userData = result.rows[0];
    
    res.json({
      user: {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        is_system_admin: userData.is_system_admin,
        organisation_id: userData.organisation_id,
        organisation_name: userData.organisation_name,
        roles: userData.roles || []
      }
    });
  } catch (err) {
    console.error('Error fetching user details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/usersfetch', async (req, res) => {
  const user = req.user || {};
  try {
    let query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.is_active,
        u.created_at,
        o.name AS organisation,
        o.package_id,
        ARRAY_REMOVE(ARRAY_AGG(r.name), NULL) AS roles
      FROM users u
      LEFT JOIN organisations o ON u.organisation_id = o.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
      LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = TRUE
    `;
    let params = [];
    if (!user.is_system_admin && user.organisation_id) {
      query += ' WHERE u.organisation_id = $1';
      params.push(user.organisation_id);
    }
    query += ' GROUP BY u.id, o.name, o.package_id ORDER BY u.id DESC';
    const result = await pool.query(query, params);

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Read',
        module_name: 'Users',
        target: 'All Users',
        result_summary: `${result.rows.length} users fetched`,
      });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Read',
        module_name: 'Users',
        target: 'All Users',
        result_summary: err.message,
        status: 'error',
      });
    }
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET organisations
router.get('/organisationsfetch', async (req, res) => {
  const user = req.user || {};
  try {
    let query = `SELECT o.*, p.name AS package_name, p.user_limit, p.onboarding_screening_limit, p.batch_screening_limit, p.price_monthly, p.price_annual, p.allow_export, p.allow_audit_trail, p.allow_batch_screening, p.allow_system_integration, p.notes
      FROM organisations o
      LEFT JOIN packages p ON o.package_id = p.id
      WHERE o.is_active = TRUE`;
    let params = [];
    if (!user.is_system_admin && user.organisation_id) {
      query += ' AND o.id = $1';
      params.push(user.organisation_id);
    }
    query += ' ORDER BY o.name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching organisations:', err);
    res.status(500).json({ error: 'Failed to fetch organisations' });
  }
});

// POST create organisation
router.post('/organisationadd', async (req, res) => {
  const { name, description, contact_email, contact_phone, address } = req.body;
  const user = req.user || {};
  try {
    const result = await pool.query(
      `INSERT INTO organisations (name, description, contact_email, contact_phone, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, contact_email, contact_phone, address]
    );

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Create',
        module_name: 'Organisations',
        target: name,
        result_summary: 'Organisation created',
        status: 'success',
      });
    }

    res.json({ message: 'Organisation added successfully', organisation: result.rows[0] });
  } catch (err) {
    console.error('Error adding organisation:', err);
    res.status(500).json({ error: 'Failed to create organisation' });
  }
});

// POST create user
router.post('/useradd', authorizePermission('manage_users'), async (req, res) => {
  const { first_name, last_name, email, password, roles, organisation_id } = req.body;
  const user = req.user || {};
  const roleNames = Array.isArray(roles) ? roles : [];
  const client = await pool.connect();

  try {
  // Enforce user limit for organisation
    let orgId = organisation_id || user.organisation_id;
    if (orgId) {
      const orgResult = await client.query('SELECT package_id FROM organisations WHERE id = $1', [orgId]);
      if (orgResult.rows.length > 0) {
        const packageId = orgResult.rows[0].package_id;
        if (packageId) {
          const pkgResult = await client.query('SELECT user_limit FROM packages WHERE id = $1', [packageId]);
          if (pkgResult.rows.length > 0 && pkgResult.rows[0].user_limit !== null) {
            const userLimit = pkgResult.rows[0].user_limit;
            const userCountResult = await client.query('SELECT COUNT(*) FROM users WHERE organisation_id = $1 AND is_active = TRUE', [orgId]);
            const userCount = parseInt(userCountResult.rows[0].count, 10);
            if (userCount >= userLimit) {
              return res.status(400).json({ error: `User limit (${userLimit}) reached for this organisation.` });
            }
          }
        }
      }
    }
    await client.query('BEGIN');
    const hashedPassword = await bcrypt.hash(password, 10);
    const isSystemAdmin = roleNames.includes('Admin');

const insertUser = await client.query(
  `INSERT INTO users (first_name, last_name, email, password, organisation_id, is_system_admin)
   VALUES ($1, $2, $3, $4, $5, $6)
   RETURNING id, first_name, last_name, email, is_active, created_at`,
  [first_name, last_name, email, hashedPassword, organisation_id || null, isSystemAdmin]
);

    const userId = insertUser.rows[0].id;

    for (const roleName of roleNames) {
      const roleResult = await client.query(
        `SELECT id FROM roles WHERE name = $1 AND is_active = TRUE`,
        [roleName]
      );
      if (roleResult.rows.length > 0) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, roleResult.rows[0].id]
        );
      }
    }

    await client.query('COMMIT');

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Create',
        module_name: 'Users',
        target: `${first_name} ${last_name}`,
        result_summary: `User created with roles: ${roleNames.join(', ')}`,
        status: 'success',
      });
    }

    res.json({ message: 'User added successfully', user: insertUser.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', err);
    if (err.code === '23505' && err.detail && err.detail.includes('email')) {
      // Unique violation for email
      res.status(400).json({ error: 'A user with this email already exists.' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  } finally {
    client.release();
  }
});


// GET /api/users/rolesfetch — fetch all active roles
// (Removed duplicate route. See below for the protected version.)

// PUT update user and roles
router.put('/userupdate/:id', authorizePermission('manage_users'), async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, password, roles, organisation_id } = req.body;
  const user = req.user || {};
  const roleNames = Array.isArray(roles) ? roles : [];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const existingUser = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    let hashedPassword = existingUser.rows[0].password;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
const roleNames = Array.isArray(roles) ? roles : [];
const isSystemAdmin = roleNames.includes('Admin'); // ✅ Only true if Admin is in roles

await client.query(
  `UPDATE users
   SET first_name = $1, last_name = $2, email = $3, password = $4, organisation_id = $5, is_system_admin = $6
   WHERE id = $7`,
  [first_name, last_name, email, hashedPassword, organisation_id || null, isSystemAdmin, id]
);
    await client.query(`UPDATE user_roles SET is_active = FALSE WHERE user_id = $1`, [id]);

    for (const roleName of roleNames) {
      const roleResult = await client.query(`SELECT id FROM roles WHERE name = $1 AND is_active = TRUE`, [roleName]);
      if (roleResult.rows.length > 0) {
        const roleId = roleResult.rows[0].id;
        await client.query(
          `INSERT INTO user_roles (user_id, role_id, is_active)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = TRUE`,
          [id, roleId]
        );
      }
    }

    await client.query('COMMIT');

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Update',
        module_name: 'Users',
        target: `${first_name} ${last_name}`,
        result_summary: `User updated with roles: ${roleNames.join(', ')}`,
        status: 'success',
      });
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  } finally {
    client.release();
  }
});


// PATCH toggle status
router.patch('/toggle-status/:id', async (req, res) => {
  const { id } = req.params;
  const user = req.user || {};

  try {
    const toggle = await pool.query(
      `UPDATE users
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING id, first_name, last_name, is_active`,
      [id]
    );

    if (toggle.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = toggle.rows[0];
    const newStatus = updatedUser.is_active ? 'active' : 'inactive';

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Update',
        module_name: 'Users',
        target: `${updatedUser.first_name} ${updatedUser.last_name}`,
        result_summary: `User status changed to ${newStatus}`,
        status: 'success',
      });
    }

    res.json({ message: `User is now ${newStatus}` });
  } catch (err) {
    console.error('Error toggling user status:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// DELETE (soft delete)
router.delete('/userdelete/:id', authorizePermission('manage_users'), async (req, res) => {
  const { id } = req.params;
  const user = req.user || {};

  try {
    const result = await pool.query(
      'UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING email',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Delete',
        module_name: 'Users',
        target: result.rows[0].email,
        result_summary: 'User marked as inactive',
        status: 'success',
      });
    }

    res.json({ message: 'User marked as inactive' });
  } catch (err) {
    console.error('Error disabling user:', err);
    res.status(500).json({ error: 'Failed to disable user' });
  }
});

// GET roles (protected, only Admin)
router.get('/rolesfetch', authenticateToken, async (req, res) => {
  const user = req.user || {};

  try {
    const result = await pool.query(
      `SELECT id, name, description, is_active FROM roles ORDER BY name`
    );

    // Audit: log success if user is authenticated
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Read',
        module_name: 'Roles',
        target: 'All Roles',
        result_summary: `${result.rows.length} roles fetched`,
        status: 'success',
      });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching roles:', err);

    // Audit: log error if user is authenticated
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Read',
        module_name: 'Roles',
        target: 'All Roles',
        result_summary: err.message,
        status: 'error',
      });
    }

    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// POST /api/users/roleadd
router.post('/roleadd', authenticateToken, attachUserRoles, authorizeRoles('Admin'), async (req, res) => {
  const { name, description } = req.body;
  const user = req.user || {};

  try {
    await pool.query(
      'INSERT INTO roles (name, description) VALUES ($1,$2)',
      [name.trim(), description || null]
    );

    // Audit: success
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Create',
        module_name: 'Roles',
        target: name.trim(),
        result_summary: 'New role created',
        status: 'success',
      });
    }

    res.json({ message: 'Role added' });
  } catch (e) {
    console.error(e);

    // Audit: duplicate or DB error
    if (user.id) {
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Create',
        module_name: 'Roles',
        target: name.trim(),
        result_summary: e.code === '23505' ? 'Duplicate role' : e.message,
        status: 'error',
      });
    }

    if (e.code === '23505') {
      return res.status(400).json({ error: 'Role already exists' });
    }

    res.status(500).json({ error: 'DB error' });
  }
});

// PATCH /api/users/roletoggle/:id — toggle active/inactive
router.patch('/roletoggle/:id', authenticateToken, attachUserRoles, authorizeRoles('Admin'), async (req, res) => {
  const { id } = req.params;
  const authUser = req.user || {};

  try {
    const result = await pool.query(
      `UPDATE roles
         SET is_active = NOT is_active
       WHERE id = $1
       RETURNING id, name, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = result.rows[0];

    if (authUser.id) {
      await logAuditTrail({
        req,
        user_id: authUser.id,
        action_type: 'Update',
        module_name: 'Roles',
        target: role.name,
        result_summary: `Toggled to ${role.is_active ? 'active' : 'inactive'}`,
        status: 'success',
      });
    }

    res.json({ message: `Role is now ${role.is_active ? 'active' : 'inactive'}` });
  } catch (e) {
    console.error('Error toggling role:', e);
    res.status(500).json({ error: 'Failed to toggle role' });

    if (authUser.id) {
      await logAuditTrail({
        req,
        user_id: authUser.id,
        action_type: 'Update',
        module_name: 'Roles',
        target: id,
        result_summary: e.message,
        status: 'error',
      });
    }
  }
});

// POST /api/users/roleupdate — update name/description
router.post('/roleupdate', authenticateToken, attachUserRoles, authorizeRoles('Admin'), async (req, res) => {
  const { id, name, description } = req.body;
  const authUser = req.user || {};

  try {
    const result = await pool.query(
      `UPDATE roles
         SET name = $1,
             description = $2
       WHERE id = $3`,
      [name.trim(), description || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (authUser.id) {
      await logAuditTrail({
        req,
        user_id: authUser.id,
        action_type: 'Update',
        module_name: 'Roles',
        target: name,
        result_summary: 'Role updated',
        status: 'success',
      });
    }

    res.json({ message: 'Role updated' });
  } catch (e) {
    console.error('Error updating role:', e);
    res.status(500).json({ error: 'Failed to update role' });

    if (authUser.id) {
      await logAuditTrail({
        req,
        user_id: authUser.id,
        action_type: 'Update',
        module_name: 'Roles',
        target: id,
        result_summary: e.message,
        status: 'error',
      });
    }
  }
});
// GET all permissions
router.get('/permissionsfetch', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description FROM permissions ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching permissions:', err);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// GET permissions for a role
router.get('/rolepermissions/:roleId', async (req, res) => {
  const { roleId } = req.params;
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.description
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [roleId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching role permissions:', err);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// POST update permissions for a role
router.post('/rolepermissions/:roleId', authenticateToken, attachUserRoles, authorizeRoles('Admin'), async (req, res) => {
  const { roleId } = req.params;
  const { permissionIds } = req.body; // array of permission IDs
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
    for (const pid of permissionIds) {
      await client.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [roleId, pid]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Role permissions updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating role permissions:', err);
    res.status(500).json({ error: 'Failed to update role permissions' });
  } finally {
    client.release();
  }
});

module.exports = router;
