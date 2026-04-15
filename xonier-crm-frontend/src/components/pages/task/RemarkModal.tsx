"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { RemarkService } from "@/src/services/remark.service";
import { PERMISSIONS } from "@/src/constants/enum";
import { usePermissions } from "@/src/hooks/usePermissions";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { User } from "@/src/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Remark {
  _id: string;
  content: string;
  createdAt: string;
  acknowledgedBy?: User;   // array of user ids who acknowledged
  createdBy: {
    id: string;
    firstName: string;
    lastName?: string;
  };
}

interface Props {
  taskId: string;
  onClose?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// 10 distinct, visually balanced avatar/accent colours
const USER_PALETTES = [
  { bg: "bg-violet-100  dark:bg-violet-900/40",  text: "text-violet-700  dark:text-violet-300",  avatar: "bg-violet-500",  ring: "ring-violet-300  dark:ring-violet-700"  },
  { bg: "bg-blue-100    dark:bg-blue-900/40",    text: "text-blue-700    dark:text-blue-300",    avatar: "bg-blue-500",    ring: "ring-blue-300    dark:ring-blue-700"    },
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", avatar: "bg-emerald-500", ring: "ring-emerald-300 dark:ring-emerald-700" },
  { bg: "bg-amber-100   dark:bg-amber-900/40",   text: "text-amber-700   dark:text-amber-400",   avatar: "bg-amber-500",   ring: "ring-amber-300   dark:ring-amber-700"   },
  { bg: "bg-pink-100    dark:bg-pink-900/40",    text: "text-pink-700    dark:text-pink-300",    avatar: "bg-pink-500",    ring: "ring-pink-300    dark:ring-pink-700"    },
  { bg: "bg-cyan-100    dark:bg-cyan-900/40",    text: "text-cyan-700    dark:text-cyan-300",    avatar: "bg-cyan-500",    ring: "ring-cyan-300    dark:ring-cyan-700"    },
  { bg: "bg-orange-100  dark:bg-orange-900/40",  text: "text-orange-700  dark:text-orange-300",  avatar: "bg-orange-500",  ring: "ring-orange-300  dark:ring-orange-700"  },
  { bg: "bg-indigo-100  dark:bg-indigo-900/40",  text: "text-indigo-700  dark:text-indigo-300",  avatar: "bg-indigo-500",  ring: "ring-indigo-300  dark:ring-indigo-700"  },
  { bg: "bg-rose-100    dark:bg-rose-900/40",    text: "text-rose-700    dark:text-rose-300",    avatar: "bg-rose-500",    ring: "ring-rose-300    dark:ring-rose-700"    },
  { bg: "bg-teal-100    dark:bg-teal-900/40",    text: "text-teal-700    dark:text-teal-300",    avatar: "bg-teal-500",    ring: "ring-teal-300    dark:ring-teal-700"    },
];

function getPalette(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return USER_PALETTES[hash % USER_PALETTES.length];
}

function initials(r: Remark["createdBy"]) {
  return `${r.firstName[0] ?? ""}${r.lastName?.[0] ?? ""}`.toUpperCase();
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Add Remark Panel (inline, slides in from top) ───────────────────────────

interface AddRemarkPanelProps {
  onSend: (content: string) => Promise<void>;
  onClose: () => void;
}

function AddRemarkPanel({ onSend, onClose }: AddRemarkPanelProps) {
  const [text, setText]       = useState("");
  const [busy, setBusy]       = useState(false);
  const textareaRef           = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleSend = async () => {
    if (!text.trim()) return;
    setBusy(true);
    await onSend(text.trim());
    setBusy(false);
    setText("");
    onClose();
  };

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-5 py-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">New remark</p>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition text-lg leading-none"
        >
          ×
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
        placeholder="Write your remark… (Ctrl+Enter to submit)"
        rows={3}
        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition resize-none"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold rounded-xl text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={busy || !text.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Posting…
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Post remark
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Acknowledge Checkbox ─────────────────────────────────────────────────────

interface AckCheckboxProps {
  checked: boolean;
  disabled: boolean;
  loading: boolean;
  onChange: () => void;
  count: number;
}

function AckCheckbox({ checked, disabled, loading, onChange, count }: AckCheckboxProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onChange}
      title={disabled ? "You wrote this remark" : checked ? "Acknowledged" : "Mark as acknowledged"}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all select-none flex-shrink-0 ${
        disabled
          ? "opacity-30 cursor-not-allowed"
          : checked
          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
          : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
      }`}
    >
      {loading ? (
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      ) : (
        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
          checked
            ? "bg-emerald-500 border-emerald-500"
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
        }`}>
          {checked && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </span>
      )}
      <span>{checked ? "Acknowledged" : "Acknowledge"}</span>
      {count > 0 && (
        <span className={`px-1 rounded-full text-[9px] font-bold ${
          checked
            ? "bg-emerald-500 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Remark Row ───────────────────────────────────────────────────────────────

interface RemarkRowProps {
  remark: Remark;
  currentUserId: string;
  onAcknowledge: (id: string) => Promise<void>;
  index: number;
}

function RemarkRow({ remark, currentUserId, onAcknowledge, index }: RemarkRowProps) {
  const [ackLoading, setAckLoading] = useState(false);
  const palette    = getPalette(remark.createdBy.id);
  const isAuthor   = remark.createdBy.id === currentUserId;
  const acked      = remark.acknowledgedBy;
  const hasAcked   = (acked)?true:false;
  const ackCount   = (acked)?1:0;

  const handleAck = async () => {
    setAckLoading(true);
    await onAcknowledge(remark._id);
    setAckLoading(false);
  };

  const fullName = `${remark.createdBy.firstName} ${remark.createdBy.lastName ?? ""}`.trim();

  return (
    <div className={`group flex items-start gap-3 px-5 py-4 border-b border-gray-50 dark:border-gray-700/60 transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/40 ${
      hasAcked ? "bg-emerald-50/30 dark:bg-emerald-900/10" : ""
    }`}>

      {/* Acknowledge checkbox — left side */}
      <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
        <AckCheckbox
          checked={hasAcked}
          disabled={isAuthor}
          loading={ackLoading}
          onChange={handleAck}
          count={ackCount}
        />
      </div>

      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ring-2 ring-white dark:ring-gray-900 ${palette.avatar}`}>
        {initials(remark.createdBy)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Author + time */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`text-xs font-bold ${palette.text}`}>{fullName}</span>
          {isAuthor && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              You
            </span>
          )}
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0">
            {relTime(remark.createdAt)}
          </span>
        </div>

        {/* Remark bubble */}
        <div className={`px-3.5 py-2.5 rounded-xl rounded-tl-sm text-sm text-gray-800 dark:text-gray-200 leading-relaxed border ${palette.bg} border-transparent`}>
          {remark.content}
        </div>

        {/* Acknowledged-by avatars */}
        {(ackCount !== 0) && (
          <div className="flex items-center gap-1.5 mt-2 ms-auto flot-right justify-end">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Acknowledged by</span>
            <div className="flex -space-x-1.5">
              {(
                <div
                  key={acked?.id}
                  className={`px-1 h-4 rounded-full border border-white dark:border-gray-900 flex items-center justify-center text-[7px] font-bold text-white ${getPalette(acked?.id || "").avatar}`}
                >
                  {acked?.firstName} {acked?.lastName ? acked.lastName : ""} 
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Row number */}
      <span className="text-[10px] font-mono text-gray-300 dark:text-gray-700 flex-shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        #{index + 1}
      </span>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function RemarkModal({ taskId, onClose }: Props) {
  const [remarks, setRemarks]       = useState<Remark[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [filter, setFilter]         = useState<"all" | "acknowledged" | "pending">("all");

  const { hasPermission } = usePermissions();
  const auth = useSelector((state: RootState) => state.auth);
  const currentUserId = auth.user?._id ?? "";

  const canRead   = hasPermission(PERMISSIONS.readRemark);
  const canCreate = hasPermission(PERMISSIONS.createRemark);

  const loadRemarks = useCallback(async () => {
    if (!canRead) return;
    try {
      const res = await RemarkService.getByTask(taskId);
      setRemarks(res.data.data ?? []);
    } catch {
       setRemarks([]);
    } finally {
      setLoading(false);
    }
  }, [taskId, canRead]);

  useEffect(() => { loadRemarks(); }, [loadRemarks]);

  const handleSend = async (content: string) => {
    try {
      const res = await RemarkService.create({ taskId, content });
      if (res.status === 201) {
        await loadRemarks();
        toast.success("Remark posted");
      }
    } catch {
      toast.error("Failed to post remark");
    }
  };

  const handleAcknowledge = async (remarkId: string) => {
    try {
      await RemarkService.acknowledge(remarkId);
      loadRemarks();
    } catch {
      toast.error("Failed to acknowledge");
      await loadRemarks(); // re-sync on error
    }
  };

  // Filtered remarks
  const filteredRemarks = remarks.filter((r) => {
    if (filter === "acknowledged") return (r.acknowledgedBy?.id);
    if (filter === "pending")      return !(r.acknowledgedBy?.id) ;
    return true;
  });

  const pendingCount = remarks.filter(
    (r) => !(r.acknowledgedBy),
  ).length;

  const ackedCount = remarks.filter((r) => (r.acknowledgedBy)).length;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      <div
        className="w-full  flex flex-col bg-white dark:bg-gray-900 rounded-2xl dark:border-gray-700 overflow-hidden"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                className="text-blue-500" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4h12M2 8h8M2 12h6"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Remarks</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                {remarks.length} total · {pendingCount} pending acknowledgement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowAdd((p) => !p)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  showAdd
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                }`}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Add remark
              </button>
            )}
            {/* <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11"/>
              </svg>
            </button> */}
          </div>
        </div>

        {/* ── Add Remark Panel ── */}
        {showAdd && <AddRemarkPanel onSend={handleSend} onClose={() => setShowAdd(false)} />}

        {/* ── Filter tabs ── */}
        <div className="flex items-center gap-1 px-5 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex-shrink-0">
          {([
            { key: "all",          label: "All",           count: remarks.length       },
            { key: "pending",      label: "Pending",       count: pendingCount         },
            { key: "acknowledged", label: "Acknowledged",  count: ackedCount           },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === tab.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === tab.key
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Remark list ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            // Skeleton
            <div className="p-5 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-16 h-6 bg-gray-100 dark:bg-gray-800 rounded-lg flex-shrink-0" />
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
                    <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRemarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-3 opacity-40">
                <rect x="4" y="8" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 16h20M10 22h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-sm font-semibold">
                {filter === "all" ? "No remarks yet" : `No ${filter} remarks`}
              </p>
              {filter === "all" && canCreate && (
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="mt-3 text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  + Add the first remark
                </button>
              )}
            </div>
          ) : (
            filteredRemarks.map((r, i) => (
              <RemarkRow
                key={r._id}
                remark={r}
                currentUserId={currentUserId}
                onAcknowledge={handleAcknowledge}
                index={i}
              />
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex-shrink-0">
          <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              Acknowledged
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
              Pending
            </span>
            <span>· Writers cannot acknowledge own remarks</span>
          </div>
          {/* <span className="text-[10px] text-gray-400 dark:text-gray-500">
            Press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-[9px]">Esc</kbd> to close
          </span> */}
        </div>

      </div>
    </div>
  );
}