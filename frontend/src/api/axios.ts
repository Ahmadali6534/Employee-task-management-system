import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

// SECURITY: the session token now lives in an httpOnly cookie set by the
// backend on /auth/login, not in sessionStorage. httpOnly means client-side
// JavaScript can never read it (there is deliberately no getToken() here
// anymore) -- so a future XSS bug in this app can no longer walk off with
// a live session by reading storage. `withCredentials: true` makes the
// browser attach that cookie automatically on every request; we no longer
// need to (or can) set an Authorization header ourselves.
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Global handling for expired/invalid sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;