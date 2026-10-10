// src/api/reports.js
import { http } from "./http";

export async function getClientLedgerReport(params = {}) {
  const query = new URLSearchParams();
  if (params.client_id) query.set("client_id", params.client_id);
  if (params.search) query.set("search", params.search);
  if (params.start_date) query.set("start_date", params.start_date);
  if (params.end_date) query.set("end_date", params.end_date);

  const res = await http.get(`/reports/client-ledger?${query.toString()}`);
  return res;
}

export async function getIncomeExpenseReport(params = {}) {
  const query = new URLSearchParams();
  if (params.view_by) query.set("view_by", params.view_by);
  if (params.year) query.set("year", params.year);
  if (params.month) query.set("month", params.month);
  if (params.start_date) query.set("start_date", params.start_date);
  if (params.end_date) query.set("end_date", params.end_date);

  const res = await http.get(`/reports/income-expense?${query.toString()}`);
  return res;
}
