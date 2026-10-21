"use client";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { AuthService } from "@/src/services/auth.service";
import { setAuthState } from "@/src/store/slices/authSlice";
import { cleanProfile, endSession } from "@/src/lib/axios";

export default function CheckAuth({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let stopped = false;
    let pending = false;
    let initialized = false;
    const check = async () => {
      if (pending || stopped) return;
      pending = true;
      try {
        if (!initialized) {
          const response = await AuthService.me();
          if (stopped) return;
          const profile = cleanProfile(response.data.data);
          dispatch(setAuthState(profile));
          try {
            localStorage.setItem("auth_user", JSON.stringify(profile));
            localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token");
          } catch { /* Cookies remain the authentication authority. */ }
          initialized = true;
          setStatus("ready");
        } else await AuthService.session();
      } catch (error) {
        if (stopped) return;
        if (axios.isAxiosError(error) && [400, 401, 403].includes(error.response?.status || 0)) {
          endSession(error.response?.data?.error?.code || "SESSION_EXPIRED");
        } else if (!initialized) setStatus("unavailable");
      } finally { pending = false; }
    };
    void check();
    const interval = setInterval(() => { void check(); }, 15000);
    const visible = () => { if (document.visibilityState === "visible") void check(); };
    const storage = (event: StorageEvent) => {
      if (event.key === "trakeroo_session_ended" && event.newValue) {
        try { endSession(JSON.parse(event.newValue).reason, false); } catch { /* Ignore malformed tab notifications. */ }
      }
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("storage", storage);
    return () => {
      stopped = true; clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("storage", storage);
    };
  }, [dispatch, retry]);
  if (status === "loading") return null;
  if (status === "unavailable") return <div role="alert" className="p-8 text-center">
    <p>Unable to verify your session. Check your connection and try again.</p>
    <button type="button" className="mt-4 rounded bg-cyan-700 px-4 py-2 text-white" onClick={() => setRetry(value => value + 1)}>Retry</button>
  </div>;
  return <>{children}</>;
}
