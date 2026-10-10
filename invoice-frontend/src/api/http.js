// src/api/http.js
//
// Thin fetch wrapper for calling the Node/Express backend
// (invoice-backend). Base URL comes from VITE_API_BASE_URL if you set it
// in a .env file, otherwise it defaults to the backend's default port.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("rfz_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // No JSON body (e.g. network error page) — leave body as null.
  }

  if (!res.ok || (body && body.success === false)) {
    const message = body?.message || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return body;
}

export const http = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, data, options) => request(path, { ...options, method: "POST", body: JSON.stringify(data) }),
  put: (path, data, options) => request(path, { ...options, method: "PUT", body: JSON.stringify(data) }),
  patch: (path, data, options) => request(path, { ...options, method: "PATCH", body: JSON.stringify(data) }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};

export { API_BASE };
