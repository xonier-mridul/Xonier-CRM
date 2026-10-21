"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { AuthService } from "@/src/services/auth.service";
import { login } from "@/src/store/slices/authSlice";

export default function LoginOtp({ admin = false }: { admin?: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useDispatch();
  const [attempt, setAttempt] = useState<{ id: string; email: string } | null>(null);
  const [digits, setDigits] = useState(Array<string>(6).fill(""));
  const [seconds, setSeconds] = useState(60);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const storageKey = admin ? "adminLoginChallengeId" : "loginChallengeId";
  const loginPath = admin ? "/admin-login" : "/login";

  useEffect(() => {
    const id = sessionStorage.getItem(storageKey);
    if (!id) { router.replace(loginPath); return; }
    const email = sessionStorage.getItem(admin ? "email" : "loginMail") || "";
    // Synchronize this browser-only challenge after hydration; never persist a password.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttempt({ id, email });
    for (const key of ["password", "loginPassword"]) sessionStorage.removeItem(key);
  }, [admin, loginPath, router, storageKey]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const report = (cause: unknown) => {
    if (axios.isAxiosError(cause)) {
      const wait = Number(cause.response?.headers["retry-after"] || 0);
      setError((cause.response?.data?.message || "Verification failed. Please try again.") + (wait ? ` Try again in ${Math.ceil(wait / 60)} minute(s).` : ""));
    } else setError("Verification unavailable. Please try again.");
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!attempt || digits.some(digit => !digit) || pending) return;
    setPending(true); setError("");
    try {
      const payload = { challengeId: attempt.id, otp: Number(digits.join("")) };
      const response = await (admin ? AuthService.verifyAdminLoginOtp(payload) : AuthService.verifyLoginOtp(payload));
      dispatch(login(response.data.data));
      for (const key of [storageKey, "loginMail", "email", "companyId", "loginPassword", "password"]) sessionStorage.removeItem(key);
      window.location.assign("/dashboard");
    } catch (cause) { report(cause); }
    finally { setPending(false); }
  };

  const resend = async () => {
    if (!attempt || pending || seconds > 0) return;
    setPending(true); setError("");
    try {
      const payload = { challengeId: attempt.id };
      const response = await (admin ? AuthService.resendAdminOTP(payload) : AuthService.resendOTP(payload));
      setSeconds(response.data.data.resendAfter || 60);
      setDigits(Array<string>(6).fill(""));
    } catch (cause) { report(cause); }
    finally { setPending(false); }
  };

  return <div className="flex min-h-screen items-center justify-center bg-cyan-50 p-5 dark:bg-slate-950">
    <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <Link href={loginPath} className="text-sm text-cyan-700 dark:text-cyan-300">← Back to login</Link>
      <h1 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-white">{t("verify_login_otp")}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Enter the latest code sent to {attempt?.email || "your email"}. Delivery may take a moment.</p>
      <p className="mt-4 rounded-lg bg-cyan-50 p-3 text-sm text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100">One browser and one mobile app may stay signed in together. This login replaces only the previous browser session. Repeated switching is temporarily restricted.</p>
      <form onSubmit={verify} className="mt-6 space-y-5">
        <div className="flex justify-between gap-2">
          {digits.map((digit, index) => <input key={index} ref={element => { refs.current[index] = element; }}
            aria-label={`Verification digit ${index + 1}`} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"}
            value={digit} maxLength={1} disabled={pending} className="h-12 min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent text-center text-xl text-slate-900 focus:border-cyan-600 focus:outline-none dark:border-slate-600 dark:text-white"
            onChange={event => {
              const value = event.target.value.replace(/\D/g, "").slice(-1);
              setDigits(values => values.map((old, position) => position === index ? value : old));
              if (value && index < 5) refs.current[index + 1]?.focus();
            }} onKeyDown={event => { if (event.key === "Backspace" && !digit && index) refs.current[index - 1]?.focus(); }}
            onPaste={event => {
              event.preventDefault();
              const values = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
              setDigits(Array.from({ length: 6 }, (_, position) => values[position] || ""));
              refs.current[Math.min(values.length, 5)]?.focus();
            }} />)}
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
        <button type="submit" disabled={pending || !attempt || digits.some(digit => !digit)} className="w-full rounded-lg bg-cyan-700 px-4 py-3 font-medium text-white disabled:opacity-50">{pending ? "Please wait…" : "Verify and sign in"}</button>
      </form>
      <button type="button" onClick={resend} disabled={pending || seconds > 0 || !attempt} className="mt-5 text-sm text-cyan-700 disabled:text-slate-400 dark:text-cyan-300">{seconds > 0 ? `Resend code in ${seconds}s` : "Resend verification code"}</button>
    </section>
  </div>;
}
