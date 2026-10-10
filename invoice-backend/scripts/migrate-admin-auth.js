// scripts/migrate-admin-auth.js
//
// Creates tables for Admin OTP Authentication and seeds initial authorized admin users.
//
//   admin_users - list of authorized emails that are permitted to login
//   admin_otps  - time-limited OTP tokens generated for login verification

require('dotenv').config();
const pool = require('../config/db');

const INITIAL_ADMINS = [
  { email: 'jaymewada42@gmail.com', name: 'Jay Mewada', role: 'Admin' },
  { email: 'roofzedigitalhub@gmail.com', name: 'Roofze Digital Hub', role: 'Super Admin' },
  { email: 'vidyashetye35@gmail.com', name: 'Vidya Shetye', role: 'Admin' },
];

async function ensureAdminAuthTables(options = { log: console.log }) {
  const log = options.log || (() => {});

  // 1. Create admin_users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(120) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_login_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  log('✅ Table `admin_users` verified/created.');

  // 2. Create admin_otps table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp_code VARCHAR(10) NOT NULL,
      expires_at DATETIME NOT NULL,
      is_used TINYINT(1) NOT NULL DEFAULT 0,
      ip_address VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email_otp (email, otp_code, is_used, expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  log('✅ Table `admin_otps` verified/created.');

  // 3. Seed initial admin users
  for (const admin of INITIAL_ADMINS) {
    await pool.query(
      `INSERT INTO admin_users (email, name, role, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         role = VALUES(role),
         is_active = 1`,
      [admin.email.trim().toLowerCase(), admin.name, admin.role]
    );
  }
  log('✅ Initial admin users seeded successfully: ' + INITIAL_ADMINS.map(a => a.email).join(', '));
}

if (require.main === module) {
  ensureAdminAuthTables()
    .then(() => {
      console.log('Migration completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { ensureAdminAuthTables, INITIAL_ADMINS };
