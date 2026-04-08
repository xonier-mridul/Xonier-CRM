"use client";

import React, { JSX, useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import  {OtpService}  from "@/src/services/otp.service";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OtpItem {
  id: string;
  encrypt_mail: string;
  email: string;
  otp: string;
  encrypt_opt: string;
  otp_type: string;
  is_used: boolean;
  expires_at: string;
  createdAt: string;
  updatedAt: string;
}

// ── OTP Type Badge ────────────────────────────────────────────────────────────
const OTP_TYPE_STYLE: Record<string, { cls: string; dot: string; label: string; icon: string }> = {
  login: {
    cls: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
    label: "Login",
    icon: "🔐",
  },
  register: {
    cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
    label: "Register",
    icon: "📝",
  },
  reset: {
    cls: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-400",
    label: "Reset",
    icon: "🔄",
  },
  verify: {
    cls: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    dot: "bg-purple-500",
    label: "Verify",
    icon: "✅",
  },
};

function OtpTypeBadge({ type }: { type: string }) {
  const style = OTP_TYPE_STYLE[type?.toLowerCase()] ?? {
    cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
    dot: "bg-gray-400",
    label: type,
    icon: "🔑",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${style.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.icon} {style.label}
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ isUsed, expiresAt }: { isUsed: boolean; expiresAt: string }) {
  const isExpired = new Date(expiresAt) < new Date();

  if (isUsed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Used
      </span>
    );
  }
  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Active
    </span>
  );
}

// ── OTP Reveal Cell ───────────────────────────────────────────────────────────
function OtpReveal({ encryptedOtp }: { encryptedOtp: string }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(3);
  const countRef = useRef<NodeJS.Timeout | null>(null);

  const handleReveal = () => {
    if (visible) return;
    setVisible(true);
    setCountdown(3);

    // countdown tick
    let c = 3;
    countRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) clearInterval(countRef.current!);
    }, 1000);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setCountdown(3);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {visible ? (
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-extrabold tracking-[0.35em] text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 select-all">
            {encryptedOtp}
          </span>
          <span
            className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-800 tabular-nums min-w-[44px] text-center"
          >
            {countdown}s ⏱
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleReveal}
          className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-800 transition-all hover:shadow-sm active:scale-95"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0">
            <ellipse cx="6.5" cy="6.5" rx="5.5" ry="3.5" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="6.5" cy="6.5" r="1.8" fill="currentColor" />
          </svg>
          Reveal
        </button>
      )}
    </div>
  );
}

// ── Skeleton Row ──────────────────────────────────────────────────────────────
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse border-b border-gray-50 dark:border-gray-700/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className={`h-4 bg-gray-100 dark:bg-gray-700 rounded-lg ${i === 1 ? "w-full" : "w-2/3"}`} />
        </td>
      ))}
    </tr>
  );
}

// ── Expiry Countdown ──────────────────────────────────────────────────────────
function ExpiryCell({ expiresAt }: { expiresAt: string }) {
  const expDate = new Date(expiresAt);
  const now = new Date();
  const isExpired = expDate < now;

  const diffMs = expDate.getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffSec = Math.floor((diffMs % 60000) / 1000);

  const formatted = expDate.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-0.5">
      <div className={`text-xs font-semibold ${isExpired ? "text-rose-500" : "text-gray-700 dark:text-gray-300"}`}>
        {isExpired && <span className="mr-1">⚠️</span>}
        {formatted}
      </div>
      {!isExpired && diffMs > 0 && (
        <div className="text-[10px] text-emerald-500 font-semibold">
          Expires in {diffMin}m {diffSec}s
        </div>
      )}
      {isExpired && (
        <div className="text-[10px] text-rose-400 font-semibold">Expired</div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const OtpListPage = (): JSX.Element => {
  const [otpData, setOtpData] = useState<OtpItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch OTPs ──────────────────────────────────────────────────────────────
  const fetchOtps = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await OtpService.getAll({
        page: currentPage,
        limit: pageLimit,
        search: search || undefined,
      });
      if (res.status === 200) {
        const d = res.data?.data;
        setOtpData(d?.data ?? []);
        setTotalPages(Number(d?.totalPages ?? 0));
      }
    } catch (e) {
      
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageLimit, search, filterType, filterStatus]);

  useEffect(() => { fetchOtps(); }, [fetchOtps]);

  const handleSearch = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 500);
  };

  const hasFilters = !!(search || filterType || filterStatus);

  // Derived stats
  const activeCount = otpData.filter(o => !o.is_used && new Date(o.expires_at) >= new Date()).length;
  const expiredCount = otpData.filter(o => new Date(o.expires_at) < new Date()).length;
  const usedCount = otpData.filter(o => o.is_used).length;

  const colCount = 7;

  return (
    <div className="ml-72 mt-14">
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">🔑</span>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                OTP Management
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monitor and inspect all one-time passwords issued in the system.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchOtps}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white text-sm font-bold transition-all active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={isLoading ? "animate-spin" : ""}>
              <path d="M13 7A6 6 0 1 1 7 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M10 1h3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh
          </button>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          {[
            { label: "Total (Page)", value: otpData.length, icon: "🔑", bg: "bg-blue-50 border-blue-100" },
            { label: "Active", value: activeCount, icon: "🟢", bg: "bg-emerald-50 border-emerald-100" },
            { label: "Expired", value: expiredCount, icon: "⏰", bg: "bg-rose-50 border-rose-100" },
            { label: "Used", value: usedCount, icon: "✅", bg: "bg-gray-50 border-gray-200" },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg}`}>
              <span className="text-xl">{s.icon}</span>
              <div>
                <div className="text-xl font-extrabold text-gray-900 dark:text-black">{s.value}</div>
                <div className="text-xs text-gray-500 font-medium">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-2 mb-5">

          {/* Search */}
          <div className="relative min-w-[240px] max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              onChange={e => handleSearch(e.target.value)}
              placeholder="Enter exact email to search…"
              className="pl-9 pr-4 py-2.5 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
          >
            <option value="">All Types</option>
            <option value="login">🔐 Login</option>
            <option value="register">📝 Register</option>
            <option value="reset">🔄 Reset</option>
            <option value="verify">✅ Verify</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
          >
            <option value="">All Statuses</option>
            <option value="active">🟢 Active</option>
            <option value="expired">⏰ Expired</option>
            <option value="used">✅ Used</option>
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterType("");
                setFilterStatus("");
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5"
            >
              <span>✕</span> Clear
            </button>
          )}

          {/* Note */}
          <div className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
            <span className="text-sm">💡</span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Enter the accurate &amp; complete email address to search
            </span>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  {[
                    { label: "#", cls: "w-12" },
                    { label: "Email", cls: "min-w-[220px]" },
                    { label: "OTP", cls: "w-44" },
                    { label: "Type", cls: "w-32" },
                    { label: "Status", cls: "w-28" },
                    { label: "Expires At", cls: "w-52" },
                    { label: "Created At", cls: "w-44" },
                  ].map(col => (
                    <th
                      key={col.label}
                      className={`px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left ${col.cls}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={colCount} />)
                ) : otpData.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="text-center py-20 text-gray-400 dark:text-gray-500">
                      <div className="text-5xl mb-3">📭</div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No OTPs found</p>
                      {hasFilters && (
                        <p className="text-xs text-gray-400 mt-1">
                          Try clearing your filters — remember to use the exact &amp; complete email
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  otpData.map((otp, i) => {
                    const isExpired = new Date(otp.expires_at) < new Date();
                    const rowMuted = otp.is_used || isExpired;
                    return (
                      <tr
                        key={otp.id}
                        className={`border-b border-gray-50 dark:border-gray-700/60 transition-colors group ${rowMuted
                          ? "opacity-60 hover:opacity-80"
                          : "hover:bg-gray-50/70 dark:hover:bg-gray-700/40"
                          }`}
                      >
                        {/* # */}
                        <td className="px-5 py-4 text-xs font-mono text-gray-400 dark:text-gray-500">
                          {String((currentPage - 1) * pageLimit + i + 1).padStart(2, "0")}
                        </td>

                        {/* Email */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {otp.encrypt_mail?.charAt(0)?.toUpperCase() ?? "?"}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                                {otp.encrypt_mail}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate max-w-[200px]" title={otp.email}>
                                {otp.email.slice(0, 20)}…
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* OTP reveal */}
                        <td className="px-5 py-4">
                          <OtpReveal encryptedOtp={otp.encrypt_opt} />
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4">
                          <OtpTypeBadge type={otp.otp_type} />
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <StatusBadge isUsed={otp.is_used} expiresAt={otp.expires_at} />
                        </td>

                        {/* Expires At */}
                        <td className="px-5 py-4">
                          <ExpiryCell expiresAt={otp.expires_at} />
                        </td>

                        {/* Created At */}
                        <td className="px-5 py-4">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {new Date(otp.createdAt).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Showing page{" "}
              <span className="font-semibold text-gray-600 dark:text-gray-300">{currentPage}</span>
              {" "}of{" "}
              <span className="font-semibold text-gray-600 dark:text-gray-300">{totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-1">
                {currentPage}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OtpListPage;