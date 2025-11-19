const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('../utils/emailSender');
const logAuditTrail = require('../utils/logAuditTrail');

// Utility function to generate random code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Step 1: User provides credentials
router.post('/login/init', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Deny login if user is inactive
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account is inactive. Contact an administrator.' });
    }

  // Deny login if user's organisation is inactive (if user has an organisation)
    if (user.organisation_id) {
      const orgResult = await pool.query('SELECT is_active FROM organisations WHERE id = $1', [user.organisation_id]);
      if (orgResult.rows.length > 0 && !orgResult.rows[0].is_active) {
  return res.status(403).json({ error: 'Your organisation is inactive. Contact an administrator.' });
      }
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Allow temporarily disabling MFA/2FA via env flag
    const disableMfa = (process.env.DISABLE_2FA || '').toLowerCase() === 'true' || process.env.DISABLE_2FA === '1';
    if (disableMfa) {
      try {
        // Fetch roles
        const rolesResult = await pool.query(
          `SELECT r.name FROM user_roles ur
           JOIN roles r ON ur.role_id = r.id AND ur.is_active = TRUE
           WHERE ur.user_id = $1`,
          [user.id]
        );
        const roles = rolesResult.rows.map(r => r.name);

        // Fetch permissions
        const permissionsResult = await pool.query(
          `SELECT DISTINCT p.name FROM user_roles ur
           JOIN roles r ON ur.role_id = r.id AND ur.is_active = TRUE
           JOIN role_permissions rp ON r.id = rp.role_id
           JOIN permissions p ON rp.permission_id = p.id
           WHERE ur.user_id = $1`,
          [user.id]
        );
        const permissions = permissionsResult.rows.map(p => p.name);

  // Fetch organisation name if user has an organisation
        let organisation_name = null;
        if (user.organisation_id) {
          const orgResult = await pool.query('SELECT name FROM organisations WHERE id = $1', [user.organisation_id]);
          if (orgResult.rows.length > 0) {
            organisation_name = orgResult.rows[0].name;
          }
        }

        // Build user object for frontend
        const userObj = {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          is_system_admin: user.is_system_admin,
          organisation_id: user.organisation_id,
          organisation_name: organisation_name,
          roles,
          permissions
        };

        // Generate token
        const token = jwt.sign({
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          is_system_admin: user.is_system_admin,
          organisation_id: user.organisation_id,
          organisation_name: organisation_name
        }, process.env.JWT_SECRET, {
          expiresIn: '10m'
        });

        // Audit trail - successful login without MFA (temporarily disabled)
        try {
          await logAuditTrail({
            req,
            user_id: user.id,
            action_type: 'Login',
            module_name: 'Authentication',
            target: user.email,
            result_summary: 'Login successful without MFA (temporarily disabled)',
            status: 'success'
          });
        } catch (auditErr) {
          console.warn('Warning: Could not log to audit trail:', auditErr.message);
        }

        return res.json({ token, user: userObj, requiresVerification: false });
      } catch (immediateLoginErr) {
        console.error('Immediate login (2FA disabled) error:', immediateLoginErr);
        return res.status(500).json({ error: 'Server error during login' });
      }
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    
    // Store verification code in database
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code valid for 10 minutes
    
    await pool.query(
      `INSERT INTO verification_codes (user_id, code, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, verificationCode, expiresAt]
    );
    
    // Send verification code (logs to console in development)
    const codeSent = await sendVerificationEmail(user.email, verificationCode);
    
    if (!codeSent) {
      return res.status(500).json({ error: 'Failed to generate verification code' });
    }
    
    // Return partial auth info (don't return actual token yet)
    res.json({
      message: 'Verification code sent',
      userId: user.id,
      email: user.email,
      requiresVerification: true
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Step 2: User submits verification code
router.post('/login/verify', async (req, res) => {
  const { userId, verificationCode } = req.body;
  
  try {
    // Find the most recent non-used verification code for this user
    const result = await pool.query(
      `SELECT * FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND expires_at > NOW() AND is_used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [userId, verificationCode]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired verification code' });
    }
    
    // Mark code as used
    await pool.query(
      `UPDATE verification_codes SET is_used = TRUE WHERE id = $1`,
      [result.rows[0].id]
    );
    
    // Fetch user details
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Fetch roles
    const rolesResult = await pool.query(
      `SELECT r.name FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id AND ur.is_active = TRUE
       WHERE ur.user_id = $1`,
      [user.id]
    );
    const roles = rolesResult.rows.map(r => r.name);

    // Fetch permissions
    const permissionsResult = await pool.query(
      `SELECT DISTINCT p.name FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id AND ur.is_active = TRUE
       JOIN role_permissions rp ON r.id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = $1`,
      [user.id]
    );
    const permissions = permissionsResult.rows.map(p => p.name);
    
  // Fetch organisation name if user has an organisation
    let organisation_name = null;
    if (user.organisation_id) {
      const orgResult = await pool.query('SELECT name FROM organisations WHERE id = $1', [user.organisation_id]);
      if (orgResult.rows.length > 0) {
        organisation_name = orgResult.rows[0].name;
      }
    }

    // Build user object for frontend
    const userObj = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_system_admin: user.is_system_admin,
      organisation_id: user.organisation_id,
      organisation_name: organisation_name,
      roles,
      permissions
    };

    // Generate token
    const token = jwt.sign({ 
      id: user.id, 
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_system_admin: user.is_system_admin,
      organisation_id: user.organisation_id,
      organisation_name: organisation_name
    }, process.env.JWT_SECRET, {
      expiresIn: '20m'
    });

    // Audit trail - successful login
    try {
      // Log the successful login using the existing audit trail utility
      await logAuditTrail({
        req,
        user_id: user.id,
        action_type: 'Login',
        module_name: 'Authentication',
        target: user.email,
        result_summary: 'Login successful with MFA',
        status: 'success'
      });
    } catch (auditErr) {
      // Just log the error but don't prevent login
      console.warn('Warning: Could not log to audit trail:', auditErr.message);
    }

    // Continue with sending the response
    res.json({ token, user: userObj });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// Keep your original login endpoint as a fallback or remove it if no longer needed
// router.post('/login', ... your existing login code ...);

module.exports = router;
