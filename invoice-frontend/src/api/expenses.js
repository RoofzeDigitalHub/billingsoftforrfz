// src/api/expenses.js
import { http } from "./http";

export async function getExpenseTypes() {
  const res = await http.get("/expenses/types");
  return res.data || [];
}

export async function getExpenseCategories() {
  const res = await http.get("/expenses/categories");
  return res.data || [];
}

export async function createExpenseCategory(payload) {
  const res = await http.post("/expenses/categories", payload);
  return res.data;
}

export async function getExpenses(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.type_id) query.set("type_id", params.type_id);
  if (params.category_id) query.set("category_id", params.category_id);
  if (params.start_date) query.set("start_date", params.start_date);
  if (params.end_date) query.set("end_date", params.end_date);
  if (params.month) query.set("month", params.month);
  if (params.year) query.set("year", params.year);
  if (params.limit) query.set("limit", params.limit);
  if (params.offset) query.set("offset", params.offset);

  const res = await http.get(`/expenses?${query.toString()}`);
  return res;
}

export async function createExpense(payload) {
  const res = await http.post("/expenses", payload);
  return res.data;
}

export async function updateExpense(id, payload) {
  try {
    const res = await http.post(`/expenses/${encodeURIComponent(id)}/update`, payload);
    return res.data;
  } catch (err) {
    if (err.status === 404 || err.status === 405) {
      const res = await http.put(`/expenses/${encodeURIComponent(id)}`, payload);
      return res.data;
    }
    throw err;
  }
}

export async function deleteExpense(id) {
  try {
    const res = await http.post(`/expenses/${encodeURIComponent(id)}/delete`);
    return res;
  } catch (err) {
    if (err.status === 404 || err.status === 405) {
      const res = await http.delete(`/expenses/${encodeURIComponent(id)}`);
      return res;
    }
    throw err;
  }
}
