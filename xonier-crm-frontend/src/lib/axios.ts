import axios from "axios";
import { store } from "@/src/store";
import { logout, setAuthState, setIsAdmin } from "@/src/store/slices/authSlice";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];
let isRedirecting = false;

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(null);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // ⛔ Skip auth endpoints to avoid loop
    const url = originalRequest?.url || "";
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh");

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(api(originalRequest)),
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const data = res.data.data;

        if (data?.access_token) {
          localStorage.setItem("access_token", data.access_token);
          api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
        }

        store.dispatch(setAuthState(data));

        if (data?.userRole?.some((r: any) => r.code === SUPER_ADMIN_ROLE_CODE)) {
          store.dispatch(setIsAdmin());
        }

        processQueue(null);

        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError);

        // ❌ Only redirect if NOT already on login page
        if (!isRedirecting && typeof window !== "undefined") {
          const path = window.location.pathname;

          if (path !== "/login") {
            isRedirecting = true;

            store.dispatch(logout());
            window.location.replace("/login");
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;