// utils/emailService.js
//
// SMTP Email delivery service using Nodemailer and Gmail SMTP credentials.
// Sends high-converting, branded HTML emails with OTP codes.

require('dotenv').config();
const nodemailer = require('nodemailer');

// Create a transporter function with specified port/security
function createSmtpTransporter(customPort, customSecure) {
  const host = process.env.SMTP_HOST || 'roofze.com';
  const port = customPort || parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = customSecure !== undefined ? customSecure : (port === 465);

  return nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER || 'jay@roofze.com',
      pass: process.env.SMTP_PASS || '5pd6n#Q94',
    },
    connectionTimeout: 10000, // 10 seconds timeout
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

let transporter = createSmtpTransporter();

/**
 * Sends a branded OTP verification email to the recipient.
 * If the primary SMTP port (e.g. 587 or 465) fails,
 * it automatically attempts fallback to the alternative port (465 / 587).
 */
async function sendOtpEmail({ toEmail, otpCode, userName = 'Admin' }) {
  const fromAddress = process.env.SMTP_FROM || 'Roofze Digital Hub <jay@roofze.com>';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Admin Login OTP - Roofze Digital Hub</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0f172a; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 520px; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); padding: 32px 30px; text-align: center; border-bottom: 1px solid #334155;">
              <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background: #020617; border-radius: 10px; width: 44px; height: 44px; text-align: center; vertical-align: middle; border: 1px solid rgba(255,255,255,0.2);">
                    <span style="font-size: 18px; font-weight: 800; color: #bef264;">RZ</span>
                  </td>
                  <td style="padding-left: 14px; text-align: left;">
                    <div style="font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">ROOF<span style="color: #bef264;">ZE</span> DIGITAL HUB</div>
                    <div style="font-size: 10px; color: #94a3b8; letter-spacing: 1px;">INVOICE & BILLING PORTAL</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #ffffff;">Admin Login Verification</h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hello <strong style="color: #f1f5f9;">${userName}</strong>,<br>
                A request was made to sign in to your Roofze Digital Hub Admin Console. Use the one-time code below to complete your login:
              </p>

              <!-- OTP Code Display Box -->
              <div style="background: #090d16; border: 2px dashed #bef264; border-radius: 12px; padding: 22px 16px; margin: 24px 0; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #bef264; margin-bottom: 8px;">
                  Your One-Time Passcode
                </div>
                <div style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #ffffff; font-family: 'Courier New', Courier, monospace; padding-left: 10px;">
                  ${otpCode}
                </div>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 13px; color: #f59e0b;">
                ⏱️ This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.
              </p>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                If you did not initiate this login request, someone may be trying to access your account. Please notify the security administrator immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                © ${new Date().getFullYear()} Roofze Digital Hub LLP · Internal Billing & Proposal System<br>
                Automated security notification · Please do not reply to this email
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const mailOptions = {
    from: fromAddress,
    to: toEmail,
    subject: `🔐 ${otpCode} is your Roofze Admin Login Code`,
    text: `Your Roofze Admin Login OTP is: ${otpCode}. Valid for 10 minutes. Do not share this code.`,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (primaryError) {
    console.warn(`[SMTP] Primary attempt failed (${primaryError.message}). Attempting fallback on alternative port...`);

    // Determine alternative port (switch between 587 and 465)
    const currentPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const fallbackPort = currentPort === 465 ? 587 : 465;
    const fallbackSecure = fallbackPort === 465;

    try {
      const fallbackTransporter = createSmtpTransporter(fallbackPort, fallbackSecure);
      const fallbackInfo = await fallbackTransporter.sendMail(mailOptions);
      console.log(`[SMTP] Fallback succeeded on port ${fallbackPort}!`);
      // Update default transporter to the working one
      transporter = fallbackTransporter;
      return { success: true, messageId: fallbackInfo.messageId };
    } catch (fallbackError) {
      console.error('[SMTP] Both primary and fallback attempts failed.');
      throw new Error(`Primary port ${currentPort}: ${primaryError.message} | Fallback port ${fallbackPort}: ${fallbackError.message}`);
    }
  }
}

/**
 * Verify transporter configuration.
 */
async function verifyTransporter() {
  return transporter.verify();
}

module.exports = {
  transporter,
  sendOtpEmail,
  verifyTransporter,
};
