const pool = require('../config/database');

// Middleware to attach roles to req.user
module.exports = async function attachUserRoles(req, res, next) {
  console.log('[attachUserRoles] req.user at start:', req.user);
  if (!req.user || !req.user.id) {
    console.log('[attachUserRoles] No user or user.id, skipping');
    return next(); // No user, skip
  }
  try {
    const rolesResult = await pool.query(
      `SELECT r.name FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id AND ur.is_active = TRUE
       WHERE ur.user_id = $1`,
      [req.user.id]
    );
    const roles = rolesResult.rows.map(r => r.name);
    req.user.roles = roles;
    next();
  } catch (err) {
    console.error('Error attaching user roles:', err);
    next(err);
  }
}
