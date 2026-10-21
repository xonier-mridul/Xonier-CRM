"use client";
import type { CampaignLeadAssignment } from "@/src/types/campaign/campaign.types";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LeadEditModal from "./LeadEditModal";
import axios from "axios";
import { toast } from "react-toastify";
import { FaWhatsapp } from "react-icons/fa";
import {
  FiCopy,
  FiEdit2,
  FiMail,
  FiMessageSquare,
  FiMinus,
  FiMoreVertical,
  FiPhone,
  FiUser,
  FiX,
} from "react-icons/fi";
import CallService from "@/src/services/call.service";
import { Lead } from "@/src/types/leads/leads.types";
import {
  CallDisposeResult,
  CallRequestResult,
  CallSession,
} from "@/src/types/call/call.types";

type Tab = "info" | "dispose" | "other";

interface CallModalProps {
  lead: Lead;
  onClose: () => void;
  /** Called after the agent answers "Was call connected?" so the table can refresh the row. */
  onDisposed?: (leadId: string, connectStatus: string) => void;
  onLeadUpdated?: (leadId: string, lead: Partial<Lead>) => void;
  campaignAssignment?: CampaignLeadAssignment;
  campaignId?: string;
  campaignLeadId?: string;
}

const LIVE_STATUSES = ["pending", "delivered", "dialing"];
const DISPOSABLE_STATUSES = ["delivered", "dialing", "ended", "failed"];

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (typeof msg === "string" && msg) return msg;
  }
  return "Something went wrong. Please try again.";
};

const formatClock = (totalSec: number): string => {
  const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const formatDateTime = (iso?: string | null): string =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex items-start py-2 text-[13px]">
    <span className="w-44 shrink-0 text-slate-500 dark:text-slate-400">{label}:</span>
    <span className="text-slate-800 dark:text-slate-100 break-all">{value || "-"}</span>
  </div>
);

const CallModal = ({ lead: initialLead, onClose, onDisposed, onLeadUpdated, campaignAssignment, campaignId, campaignLeadId }: CallModalProps) => {
  const [lead, setLead] = useState(initialLead);
  const [editingLead, setEditingLead] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const [minimized, setMinimized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<CallSession | null>(null);
  const [mobileOnline, setMobileOnline] = useState<boolean | null>(null);
  const [requesting, setRequesting] = useState(true);
  const [error, setError] = useState("");
  const [disposing, setDisposing] = useState<boolean | null>(null);
  const [dialStartedAtMs, setDialStartedAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const startedRef = useRef(false);
  const autoSwitchedRef = useRef(false);

  const sessionId = session?.id;
  const status = session?.status;
  const disposed = Boolean(session?.disposition);

  // ── send the call request to the mobile app ────────────────────────────────
  const runRequest = useCallback(async () => {
    try {
      const res = await CallService.request(lead.id, campaignId, campaignLeadId);
      const data: CallRequestResult = res.data.data;
      setSession(data.session);
      setMobileOnline(data.mobileOnline);
    } catch (err) {
      setSession(null);
      setError(getErrorMessage(err));
    } finally {
      setRequesting(false);
    }
  }, [lead.id, campaignId, campaignLeadId]);

  useEffect(() => {
    if (startedRef.current) return; // React strict mode mounts effects twice in dev
    startedRef.current = true;
    runRequest();
  }, [runRequest]);

  const handleRetry = () => {
    setMenuOpen(false);
    setError("");
    setSession(null);
    setDialStartedAtMs(null);
    setRequesting(true);
    autoSwitchedRef.current = false;
    setTab("info");
    runRequest();
  };

  // The browser follows persisted call state with its HttpOnly web session.
  // Never join the phone-only socket: that incorrectly marks a browser as a
  // connected dialer and requires exposing a bearer token to browser storage.
  useEffect(() => {
    if (!sessionId || disposed || !status || !LIVE_STATUSES.includes(status)) return;
    let stopped = false;
    let pending = false;
    let delay = 2000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (stopped || pending) return;
      pending = true;
      try {
        const response = await CallService.getSession(sessionId);
        if (stopped) return;
        const next: CallSession & { mobileOnline?: boolean } = response.data.data;
        setSession(next);
        setMobileOnline(next.mobileOnline ?? null);
        delay = 2000;
        if (next.status === "dialing") setDialStartedAtMs(value => value ?? Date.now());
        if (!autoSwitchedRef.current && ["dialing", "ended", "failed"].includes(next.status)) {
          autoSwitchedRef.current = true;
          setTab("dispose");
        }
        if (!LIVE_STATUSES.includes(next.status)) stopped = true;
      } catch (cause) {
        if (axios.isAxiosError(cause) && [400, 401, 403, 404].includes(cause.response?.status || 0)) stopped = true;
        else delay = Math.min(delay * 2, 10000);
      } finally {
        pending = false;
        if (!stopped) timer = setTimeout(() => { void poll(); }, delay);
      }
    };
    void poll();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [sessionId, status, disposed]);

  // ── live timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "dialing") return;
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [status]);

  let elapsedSec = 0;
  if (status === "ended" && session?.durationSec != null) {
    elapsedSec = session.durationSec;
  } else if (status === "dialing" && dialStartedAtMs) {
    elapsedSec = Math.max(0, Math.floor((nowMs - dialStartedAtMs) / 1000));
  }

  // ── actions ───────────────────────────────────────────────────────────────
  const handleClose = () => {
    if (session && !session.disposition && ["pending", "delivered"].includes(session.status)) {
      CallService.cancel(session.id).catch(() => undefined);
    }
    onClose();
  };

  const handleCancelRequest = async () => {
    setMenuOpen(false);
    if (!session) return;
    try {
      const res = await CallService.cancel(session.id);
      setSession(res.data.data);
      toast.info("Call request cancelled");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDispose = async (connected: boolean) => {
    if (!session) return;
    setDisposing(connected);
    try {
      const res = await CallService.dispose(session.id, connected);
      const data: CallDisposeResult = res.data.data;
      if (data.warning) toast.warning(data.warning);
      else toast.success(connected ? "Marked as connected" : "Marked as not connected");
      onDisposed?.(lead.id, data.connectStatus);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDisposing(null);
    }
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(lead.phone);
      toast.success("Number copied");
    } catch {
      toast.error("Could not copy the number");
    }
  };

  // ── status banner text ────────────────────────────────────────────────────
  let banner: { text: string; tone: "info" | "warn" | "ok" | "bad" } = {
    text: "Sending the call request to your mobile app…",
    tone: "info",
  };
  if (error) banner = { text: error, tone: "bad" };
  else if (requesting) banner = { text: "Sending the call request to your mobile app…", tone: "info" };
  else if (status === "pending")
    banner =
      mobileOnline === false
        ? {
            text: "Your mobile app is not connected. Open the Trakeroo app and keep it logged in, then retry.",
            tone: "warn",
          }
        : { text: "Request sent. Waiting for your mobile app…", tone: "info" };
  else if (status === "delivered") banner = { text: "Mobile app received the request. Opening the dialer…", tone: "info" };
  else if (status === "dialing") banner = { text: "Call in progress on your mobile phone", tone: "ok" };
  else if (status === "ended") banner = { text: `Call ended · ${formatClock(elapsedSec)}`, tone: "ok" };
  else if (status === "failed")
    banner = { text: session?.failureReason || "The call could not be placed from your mobile", tone: "bad" };
  else if (status === "cancelled") banner = { text: "Call request cancelled", tone: "warn" };
  else if (status === "expired")
    banner = { text: "Your mobile app did not respond in time. Please retry.", tone: "warn" };

  const toneClass = {
    info: "bg-[#BAF7FE]/30 text-[#0092B8] border-[#BAF7FE] dark:bg-[#0092B8]/20 dark:text-[#BAF7FE] dark:border-[#0092B8]/60",
    warn: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800",
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800",
    bad: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800",
  }[banner.tone];

  const canRetry = Boolean(error) || (status && ["failed", "cancelled", "expired"].includes(status)) || (status === "pending" && mobileOnline === false);
  const canDispose = Boolean(status && DISPOSABLE_STATUSES.includes(status)) && !disposed;

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "LEAD INFORMATION" },
    { key: "dispose", label: "DISPOSE LEAD" },
    { key: "other", label: "OTHER" },
  ];

  const pillBtn =
    "h-8 min-w-[56px] px-3 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-[#0092B8] dark:text-[#BAF7FE] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors";

  // ── minimized floating bar ────────────────────────────────────────────────
  if (minimized) {
    return createPortal(
      <div onClick={(event) => event.stopPropagation()} className="fixed bottom-4 right-4 z-[1000] flex items-center gap-3 rounded-full bg-[#0092B8] text-white shadow-2xl pl-3 pr-2 py-2">
        <span className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center">
          <FiPhone size={15} />
        </span>
        <div className="leading-tight">
          <p className="text-[12px] font-semibold capitalize max-w-[140px] truncate">{lead.fullName}</p>
          <p className="text-[11px] opacity-80">
            {status === "dialing" || status === "ended" ? formatClock(elapsedSec) : banner.text.slice(0, 28)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="text-[12px] font-medium rounded-full bg-white/20 hover:bg-white/30 px-3 py-1.5 transition-colors"
        >
          Maximize
        </button>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div onClick={(event) => event.stopPropagation()} className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Call lead"
        className="relative w-full max-w-[1100px] h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* header */}
        <div className="relative flex items-center justify-center border-b border-slate-100 dark:border-slate-700 px-4 shrink-0">
          <div className="flex items-center gap-8">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`py-4 text-[12px] font-medium tracking-wide border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-[#0092B8] text-[#0092B8] dark:text-[#BAF7FE]"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="absolute right-4 flex items-center gap-2">
            <button type="button" onClick={() => setMinimized(true)} className={pillBtn} title="Minimize">
              <FiMinus size={15} />
            </button>
            <button type="button" onClick={handleClose} className={pillBtn} title="Close">
              <FiX size={15} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                title="More"
              >
                <FiMoreVertical size={15} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-44 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1 text-[13px] z-10">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Call again
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    disabled={!status || !["pending", "delivered", "dialing"].includes(status)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Cancel request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* live status */}
          <div className={`mb-5 rounded-lg border px-4 py-2.5 text-[13px] flex items-center justify-between gap-3 ${toneClass}`}>
            <span>{banner.text}</span>
            {canRetry && (
              <button
                type="button"
                onClick={handleRetry}
                className="shrink-0 rounded-full border border-current px-3 py-1 text-[12px] font-medium hover:bg-white/50"
              >
                Retry
              </button>
            )}
          </div>

          {tab === "info" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* contact name */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm px-5 py-4 flex flex-col items-center gap-2 bg-white dark:bg-slate-800">
                  <p className="text-[11px] font-semibold text-[#0092B8] dark:text-[#BAF7FE]">Contact Name:</p>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <FiUser size={16} className="text-slate-400" />
                    <span className="text-[15px] font-semibold capitalize">{lead.fullName || "-"}</span>
                  </div>
                  {lead.companyName && (
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">{lead.companyName}</p>
                  )}
                </div>

                {/* call card */}
                <div className="rounded-xl bg-[#0092B8] text-white shadow-md px-5 py-4 flex flex-col items-center gap-2">
                  <p className="text-[11px] font-medium opacity-90">Calling on this number...</p>
                  <div className="flex items-center justify-between w-full">
                    <button
                      type="button"
                      onClick={copyNumber}
                      className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-white/15 transition-colors"
                      title="Copy number"
                    >
                      <FiCopy size={16} />
                    </button>
                    <span className="flex items-center gap-2 text-[20px] font-semibold tracking-wide">
                      <FiPhone size={17} />
                      {lead.phone}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingLead(true)}
                      className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-white/15 transition-colors"
                      title="Edit lead"
                    >
                      <FiEdit2 size={16} />
                    </button>
                  </div>
                </div>

                {/* send message */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm px-5 py-4 flex flex-col items-center gap-3 bg-white dark:bg-slate-800">
                  <p className="text-[11px] font-semibold text-[#0092B8] dark:text-[#BAF7FE]">Send Message:</p>
                  <div className="flex items-center gap-3">
                    <a
                      href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-10 w-10 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm flex items-center justify-center text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-700"
                      title="WhatsApp"
                    >
                      <FaWhatsapp size={20} />
                    </a>
                    <a
                      href={lead.email ? `mailto:${lead.email}` : undefined}
                      className={`h-10 w-10 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm flex items-center justify-center text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-700 ${
                        lead.email ? "" : "opacity-40 pointer-events-none"
                      }`}
                      title="Email"
                    >
                      <FiMail size={19} />
                    </a>
                    <a
                      href={`sms:${lead.phone}`}
                      className="h-10 w-10 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm flex items-center justify-center text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-700"
                      title="SMS"
                    >
                      <FiMessageSquare size={19} />
                    </a>
                  </div>
                </div>
              </div>

              {/* lead details */}
              <div className="mt-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                <div className="px-6 pt-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="inline-block pb-2.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100 border-b-2 border-[#0092B8]">
                    Lead Details
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                  <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-5">
                    <h3 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-700">
                      About
                    </h3>
                    <p className="pt-3 text-[13px] font-semibold text-slate-800 dark:text-slate-100">Basic Details</p>
                    <DetailRow label="Lead Name" value={lead.fullName} />
                    <DetailRow label="Email Address" value={lead.email} />
                    <DetailRow label="Mobile Number" value={lead.phone} />
                    <DetailRow label="Company" value={lead.companyName} />
                    <DetailRow label="Creation Time" value={formatDateTime(lead.createdAt)} />

                    <p className="pt-4 text-[13px] font-semibold text-slate-800 dark:text-slate-100 border-t border-slate-100 dark:border-slate-700 mt-2">
                      Lead Progress
                    </p>
                    <DetailRow label="Status" value={lead.status} />
                    <DetailRow label="Call Status" value={(lead.connectStatus || "not_reached").replace(/_/g, " ")} />
                    <DetailRow label="Source" value={(lead.source || "").replace(/_/g, " ")} />
                    <DetailRow label="Tag" value={lead.dataTag} />
                  </div>

                  <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-5">
                    <h3 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-700">
                      Timeline
                    </h3>
                    <p className="pt-3 pb-2 text-[13px] font-semibold text-slate-800 dark:text-slate-100">Contact History</p>
                    <ul className="space-y-3 text-[13px] text-slate-700 dark:text-slate-200">
                      {session?.disposedAt && (
                        <li>
                          <span className="text-slate-400 mr-2">{formatDateTime(session.disposedAt)}</span>
                          Marked {session.disposition === "connected" ? "connected" : "not connected"}
                        </li>
                      )}
                      {session?.endedAt && (
                        <li>
                          <span className="text-slate-400 mr-2">{formatDateTime(session.endedAt)}</span>
                          Call ended{session.durationSec != null ? ` · ${formatClock(session.durationSec)}` : ""}
                        </li>
                      )}
                      {session?.dialedAt && (
                        <li>
                          <span className="text-slate-400 mr-2">{formatDateTime(session.dialedAt)}</span>
                          Call started on mobile
                        </li>
                      )}
                      {session?.requestedAt && (
                        <li>
                          <span className="text-slate-400 mr-2">{formatDateTime(session.requestedAt)}</span>
                          Call requested from web
                        </li>
                      )}
                      <li>
                        <span className="text-slate-400 mr-2">{formatDateTime(lead.createdAt)}</span>
                        Lead Created | Source: {(lead.source || "N/A").replace(/_/g, " ")}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "dispose" && (
            <div className="flex flex-col items-center pt-2">
              <span className="rounded bg-red-100 text-red-800 px-3 py-1 text-[13px] font-medium">
                Time elapsed {formatClock(elapsedSec)}
              </span>

              <div className="mt-6 w-full max-w-[700px] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 px-8 py-6 text-center">
                <h2 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">Was call connected?</h2>
                <div className="mt-5 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    disabled={!canDispose || disposing !== null}
                    onClick={() => handleDispose(false)}
                    className="rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold px-7 py-2.5 transition-colors"
                  >
                    {disposing === false ? "Saving…" : "Not Connected"}
                  </button>
                  <button
                    type="button"
                    disabled={!canDispose || disposing !== null}
                    onClick={() => handleDispose(true)}
                    className="rounded-full bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold px-7 py-2.5 transition-colors"
                  >
                    {disposing === true ? "Saving…" : "Yes Connected"}
                  </button>
                </div>
                {!canDispose && !disposed && (
                  <p className="mt-4 text-[12px] text-slate-400">
                    You can answer once the call starts on your mobile.
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "other" && (
            <div className="max-w-[640px] mx-auto rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 p-6">
              <h3 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-700">
                Call Details
              </h3>
              <DetailRow label="Call status" value={status} />
              <DetailRow label="Mobile app" value={mobileOnline === null ? "-" : mobileOnline ? "Connected" : "Not connected"} />
              <DetailRow label="Requested at" value={formatDateTime(session?.requestedAt)} />
              <DetailRow label="Call started" value={formatDateTime(session?.dialedAt)} />
              <DetailRow label="Call ended" value={formatDateTime(session?.endedAt)} />
              <DetailRow label="Duration" value={session?.durationSec != null ? formatClock(session.durationSec) : "-"} />
              <DetailRow label="Answer" value={session?.disposition ? session.disposition.replace(/_/g, " ") : "-"} />
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-full border border-[#0092B8] text-[#0092B8] dark:text-[#BAF7FE] text-[13px] font-medium px-5 py-2 hover:bg-[#BAF7FE]/20 dark:hover:bg-slate-700"
                >
                  Call again
                </button>
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  disabled={!status || !LIVE_STATUSES.includes(status)}
                  className="rounded-full border border-slate-300 text-slate-600 dark:text-slate-300 text-[13px] font-medium px-5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel request
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {editingLead && (
        <LeadEditModal
          campaignAssignment={campaignAssignment}
          leadId={lead.id}
          onClose={() => setEditingLead(false)}
          onSaved={(updatedLead) => {
            setLead((current) => ({ ...current, ...updatedLead }));
            onLeadUpdated?.(lead.id, updatedLead);
            setEditingLead(false);
          }}
        />
      )}
    </div>,
    document.body
  );
};

export default CallModal;
