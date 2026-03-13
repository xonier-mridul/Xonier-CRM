"use client";

import { JSX, useState, useEffect, useRef } from "react";
import { IoIosSearch } from "react-icons/io";
import { FiColumns } from "react-icons/fi";
import Skeleton from "react-loading-skeleton";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";
import extractErrorMessages from "@/src/app/utils/error.utils";
import axios from "axios";
import prospectService from "@/src/services/prospect.service";
import FilterSideBar from "@/src/components/pages/prospect/FilterSideBar";
import { LiaFilterSolid } from "react-icons/lia";
import { ALL_COL, DEF_ACTIVE } from "@/src/components/pages/prospect/columns";
import { Prospect, ActiveColumns } from "@/src/types/prospect/prospect.type";
import { FilterValues } from "@/src/types/prospect/filterSideBar.types";
import { User } from "@/src/types/auth/auth.types";
import { MdOutlinePersonAdd, MdCall, MdSms, MdEmail, MdMessage, MdMailOutline, MdPhoneEnabled } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { FaXmark, FaCheck, FaRegEye, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { maskEmail, maskPhone } from "@/src/app/utils/mask.utils";
import { toast } from "react-toastify";
import Link from "next/link";
import SensitiveField from "@/src/components/common/SensitiveField";
import { useParams } from "next/navigation";
import { IoClose } from "react-icons/io5";
import CallModal from "@/src/components/pages/prospect/CallModal";
import RichEditor from "@/src/components/pages/prospect/RichEditor";

const PAGE_LIMIT = 10;

// ─── Bulk Call Modal ──────────────────────────────────────────────────────────
type CallStatus = "queued" | "in_progress" | "completed" | "failed";

const BulkCallModal = ({
  leads,
  onClose,
}: {
  leads: Prospect[];
  onClose: () => void;
}) => {
  // "idle" = not started yet, "running" = call all in progress, "done" = all done
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [statuses, setStatuses] = useState<Record<string, CallStatus>>(
    () => Object.fromEntries(leads.map((l) => [l.id, "queued"]))
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const isCancelledRef = useRef(false);

  const completedCount = Object.values(statuses).filter((s) => s === "completed").length;
  const failedCount = Object.values(statuses).filter((s) => s === "failed").length;
  const inProgressId = Object.entries(statuses).find(([, s]) => s === "in_progress")?.[0] ?? null;

  const setStatus = (id: string, status: CallStatus) =>
    setStatuses((prev) => ({ ...prev, [id]: status }));

  const handleCallAll = async () => {
    isCancelledRef.current = false;
    setPhase("running");

    for (const lead of leads) {
      if (isCancelledRef.current) break;

      setActiveId(lead.id);
      setStatus(lead.id, "in_progress");

      try {
        // await prospectService.makeCall(lead.phone);
        // Simulate call duration — replace with real webhook/polling if available
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 3000);
          // store timer so cancel can clear it if needed
          (window as any).__callTimer = timer;
        });
        if (!isCancelledRef.current) setStatus(lead.id, "completed");
      } catch {
        setStatus(lead.id, "failed");
      }
    }

    setActiveId(null);
    setPhase("done");
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    if ((window as any).__callTimer) clearTimeout((window as any).__callTimer);
    // Mark anything still queued/in_progress as queued again
    setStatuses((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (next[id] === "in_progress") next[id] = "queued";
      });
      return next;
    });
    setActiveId(null);
    setPhase("idle");
  };

  const StatusPill = ({ status }: { status: CallStatus }) => {
    if (status === "completed")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          Completed
        </span>
      );
    if (status === "in_progress")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
          In Progress
        </span>
      );
    if (status === "failed")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          Failed
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
        Queued
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
              <MdCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bulk Call</h3>
              <p className="text-xs text-blue-100">{leads.length} lead{leads.length > 1 ? "s" : ""} queued</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
            <IoClose className="w-5 h-5" />
          </button>
        </div>

        {/* ── Progress bar ── */}
        <div className="w-full bg-gray-100 dark:bg-gray-700 h-1 shrink-0">
          <div
            className="bg-blue-500 h-1 transition-all duration-500"
            style={{ width: phase === "idle" ? "0%" : `${(completedCount / leads.length) * 100}%` }}
          />
        </div>

        {/* ── Stats row ── */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>Queued: <strong className="text-slate-700 dark:text-slate-200">{Object.values(statuses).filter(s => s === "queued").length}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-500">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>In Progress: <strong>{Object.values(statuses).filter(s => s === "in_progress").length}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Completed: <strong>{completedCount}</strong></span>
          </div>
          {failedCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Failed: <strong>{failedCount}</strong></span>
            </div>
          )}
        </div>

        {/* ── Call list ── */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-0">
          {leads.map((lead, idx) => {
            const status = statuses[lead.id];
            const isActive = status === "in_progress";
            return (
              <div
                key={lead.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 shadow-sm"
                    : status === "completed"
                    ? "bg-green-50/60 dark:bg-green-900/10 border-green-100 dark:border-green-900"
                    : status === "failed"
                    ? "bg-red-50/60 dark:bg-red-900/10 border-red-100 dark:border-red-900"
                    : "bg-slate-50 dark:bg-gray-700/50 border-slate-100 dark:border-gray-700"
                }`}
              >
                {/* Index / avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isActive ? "bg-blue-600 text-white" :
                  status === "completed" ? "bg-green-500 text-white" :
                  status === "failed" ? "bg-red-400 text-white" :
                  "bg-slate-200 dark:bg-gray-600 text-slate-500 dark:text-slate-300"
                }`}>
                  {status === "completed" ? "✓" : status === "failed" ? "✕" : idx + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold capitalize truncate ${
                    isActive ? "text-blue-700 dark:text-blue-300" :
                    status === "completed" ? "text-green-700 dark:text-green-300" :
                    "text-slate-700 dark:text-slate-200"
                  }`}>
                    {lead.fullName}
                  </p>
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">{lead.phone}</p>
                </div>

                {/* Status pill */}
                <StatusPill status={status} />

                {/* Live calling animation */}
                {isActive && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1 rounded-full bg-blue-500 animate-bounce"
                        style={{ height: `${10 + i * 4}px`, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between gap-3 shrink-0">
          {phase === "idle" && (
            <>
              <p className="text-xs text-slate-400">Calls will be placed one by one automatically</p>
              <button
                onClick={handleCallAll}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-md transition-colors"
              >
                <MdCall className="w-4 h-4" />
                Call All
              </button>
            </>
          )}

          {phase === "running" && (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Calling {completedCount + 1} of {leads.length}...
              </div>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-gray-700 hover:bg-red-50 hover:text-red-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors"
              >
                <IoClose className="w-4 h-4" />
                Stop
              </button>
            </>
          )}

          {phase === "done" && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {completedCount} completed{failedCount > 0 ? `, ${failedCount} failed` : ""}
              </p>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm shadow-md transition-colors"
              >
                <FaCheck className="w-3.5 h-3.5" />
                Done
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

// ─── Bulk Mail Modal ──────────────────────────────────────────────────────────
const BulkMailModal = ({
  leads,
  onClose,
}: {
  leads: Prospect[];
  onClose: () => void;
}) => {
  const [subject, setSubject] = useState("");
  const [mailText, setMailText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !mailText.trim()) {
      toast.warning("Please fill in subject and message");
      return;
    }
    setIsSending(true);
    try {
      await Promise.all(
        leads.map((lead) =>
          prospectService.sendEmail
            ? prospectService.sendEmail(lead.email, subject, mailText)
            : Promise.resolve()
        )
      );
      setSent(true);
      toast.success(`Email sent to ${leads.length} lead${leads.length > 1 ? "s" : ""}`);
      setTimeout(onClose, 1500);
    } catch {
      toast.error("Failed to send some emails");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <MdEmail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bulk Email</h3>
              <p className="text-sm text-green-100">
                Sending to {leads.length} lead{leads.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
          >
            <IoClose className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Recipient chips */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Recipients</p>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {leads.map((lead) => (
                <span
                  key={lead.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium border border-green-200 dark:border-green-800"
                >
                  <span className="w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">
                    {lead.fullName?.[0]?.toUpperCase()}
                  </span>
                  {lead.fullName}
                </span>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full mt-1.5 p-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:outline-none dark:bg-gray-700 text-sm"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Message</label>
            <div className="mt-1.5">
              <RichEditor value={mailText} onChange={setMailText} />
            </div>
          </div>

          {/* Send */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || sent}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm shadow-md transition-colors"
            >
              <MdEmail className="w-4 h-4" />
              {isSending ? "Sending..." : sent ? "Sent!" : `Send to ${leads.length} Lead${leads.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Bulk SMS Modal ───────────────────────────────────────────────────────────
const BulkSmsModal = ({
  leads,
  onClose,
}: {
  leads: Prospect[];
  onClose: () => void;
}) => {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!messageText.trim()) {
      toast.warning("Please enter a message");
      return;
    }
    setIsSending(true);
    try {
      await Promise.all(
        leads.map((lead) => prospectService.sendMessage(lead.phone, messageText))
      );
      setSent(true);
      toast.success(`SMS sent to ${leads.length} lead${leads.length > 1 ? "s" : ""}`);
      setTimeout(onClose, 1500);
    } catch {
      toast.error("Failed to send some messages");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <MdMessage className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bulk SMS</h3>
              <p className="text-sm text-yellow-100">
                Sending to {leads.length} lead{leads.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
          >
            <IoClose className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Recipient chips */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Recipients</p>
            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
              {leads.map((lead) => (
                <span
                  key={lead.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-800"
                >
                  <span className="w-4 h-4 bg-yellow-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">
                    {lead.fullName?.[0]?.toUpperCase()}
                  </span>
                  {lead.fullName}
                </span>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Message</label>
            <textarea
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="w-full mt-1.5 p-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-yellow-500 focus:outline-none dark:bg-gray-700 text-sm resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{messageText.length} chars</p>
          </div>

          {/* Send */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || sent}
              className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm shadow-md transition-colors"
            >
              <MdMessage className="w-4 h-4" />
              {isSending ? "Sending..." : sent ? "Sent!" : `Send to ${leads.length} Lead${leads.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LeadContent = (): JSX.Element => {
  const params = useParams();
  const info = params?.infotype as string;
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [leadData, setLeadData] = useState<Prospect[]>([]);
  const [err, setErr] = useState<string[] | string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchVal, setSearchVal] = useState<string>("");
  const [activeColumns, setActiveColumns] = useState<ActiveColumns>(DEF_ACTIVE[info]);
  const [showColumnPicker, setShowColumnPicker] = useState<boolean>(false);
  const [infoType, setInfoType] = useState<string>(info);
  const [ALL_COLUMNS, setALL_COLUMNS] = useState<any[]>(ALL_COL[info]);
  const [openFilter, setOpenFilter] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterValues>({ fullName: "" });
  const [filterQuery, setFilterQuery] = useState<FilterValues>({});
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignableLeads, setAssignableLeads] = useState<Prospect[]>([]);

  // Separate communication selection (independent from assign selection)
  const [commSelectedIds, setCommSelectedIds] = useState<Set<string>>(new Set());
  const [commMode, setCommMode] = useState<"call" | "sms" | "mail" | null>(null);

  const commSelectAllRef = useRef<HTMLInputElement>(null);

  // Bulk action modals (opened via header buttons)
  const [showBulkCallModal, setShowBulkCallModal] = useState(false);
  const [showBulkMailModal, setShowBulkMailModal] = useState(false);
  const [showBulkSmsModal, setShowBulkSmsModal] = useState(false);

  // Single lead quick action modals
  const [singleActionLead, setSingleActionLead] = useState<Prospect | null>(null);
  const [singleActionType, setSingleActionType] = useState<"call" | "sms" | "mail" | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const pageRef = useRef<number>(1);
  const bottomRef = useRef<HTMLTableRowElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const isAllSelected = assignableLeads.length === selectedLeadIds.size;
  const isIndeterminate = selectedLeadIds.size > 0 && !isAllSelected;

  const isAllCommSelected = leadData.length > 0 && leadData.length === commSelectedIds.size;
  const isCommIndeterminate = commSelectedIds.size > 0 && !isAllCommSelected;

  // Selected lead objects for bulk comm modals
  const commSelectedLeads = leadData.filter((l) => commSelectedIds.has(l.id));

  // Toggle a lead in the comm selection
  const toggleCommSelect = (id: string) => {
    setCommSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleSelectAllComm = () => {
    if (isAllCommSelected) {
      setCommSelectedIds(new Set());
    } else {
      setCommSelectedIds(new Set(leadData.map((l) => l.id)));
    }
  };

  // Open bulk modal — if nothing selected, use all loaded leads
  const openBulkModal = (type: "call" | "sms" | "mail") => {
    if (commSelectedIds.size === 0) {
      toast.info("Select leads using the comm checkboxes, or all loaded leads will be used");
    }
    if (type === "call") setShowBulkCallModal(true);
    if (type === "sms") setShowBulkSmsModal(true);
    if (type === "mail") setShowBulkMailModal(true);
  };

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = isIndeterminate;
  }, [isIndeterminate]);

  useEffect(() => {
    if (commSelectAllRef.current) commSelectAllRef.current.indeterminate = isCommIndeterminate;
  }, [isCommIndeterminate]);

  const { hasPermission } = usePermissions();

  useEffect(() => { pageRef.current = currentPage; }, [currentPage]);

  useEffect(() => {
    function handleOutsideClick(e: globalThis.MouseEvent): void {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColumnPicker(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const fetchData = async (page: number, currentFilters: FilterValues, reset = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (reset) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const result: any = await prospectService.getAll(page, PAGE_LIMIT, currentFilters);
      if (result.status === 200) {
        const data = result.data.data;
        const newLeads: Prospect[] = data;
        setLeadData((prev) => (reset ? newLeads : [...prev, ...newLeads]));
        setCurrentPage(page);
        setAssignableLeads((prev) =>
          reset
            ? newLeads.filter((item) => !item.assignTo?.id)
            : [...prev, ...newLeads.filter((item) => !item.assignTo?.id)]
        );
        const totalPages = Number(data.totalPages);
        setHasMore(page < totalPages);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      else setErr(["Something went wrong"]);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => { fetchData(1, filters, true); getAssignableUsers(); }, []);
  useEffect(() => { rowRefs.current.clear(); setHasMore(true); fetchData(1, filters, true); }, [filters]);

  useEffect(() => {
    if (!bottomRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
          fetchData(pageRef.current + 1, filters);
        }
      },
      { root: null, rootMargin: "0px", threshold: 0 }
    );
    observerRef.current.observe(bottomRef.current);
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [hasMore, filters, leadData.length]);

  useEffect(() => {
    if (!hasMore && observerRef.current) observerRef.current.disconnect();
  }, [leadData, hasMore]);

  useEffect(() => { return () => { if (observerRef.current) observerRef.current.disconnect(); }; }, []);
  useEffect(() => { fetchData(1, { ...filters, ...filterQuery }, true); }, [filterQuery]);
  useEffect(() => { setALL_COLUMNS(ALL_COL[infoType]); setActiveColumns(DEF_ACTIVE[infoType]); }, [infoType]);

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, fullName: val }));
    }, 300);
  };

  const toggleColumn = (key: string): void => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (col?.required) return;
    setActiveColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getValue = (obj: any, path: string) => path.split(".").reduce((acc, part) => acc?.[part], obj);
  const visibleCols = ALL_COLUMNS.filter((c) => activeColumns[c.key]);
  const activeCount = Object.values(activeColumns).filter(Boolean).length;
  const setRowRef = (index: number) => (el: HTMLTableRowElement | null) => {
    if (el) rowRefs.current.set(index, el);
    else rowRefs.current.delete(index);
  };

  const clearAssignSelection = () => { setSelectedLeadIds(new Set()); setSelectedUserId(""); };

  const getAssignableUsers = async () => {
    const result = await prospectService.getAllActiveWithoutPagination();
    if (result.status === 200) setAssignableUsers(result.data.data);
  };

  const handleSelectAll = () => {
    if (isAllSelected) { setSelectedLeadIds(new Set()); setSelectedUserId(""); }
    else {
      const s = new Set(selectedLeadIds);
      leadData.forEach((item) => !item.assignTo && s.add(item.id));
      setSelectedLeadIds(s);
    }
  };

  const handleSelectOne = (id: string) => {
    const s = new Set(selectedLeadIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedLeadIds(s);
  };

  const handleAssignLeads = async (): Promise<void> => {
    if (!selectedUserId) { toast.warning("Please select a user to assign leads to"); return; }
    if (selectedLeadIds.size === 0) { toast.warning("Please select at least one lead"); return; }
    setIsAssigning(true);
    try {
      const result = await prospectService.assignBulkLead(selectedUserId, Array.from(selectedLeadIds));
      if (result.status === 200) {
        toast.success(result.data.message);
        clearAssignSelection();
        await fetchData(1, filters, true);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) { const m = extractErrorMessages(error); setErr(m); toast.error(`${m}`); }
      else setErr(["Something went wrong"]);
    } finally { setIsAssigning(false); }
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize
      ${status === "new" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        : status === "contacted" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
        : status === "qualified" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
        : status === "proposal" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
        : status === "won" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
        : status === "lost" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
        : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"}`}>
      {status}
    </span>
  );

  const RowActions = ({ item }: { item: Prospect }) => {
    const isCommChecked = commSelectedIds.has(item.id);
    return (
      <span className="flex items-center gap-1.5 p-2">
        {/* Comm selection checkbox */}
        <label className="relative inline-flex items-center cursor-pointer mr-1" title="Select for bulk communication">
          <input
            type="checkbox"
            className="sr-only"
            checked={isCommChecked}
            onChange={() => toggleCommSelect(item.id)}
          />
          <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-all duration-150 ${isCommChecked ? "bg-slate-600 border-slate-600" : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-slate-500"}`}>
            {isCommChecked && <FaCheck className="text-white text-[8px]" />}
          </div>
        </label>

        {/* View */}
        {hasPermission(PERMISSIONS.readProspects) ? (
          <Link href={`/prospects/view/${item.id}`} className="h-8 w-8 flex items-center justify-center rounded-md bg-green-100/80 dark:bg-green-900/30 hover:bg-green-200 text-green-600 hover:scale-105 transition-transform" title="View">
            <FaRegEye className="text-sm" />
          </Link>
        ) : (
          <span className="h-8 w-8 flex items-center justify-center rounded-md bg-green-100/80 text-green-500 opacity-50 cursor-not-allowed">
            <FaRegEye className="text-sm" />
          </span>
        )}

        {/* Call */}
        {hasPermission(PERMISSIONS.callProspects) && (
          <button
            onClick={() => { setSingleActionLead(item); setSingleActionType("call"); }}
            className="h-8 w-8 flex items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 text-blue-600 hover:scale-105 transition-transform"
            title="Call"
          >
            <MdPhoneEnabled className="text-sm" />
          </button>
        )}

        {/* SMS */}
        {hasPermission(PERMISSIONS.smsProspects) && (
          <button
            onClick={() => { setSingleActionLead(item); setSingleActionType("sms"); }}
            className="h-8 w-8 flex items-center justify-center rounded-md bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 text-yellow-600 hover:scale-105 transition-transform"
            title="Send SMS"
          >
            <MdSms className="text-sm" />
          </button>
        )}

        {/* Mail */}
        {hasPermission(PERMISSIONS.emailProspects) && (
          <button
            onClick={() => { setSingleActionLead(item); setSingleActionType("mail"); }}
            className="h-8 w-8 flex items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 text-emerald-600 hover:scale-105 transition-transform"
            title="Send Email"
          >
            <MdMailOutline className="text-sm" />
          </button>
        )}
      </span>
    );
  };

  const Spinner = ({ color }: { color: string }) => (
    <svg className={`animate-spin h-4 w-4 ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );

  return (
    <>
      <div className="ml-72 mt-14 p-6">
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between">

          {/* Header */}
          <div className="flex w-full items-center gap-12 justify-between">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-bold dark:text-white text-slate-900">Prospect</h2>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
                <IoIosSearch className="text-xl" />
                <input
                  type="text"
                  className="outline-none bg-transparent"
                  value={searchVal}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name"
                />
              </div>

              {/* Column Picker */}
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowColumnPicker((v) => !v)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-900/10 text-sm font-semibold transition-all duration-200 cursor-pointer ${showColumnPicker ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 dark:bg-gray-600 text-slate-700 dark:text-white"}`}
                >
                  <FiColumns className="text-base" />
                  Columns
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${showColumnPicker ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"}`}>
                    {activeCount}
                  </span>
                </button>

                {showColumnPicker && (
                  <div className="absolute top-[calc(100%+8px)] left-0 z-50 bg-white dark:bg-gray-800 border border-slate-900/10 rounded-xl shadow-xl min-w-55 py-2 max-h-80 overflow-y-scroll">
                    <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-gray-700 mb-1">
                      Select Columns
                    </p>
                    {ALL_COLUMNS.map((col) => (
                      <div
                        key={col.key}
                        onClick={() => toggleColumn(col.key)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${col.required ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700"}`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${activeColumns[col.key] ? "bg-blue-600 border-blue-600" : "border-slate-300 dark:border-gray-500"}`}>
                          {activeColumns[col.key] && <span className="text-white text-[10px] leading-none">✓</span>}
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 font-medium">{col.label}</span>
                        {col.required && <span className="ml-auto text-[10px] bg-slate-100 dark:bg-gray-600 text-slate-400 rounded px-1.5 py-0.5">locked</span>}
                      </div>
                    ))}
                    <div className="flex gap-2 px-3 pt-2 mt-1 border-t border-slate-100 dark:border-gray-700">
                      <button
                        onClick={() => { const all = {} as ActiveColumns; ALL_COLUMNS.forEach((c) => (all[c.key] = true)); setActiveColumns(all); }}
                        className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setActiveColumns(DEF_ACTIVE[infoType])}
                        className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-colors">⬆</button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-colors">⬇</button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-md flex items-center gap-2 text-sm font-normal transition-colors border-2"
                  onClick={() => setOpenFilter((prev) => !prev)}
                >
                  <LiaFilterSolid /> {openFilter ? "Hide Filters" : "Show Filters"}
                </button>
              </div>
            </div>
          </div>

          {/* ── Assign Action Bar — only for assignment selection ── */}
          {selectedLeadIds.size > 0 && (
            <div className="w-full bg-blue-600 dark:bg-blue-700 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap shadow-lg shadow-blue-200/60 dark:shadow-blue-900/30 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <HiOutlineUserGroup className="text-white text-lg" />
                  <span className="text-white text-sm font-semibold">
                    {selectedLeadIds.size} lead{selectedLeadIds.size > 1 ? "s" : ""} selected for assignment
                  </span>
                </div>
                <button
                  onClick={clearAssignSelection}
                  className="text-blue-200 group cursor-pointer hover:text-white text-xs underline underline-offset-2 flex items-center gap-1 transition-colors"
                >
                  <FaXmark className="text-xs group-hover:rotate-90" /> Clear
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  {!selectedUserId && <span className="text-blue-200 text-[11px] ml-1">← Select a user first</span>}
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="bg-white dark:bg-gray-800 text-slate-800 dark:text-white px-4 py-2 rounded-lg border-0 outline-none text-sm min-w-52 cursor-pointer shadow-sm"
                  >
                    <option value="" disabled>— Select user to assign —</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName ?? ""}{u.userRole[0]?.name ? ` · ${u.userRole[0].name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAssignLeads}
                  disabled={!selectedUserId || isAssigning}
                  className="bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  {isAssigning ? <><Spinner color="text-blue-600" /> Assigning...</> : <><MdOutlinePersonAdd className="text-lg" /> Assign Leads</>}
                </button>
              </div>
            </div>
          )}



          {/* Table */}
          <div className="w-full overflow-hidden rounded-xl">
            <div className="overflow-x-auto w-full">
              <table className="w-full overflow-scroll overflow-x-scroll">
                <thead>
                  <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
                    {hasPermission(PERMISSIONS.assignLead) && (
                      <th className="p-4 w-12 whitespace-nowrap">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input ref={selectAllRef} type="checkbox" className="sr-only" checked={isAllSelected} onChange={handleSelectAll} />
                          <div className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all duration-150 ${isAllSelected || isIndeterminate ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-gray-700 border-slate-300 hover:border-blue-400"}`}>
                            {isAllSelected && <FaCheck className="text-white text-[9px]" />}
                            {isIndeterminate && <span className="block w-2.5 h-0.5 bg-white rounded-full" />}
                          </div>
                        </label>
                      </th>
                    )}
                    {visibleCols.map((col) => (
                      <th key={col.key} className={`p-4 uppercase text-xs text-slate-500 dark:text-slate-100 whitespace-nowrap ${col.key === "actions" ? "text-center" : "text-start"}`}>
                        {col.key === "actions" ? (
                          <div className="flex items-center gap-4 px-2">
                            <label className="relative inline-flex items-center cursor-pointer" title="Select all for communication">
                              <input
                                ref={commSelectAllRef}
                                type="checkbox"
                                className="sr-only"
                                checked={isAllCommSelected}
                                onChange={handleSelectAllComm}
                              />
                              <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-all duration-150 ${isAllCommSelected || isCommIndeterminate ? "bg-slate-600 border-slate-600" : "bg-white dark:bg-gray-700 border-slate-300 hover:border-slate-500"}`}>
                                {isAllCommSelected && <FaCheck className="text-white text-[8px]" />}
                                {isCommIndeterminate && <span className="block w-2.5 h-0.5 bg-white rounded-full" />}
                              </div>
                            </label>
                            <span>{col.label}</span>
                          </div>
                        ) : col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => {
                      const rr = (leadData.length + i) % 2 === 0;
                      return (
                        <tr key={`skel-${i}`} className={`${rr ? "bg-white dark:bg-transparent" : "bg-blue-100/50 dark:bg-slate-500 whitespace-nowrap"} w-full`}>
                          {hasPermission(PERMISSIONS.assignLead) && <td className="p-4"><Skeleton width={30} height={24} borderRadius={10} /></td>}
                          {Object.entries(activeColumns).map(([key, isActive]) =>
                            isActive ? <td key={key} className="p-4"><Skeleton width={120} height={24} borderRadius={10} /></td> : null
                          )}
                        </tr>
                      );
                    })
                  ) : leadData?.length > 0 ? (
                    <>
                      {leadData.map((item, i) => {
                        const rr = i % 2 === 0;
                        const isChecked = selectedLeadIds.has(item.id);
                        return (
                          <tr key={item.id} ref={setRowRef(i)} className={`${rr ? "bg-white dark:bg-transparent" : "bg-blue-100/50 dark:bg-slate-500"} w-full`}>
                            {hasPermission(PERMISSIONS.assignLead) && (
                              <td className="p-4 text-center">
                                {!item.assignTo?.id ? (
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => handleSelectOne(item.id)} />
                                    <div className={`w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all duration-150 ${isChecked ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-gray-700 border-slate-300 dark:border-slate-500 hover:border-blue-400"}`}>
                                      {isChecked && <FaCheck className="text-white text-[9px]" />}
                                    </div>
                                  </label>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-green-100 dark:bg-green-900/30" title="Already assigned">
                                    <FaCheck className="text-green-500 text-[8px]" />
                                  </span>
                                )}
                              </td>
                            )}
                            {Object.entries(activeColumns).map(([key, isActive]) => {
                              if (!isActive) return null;
                              const value = getValue(item, key);
                              let content;
                              if (key === "status") content = <StatusBadge status={value ?? "-"} />;
                              else if (key === "technologies" && Array.isArray(value)) content = <span className="capitalize text-sm whitespace-nowrap">{value.join(", ")}</span>;
                              else if (key === "projectType") content = <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium">{value}</span>;
                              else if (typeof value === "object" && value !== null) content = <span className="capitalize text-sm whitespace-nowrap">{Object.values(value).join(", ")}</span>;
                              else if (key === "email") content = <SensitiveField value={item.email} link={`mailto:${item.email}`} maskedValue={maskEmail(item.email)} fontSize="sm" />;
                              else if (key === "phone") content = <SensitiveField value={value} link={`tel:${value}`} maskedValue={maskPhone(value)} fontSize="sm" />;
                              else if (key === "actions") content = <RowActions item={item} />;
                              else content = <span className="capitalize text-sm whitespace-nowrap">{value ?? "-"}</span>;
                              return <td key={key} className="p-4">{content}</td>;
                            })}
                          </tr>
                        );
                      })}

                      {isFetchingMore && Array.from({ length: 5 }).map((_, i) => {
                        const rr = (leadData.length + i) % 2 === 0;
                        return (
                          <tr key={`more-${i}`} className={`${rr ? "bg-white dark:bg-transparent" : "bg-blue-100/50 dark:bg-slate-500"} w-full`}>
                            {Object.entries(activeColumns).map(([key, isActive]) =>
                              isActive ? <td key={key} className="p-4"><Skeleton /></td> : null
                            )}
                          </tr>
                        );
                      })}
                    </>
                  ) : (
                    <tr>
                      <td className="p-4 text-center" colSpan={visibleCols.length}>Data not found</td>
                    </tr>
                  )}
                  <tr ref={bottomRef}><td colSpan={visibleCols.length}></td></tr>
                </tbody>
              </table>
            </div>
            {!hasMore && !isFetchingMore && (
              <p className="p-4 text-center text-xs text-slate-400">
                — All leads loaded ({leadData.length} total) —
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filter sidebar */}
      {openFilter && (
        <FilterSideBar
          open={openFilter}
          onClose={() => setOpenFilter(false)}
          onFilterChange={(filters) => setFilterQuery(filters)}
          onInfoTypeChange={(infotype) => setInfoType(infotype)}
          infoValue={info}
        />
      )}

      {/* Bulk modals — use comm selection, fallback to all loaded leads */}
      {showBulkCallModal && (
        <BulkCallModal
          leads={commSelectedLeads.length > 0 ? commSelectedLeads : leadData}
          onClose={() => setShowBulkCallModal(false)}
        />
      )}
      {showBulkMailModal && (
        <BulkMailModal
          leads={commSelectedLeads.length > 0 ? commSelectedLeads : leadData}
          onClose={() => setShowBulkMailModal(false)}
        />
      )}
      {showBulkSmsModal && (
        <BulkSmsModal
          leads={commSelectedLeads.length > 0 ? commSelectedLeads : leadData}
          onClose={() => setShowBulkSmsModal(false)}
        />
      )}

      {/* Single lead quick action modals */}
      {singleActionLead && singleActionType === "call" && (
        <BulkCallModal
          leads={[singleActionLead]}
          onClose={() => { setSingleActionLead(null); setSingleActionType(null); }}
        />
      )}
      {singleActionLead && singleActionType === "sms" && (
        <BulkSmsModal
          leads={[singleActionLead]}
          onClose={() => { setSingleActionLead(null); setSingleActionType(null); }}
        />
      )}
      {singleActionLead && singleActionType === "mail" && (
        <BulkMailModal
          leads={[singleActionLead]}
          onClose={() => { setSingleActionLead(null); setSingleActionType(null); }}
        />
      )}
      {/* ── Floating Communication Navbar ── */}
      <div
        className={`fixed bottom-0 left-72 right-0 z-40 transition-all duration-300 ease-in-out ${
          commSelectedIds.size > 0
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-6 mb-5">
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-2xl shadow-2xl shadow-slate-300/50 dark:shadow-black/40 px-5 py-3.5 flex items-center justify-between gap-4">

            {/* Left — selected info + avatars */}
            <div className="flex items-center gap-3 min-w-0">
              {/* indicator */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <HiOutlineUserGroup className="text-indigo-600 dark:text-indigo-400 text-lg" />
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {commSelectedIds.size}
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                  {commSelectedIds.size} lead{commSelectedIds.size > 1 ? "s" : ""} selected
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight">Ready to call, SMS, or email</p>
              </div>

              {/* Mini avatar strip */}
              <div className="hidden sm:flex items-center -space-x-2 ml-1">
                {commSelectedLeads.slice(0, 5).map((lead, i) => (
                  <div
                    key={lead.id}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    title={lead.fullName}
                    style={{ zIndex: 5 - i }}
                  >
                    {lead.fullName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                ))}
                {commSelectedIds.size > 5 && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-slate-500 dark:text-slate-300 text-[9px] font-bold shrink-0">
                    +{commSelectedIds.size - 5}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-gray-600 shrink-0" />

            {/* Center — action buttons */}
            <div className="flex items-center gap-2">
              {hasPermission(PERMISSIONS.callProspects) && (
                <button
                  onClick={() => setShowBulkCallModal(true)}
                  className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white border border-blue-200 dark:border-blue-700 hover:border-blue-600 text-sm font-semibold transition-all duration-150 shadow-sm hover:shadow-md"
                >
                  <MdPhoneEnabled className="text-base group-hover:scale-110 transition-transform" />
                  <span>Call All</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.smsProspects) && (
                <button
                  onClick={() => setShowBulkSmsModal(true)}
                  className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-white border border-amber-200 dark:border-amber-700 hover:border-amber-500 text-sm font-semibold transition-all duration-150 shadow-sm hover:shadow-md"
                >
                  <MdSms className="text-base group-hover:scale-110 transition-transform" />
                  <span>SMS All</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.emailProspects) && (
                <button
                  onClick={() => setShowBulkMailModal(true)}
                  className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white border border-emerald-200 dark:border-emerald-700 hover:border-emerald-600 text-sm font-semibold transition-all duration-150 shadow-sm hover:shadow-md"
                >
                  <MdMailOutline className="text-base group-hover:scale-110 transition-transform" />
                  <span>Mail All</span>
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-gray-600 shrink-0" />

            {/* Right — clear */}
            <button
              onClick={() => setCommSelectedIds(new Set())}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
              title="Clear selection"
            >
              <IoClose className="text-base" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeadContent;