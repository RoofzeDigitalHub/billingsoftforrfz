// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const path = require('path');
const fs = require('fs');

const pool = require('./config/db');
const apiRoutes = require('./routes');
const { ensureProposalTables } = require('./scripts/migrate-proposals');
const { ensureAdminAuthTables } = require('./scripts/migrate-admin-auth');

const app = express();
const PORT = process.env.PORT || 5000;

const uploadsDir = path.join(__dirname, 'uploads', 'payments');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
// 25mb: proposals and payment screenshots can contain images (stored as data: URLs or files)
app.use(express.json({ limit: '25mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'Roofze Invoice Billing API is running' });
});

// Quick way to confirm the DB connection from Workbench is actually reachable
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    let proposals = 'ready';
    try {
      await pool.query('SELECT 1 FROM proposals LIMIT 1');
    } catch (e) {
      proposals = `tables missing (${e.code || e.message})`;
    }
    res.json({ success: true, db: 'connected', proposals });
  } catch (err) {
    res.status(500).json({ success: false, db: 'disconnected', error: err.message });
  }
});

app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Make sure the proposal & admin auth tables exist (safe every time: CREATE TABLE IF NOT EXISTS).
ensureProposalTables({ log: () => {} })
  .then(() => console.log('\u2705 Proposal tables ready'))
  .catch((err) => console.error(`\u26A0\uFE0F  Proposal tables could not be prepared: ${err.message}`));

ensureAdminAuthTables({ log: () => {} })
  .then(() => console.log('\u2705 Admin auth tables and seed users ready'))
  .catch((err) => console.error(`\u26A0\uFE0F  Admin auth tables could not be prepared: ${err.message}`));

app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
  console.log(`✅ Health check:   http://localhost:${PORT}/api/health`);
});
