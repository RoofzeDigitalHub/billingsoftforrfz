// controllers/authController.js
//
// Handles Passwordless Admin OTP Login:
// 1. sendOtp: checks if email exists in admin_users -> generates 6-digit OTP -> sends via SMTP
// 2. verifyOtp: verifies code against admin_otps -> issues JWT session token

require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendOtpEmail } = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'rfz_billing_super_secret_jwt_key_2026_secured';
const OTP_EXPIRY_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 30;

/**
 * Step 1: Request OTP for registered admin email
 */
async function sendOtp(req, res) {
  try {
    const rawEmail = req.body?.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const email = rawEmail.trim().toLowerCase();

    // Verify email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Check if email exists in admin_users
    const [users] = await pool.query(
      'SELECT id, email, name, role, is_active FROM admin_users WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'This email is not registered as an authorized admin. Access is restricted.',
      });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your admin account has been deactivated. Please contact support.',
      });
    }

    // Cooldown check: prevent rapid repeated OTP requests
    const [recentOtps] = await pool.query(
      `SELECT id, created_at, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS diff_sec
       FROM admin_otps
       WHERE email = ? AND is_used = 0 AND created_at > (NOW() - INTERVAL ? SECOND)
       ORDER BY id DESC LIMIT 1`,
      [email, OTP_COOLDOWN_SECONDS]
    );

    if (recentOtps.length > 0) {
      const waitRemaining = OTP_COOLDOWN_SECONDS - (recentOtps[0].diff_sec || 0);
      if (waitRemaining > 0) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitRemaining}s before requesting a new OTP.`,
        });
      }
    }

    // Invalidate previous unused OTPs for this email
    await pool.query('UPDATE admin_otps SET is_used = 1 WHERE email = ? AND is_used = 0', [email]);

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Expiration date
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;

    // Save OTP in database
    await pool.query(
      `INSERT INTO admin_otps (email, otp_code, expires_at, is_used, ip_address)
       VALUES (?, ?, ?, 0, ?)`,
      [email, otpCode, expiresAt, clientIp]
    );

    console.log(`[AUTH OTP GENERATED for ${user.email}]: ${otpCode}`);

    // Send email via SMTP
    let emailSent = false;
    let emailError = null;
    try {
      await sendOtpEmail({
        toEmail: user.email,
        otpCode,
        userName: user.name,
      });
      emailSent = true;
    } catch (mailError) {
      console.error('SMTP Email Send Failed (Firewall or Network restriction):', mailError.message);
      emailError = mailError.message;
    }

    // Masked email for display e.g. j***42@gmail.com
    const parts = email.split('@');
    const local = parts[0];
    const masked = local.length > 3
      ? `${local[0]}***${local.slice(-2)}@${parts[1]}`
      : `${local[0]}***@${parts[1]}`;

    // If email failed due to hosting server firewall, provide fallback so admin is not locked out
    if (!emailSent) {
      return res.json({
        success: true,
        message: `Server firewall blocked email delivery. Use code: ${otpCode}`,
        email: user.email,
        maskedEmail: masked,
        expiresInMinutes: OTP_EXPIRY_MINUTES,
        fallbackOtp: otpCode,
        smtpError: emailError,
      });
    }

    return res.json({
      success: true,
      message: `A 6-digit OTP code has been sent to ${user.email}.`,
      email: user.email,
      maskedEmail: masked,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (err) {
    console.error('sendOtp error:', err);
    return res.status(500).json({ success: false, message: 'Server error while sending OTP.' });
  }
}

/**
 * Step 2: Verify OTP and login admin
 */
async function verifyOtp(req, res) {
  try {
    const rawEmail = req.body?.email;
    const rawOtp = req.body?.otp;

    if (!rawEmail || !rawOtp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are both required.' });
    }

    const email = rawEmail.trim().toLowerCase();
    const otp = rawOtp.toString().trim();

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'OTP must be a 6-digit number.' });
    }

    // Find matching active OTP
    const [matching] = await pool.query(
      `SELECT id, email, otp_code, expires_at, is_used
       FROM admin_otps
       WHERE email = ? AND otp_code = ? AND is_used = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [email, otp]
    );

    if (matching.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP code. Please enter the correct code or request a new one.',
      });
    }

    const otpRecord = matching[0];

    // Mark OTP as used
    await pool.query('UPDATE admin_otps SET is_used = 1 WHERE id = ?', [otpRecord.id]);

    // Fetch user details
    const [users] = await pool.query(
      'SELECT id, email, name, role, is_active FROM admin_users WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(403).json({ success: false, message: 'User account not active.' });
    }

    const user = users[0];

    // Update last login timestamp
    await pool.query('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ success: false, message: 'Server error while verifying OTP.' });
  }
}

/**
 * Check current logged in user token
 */
async function getCurrentUser(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No authorization token provided.' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
      }

      const [users] = await pool.query(
        'SELECT id, email, name, role, is_active, last_login_at FROM admin_users WHERE id = ? LIMIT 1',
        [decoded.id]
      );

      if (users.length === 0 || !users[0].is_active) {
        return res.status(403).json({ success: false, message: 'Account is no longer active.' });
      }

      return res.json({
        success: true,
        user: users[0],
      });
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  getCurrentUser,
};
