const jwt = require('jsonwebtoken');
const pool = require('../config/database');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = {};
    return next();
  }
  
  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      // Token is invalid or expired
      console.error('JWT Verification Error:', err.message);
      req.user = {}; // Set empty user object
    } else {
      // Token is valid
      // Extra check: Validate if user exists in database and get latest data
      if (user.id) {
        try {
          const result = await pool.query(
            `SELECT id, email, is_system_admin, organisation_id 
             FROM users WHERE id = $1`,
            [user.id]
          );
          
          if (result.rows.length > 0) {
            const dbUser = result.rows[0];
            
            // Use the DB value for organization_id if it exists
            if (dbUser.organisation_id) {
              user.organisation_id = dbUser.organisation_id;
            }
          }
        } catch (dbErr) {
          console.error('Database error in authenticateToken:', dbErr.message);
        }
      }
      
      req.user = user; // user contains: { id, email, is_system_admin, organisation_id }
    }
    next();
  });
}

module.exports = authenticateToken;
