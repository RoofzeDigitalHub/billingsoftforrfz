// controllers/invoiceController.js
//
// Invoices are NOT handled by the generic CRUD controller because saving one
// touches several tables at once (invoices + invoice_items +
// invoice_item_milestones + invoice_sequences) and must be all-or-nothing.
//
//   GET   /api/invoices                 list (header rows, newest first)
//   GET   /api/invoices/next-number     preview of next numbers (temp random & official)
//   GET   /api/invoices/:id             one invoice with items + milestones
//   POST  /api/invoices                 create (unpaid with random temp number)
//   PATCH /api/invoices/:id/status      mark PAID (generates official invoice number) / PENDING

const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { getTableColumns } = require('../utils/schemaUtils');
const {
  HttpError,
  INVOICE_TYPES,
  PAYMENT_STATUSES,
  getFinancialYear,
  startSequenceFor,
  buildInvoiceNumber,
  computeInvoice,
} = require('../utils/invoiceMath');
const { syncInvoicePaidToExpenses, removeInvoiceExpenseSync } = require('../utils/expenseSync');

// DATE columns are formatted in SQL so the API returns "2026-09-28" and not a
// JS Date that shifts by the server's timezone. DECIMALs are converted to
// numbers in serialize() below (mysql2 returns them as strings).
const INVOICE_COLUMNS = `
  i.id, i.invoice_number, i.billing_location_id, i.financial_year, i.sequence_number,
  DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date, i.invoice_type,
  i.client_id, i.client_name, i.client_contact, i.client_address, i.client_state,
  i.client_pan, i.client_gst_number,
  i.gross_amount, i.subtotal_amount, i.gst_percentage, i.gst_amount, i.total_amount,
  i.payment_status, i.payment_mode, i.payment_reference, i.amount_paid, i.payment_screenshot,
  DATE_FORMAT(i.payment_date, '%Y-%m-%d') AS payment_date, i.terms, i.show_bank_details,
  UNIX_TIMESTAMP(i.created_at) * 1000 AS created_at_ms,
  UNIX_TIMESTAMP(i.paid_at) * 1000 AS paid_at_ms`;

const num = (v) => (v === null || v === undefined ? null : Number(v));

function serializeInvoice(row, items) {
  const out = {
    id: row.id,
    invoice_number: row.invoice_number,
    billing_location_id: row.billing_location_id,
    financial_year: row.financial_year,
    sequence_number: row.sequence_number,
    invoice_date: row.invoice_date,
    invoice_type: row.invoice_type,
    client_id: row.client_id,
    client_name: row.client_name,
    client_contact: row.client_contact,
    client_address: row.client_address,
    client_state: row.client_state,
    client_pan: row.client_pan,
    client_gst_number: row.client_gst_number,
    gross_amount: num(row.gross_amount),
    subtotal_amount: num(row.subtotal_amount),
    gst_percentage: num(row.gst_percentage),
    gst_amount: num(row.gst_amount),
    total_amount: num(row.total_amount),
    payment_status: row.payment_status,
    payment_mode: row.payment_mode,
    payment_reference: row.payment_reference,
    payment_date: row.payment_date,
    amount_paid: num(row.amount_paid),
    payment_screenshot: row.payment_screenshot || null,
    terms: row.terms,
    show_bank_details: !!row.show_bank_details,
    created_at_ms: num(row.created_at_ms),
    paid_at_ms: num(row.paid_at_ms),
  };
  if (items) out.items = items;
  return out;
}

function saveScreenshot(dataUrl, invoiceId) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const trimmed = dataUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('http')) return trimmed;

  const matches = trimmed.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches) {
    return trimmed.slice(0, 500);
  }

  try {
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'payments');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filename = `screenshot-${invoiceId || 'new'}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);
    return `/uploads/payments/${filename}`;
  } catch (err) {
    console.error('Failed to save screenshot file:', err);
    return null;
  }
}

async function generateUniqueTempInvoiceNumber(conn) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const rand = Math.floor(100000 + Math.random() * 900000);
    const tempNum = `TMP-${rand}`;
    const [existing] = await conn.query('SELECT id FROM invoices WHERE invoice_number = ?', [tempNum]);
    if (existing.length === 0) {
      return tempNum;
    }
  }
  return `TMP-${Date.now().toString().slice(-6)}`;
}

async function attachItems(conn, invoiceRows) {
  if (invoiceRows.length === 0) return [];
  const ids = invoiceRows.map((r) => r.id);

  const [itemRows] = await conn.query(
    `SELECT * FROM invoice_items WHERE invoice_id IN (?) ORDER BY invoice_id, line_no`,
    [ids]
  );
  const itemIds = itemRows.map((r) => r.id);
  const [msRows] = itemIds.length
    ? await conn.query(
        `SELECT * FROM invoice_item_milestones WHERE invoice_item_id IN (?) ORDER BY invoice_item_id, milestone_no`,
        [itemIds]
      )
    : [[]];

  const msByItem = {};
  msRows.forEach((m) => {
    (msByItem[m.invoice_item_id] = msByItem[m.invoice_item_id] || []).push({
      id: m.id,
      milestone_no: m.milestone_no,
      label: m.label,
      percent: num(m.percent),
      amount: num(m.amount),
      billed: !!m.is_billed,
      already_billed: !!m.already_billed,
    });
  });

  const itemsByInvoice = {};
  itemRows.forEach((it) => {
    (itemsByInvoice[it.invoice_id] = itemsByInvoice[it.invoice_id] || []).push({
      id: it.id,
      line_no: it.line_no,
      service_description: it.service_description,
      qty: num(it.qty),
      total_price: num(it.total_price),
      price_percentage: num(it.price_percentage),
      tax_rate: num(it.tax_rate),
      taxable_amount: num(it.taxable_amount),
      tax_amount: num(it.tax_amount),
      line_total: num(it.line_total),
      milestones: msByItem[it.id] || [],
    });
  });

  return invoiceRows.map((r) => serializeInvoice(r, itemsByInvoice[r.id] || []));
}

async function loadInvoice(conn, id) {
  const [rows] = await conn.query(`SELECT ${INVOICE_COLUMNS} FROM invoices i WHERE i.id = ?`, [id]);
  if (rows.length === 0) return null;
  const [full] = await attachItems(conn, rows);
  return full;
}

async function findLocation(conn, id) {
  if (id === undefined || id === null || id === '') throw new HttpError(400, 'Please select a billing location.');
  const { primaryKey } = await getTableColumns('billing_location');
  const [rows] = await conn.query(`SELECT * FROM \`billing_location\` WHERE \`${primaryKey}\` = ?`, [id]);
  if (rows.length === 0) {
    throw new HttpError(
      400,
      `Billing location ${id} does not exist in the billing_location table. ` +
        `The location list in the app must use ids that exist in the database.`
    );
  }
  return { row: rows[0], id: rows[0][primaryKey] };
}

// Whether a location is GST or not: the DB column wins if it exists,
// otherwise fall back to what the app says.
function resolveLocationType(row, fallback) {
  if (Object.prototype.hasOwnProperty.call(row, 'gst_applicable')) {
    const v = Buffer.isBuffer(row.gst_applicable) ? row.gst_applicable[0] : row.gst_applicable;
    return v ? 'GST' : 'NON_GST';
  }
  return fallback === 'GST' ? 'GST' : 'NON_GST';
}

function handleError(res, err) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  if (err.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({
      success: false,
      message: 'Invoice tables are missing in the database. Run "npm run migrate" in invoice-backend first.',
    });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'That invoice number was just taken — please save again.' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ success: false, message: 'The selected client or billing location no longer exists.' });
  }
  console.error(err);
  return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
}

const str = (v, max) => {
  const s = v === undefined || v === null ? '' : String(v).trim();
  return s === '' ? null : s.slice(0, max);
};

module.exports = {
  // GET /api/invoices?limit=&offset=
  async getAll(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
      const offset = parseInt(req.query.offset, 10) || 0;
      const [rows] = await pool.query(
        `SELECT ${INVOICE_COLUMNS} FROM invoices i ORDER BY i.id DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM invoices');
      res.json({ success: true, data: rows.map((r) => serializeInvoice(r)), total, limit, offset });
    } catch (err) {
      handleError(res, err);
    }
  },

  // GET /api/invoices/next-number?location_id=1&date=2026-09-28&location_type=GST
  // Returns temporary random number for unpaid invoices, and preview of next official sequential number.
  async nextNumber(req, res) {
    try {
      const location = await findLocation(pool, req.query.location_id);
      const financialYear = getFinancialYear(req.query.date);
      const type = resolveLocationType(location.row, req.query.location_type);

      const [rows] = await pool.query(
        'SELECT last_sequence FROM invoice_sequences WHERE billing_location_id = ? AND financial_year = ?',
        [location.id, financialYear]
      );
      const sequence = rows.length ? rows[0].last_sequence + 1 : startSequenceFor(type);
      const officialNextNumber = buildInvoiceNumber(financialYear, sequence);
      const rand = Math.floor(100000 + Math.random() * 900000);
      const tempNumber = `TMP-${rand}`;

      res.json({
        success: true,
        data: {
          invoice_number: tempNumber, // default number for unpaid invoice
          temp_number: tempNumber,
          official_next_number: officialNextNumber,
          financial_year: financialYear,
          sequence_number: sequence,
        },
      });
    } catch (err) {
      handleError(res, err);
    }
  },

  // GET /api/invoices/client-milestones?client_id=...&client_name=...
  // Returns previous milestone projects for this client with already billed vs pending statuses
  async getClientMilestones(req, res) {
    try {
      const clientId = req.query.client_id;
      const clientName = req.query.client_name ? String(req.query.client_name).trim().toLowerCase() : null;

      let whereClause = "i.invoice_type = 'MILESTONE'";
      const params = [];

      if (clientId && clientId !== 'undefined' && clientId !== 'null') {
        whereClause += " AND (i.client_id = ? OR LOWER(i.client_name) = ?)";
        params.push(clientId, clientName || '');
      } else if (clientName) {
        whereClause += " AND LOWER(i.client_name) = ?";
        params.push(clientName);
      }

      const [invoiceRows] = await pool.query(
        `SELECT ${INVOICE_COLUMNS} FROM invoices i WHERE ${whereClause} ORDER BY i.id DESC`,
        params
      );

      if (invoiceRows.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const fullInvoices = await attachItems(pool, invoiceRows);
      const projectMap = new Map();

      for (const inv of fullInvoices) {
        for (const item of (inv.items || [])) {
          if (!item.milestones || item.milestones.length === 0) continue;

          const key = (item.service_description || '').trim().toLowerCase();
          if (!projectMap.has(key)) {
            projectMap.set(key, {
              project_title: item.service_description,
              total_price: item.total_price,
              qty: item.qty,
              tax_rate: item.tax_rate,
              latest_invoice_id: inv.id,
              latest_invoice_number: inv.invoice_number,
              invoices: [],
              milestones: item.milestones.map((m) => ({
                id: m.id,
                milestone_no: m.milestone_no || (m.label ? parseInt(m.label.replace(/\D/g, ''), 10) : 1),
                label: m.label,
                percent: m.percent,
                amount: m.amount,
                is_billed_previously: false,
                billed_in: null,
              })),
            });
          }

          const project = projectMap.get(key);
          project.invoices.push({
            id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            payment_status: inv.payment_status,
          });

          // Check which milestone was billed in this invoice
          const billedMs = item.milestones.find((m) => m.billed || m.is_billed);
          if (billedMs) {
            const msNo = billedMs.milestone_no || (billedMs.label ? parseInt(billedMs.label.replace(/\D/g, ''), 10) : null);
            const target = project.milestones.find(
              (pm) => (msNo && pm.milestone_no === msNo) || pm.label === billedMs.label
            );
            if (target) {
              target.is_billed_previously = true;
              target.billed_in = inv.invoice_number;
            }
          }

          // Check any milestone marked already_billed in this invoice item
          item.milestones.forEach((m) => {
            if (m.already_billed) {
              const msNo = m.milestone_no || (m.label ? parseInt(m.label.replace(/\D/g, ''), 10) : null);
              const target = project.milestones.find(
                (pm) => (msNo && pm.milestone_no === msNo) || pm.label === m.label
              );
              if (target) {
                target.is_billed_previously = true;
                if (!target.billed_in) target.billed_in = 'Previous Invoice';
              }
            }
          });
        }
      }

      const result = Array.from(projectMap.values()).map((p) => {
        const billedCount = p.milestones.filter((m) => m.is_billed_previously).length;
        const totalCount = p.milestones.length;
        return {
          ...p,
          billed_count: billedCount,
          total_count: totalCount,
          pending_count: totalCount - billedCount,
        };
      });

      return res.json({ success: true, data: result });
    } catch (err) {
      handleError(res, err);
    }
  },

  // GET /api/invoices/:id
  async getById(req, res) {
    try {
      const invoice = await loadInvoice(pool, req.params.id);
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
      res.json({ success: true, data: invoice });
    } catch (err) {
      handleError(res, err);
    }
  },

  // POST /api/invoices
  // If payment_status is PENDING (default), gives it a random temporary number.
  // The official sequential number is generated later upon payment.
  async create(req, res) {
    const body = req.body || {};
    let conn;
    try {
      // ---- validate everything that doesn't need the database ----
      const invoiceType = body.invoice_type || 'DIRECT';
      if (!INVOICE_TYPES.includes(invoiceType)) {
        throw new HttpError(400, `Invoice type must be one of: ${INVOICE_TYPES.join(', ')}.`);
      }
      const financialYear = getFinancialYear(body.invoice_date);
      const clientName = str(body.client_name, 200);
      const clientContact = str(body.client_contact, 200);
      if (!clientName) throw new HttpError(400, 'Please enter the client name.');
      if (!clientContact) throw new HttpError(400, 'Please enter a contact person / phone.');
      const paymentStatus = body.payment_status || 'PENDING';
      if (!PAYMENT_STATUSES.includes(paymentStatus)) throw new HttpError(400, 'Invalid payment status.');

      conn = await pool.getConnection();
      await conn.beginTransaction();

      // ---- location + client must really exist ----
      const location = await findLocation(conn, body.billing_location_id);
      const locationType = resolveLocationType(location.row, body.location_type);
      const isGst = locationType === 'GST';

      let clientId = null;
      if (body.client_id !== undefined && body.client_id !== null && body.client_id !== '') {
        const { primaryKey } = await getTableColumns('clients');
        const [clientRows] = await conn.query(`SELECT \`${primaryKey}\` FROM \`clients\` WHERE \`${primaryKey}\` = ?`, [
          body.client_id,
        ]);
        if (clientRows.length === 0) {
          throw new HttpError(400, 'The selected client was not found in Client Master (it may have been deleted).');
        }
        clientId = clientRows[0][primaryKey];
      }

      // ---- totals are computed here, never taken from the browser ----
      const { items, totals } = computeInvoice(body.items, { invoiceType, isGst });

      let invoiceNumber;
      let sequence = null;

      if (paymentStatus === 'PAID') {
        // If created directly as PAID, generate the sequential official invoice number immediately
        await conn.query(
          `INSERT INTO invoice_sequences (billing_location_id, financial_year, last_sequence)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE last_sequence = last_sequence + 1`,
          [location.id, financialYear, startSequenceFor(locationType)]
        );
        const [[seqRow]] = await conn.query(
          'SELECT last_sequence FROM invoice_sequences WHERE billing_location_id = ? AND financial_year = ?',
          [location.id, financialYear]
        );
        sequence = seqRow.last_sequence;
        invoiceNumber = buildInvoiceNumber(financialYear, sequence);
      } else {
        // Unpaid invoice: generate random temporary number, do NOT increment invoice_sequences
        if (body.invoice_number && String(body.invoice_number).trim().startsWith('TMP-')) {
          const candidate = String(body.invoice_number).trim().slice(0, 30);
          const [exists] = await conn.query('SELECT id FROM invoices WHERE invoice_number = ?', [candidate]);
          if (exists.length === 0) {
            invoiceNumber = candidate;
          } else {
            invoiceNumber = await generateUniqueTempInvoiceNumber(conn);
          }
        } else {
          invoiceNumber = await generateUniqueTempInvoiceNumber(conn);
        }
      }

      const screenshotPath = body.payment_screenshot ? saveScreenshot(body.payment_screenshot) : null;

      const [invResult] = await conn.query(
        `INSERT INTO invoices
          (invoice_number, billing_location_id, financial_year, sequence_number, invoice_date, invoice_type,
           client_id, client_name, client_contact, client_address, client_state, client_pan, client_gst_number,
           gross_amount, subtotal_amount, gst_percentage, gst_amount, total_amount,
           payment_status, paid_at, payment_mode, payment_reference, payment_date, amount_paid, payment_screenshot,
           terms, show_bank_details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceNumber, location.id, financialYear, sequence, body.invoice_date, invoiceType,
          clientId, clientName, clientContact, str(body.client_address, 1000), str(body.client_state, 60),
          str(body.client_pan, 10), str(body.client_gst_number, 15),
          totals.gross_amount, totals.subtotal_amount, totals.gst_percentage, totals.gst_amount, totals.total_amount,
          paymentStatus, paymentStatus === 'PAID' ? new Date() : null,
          str(body.payment_mode, 20), str(body.payment_reference, 100),
          body.payment_date ? str(body.payment_date, 10) : null,
          body.amount_paid !== undefined && body.amount_paid !== null ? Number(body.amount_paid) : null,
          screenshotPath,
          str(body.terms, 5000), body.show_bank_details === false ? 0 : 1,
        ]
      );
      const invoiceId = invResult.insertId;

      for (const item of items) {
        const [itemResult] = await conn.query(
          `INSERT INTO invoice_items
            (invoice_id, line_no, service_description, qty, total_price, price_percentage,
             tax_rate, taxable_amount, tax_amount, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId, item.line_no, item.service_description.slice(0, 255), item.qty, item.total_price,
            item.price_percentage, item.tax_rate, item.taxable_amount, item.tax_amount, item.line_total,
          ]
        );
        for (const m of item.milestones) {
          await conn.query(
            `INSERT INTO invoice_item_milestones
              (invoice_item_id, milestone_no, label, percent, amount, is_billed, already_billed)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [itemResult.insertId, m.milestone_no, m.label, m.percent, m.amount, m.is_billed ? 1 : 0, m.already_billed ? 1 : 0]
          );
        }
      }

      if (paymentStatus === 'PAID') {
        await syncInvoicePaidToExpenses(
          conn,
          { id: invoiceId, invoice_number: invoiceNumber, client_name: clientName, total_amount: totals.total_amount },
          { payment_date: body.payment_date, amount_paid: body.amount_paid, payment_reference: body.payment_reference }
        );
      }

      await conn.commit();
      const saved = await loadInvoice(conn, invoiceId);
      res.status(201).json({ success: true, data: saved });
    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch {
          // connection already gone — nothing to roll back
        }
      }
      handleError(res, err);
    } finally {
      if (conn) conn.release();
    }
  },

  // PATCH /api/invoices/:id/status
  //   { payment_status: "PENDING" }
  //   { payment_status: "PAID", payment_mode, payment_reference, payment_date, amount_paid, payment_screenshot }
  // When an unpaid invoice is marked PAID, its official sequential invoice number is generated.
  async updateStatus(req, res) {
    let conn;
    try {
      const body = req.body || {};
      const status = body.payment_status;
      if (!PAYMENT_STATUSES.includes(status)) {
        throw new HttpError(400, `payment_status must be one of: ${PAYMENT_STATUSES.join(', ')}.`);
      }

      if (status === 'PAID') {
        const mode = String(body.payment_mode || '').trim();
        const reference = String(body.payment_reference || '').trim();
        const date = String(body.payment_date || '').trim();
        const amount = Number(body.amount_paid);

        if (!mode) throw new HttpError(400, 'Payment Mode is required.');
        if (mode.length > 50) throw new HttpError(400, 'Payment Mode is too long.');
        if (!reference) throw new HttpError(400, 'Reference ID is required.');
        if (reference.length > 100) throw new HttpError(400, 'Reference ID cannot be longer than 100 characters.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
          throw new HttpError(400, 'Payment Date is required (YYYY-MM-DD).');
        }
        if (body.amount_paid === '' || body.amount_paid === null || body.amount_paid === undefined ||
            !Number.isFinite(amount) || amount <= 0) {
          throw new HttpError(400, 'Total Payment must be a number greater than 0.');
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [invRows] = await conn.query('SELECT * FROM invoices WHERE id = ? FOR UPDATE', [req.params.id]);
        if (invRows.length === 0) throw new HttpError(404, 'Invoice not found');
        const inv = invRows[0];

        let invoiceNumber = inv.invoice_number;
        let sequence = inv.sequence_number;

        // If this invoice does not have an official sequence number yet (was unpaid / temp number),
        // generate the official sequence number NOW.
        if (sequence === null || sequence === undefined) {
          const location = await findLocation(conn, inv.billing_location_id);
          const locationType = resolveLocationType(location.row);
          const financialYear = inv.financial_year;

          await conn.query(
            `INSERT INTO invoice_sequences (billing_location_id, financial_year, last_sequence)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE last_sequence = last_sequence + 1`,
            [inv.billing_location_id, financialYear, startSequenceFor(locationType)]
          );
          const [[seqRow]] = await conn.query(
            'SELECT last_sequence FROM invoice_sequences WHERE billing_location_id = ? AND financial_year = ?',
            [inv.billing_location_id, financialYear]
          );
          sequence = seqRow.last_sequence;
          invoiceNumber = buildInvoiceNumber(financialYear, sequence);
        }

        const screenshotPath = body.payment_screenshot
          ? saveScreenshot(body.payment_screenshot, inv.id)
          : (inv.payment_screenshot || null);

        await conn.query(
          `UPDATE invoices
           SET invoice_number = ?, sequence_number = ?, payment_status = 'PAID', paid_at = NOW(),
               payment_mode = ?, payment_reference = ?, payment_date = ?, amount_paid = ?,
               payment_screenshot = ?
           WHERE id = ?`,
          [
            invoiceNumber,
            sequence,
            mode,
            reference,
            date,
            Math.round(amount * 100) / 100,
            screenshotPath,
            inv.id,
          ]
        );

        await syncInvoicePaidToExpenses(
          conn,
          { id: inv.id, invoice_number: invoiceNumber, client_name: inv.client_name, total_amount: inv.total_amount },
          { payment_date: date, amount_paid: amount, payment_reference: reference }
        );

        await conn.commit();
        const updated = await loadInvoice(conn, req.params.id);
        res.json({ success: true, data: updated });
      } else {
        // Back to pending: clear the payment details
        const [result] = await pool.query(
          `UPDATE invoices
           SET payment_status = 'PENDING', paid_at = NULL,
               payment_reference = NULL, payment_date = NULL, amount_paid = NULL,
               payment_screenshot = NULL
           WHERE id = ?`,
          [req.params.id]
        );
        if (result.affectedRows === 0) throw new HttpError(404, 'Invoice not found');
        await removeInvoiceExpenseSync(pool, req.params.id);
        res.json({ success: true, data: await loadInvoice(pool, req.params.id) });
      }
    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch {
          // connection already gone
        }
      }
      handleError(res, err);
    } finally {
      if (conn) conn.release();
    }
  },

  // PATCH /api/invoices/:id
  // Updates metadata (client details, address, state, PAN, GSTIN, terms, payment reference, etc.)
  // Strictly locks invoice_number and cost/amounts from being edited!
  async updateDetails(req, res) {
    try {
      const id = req.params.id;
      const inv = await loadInvoice(pool, id);
      if (!inv) throw new HttpError(404, 'Invoice not found');

      const body = req.body || {};
      const updates = [];
      const params = [];

      if (body.client_name !== undefined) {
        const val = str(body.client_name, 200);
        if (!val) throw new HttpError(400, 'Client name cannot be empty');
        updates.push('client_name = ?');
        params.push(val);
      }
      if (body.client_contact !== undefined) {
        const val = str(body.client_contact, 200);
        if (!val) throw new HttpError(400, 'Client contact cannot be empty');
        updates.push('client_contact = ?');
        params.push(val);
      }
      if (body.client_address !== undefined) {
        updates.push('client_address = ?');
        params.push(str(body.client_address, 1000));
      }
      if (body.client_state !== undefined) {
        updates.push('client_state = ?');
        params.push(str(body.client_state, 60));
      }
      if (body.client_pan !== undefined) {
        updates.push('client_pan = ?');
        params.push(str(body.client_pan, 10));
      }
      if (body.client_gst_number !== undefined) {
        updates.push('client_gst_number = ?');
        params.push(str(body.client_gst_number, 15));
      }
      if (body.terms !== undefined) {
        updates.push('terms = ?');
        params.push(str(body.terms, 5000));
      }
      if (body.show_bank_details !== undefined) {
        updates.push('show_bank_details = ?');
        params.push(body.show_bank_details ? 1 : 0);
      }
      if (body.payment_mode !== undefined) {
        updates.push('payment_mode = ?');
        params.push(str(body.payment_mode, 20));
      }
      if (body.payment_reference !== undefined) {
        updates.push('payment_reference = ?');
        params.push(str(body.payment_reference, 100));
      }
      if (body.payment_date !== undefined) {
        updates.push('payment_date = ?');
        params.push(body.payment_date ? str(body.payment_date, 10) : null);
      }

      if (updates.length === 0) {
        return res.json({ success: true, data: inv });
      }

      params.push(id);
      await pool.query(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`, params);

      const updated = await loadInvoice(pool, id);
      res.json({ success: true, data: updated });
    } catch (err) {
      handleError(res, err);
    }
  },
};

