const nodemailer = require('nodemailer');

// Railway-aware diagnostics and helpers
const isRailway = !!(
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_STATIC_URL
);
const emailDebug = process.env.EMAIL_DEBUG === 'true';

const maskEmail = (s = '') => {
  try {
    if (!s) return '';
    const at = s.indexOf('@');
    if (at === -1) return s.replace(/.(?=.{2})/g, '*');
    const name = s.slice(0, at);
    const domain = s.slice(at);
    return `${name.slice(0, 2)}***${domain}`;
  } catch {
    return '***';
  }
};

const classifySmtpError = (err) => {
  const info = {
    reason: err?.message || 'Unknown SMTP error',
    suggestions: []
  };
  const code = err?.code;
  const respCode = err?.responseCode;
  const resp = (err?.response || '').toString();

  switch (code) {
    case 'ETIMEDOUT':
      info.reason = 'SMTP connection timed out';
      info.suggestions.push(
        'If running on Railway, outbound SMTP may be blocked.',
        'Try EMAIL_PORT=587 and EMAIL_SECURE=false (STARTTLS).',
        'Ensure EMAIL_HOST=smtp.gmail.com is reachable.'
      );
      break;
    case 'ECONNECTION':
    case 'ECONNREFUSED':
    case 'EHOSTUNREACH':
      info.reason = 'Failed to connect to SMTP server';
      info.suggestions.push(
        'Verify EMAIL_HOST and EMAIL_PORT.',
        'Check firewall/egress rules on host (Railway may block 465).',
        'Use port 587 with EMAIL_SECURE=false.'
      );
      break;
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      info.reason = 'DNS lookup failed for SMTP host';
      info.suggestions.push('Check EMAIL_HOST and DNS/network availability.');
      break;
    case 'EAUTH':
      info.reason = 'SMTP authentication failed';
      info.suggestions.push(
        'Use a Gmail App Password (16 chars, no spaces, no quotes).',
        'Set EMAIL_USER to the Gmail address and EMAIL_PASSWORD to the App Password.'
      );
      break;
    case 'ESOCKET':
    case 'ETLS':
    case 'EPROTO':
      info.reason = 'TLS/Socket error during SMTP handshake';
      info.suggestions.push(
        'Ensure EMAIL_SECURE matches the port (false for 587, true for 465).',
        'Try port 587 with EMAIL_SECURE=false to negotiate STARTTLS.'
      );
      break;
    default:
      break;
  }

  switch (respCode) {
    case 535:
    case 534:
    case 530:
      info.reason = 'Authentication rejected by SMTP server';
      info.suggestions.push(
        'Confirm App Password usage and 2FA is enabled in Gmail.',
        'Ensure EMAIL_PASSWORD has no quotes and no spaces.'
      );
      break;
    case 421:
    case 451:
    case 454:
      info.reason = 'Temporary SMTP failure or rate-limited';
      info.suggestions.push('Retry later; provider may be throttling.');
      break;
    case 550:
    case 553:
    case 554:
      info.reason = 'SMTP policy rejection';
      info.suggestions.push(
        'Check FROM address (EMAIL_FROM) and domain policy.',
        'Use the Gmail account as FROM or configure domain auth.'
      );
      break;
    default:
      break;
  }

  if (/App\s*Password/i.test(resp)) {
    info.suggestions.push('Gmail indicates an App Password is required.');
  }

  return info;
};

// Create reusable transporter object using SMTP transport
let transporter = null;

const initializeTransporter = () => {
  if (transporter) {
    return transporter;
  }

  try {
    // Quick sanity check for common pitfalls
    const pwd = process.env.EMAIL_PASSWORD || '';
    if (/['"]/g.test(pwd) || /\s/.test(pwd)) {
      console.warn('⚠️ EMAIL_PASSWORD seems to include quotes or spaces. Gmail App Passwords must be 16 characters with no spaces and no quotes.');
    }
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ Missing required email configuration:');
      console.error('   Required: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD');
      return null;
    }

    const isGmailSmtp = (process.env.EMAIL_HOST || '').includes('gmail.com') || (process.env.EMAIL_USER || '').includes('@gmail.com');
    const transportOptions = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      // true for 465, false for 587/others. If EMAIL_SECURE isn't set, infer from port.
      secure: process.env.EMAIL_SECURE
        ? process.env.EMAIL_SECURE === 'true'
        : String(process.env.EMAIL_PORT) === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      requireTLS: String(process.env.EMAIL_PORT) === '587',
      logger: emailDebug,
      debug: emailDebug,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000
    };
    if (isGmailSmtp) {
      transportOptions.service = 'gmail';
    }
    transporter = nodemailer.createTransport(transportOptions);

    transporter.on('error', (err) => {
      console.error('❌ [SMTP ERROR]', {
        message: err.message,
        code: err.code,
        errno: err.errno,
        syscall: err.syscall
      });
    });

    transporter.verify((error, success) => {
      if (error) {
        const info = classifySmtpError(error);
        console.error('❌ SMTP Connection Verification Failed:', {
          env: isRailway ? 'Railway' : (process.env.NODE_ENV || 'unknown'),
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT),
          secure: process.env.EMAIL_SECURE || (String(process.env.EMAIL_PORT) === '465' ? 'true' : 'false'),
          user: maskEmail(process.env.EMAIL_USER),
          reason: info.reason,
          suggestions: info.suggestions
        });
      } else {
        console.log('✅ SMTP Connection Verified');
      }
    });

    return transporter;
  } catch (error) {
    console.error('❌ Failed to initialize email transporter:', {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
};

const sendVerificationEmail = async (email, code) => {
  try {
    const transporter = initializeTransporter();

    if (!transporter) {
      logFallbackVerification(email, code);
      return true;
    }

    const mailOptions = {
      from: `"PIP Intel System" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your PIP Intel Verification Code',
      returnPath: 'bounces@pipintel.com',
      html: `
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Segoe UI', sans-serif; background-color: #f4f4f4; max-width: 600px; margin: auto; padding: 0; }
            .container { background: #fff; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .code-container { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 30px; margin: 30px 0; text-align: center; }
            .code { font-family: monospace; font-size: 42px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
            .expiry { color: #dc3545; font-weight: 500; margin-top: 15px; font-size: 16px; }
            .message { color: #666; margin: 20px 0; line-height: 1.8; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0; color: #856404; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 13px; color: #6c757d; border-top: 1px solid #e9ecef; }
            .logo { font-size: 50px; margin-bottom: 10px; }
          </style>
        </head><body>
          <div class="container">
            <div class="header"><div class="logo">🔐</div><h1>PIP Intel Verification</h1></div>
            <div class="content">
              <p class="message">Hello,<br><br>You’ve requested to log in to the PIP Intel System. Use the code below:</p>
              <div class="code-container">
                <p class="code">${code}</p>
                <p class="expiry">⏱ Valid for 10 minutes only</p>
              </div>
              <p class="message">Enter this code on the verification screen to access your account.</p>
              <div class="warning"><strong>⚠️ Security Notice:</strong><br>If you didn’t request this, ignore this email and secure your account.</div>
            </div>
            <div class="footer">
              <p>This is an automated message from PIP Intel.</p>
              <p>Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} PIP Intel. All rights reserved.</p>
            </div>
          </div>
        </body></html>`,
      text: `
PIP Intel Verification Code

Your verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email and ensure your account is secure.

This is an automated message. Please do not reply.`
    };

    // Primary attempt with configured settings
    if (emailDebug) {
      console.log('📨 SMTP send attempt:', {
        env: isRailway ? 'Railway' : (process.env.NODE_ENV || 'unknown'),
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE || (String(process.env.EMAIL_PORT) === '465' ? 'true' : 'false'),
        from: maskEmail(process.env.EMAIL_FROM || process.env.EMAIL_USER),
        to: maskEmail(email)
      });
    }
    try {
      await transporter.sendMail(mailOptions);
    } catch (sendErr) {
      const configuredPort = parseInt(process.env.EMAIL_PORT);
      const configuredSecure = process.env.EMAIL_SECURE
        ? process.env.EMAIL_SECURE === 'true'
        : String(process.env.EMAIL_PORT) === '465';
      const isTimeoutOrConn = sendErr?.code === 'ETIMEDOUT' || sendErr?.code === 'ECONNECTION';
      const canRetryOn587 = (configuredPort === 465 || configuredSecure === true);
      if (isTimeoutOrConn && canRetryOn587) {
        console.warn('⚠️ SMTP send failed on 465 (secure). Retrying with STARTTLS on port 587...');
        const isGmailSmtp = (process.env.EMAIL_HOST || '').includes('gmail.com') || (process.env.EMAIL_USER || '').includes('@gmail.com');
        const fallbackOptions = {
          host: process.env.EMAIL_HOST,
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          },
          requireTLS: true,
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 15000
        };
        if (isGmailSmtp) {
          fallbackOptions.service = 'gmail';
        }
        const fallbackTransporter = nodemailer.createTransport(fallbackOptions);
        await fallbackTransporter.sendMail(mailOptions);
      } else {
        throw sendErr;
      }
    }

    // Only show the verification code, not message details
    console.log('\n==================================================');
    console.log(`🔐 VERIFICATION CODE for ${email}: ${code}`);
    console.log('==================================================\n');

    return true;
  } catch (error) {
    // Rich, actionable diagnostics for Railway and general SMTP
    const info = classifySmtpError(error);
    console.error('❌ Email sending failed:', {
      env: isRailway ? 'Railway' : (process.env.NODE_ENV || 'unknown'),
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE || (String(process.env.EMAIL_PORT) === '465' ? 'true' : 'false'),
      user: maskEmail(process.env.EMAIL_USER),
      reason: info.reason,
      suggestions: info.suggestions,
      code: error.code,
      responseCode: error.responseCode,
      errno: error.errno
    });
    if (emailDebug) {
      console.error('🧰 Raw SMTP error:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
    }
    logFallbackVerification(email, code);
    return true;
  }
};

// Helper fallback logger
const logFallbackVerification = (email, code) => {
  console.log('\n==================================================');
  console.log(`🔐 VERIFICATION CODE for ${email}: ${code}`);
  console.log('📧 Email not sent due to configuration issues');
  console.log('==================================================\n');
};

console.log('🔧 Starting email service initialization...');
initializeTransporter();

module.exports = { sendVerificationEmail };
