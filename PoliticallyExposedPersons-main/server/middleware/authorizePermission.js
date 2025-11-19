// Middleware to enforce permission-based access control
// Usage: authorizePermission('manage_users')
const pool = require('../config/database');

module.exports = function authorizePermission(permissionName) {
  return async (req, res, next) => {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
      // System admin bypass
      if (user.is_system_admin) return next();
      // Query: does user have a role with this permission?
      const result = await pool.query(`
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id AND ur.is_active = TRUE
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1 AND p.name = $2
        LIMIT 1
      `, [user.id, permissionName]);
      if (result.rowCount > 0) return next();
      return res.status(403).json({ error: 'Access denied: Missing permission' });
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}
