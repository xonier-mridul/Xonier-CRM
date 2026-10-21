import axios, { InternalAxiosRequestConfig } from "axios";
import { store } from "@/src/store";
import { logout, setAuthState } from "@/src/store/slices/authSlice";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_BASE_URL, withCredentials: true });
let refreshPromise: Promise<void> | null = null;
let redirecting = false;
let memoryClientId = "";
const terminal = new Set(["SESSION_REPLACED", "SESSION_EXPIRED", "ACCOUNT_DISABLED"]);
const publicAuth = /\/auth\/(?:admin-login|login|verify-admin-login-otp|verify-login-otp|resend-admin-login-otp|resend-login-otp|forgot-password|verify-forgot-pass-otp|find-company-id|refresh)(?:$|\?)/;

export function clientId(): string {
  if (typeof window === "undefined") return "";
  try {
    let value = localStorage.getItem("trakeroo_client_id");
    if (!value) { value = crypto.randomUUID(); localStorage.setItem("trakeroo_client_id", value); }
    return value;
  } catch {
    if (!memoryClientId) memoryClientId = crypto.randomUUID();
    return memoryClientId;
  }
}

export function cleanProfile(value: Record<string, unknown>) {
  const profile = { ...value };
  for (const key of ["accessToken", "refreshToken", "access_token", "refresh_token", "password"]) delete profile[key];
  return profile;
}

export function endSession(reason = "SESSION_EXPIRED", broadcast = true) {
  if (typeof window === "undefined" || redirecting) return;
  redirecting = true;
  const loginPath = store.getState().auth.isAdmin ? "/admin-login" : "/login";
  store.dispatch(logout());
  if (broadcast) {
    try { localStorage.setItem("trakeroo_session_ended", JSON.stringify({ reason, at: Date.now() })); } catch { /* Storage may be disabled. */ }
  }
  window.location.replace(loginPath + "?reason=" + encodeURIComponent(reason));
}

api.interceptors.request.use(config => {
  if (typeof window !== "undefined") config.headers["X-Client-ID"] = clientId();
  // Browser auth is HttpOnly cookies only. Never resurrect a stale bearer token
  // from localStorage after rotation or an account switch.
  return config;
});

api.interceptors.response.use(
  response => {
    if (/\/auth\/(?:verify-login-otp|verify-admin-login-otp|refresh)$/.test(response.config.url || "") && response.data?.data) {
      response.data.data = cleanProfile(response.data.data);
    }
    return response;
  },
  async error => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code as string | undefined;
    if (!original || publicAuth.test(original.url || "")) return Promise.reject(error);
    if (code && terminal.has(code)) { endSession(code); return Promise.reject(error); }
    if (status !== 401 || original._retry) return Promise.reject(error);
    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/refresh`, {}, {
          withCredentials: true, headers: { "X-Client-ID": clientId() },
        }).then(response => {
          const profile = cleanProfile(response.data.data);
          store.dispatch(setAuthState(profile));
        }).finally(() => { refreshPromise = null; });
      }
      await refreshPromise;
      return api(original);
    } catch (refreshError) {
      if (axios.isAxiosError(refreshError) && [400, 401, 403].includes(refreshError.response?.status || 0)) {
        endSession(refreshError.response?.data?.error?.code || "SESSION_EXPIRED");
      }
      // Offline/database failures do not force logout or retry an unsafe write.
      return Promise.reject(refreshError);
    }
  },
);
export default api;
