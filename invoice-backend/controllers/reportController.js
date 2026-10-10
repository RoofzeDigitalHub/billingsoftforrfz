// controllers/reportController.js
const pool = require('../config/db');

module.exports = {
  // GET /api/reports/client-ledger
  // Query: ?client_id=&search=&start_date=&end_date=
  async getClientLedger(req, res) {
    try {
      const { client_id, search, start_date, end_date } = req.query;

      // If no specific client is selected, return the summary table for all clients
      if (!client_id) {
        let where = 'WHERE 1=1';
        const params = [];

        if (search && String(search).trim()) {
          const q = `%${String(search).trim()}%`;
          where += ' AND (c.business_name LIKE ? OR c.client_code LIKE ? OR c.contact_person LIKE ?)';
          params.push(q, q, q);
        }

        const query = `
          SELECT
            c.id AS client_id,
            c.client_code,
            c.business_name,
            c.contact_person,
            c.phone,
            c.email,
            c.city,
            COUNT(i.id) AS total_invoices,
            COUNT(CASE WHEN i.payment_status = 'PAID' THEN 1 END) AS paid_invoices,
            COUNT(CASE WHEN i.payment_status = 'PENDING' THEN 1 END) AS pending_invoices,
            COALESCE(SUM(i.total_amount), 0) AS total_invoiced,
            COALESCE(SUM(CASE WHEN i.payment_status = 'PAID' THEN COALESCE(i.amount_paid, i.total_amount) ELSE 0 END), 0) AS total_paid,
            COALESCE(SUM(CASE WHEN i.payment_status = 'PENDING' THEN i.total_amount ELSE 0 END), 0) AS balance_due,
            MAX(i.invoice_date) AS last_invoice_date
          FROM clients c
          LEFT JOIN invoices i ON c.id = i.client_id
          ${where}
          GROUP BY c.id
          ORDER BY total_invoiced DESC, c.business_name ASC
        `;

        const [clientsSummary] = await pool.query(query, params);

        const totals = clientsSummary.reduce(
          (acc, row) => {
            acc.total_invoiced += parseFloat(row.total_invoiced);
            acc.total_paid += parseFloat(row.total_paid);
            acc.balance_due += parseFloat(row.balance_due);
            acc.total_invoices += parseInt(row.total_invoices, 10);
            return acc;
          },
          { total_invoiced: 0, total_paid: 0, balance_due: 0, total_invoices: 0 }
        );

        return res.json({
          success: true,
          mode: 'list',
          data: clientsSummary.map((r) => ({
            ...r,
            total_invoiced: parseFloat(r.total_invoiced),
            total_paid: parseFloat(r.total_paid),
            balance_due: parseFloat(r.balance_due),
          })),
          summary: totals,
        });
      }

      // Specific client ledger
      const [clientRows] = await pool.query('SELECT * FROM clients WHERE id = ?', [client_id]);
      if (clientRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      const client = clientRows[0];

      // Invoices for this client
      let invWhere = 'WHERE i.client_id = ?';
      const invParams = [client_id];
      if (start_date) {
        invWhere += ' AND i.invoice_date >= ?';
        invParams.push(start_date);
      }
      if (end_date) {
        invWhere += ' AND i.invoice_date <= ?';
        invParams.push(end_date);
      }

      const invQuery = `
        SELECT
          i.id,
          i.invoice_number,
          DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date,
          i.invoice_type,
          i.gross_amount,
          i.subtotal_amount,
          i.gst_percentage,
          i.gst_amount,
          i.total_amount,
          i.payment_status,
          i.payment_mode,
          i.payment_reference,
          DATE_FORMAT(i.payment_date, '%Y-%m-%d') AS payment_date,
          i.amount_paid
        FROM invoices i
        ${invWhere}
        ORDER BY i.invoice_date ASC, i.id ASC
      `;
      const [invoices] = await pool.query(invQuery, invParams);

      // Ledger items generation:
      // An invoice billed increases receivable (Debit)
      // A payment received decreases receivable (Credit)
      const ledgerEntries = [];

      invoices.forEach((inv) => {
        const total = parseFloat(inv.total_amount || 0);
        ledgerEntries.push({
          date: inv.invoice_date,
          type: 'INVOICE',
          doc_number: inv.invoice_number,
          description: `Invoice Raised (${inv.invoice_type})`,
          debit: total, // client owes us
          credit: 0,
          invoice_id: inv.id,
          payment_status: inv.payment_status,
        });

        if (inv.payment_status === 'PAID') {
          const paid = parseFloat(inv.amount_paid !== null ? inv.amount_paid : total);
          ledgerEntries.push({
            date: inv.payment_date || inv.invoice_date,
            type: 'PAYMENT',
            doc_number: inv.payment_reference || `REC-${inv.invoice_number}`,
            description: `Payment Received (${inv.payment_mode || 'Bank/UPI'})`,
            debit: 0,
            credit: paid, // payment settled
            invoice_id: inv.id,
            payment_status: 'PAID',
          });
        }
      });

      // Also check if any direct expense/income transactions exist under this client's name
      const [expenseRows] = await pool.query(
        `SELECT
           e.id,
           DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS expense_date,
           t.name AS type_name,
           c.name AS category_name,
           e.vendor_person_name,
           e.description,
           e.amount,
           e.invoice_id
         FROM expenses e
         JOIN expense_types t ON e.type_id = t.id
         JOIN expense_categories c ON e.category_id = c.id
         WHERE (e.vendor_person_name = ? OR e.vendor_person_name LIKE ?)
           AND e.invoice_id IS NULL
         ORDER BY e.expense_date ASC`,
        [client.business_name, `%${client.business_name}%`]
      );

      expenseRows.forEach((exp) => {
        const amt = parseFloat(exp.amount || 0);
        const isCredit = exp.type_name.toLowerCase() === 'credit';
        ledgerEntries.push({
          date: exp.expense_date,
          type: isCredit ? 'DIRECT_INCOME' : 'DIRECT_EXPENSE',
          doc_number: `TXN-${exp.id}`,
          description: exp.description || exp.category_name,
          debit: isCredit ? 0 : amt,
          credit: isCredit ? amt : 0,
          invoice_id: null,
          payment_status: 'COMPLETED',
        });
      });

      // Sort ledger entries chronologically
      ledgerEntries.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

      // Calculate Running Balance
      let runningBalance = 0;
      const ledger = ledgerEntries.map((entry) => {
        runningBalance += entry.debit - entry.credit;
        return {
          ...entry,
          balance: runningBalance,
        };
      });

      // Summary
      const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
      const totalPaid = invoices
        .filter((i) => i.payment_status === 'PAID')
        .reduce((s, i) => s + parseFloat(i.amount_paid !== null ? i.amount_paid : i.total_amount || 0), 0);
      const balanceDue = totalInvoiced - totalPaid;

      res.json({
        success: true,
        mode: 'detail',
        client: {
          id: client.id,
          client_code: client.client_code,
          business_name: client.business_name,
          contact_person: client.contact_person,
          phone: client.phone,
          email: client.email,
          billing_address: client.billing_address,
          city: client.city,
          pan: client.pan,
          gstin: client.gstin,
        },
        summary: {
          total_invoices: invoices.length,
          paid_invoices: invoices.filter((i) => i.payment_status === 'PAID').length,
          pending_invoices: invoices.filter((i) => i.payment_status === 'PENDING').length,
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          balance_due: balanceDue,
        },
        invoices: invoices.map((i) => ({
          ...i,
          gross_amount: parseFloat(i.gross_amount || 0),
          subtotal_amount: parseFloat(i.subtotal_amount || 0),
          gst_amount: parseFloat(i.gst_amount || 0),
          total_amount: parseFloat(i.total_amount || 0),
          amount_paid: i.amount_paid !== null ? parseFloat(i.amount_paid) : null,
        })),
        ledger,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/reports/income-expense
  // Query: ?view_by=month|year|date&year=&month=&start_date=&end_date=
  async getIncomeExpenseReport(req, res) {
    try {
      const { view_by = 'month', year, month, start_date, end_date } = req.query;

      const conditions = [];
      const params = [];

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

      // 1. Overall Summary
      const summaryQuery = `
        SELECT
          COUNT(*) AS total_count,
          COALESCE(SUM(CASE WHEN LOWER(t.name) = 'credit' THEN e.amount ELSE 0 END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN LOWER(t.name) = 'debit' THEN e.amount ELSE 0 END), 0) AS total_expense
        FROM expenses e
        JOIN expense_types t ON e.type_id = t.id
        ${whereClause}
      `;
      const [[summaryRow]] = await pool.query(summaryQuery, params);
      const totalIncome = parseFloat(summaryRow?.total_income || 0);
      const totalExpense = parseFloat(summaryRow?.total_expense || 0);
      const netProfit = totalIncome - totalExpense;

      // 2. Grouped Time-Series Data (by Month, Year, or Date)
      let groupFormat = '%Y-%m';
      let groupLabelFormat = '%b %Y'; // e.g. Oct 2026
      if (view_by === 'year') {
        groupFormat = '%Y';
        groupLabelFormat = '%Y';
      } else if (view_by === 'date') {
        groupFormat = '%Y-%m-%d';
        groupLabelFormat = '%d %b %Y';
      }

      const groupedQuery = `
        SELECT
          DATE_FORMAT(e.expense_date, '${groupFormat}') AS period_key,
          DATE_FORMAT(e.expense_date, '${groupLabelFormat}') AS period_label,
          COALESCE(SUM(CASE WHEN LOWER(t.name) = 'credit' THEN e.amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN LOWER(t.name) = 'debit' THEN e.amount ELSE 0 END), 0) AS expense,
          COUNT(*) AS transaction_count
        FROM expenses e
        JOIN expense_types t ON e.type_id = t.id
        ${whereClause}
        GROUP BY period_key, period_label
        ORDER BY period_key DESC
      `;
      const [groupedRows] = await pool.query(groupedQuery, params);

      // 3. Category Breakdown
      const catQuery = `
        SELECT
          c.id AS category_id,
          c.name AS category_name,
          t.name AS type_name,
          COALESCE(SUM(e.amount), 0) AS total_amount,
          COUNT(*) AS transaction_count
        FROM expenses e
        JOIN expense_categories c ON e.category_id = c.id
        JOIN expense_types t ON e.type_id = t.id
        ${whereClause}
        GROUP BY c.id, c.name, t.name
        ORDER BY total_amount DESC
      `;
      const [categoryRows] = await pool.query(catQuery, params);

      // Calculate percentages for categories
      const categoryBreakdown = categoryRows.map((cat) => {
        const amt = parseFloat(cat.total_amount || 0);
        const isCredit = cat.type_name.toLowerCase() === 'credit';
        const base = isCredit ? totalIncome : totalExpense;
        const percentage = base > 0 ? (amt / base) * 100 : 0;
        return {
          ...cat,
          total_amount: amt,
          percentage: Math.round(percentage * 10) / 10,
        };
      });

      // 4. Detailed list of transactions for this period
      const txnQuery = `
        SELECT
          e.id,
          DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS expense_date,
          DATE_FORMAT(e.expense_date, '%d %b %Y') AS expense_date_formatted,
          t.name AS type_name,
          c.name AS category_name,
          e.vendor_person_name,
          e.description,
          CAST(e.amount AS DECIMAL(14,2)) AS amount,
          e.invoice_id,
          i.invoice_number
        FROM expenses e
        JOIN expense_types t ON e.type_id = t.id
        JOIN expense_categories c ON e.category_id = c.id
        LEFT JOIN invoices i ON e.invoice_id = i.id
        ${whereClause}
        ORDER BY e.expense_date DESC, e.id DESC
      `;
      const [transactions] = await pool.query(txnQuery, params);

      res.json({
        success: true,
        view_by,
        overview: {
          total_income: totalIncome,
          total_expense: totalExpense,
          net_profit: netProfit,
          profit_margin_pct: totalIncome > 0 ? Math.round((netProfit / totalIncome) * 1000) / 10 : 0,
          transaction_count: summaryRow?.total_count || 0,
        },
        grouped_data: groupedRows.map((r) => {
          const inc = parseFloat(r.income);
          const exp = parseFloat(r.expense);
          return {
            period_key: r.period_key,
            period_label: r.period_label,
            income: inc,
            expense: exp,
            net: inc - exp,
            transaction_count: r.transaction_count,
          };
        }),
        category_breakdown: categoryBreakdown,
        transactions: transactions.map((t) => ({
          ...t,
          amount: parseFloat(t.amount),
        })),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
