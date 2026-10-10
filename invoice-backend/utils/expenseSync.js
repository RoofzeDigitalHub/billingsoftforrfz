// utils/expenseSync.js
//
// Automatically syncs invoice payments into the expenses table as:
// Type: Credit (Income), Category: Income
// with client name, description, date, and amount.

const pool = require('../config/db');

async function getCreditIncomeIds(conn) {
  // Ensure Credit type exists
  const [types] = await conn.query('SELECT id FROM expense_types WHERE LOWER(name) = ?', ['credit']);
  let typeId = types[0]?.id;
  if (!typeId) {
    const [res] = await conn.query('INSERT INTO expense_types (name) VALUES (?)', ['Credit']);
    typeId = res.insertId;
  }

  // Ensure Income category exists bound to Credit
  const [cats] = await conn.query('SELECT id FROM expense_categories WHERE LOWER(name) = ?', ['income']);
  let categoryId = cats[0]?.id;
  if (!categoryId) {
    const [res] = await conn.query('INSERT INTO expense_categories (name, type_id) VALUES (?, ?)', ['Income', typeId]);
    categoryId = res.insertId;
  }

  return { typeId, categoryId };
}

/**
 * Inserts or updates an expense record when an invoice is marked PAID.
 */
async function syncInvoicePaidToExpenses(conn, invoice, paymentDetails = {}) {
  try {
    const { typeId, categoryId } = await getCreditIncomeIds(conn);

    const date = paymentDetails.payment_date || invoice.payment_date || new Date().toISOString().slice(0, 10);
    const amount = Number(paymentDetails.amount_paid !== undefined ? paymentDetails.amount_paid : invoice.total_amount);
    const clientName = invoice.client_name || 'Client';
    const ref = paymentDetails.payment_reference || invoice.payment_reference || '';
    const desc = `Payment for Invoice #${invoice.invoice_number}${ref ? ` (Ref: ${ref})` : ''}`;

    // Check if a record already exists for this invoice_id
    const [existing] = await conn.query('SELECT id FROM expenses WHERE invoice_id = ?', [invoice.id]);

    if (existing.length > 0) {
      await conn.query(
        `UPDATE expenses
         SET expense_date = ?, type_id = ?, category_id = ?, vendor_person_name = ?,
             description = ?, amount = ?
         WHERE id = ?`,
        [date, typeId, categoryId, clientName, desc, amount, existing[0].id]
      );
    } else {
      await conn.query(
        `INSERT INTO expenses
           (expense_date, type_id, category_id, vendor_person_name, description, amount, invoice_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [date, typeId, categoryId, clientName, desc, amount, invoice.id]
      );
    }
  } catch (err) {
    console.error('Failed to sync invoice payment to expenses:', err);
    // Do not fail invoice status update if sync fails, but log error
  }
}

/**
 * Removes the linked expense record if an invoice is reverted back to PENDING.
 */
async function removeInvoiceExpenseSync(conn, invoiceId) {
  try {
    await conn.query('DELETE FROM expenses WHERE invoice_id = ?', [invoiceId]);
  } catch (err) {
    console.error('Failed to remove invoice payment from expenses:', err);
  }
}

module.exports = {
  syncInvoicePaidToExpenses,
  removeInvoiceExpenseSync,
  getCreditIncomeIds,
};
