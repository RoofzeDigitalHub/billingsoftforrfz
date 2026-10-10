// src/api/auth.js
import { http } from "./http";

export const authApi = {
  /**
   * Request OTP code to be sent to authorized admin email
   */
  sendOtp: (email) => http.post("/auth/send-otp", { email }),

  /**
   * Verify OTP and receive JWT token + admin profile
   */
  verifyOtp: (email, otp) => http.post("/auth/verify-otp", { email, otp }),

  /**
   * Fetch current session info
   */
  getCurrentUser: () => http.get("/auth/me"),
};
