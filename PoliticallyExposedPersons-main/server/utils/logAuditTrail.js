const pool = require('../config/database'); // PostgreSQL pool

async function logAuditTrail({
  req,
  user_id = null,
  action_type,
  module_name = null,
  target = null,
  result_summary = null,
  status = 'success',
  session_id = null,
  metadata = null
}) {
  try {
    // Safely get user ID from middleware-injected req.user
    if (!user_id && req?.user?.id) {
      user_id = req.user.id;
    }

    // Get client IP
    const ipHeader = req.headers['x-forwarded-for'];
    const ip = ipHeader ? ipHeader.split(',')[0].trim() : req.socket.remoteAddress;

    const userAgent = req.headers['user-agent'];

    const query = `
      INSERT INTO audit_trail (
        user_id,
        action_type,
        module_name,
        target,
        result_summary,
        status,
        ip_address,
        user_agent,
        session_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const values = [
      user_id,
      action_type,
      module_name,
      target,
      result_summary,
      status,
      ip,
      userAgent,
      session_id,
      metadata ? JSON.stringify(metadata) : null
    ];

    await pool.query(query, values);
  } catch (err) {
    console.error('Audit log error:', err);
    // Don't throw errors from logging
  }
}

module.exports = logAuditTrail;
