// controllers/expenseController.js
const pool = require('../config/db');

module.exports = {
  // GET /api/expenses/types
  async getTypes(req, res) {
    try {
      const [rows] = await pool.query('SELECT id, name FROM expense_types ORDER BY id ASC');
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/expenses/categories
  async getCategories(req, res) {
    try {
      const [rows] = await pool.query(`
        SELECT c.id, c.name, c.type_id, t.name AS type_name
        FROM expense_categories c
        LEFT JOIN expense_types t ON c.type_id = t.id
        ORDER BY c.name ASC
      `);
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/expenses/categories
  async createCategory(req, res) {
    try {
      const { name, type_id } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Category name is required' });
      }
      const trimmed = String(name).trim();
      const [existing] = await pool.query('SELECT id FROM expense_categories WHERE LOWER(name) = LOWER(?)', [trimmed]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Category already exists' });
      }
      const [result] = await pool.query(
        'INSERT INTO expense_categories (name, type_id) VALUES (?, ?)',
        [trimmed, type_id || null]
      );
      res.status(201).json({
        success: true,
        data: { id: result.insertId, name: trimmed, type_id: type_id || null },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/expenses
  async getAll(req, res) {
    try {
      const {
        search,
        type_id,
        category_id,
        start_date,
        end_date,
        month,
        year,
        limit = 500,
        offset = 0,
      } = req.query;

      const conditions = [];
      const params = [];

      if (search && String(search).trim()) {
        const q = `%${String(search).trim()}%`;
        conditions.push('(e.vendor_person_name LIKE ? OR e.description LIKE ?)');
        params.push(q, q);
      }

      if (type_id) {
        conditions.push('e.type_id = ?');
        params.push(type_id);
      }

      if (category_id) {
        conditions.push('e.category_id = ?');
        params.push(category_id);
      }

      if (start_date) {
        conditions.push('e.expense_date >= ?');
        params.push(start_date);
      }

      if (end_date) {
        conditions.push('e.expense_date <= ?');
        params.push(end_date);
      }

      if (year && !start_date && !end_date) {
        if (month) {
          // e.g. year: 2026, month: 10 or month: '2026-10'
          const mStr = String(month).padStart(2, '0');
          conditions.push('DATE_FORMAT(e.expense_date, "%Y-%m") = ?');
          params.push(mStr.length === 7 ? mStr : `${year}-${mStr}`);
        } else {
          conditions.push('DATE_FORMAT(e.expense_date, "%Y") = ?');
          params.push(String(year));
        }
      } else if (month && !start_date && !end_date) {
        if (String(month).length === 7) {
          conditions.push('DATE_FORMAT(e.expense_date, "%Y-%m") = ?');
          params.push(month);
        } else {
          conditions.push('DATE_FORMAT(e.expense_date, "%m") = ?');
          params.push(String(month).padStart(2, '0'));
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get Summary
      const summaryQuery = `
        SELECT
          COUNT(*) AS total_count,
          COALESCE(SUM(CASE WHEN LOWER(t.name) = 'credit' THEN e.amount ELSE 0 END), 0) AS total_credit,
          COALESCE(SUM(CASE WHEN LOWER(t.name) = 'debit' THEN e.amount ELSE 0 END), 0) AS total_debit
        FROM expenses e
        JOIN expense_types t ON e.type_id = t.id
        JOIN expense_categories c ON e.category_id = c.id
        ${whereClause}
      `;
      const [[summaryRow]] = await pool.query(summaryQuery, params);

      // Get Paginated Data
      const dataQuery = `
        SELECT
          e.id,
          DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS expense_date,
          e.type_id,
          t.name AS type_name,
          e.category_id,
          c.name AS category_name,
          e.vendor_person_name,
          e.description,
          CAST(e.amount AS DECIMAL(14,2)) AS amount,
          e.invoice_id,
          i.invoice_number,
          UNIX_TIMESTAMP(e.created_at) * 1000 AS created_at_ms
        FROM expenses e
        JOIN expense_types t ON e.type_id = t.id
        JOIN expense_categories c ON e.category_id = c.id
        LEFT JOIN invoices i ON e.invoice_id = i.id
        ${whereClause}
        ORDER BY e.expense_date DESC, e.id DESC
        LIMIT ? OFFSET ?
      `;

      const limitNum = Math.min(parseInt(limit, 10) || 500, 1000);
      const offsetNum = parseInt(offset, 10) || 0;
      const [rows] = await pool.query(dataQuery, [...params, limitNum, offsetNum]);

      const totalCredit = parseFloat(summaryRow?.total_credit || 0);
      const totalDebit = parseFloat(summaryRow?.total_debit || 0);

      res.json({
        success: true,
        data: rows.map((r) => ({
          ...r,
          amount: parseFloat(r.amount),
        })),
        summary: {
          total_credit: totalCredit,
          total_debit: totalDebit,
          net_balance: totalCredit - totalDebit,
          count: summaryRow?.total_count || 0,
        },
        total: summaryRow?.total_count || 0,
        limit: limitNum,
        offset: offsetNum,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/expenses
  async create(req, res) {
    try {
      const body = req.body || {};
      const date = String(body.expense_date || '').trim();
      const typeId = parseInt(body.type_id, 10);
      const categoryId = parseInt(body.category_id, 10);
      const person = String(body.vendor_person_name || '').trim();
      const desc = body.description ? String(body.description).trim() : null;
      const amount = parseFloat(body.amount);
      const invoiceId = body.invoice_id ? parseInt(body.invoice_id, 10) : null;

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: 'Valid Date (YYYY-MM-DD) is required' });
      }
      if (!typeId || isNaN(typeId)) {
        return res.status(400).json({ success: false, message: 'Type is required' });
      }
      if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({ success: false, message: 'Category is required' });
      }
      if (!person) {
        return res.status(400).json({ success: false, message: 'Vendor / Person Name is required' });
      }
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
      }

      const [resInsert] = await pool.query(
        `INSERT INTO expenses
           (expense_date, type_id, category_id, vendor_person_name, description, amount, invoice_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [date, typeId, categoryId, person, desc, amount, invoiceId]
      );

      const [rows] = await pool.query(
        `SELECT
           e.id,
           DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS expense_date,
           e.type_id,
           t.name AS type_name,
           e.category_id,
           c.name AS category_name,
           e.vendor_person_name,
           e.description,
           CAST(e.amount AS DECIMAL(14,2)) AS amount,
           e.invoice_id,
           i.invoice_number,
           UNIX_TIMESTAMP(e.created_at) * 1000 AS created_at_ms
         FROM expenses e
         JOIN expense_types t ON e.type_id = t.id
         JOIN expense_categories c ON e.category_id = c.id
         LEFT JOIN invoices i ON e.invoice_id = i.id
         WHERE e.id = ?`,
        [resInsert.insertId]
      );

      res.status(201).json({
        success: true,
        data: {
          ...rows[0],
          amount: parseFloat(rows[0].amount),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // PUT or PATCH /api/expenses/:id
  async update(req, res) {
    try {
      const id = req.params.id;
      const body = req.body || {};

      const [existing] = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      const date = body.expense_date !== undefined ? String(body.expense_date).trim() : existing[0].expense_date;
      const typeId = body.type_id !== undefined ? parseInt(body.type_id, 10) : existing[0].type_id;
      const categoryId = body.category_id !== undefined ? parseInt(body.category_id, 10) : existing[0].category_id;
      const person = body.vendor_person_name !== undefined ? String(body.vendor_person_name).trim() : existing[0].vendor_person_name;
      const desc = body.description !== undefined ? (body.description ? String(body.description).trim() : null) : existing[0].description;
      const amount = body.amount !== undefined ? parseFloat(body.amount) : parseFloat(existing[0].amount);

      if (!date) return res.status(400).json({ success: false, message: 'Valid Date is required' });
      if (!typeId) return res.status(400).json({ success: false, message: 'Type is required' });
      if (!categoryId) return res.status(400).json({ success: false, message: 'Category is required' });
      if (!person) return res.status(400).json({ success: false, message: 'Vendor / Person Name is required' });
      if (isNaN(amount) || amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });

      await pool.query(
        `UPDATE expenses
         SET expense_date = ?, type_id = ?, category_id = ?, vendor_person_name = ?,
             description = ?, amount = ?
         WHERE id = ?`,
        [date, typeId, categoryId, person, desc, amount, id]
      );

      const [rows] = await pool.query(
        `SELECT
           e.id,
           DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS expense_date,
           e.type_id,
           t.name AS type_name,
           e.category_id,
           c.name AS category_name,
           e.vendor_person_name,
           e.description,
           CAST(e.amount AS DECIMAL(14,2)) AS amount,
           e.invoice_id,
           i.invoice_number,
           UNIX_TIMESTAMP(e.created_at) * 1000 AS created_at_ms
         FROM expenses e
         JOIN expense_types t ON e.type_id = t.id
         JOIN expense_categories c ON e.category_id = c.id
         LEFT JOIN invoices i ON e.invoice_id = i.id
         WHERE e.id = ?`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...rows[0],
          amount: parseFloat(rows[0].amount),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/expenses/:id
  async delete(req, res) {
    try {
      const id = req.params.id;
      const [result] = await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }
      res.json({ success: true, message: 'Transaction deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
