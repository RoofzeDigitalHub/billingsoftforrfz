// src/utils/auth.js
//
// Real Backend-Connected Authentication Manager with JWT & Email OTP.

const SESSION_KEY = "rfz_session";
const TOKEN_KEY = "rfz_token";

/**
 * Saves authenticated session and token into localStorage
 */
export function setSession({ token, user }) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (user) {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name || user.email.split("@")[0],
        role: user.role || "Admin",
        loginAt: Date.now(),
      })
    );
  }
}

/**
 * Retrieves the currently logged-in user profile
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Retrieves JWT Bearer token
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

/**
 * Checks whether user is logged in
 */
export function isAuthenticated() {
  return Boolean(getToken() && getSession());
}

/**
 * Logs out and clears session & token
 */
export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
