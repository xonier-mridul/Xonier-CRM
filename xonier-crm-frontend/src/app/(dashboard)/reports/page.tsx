"use client";

import React, { JSX, useState, useEffect, useCallback, useRef } from "react";
import { TaskReportService } from "@/src/services/taskReport.service";
import type { TaskReport } from "@/src/types/task/taskReport";
import { MdDelete } from "react-icons/md";
import Link from "next/link";
import { toast } from "react-toastify";
import DateFilterButton from "@/src/components/common/dateFilter";
import { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS, TASK_REPORT_STATUS } from "@/src/constants/enum";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { User, UserRole } from "@/src/types";
import axios from "axios";
import extractErrorMessages from "../../utils/error.utils";
import { AuthService } from "@/src/services/auth.service";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { IoIosSearch } from "react-icons/io";
import { MdClose } from "react-icons/md";
import { RoleService } from "@/src/services/role.service";
import { IoChevronDown } from "react-icons/io5";
import { FormatDate, FormatWeekday } from "@/src/components/common/FormateDate";

const STATUS_META: Record<
  string,
  { label: string; dot: string; bg: string; text: string }
> = {
  morning_pending: {
    label: "Morning Pending",
    dot: "bg-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
  },
  morning_submitted: {
    label: "Morning Done",
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
  },
  evening_pending: {
    label: "Evening Pending",
    dot: "bg-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-400",
  },
  evening_submitted: {
    label: "Evening Done",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  submitted: {
    label: "Submitted",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  reviewed: {
    label: "Reviewed",
    dot: "bg-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-400",
  },
};

const MOOD_EMOJI: Record<string, string> = {
  excellent: "🚀",
  good: "😊",
  neutral: "😐",
  tired: "😴",
  stressed: "😰",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? {
    label: status,
    dot: "bg-gray-400",
    bg: "bg-gray-50 dark:bg-gray-700",
    text: "text-gray-600 dark:text-gray-400",
  };
  const {t} = useTranslation()
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${m.bg} ${m.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {t(m.label.toLowerCase())}
    </span>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct === 100 ? "#10b981" : pct >= 50 ? "#3b82f6" : "#f59e0b";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-gray-100 dark:text-gray-700"
      />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill={color}
      >
        {pct}%
      </text>
    </svg>
  );
}

function ExpandableRow({
  report,
  canDelete,
  handleDelete,
}: {
  report: TaskReport;
  canDelete: boolean;
  handleDelete: (id: string, date: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const morningItems = report.morningAgenda?.items ?? [];
  const completedItems = report.eveningReport?.completedItems ?? [];
  const pendingItems = report.eveningReport?.pendingItems ?? [];
  const totalEst = morningItems.reduce(
    (s, i) => s + (i.estimatedHours ?? 0),
    0
  );

  const totalActual =
    Number(completedItems.reduce((s, i) => s + (i.actualHours ?? 0), 0)) +
    Number(pendingItems.reduce((s, i) => s + (i.actualHours ?? 0), 0));
  const user = report.user;
  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <>
      <tr
        className="text-nowrap border-b border-gray-50 dark:border-gray-700/60 hover:bg-slate-50/60 dark:hover:bg-gray-700/30 transition-colors cursor-pointer group"
        onClick={() => router.push(`/report/detail/${report.id}`)}
      >
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#16c2cf] to-[#0fb8a5] flex items-center justify-center text-white text-xs font-extrabold shrink-0 shadow-sm">
              {initials}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                {user?.company ?? "—"}
              </p>
            </div>
          </div>
        </td>

        <td className="px-5 py-4">
         
<div className="flex flex-col">
  <span className="text-sm font-bold text-gray-900 dark:text-white">
    {FormatDate(report.reportDate)}
  </span>

  <span className="text-[10px] text-gray-400 font-medium">
    {FormatWeekday(report.reportDate)}
  </span>
</div>
        </td>

        <td className="px-5 py-4">
          <StatusBadge status={report.status} />
        </td>

        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-gray-900 dark:text-white">
              {morningItems.length}
            </span>
            <span className="text-xs text-gray-400">{t("planned")}</span>
            <span className="text-gray-200 dark:text-gray-600">|</span>
            <span className="text-sm font-extrabold text-emerald-600">
              {completedItems.length}
            </span>
            <span className="text-xs text-gray-400">{t("done")}</span>
          </div>
        </td>

        <td className="px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 w-12">{t("est")}</span>
              <div className="h-1.5 w-24 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full"
                  style={{ width: `${Math.min((totalEst / 8) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {totalEst.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 w-12">
                {t("actual")}
              </span>
              <div className="h-1.5 w-24 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{
                    width: `${Math.min((totalActual / 8) * 100, 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {totalActual.toFixed(1)}h
              </span>
            </div>
          </div>
        </td>

        <td className="px-5 py-4">
          {report.eveningReport?.overallMood ? (
            <span className="text-xl" title={report.eveningReport.overallMood}>
              {MOOD_EMOJI[report.eveningReport.overallMood] ?? "—"}
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
          )}
        </td>

        <td className="px-5 py-4">
          {report.isReviewed ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />{" "}
              {t("reviewed")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
              {t("pending")}
            </span>
          )}
        </td>

        <td className="px-5 py-4">
          <button
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all"
            onClick={(e) => {
              setOpen((o) => !o);
              e.stopPropagation();
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                transform: open ? "rotate(180deg)" : "",
                transition: "transform .2s",
              }}
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </td>

        <td className="justify-center px-5 py-4 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(report.id, report.reportDate);
            }}
            disabled={!canDelete}
            className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <MdDelete
              className={`w-5 h-5 transition-colors ${
                canDelete
                  ? "text-red-500 cursor-pointer hover:text-red-700"
                  : "text-red-200 cursor-not-allowed"
              }`}
            />
          </button>
        </td>
      </tr>

      {open && (
        <tr className="bg-slate-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
          <td colSpan={9} className="px-6 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🌅</span>
                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {t("morning_agenda")}
                  </h4>
                  {report.morningAgenda?.goals && (
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 italic max-w-[200px] truncate">
                      "{report.morningAgenda.goals}"
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {morningItems.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      {t("no_items_planned")}
                    </p>
                  ) : (
                    morningItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                      >
                        <ProgressRing pct={item.completionPercentage} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-800 dark:text-white">
                              {item.title}
                            </span>
                            {item.priority && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.low}`}
                              >
                                {item.priority}
                              </span>
                            )}
                            {item.linkedTaskId && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                                {item.linkedTaskId}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-gray-400">
                              {t("est_3")}{" "}
                              <b className="text-gray-600 dark:text-gray-300">
                                {item.estimatedHours ?? "—"}h
                              </b>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🌆</span>
                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {t("evening_report")}
                  </h4>
                  {report.eveningReport?.overallMood && (
                    <span className="ml-auto text-base">
                      {MOOD_EMOJI[report.eveningReport.overallMood]}
                    </span>
                  )}
                </div>

                {report.eveningReport?.isSubmitted ? (
                  <div className="space-y-3">
                    {report.eveningReport.completedItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                      >
                        <ProgressRing pct={item.completionPercentage} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-800 dark:text-white">
                              {item.title}
                            </span>
                            {item.priority && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.low}`}
                              >
                                {item.priority}
                              </span>
                            )}
                            {item.linkedTaskId && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                                {item.linkedTaskId}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-gray-400">
                              {t("est_3")}{" "}
                              <b className="text-gray-600 dark:text-gray-300">
                                {item.estimatedHours ?? "—"}h
                              </b>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {report.eveningReport.achievements && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                          {t("achievements")}
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line">
                          {report.eveningReport.achievements}
                        </p>
                      </div>
                    )}
                    {report.eveningReport.blockers && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                        <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                          {t("blockers_2")}
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line">
                          {report.eveningReport.blockers}
                        </p>
                      </div>
                    )}
                    {report.eveningReport.tomorrowPlan && (
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                          {t("tomorrow_s_plan")}
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line">
                          {report.eveningReport.tomorrowPlan}
                        </p>
                      </div>
                    )}
                    {pendingItems.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        <span>⏳</span> {pendingItems.length}{" "}
                        {t("task_s_carried_forward")}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-28 text-gray-300 dark:text-gray-600">
                    <span className="text-3xl mb-2">🌙</span>
                    <p className="text-xs font-semibold">
                      {t("evening_report_not_submitted_yet")}
                    </p>
                  </div>
                )}
              </div>

              {report.managerComment && (
                <div className="lg:col-span-2 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 flex items-start gap-2">
                  <span className="text-base shrink-0">💬</span>
                  <div>
                    <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-0.5">
                      {t("manager_comment")}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {report.managerComment}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-50 dark:border-gray-700/60">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div
            className={`h-4 bg-gray-100 dark:bg-gray-700 rounded-lg ${
              i === 0 ? "w-32" : i === 1 ? "w-20" : "w-16"
            }`}
          />
        </td>
      ))}
    </tr>
  );
}

function CustomDropdownFilter({
  placeholder,
  value,
  inputValue,
  onInputChange,
  onSelect,
  onClear,
  items,
  loading,
  showDropdown,
  setShowDropdown,
  renderItem,
  renderSelected,
  emptyText,
  dropdownRef,
}: {
  placeholder: string;
  value: string;
  inputValue: string;
  onInputChange: (val: string) => void;
  onSelect: (item: any) => void;
  onClear: () => void;
  items: any[];
  loading?: boolean;
  showDropdown: boolean;
  setShowDropdown: (v: boolean) => void;
  renderItem: (item: any) => React.ReactNode;
  renderSelected?: () => React.ReactNode;
  emptyText?: string;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={dropdownRef} className="relative min-w-[200px]">
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white dark:bg-gray-800 transition-all
          ${
            showDropdown || value
              ? "border-cyan-400 ring-2 ring-cyan-500/20"
              : "border-gray-200 dark:border-gray-600"
          }`}
      >
        <IoIosSearch className="text-gray-400 text-base flex-shrink-0" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => {
            if (inputValue.length > 0 || items.length > 0)
              setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 min-w-0"
        />

        {(inputValue || value) && (
          <button
            type="button"
            onClick={onClear}
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
          >
            <MdClose className="text-sm" />
          </button>
        )}
      </div>

      {value && !showDropdown && renderSelected && (
        <div className="absolute -top-2 -right-2">
          <span className="w-4 h-4 rounded-full bg-cyan-500 text-white text-[9px] font-bold flex items-center justify-center">
            ✓
          </span>
        </div>
      )}

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                <span className="text-2xl mb-1">🔍</span>
                <p className="text-xs">{emptyText ?? "No results found"}</p>
              </div>
            ) : (
              items.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors group"
                >
                  {renderItem(item)}
                </button>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                {items.length} result{items.length !== 1 ? "s" : ""} found
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TaskReportListPage = (): JSX.Element => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<TaskReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string[] | string>("");

  const { hasPermission } = usePermissions();

  const [searchInput, setSearchInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const [departmentSearchInp, setDepartmentSearchInp] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [departmentDropdown, setDepartmentDropdown] = useState(false);
  const [departmentsData, setDepartmentsData] = useState<
    { id: string; name: string }[]
  >([]);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const departmentRef = useRef<HTMLDivElement>(null);

  const [roleSearchInp, setRoleSearchInp] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [roleDropdown, setRoleDropdown] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);
  const [roleData, setRoleData] = useState<UserRole[]>([]);
  const [statusDropdown, setStatusDropdown] = useState(false);

const STATUS_OPTIONS = [
  { value: "", label: t("all_statuses") },
  {
    value: TASK_REPORT_STATUS.MORNING_PENDING,
    label: t("morning_pending_2"),
  },
  {
    value: TASK_REPORT_STATUS.EVENING_PENDING,
    label: t("evening_pending_2"),
  },
  {
    value: TASK_REPORT_STATUS.COMPLETED_PENDING_REVIEW,
    label: t("complete_pending_review"),
  },
  {
    value: TASK_REPORT_STATUS.SUBMITTED,
    label: t("submitted_3"),
  },
  {
    value: TASK_REPORT_STATUS.REVIEWED,
    label: t("reviewed_2"),
  },
   {
    value: TASK_REPORT_STATUS.NOT_SUBMIT,
    label: t("not_submit"),
  },
];

  const [dateFilter, setDateFilter] = useState<DateFilter>({
    fromDate: "",
    toDate: "",
  });

  const canDelete = hasPermission(PERMISSIONS.deleteTaskReport);

  // ── Fetch reports ──
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await TaskReportService.getAll({
        page: currentPage,
        limit: 10,
        userId: userId,
        status: (filterStatus as TASK_REPORT_STATUS) || undefined,
        fromDate: dateFilter.fromDate || undefined,
        toDate: dateFilter.toDate || undefined,

        // roleId: selectedRole || undefined,
      });

      if (res.status === 200) {
        const d = res.data.data;
        setReports(d.data || []);
        setTotalPages(d.totalPages || 1);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    search,
    filterStatus,
    dateFilter,
    userId,
    selectedRole,
  ]);

  const getRoleData = async () => {
    try {
      const result = await RoleService.getRolesWithoutPagination();
      if (result.status === 200) setRoleData(result.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) setErr(extractErrorMessages(error));
      else setErr(["Something went wrong"]);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    getRoleData();
  }, []);

  const handleRoleSearch = (val: string) => {
    setRoleSearchInp(val);
    setRoleDropdown(true);
  };

  const handleSearch = (val: string) => {
    setSearchInput(val);
    setShowDropdown(val.length > 0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 400);
  };

  const handleDepartment = (val: string) => {
    setDepartmentSearchInp(val);
    setDepartmentDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDepartmentSearch(val);
      setCurrentPage(1);
    }, 400);
  };

  // const getDepartments = async () => {
  //   setDepartmentLoading(true);
  //   try {
  //     const result = await AuthService.getDepartments({
  //       search: departmentSearch,
  //     });
  //     if (result.status === 200) {
  //       setDepartmentsData(result.data.data ?? []);
  //     }
  //   } catch (error) {
  //     process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
  //   } finally {
  //     setDepartmentLoading(false);
  //   }
  // };

  const getUserData = async () => {
    setLoading(true);
    try {
      const result = await AuthService.getAllTeamUsers({ search: search });
      if (result.status === 200) {
        setUsersData(result.data.data);
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error))
        setErr(String(...extractErrorMessages(error)));
      else setErr("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        departmentRef.current &&
        !departmentRef.current.contains(e.target as Node)
      ) {
        setDepartmentDropdown(false);
      }
       if (
        statusRef.current &&
        !statusRef.current.contains(e.target as Node)
      ) {
        setStatusDropdown(false);
      }
      if (
        roleRef.current &&
        !roleRef.current.contains(e.target as Node)
      ) {
        setRoleDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    getUserData();
  }, [search]);

  // useEffect(() => {
  //   if (departmentDropdown) getDepartments();
  // }, [departmentSearch, departmentDropdown]);

  const handleUserId = (user: User) => {
    setUserId(user.id);
    setSearchInput(`${user.firstName} ${user.lastName}`);
    setShowDropdown(false);
    setSearch("");
    setCurrentPage(1);
  };

  const handleDelete = async (id: string, date: string) => {
    try {
      const confirm = await ConfirmPopup({
        title: "Are you sure",
        text: `Are you sure to delete ${new Date(date).toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        )} task report`,
        btnTxt: "Yes, Delete",
      }).catch(() => false);
      if (confirm) {
        const res = await TaskReportService.deleteReport(id);
        if (res.status === 200) {
          toast.success("Report deleted");
          const filtered = reports.filter((item) => item.id !== id);
          setReports(filtered);
        }
      }
    } catch {
      toast.error("Failed to delete report");
    }
  };

  // ✅ Robust role filter that checks all possible user role structures
  const filteredReports = selectedRole
    ? reports.filter((r) => {
        const user = r.user as any;
        if (!user) return false;

        const targetRoleObj = roleData.find((rd) => rd.id === selectedRole);
        const targetRoleName = targetRoleObj?.name?.toLowerCase().trim();
        const targetId = String(selectedRole).toLowerCase().trim();

        // 1. Direct properties on user object
        const directProps = [user.roleId, user.role_id, user.role, user.userRole];
        for (const val of directProps) {
          if (!val) continue;
          if (typeof val === "string") {
            const v = val.toLowerCase().trim();
            if (v === targetId || (targetRoleName && v === targetRoleName)) return true;
          } else if (typeof val === "object") {
            const objId = String(val.id || val._id || val.roleId || "").toLowerCase().trim();
            const objName = String(val.name || val.roleName || val.title || "").toLowerCase().trim();
            if (objId && objId === targetId) return true;
            if (targetRoleName && objName && objName === targetRoleName) return true;
          }
        }

        // 2. Array properties on user object (roles, userRoles, etc.)
        const arrayProps = [user.roles, user.userRoles, user.user_roles];
        let hasArrayProps = false;

        for (const arr of arrayProps) {
          if (Array.isArray(arr) && arr.length > 0) {
            hasArrayProps = true;
            const match = arr.some((item: any) => {
              if (!item) return false;
              if (typeof item === "string") {
                const v = item.toLowerCase().trim();
                return v === targetId || (targetRoleName && v === targetRoleName);
              }
              if (typeof item === "object") {
                const itemId = String(item.id || item._id || item.roleId || item.role?.id || item.role?._id || "").toLowerCase().trim();
                const itemName = String(item.name || item.roleName || item.role?.name || "").toLowerCase().trim();
                if (itemId && itemId === targetId) return true;
                if (targetRoleName && itemName && itemName === targetRoleName) return true;
              }
              return false;
            });
            if (match) return true;
          }
        }

        // 3. Fallback: If report.user doesn't have role props populated, trust backend results
        const hasRoleInfoOnUser = directProps.some(Boolean) || hasArrayProps;
        if (!hasRoleInfoOnUser) return true;

        return false;
      })
    : reports;

  const totalReports = filteredReports.length;
  const reviewed = filteredReports.filter((r) => r.isReviewed).length;
  const eveningDone = filteredReports.filter(
    (r) =>
      r.status === TASK_REPORT_STATUS.SUBMITTED ||
      r.status === TASK_REPORT_STATUS.REVIEWED
  ).length;
  const avgCompletion = filteredReports.length
    ? Math.round(
        filteredReports.reduce((sum, r) => {
          const items = r.eveningReport?.completedItems ?? [];
          if (!items.length) return sum;
          return (
            sum +
            items.reduce((s, i) => s + i.completionPercentage, 0) /
              items.length
          );
        }, 0) / filteredReports.length
      )
    : 0;

  const hasActiveFilter =
    search ||
    filterStatus ||
    dateFilter.fromDate ||
    dateFilter.toDate ||
    selectedDepartment ||
    selectedRole;

  const handleClearAll = () => {
    setSearchInput("");
    setSearch("");
    setUserId("");
    setFilterStatus("");
    setCurrentPage(1);
    setDateFilter({ fromDate: "", toDate: "" });
    setShowDropdown(false);
    setDepartmentSearchInp("");
    setDepartmentSearch("");
    setSelectedDepartment("");
    setDepartmentDropdown(false);
    setRoleSearchInp("");
    setSelectedRole("");
    setRoleDropdown(false);
  };

  return (
    <div className="ml-72 mt-14">
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full mb-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">📋</span>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {t("task_reports")}
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("daily_task_reports_morning_agendas_evening_progress")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchReports}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white text-sm font-bold transition-all active:scale-95"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className={isLoading ? "animate-spin" : ""}
              >
                <path
                  d="M13 7A6 6 0 1 1 7 1"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M10 1h3v3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("refresh")}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          {[
            {
              label: t("total_page"),
              value: totalReports,
              icon: "📋",
              bg: "bg-blue-50  border-blue-100 dark:bg-blue-900/50 dark:border-blue-800",
            },
            {
              label: t("evening_submitted"),
              value: eveningDone,
              icon: "🌆",
              bg: "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/50 dark:border-emerald-800",
            },
            {
              label: t("reviewed"),
              value: reviewed,
              icon: "✅",
              bg: "bg-purple-50 border-purple-100 dark:bg-purple-900/50 dark:border-purple-800",
            },
            {
              label: t("avg_completion"),
              value: `${avgCompletion}%`,
              icon: "📊",
              bg: "bg-amber-50 border-amber-100 dark:bg-amber-900/50 dark:border-amber-800",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg}`}
            >
              <span className="text-xl">{s.icon}</span>
              <div>
                <div className="text-xl font-extrabold text-gray-900 dark:text-white">
                  {s.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-5 justify-between">
           <div className="flex gap-4">
          {/* Employee Search */}
          <div ref={searchRef} className="relative min-w-[240px]">
            <div
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white dark:bg-gray-800 transition-all
              ${
                showDropdown || userId
                  ? "border-cyan-400 ring-2 ring-cyan-500/20"
                  : "border-gray-200 dark:border-gray-600"
              }`}
            >
              <span className="text-gray-400 text-sm flex-shrink-0">🔍</span>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() =>
                  searchInput.length > 0 && setShowDropdown(true)
                }
                placeholder={t("search_by_employee_name")}
                className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setShowDropdown(false);
                    setUserId("");
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <MdClose className="text-sm" />
                </button>
              )}
            </div>

            {showDropdown && usersData.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="max-h-48 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    usersData.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleUserId(user)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors text-left group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(user.firstName?.[0] ?? "").toUpperCase()}
                          {(user.lastName?.[0] ?? "").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                            {user.firstName} {user.lastName}
                          </p>
                          {(user as any).company && (
                            <p className="text-xs text-gray-400 truncate">
                              {(user as any).company}
                            </p>
                          )}
                        </div>
                        {userId === user.id && (
                          <span className="text-cyan-500 flex-shrink-0 text-xs font-bold">
                            {t("selected_3")}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
                {usersData.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      {usersData.length} {t("user_2")}
                      {usersData.length !== 1 ? "s" : ""} {t("found")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

        <div 
        ref={statusRef}
         className="relative min-w-[220px]">
  {/* Trigger */}
  <button
    type="button"
    onClick={() => setStatusDropdown(!statusDropdown)}
    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border bg-white dark:bg-gray-800 transition
      ${
        statusDropdown
          ? "border-cyan-400 ring-2 ring-cyan-500/20"
          : "border-gray-200 dark:border-gray-600"
      }`}
  >
    <span className="text-sm text-gray-700 dark:text-white">
      {STATUS_OPTIONS.find((s) => s.value === filterStatus)?.label ??
        t("all_statuses")}
    </span>

  <IoChevronDown
  className={`text-gray-400 transition-transform duration-200 ${
    statusDropdown ? "rotate-180" : ""
  }`}
/>
  </button>

  {statusDropdown && (
    <div className="absolute h-50  overflow-y-scroll top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-xl z-50 overflow-hidden">
      {STATUS_OPTIONS.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => {
            setFilterStatus(item.value);
            setCurrentPage(1);
            setStatusDropdown(false);
          }}
          className={`w-full px-4 py-3 flex items-center justify-between text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors ${
            filterStatus === item.value
              ? "bg-cyan-50 dark:bg-cyan-900/20"
              : ""
          }`}
        >
          <span className="text-sm text-gray-700 dark:text-white">
            {item.label}
          </span>

          {filterStatus === item.value && (
            <span className="text-cyan-500 font-bold">✓</span>
          )}
        </button>
      ))}
    </div>
  )}
</div>

         


          {/* <CustomDropdownFilter
            placeholder={t("search_department")}
            value={selectedDepartment}
            inputValue={departmentSearchInp}
            onInputChange={handleDepartment}
            onSelect={(item) => {
              setSelectedDepartment(item.name);
              setDepartmentSearchInp(item.name);
              setCurrentPage(1);
            }}
            onClear={() => {
              setDepartmentSearchInp("");
              setDepartmentSearch("");
              setSelectedDepartment("");
              setDepartmentDropdown(false);
              setCurrentPage(1);
            }}
            items={departmentsData}
            loading={departmentLoading}
            showDropdown={departmentDropdown}
            setShowDropdown={setDepartmentDropdown}
            dropdownRef={departmentRef}
            emptyText="No departments found"
            renderItem={(item) => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {item.name?.[0]?.toUpperCase() ?? "D"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {item.name}
                  </p>
                </div>
                {selectedDepartment === item.name && (
                  <span className="text-cyan-500 text-xs font-bold flex-shrink-0">
                    ✓
                  </span>
                )}
              </div>
            )}
          /> */}

        
<div ref={roleRef} className="relative min-w-[200px]">
  <button
    type="button"
    onClick={() => {
      setRoleDropdown(!roleDropdown);
      setRoleSearchInp(""); 
    }}
    className={`w-full flex items-center justify-between gap-2 px-3 py-[9px] outline-none rounded-xl border bg-white dark:bg-gray-800 transition-all cursor-pointer
      ${
        roleDropdown || selectedRole
          ? "border-cyan-400 ring-2 ring-cyan-500/20"
          : "border-gray-200 dark:border-gray-600"
      }`}
  >
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {selectedRole ? (
        <>
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {roleData
              .find((r) => r.id === selectedRole)
              ?.name?.[0]?.toUpperCase() ?? "R"}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate capitalize">
            {roleData.find((r) => r.id === selectedRole)?.name}
          </span>
        </>
      ) : (
        <>
          <span className="text-sm text-gray-400 truncate">
            {t("search_role")}
          </span>
        </>
      )}
    </div>

    <div className="flex items-center gap-1 flex-shrink-0">
      {selectedRole && (
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRole("");
            setRoleSearchInp("");
            setRoleDropdown(false);
            setCurrentPage(1);
          }}
          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <MdClose className="text-sm" />
        </span>
      )}
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        className="text-gray-400"
        style={{
          transform: roleDropdown ? "rotate(180deg)" : "",
          transition: "transform 0.2s",
        }}
      >
        <path
          d="M2 4l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  </button>

  {/* ✅ Dropdown with search inside */}
  {roleDropdown && (
    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl z-50 overflow-hidden">
      
      <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="relative">
          <IoIosSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
          <input
            type="text"
            value={roleSearchInp}
            onChange={(e) => setRoleSearchInp(e.target.value)}
            placeholder={t("search_role")}
            autoFocus
            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition"
          />
          {roleSearchInp && (
            <button
              type="button"
              onClick={() => setRoleSearchInp("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <MdClose className="text-sm" />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-52 overflow-y-auto">
        {roleData.filter((role) =>
          role.name.toLowerCase().includes(roleSearchInp.toLowerCase())
        ).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
            <span className="text-2xl mb-1">🔍</span>
            <p className="text-xs">No roles found</p>
          </div>
        ) : (
          roleData
            .filter((role) =>
              role.name.toLowerCase().includes(roleSearchInp.toLowerCase())
            )
            .map((role) => {
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role.id);
                    setRoleSearchInp(""); 
                    setRoleDropdown(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2.5 transition-colors group
                    ${
                      isSelected
                        ? "bg-cyan-50 dark:bg-cyan-900/20"
                        : "hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                      ${
                        isSelected
                          ? "bg-gradient-to-br from-cyan-500 to-cyan-600"
                          : "bg-gradient-to-br from-gray-400 to-gray-500 group-hover:from-cyan-500 group-hover:to-cyan-600"
                      }`}
                    >
                      {role.name?.[0]?.toUpperCase() ?? "R"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate capitalize transition-colors
                          ${
                            isSelected
                              ? "text-cyan-600 dark:text-cyan-400"
                              : "text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400"
                          }`}
                      >
                        {role.name}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                        >
                          <path
                            d="M2 5l2 2 4-4"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
        )}
      </div>

    </div>
  )}
</div>

 <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter} />

</div>
<div>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5"
            >
              <MdClose className="text-sm" /> {t("clear")}
            </button>
          )}
          </div>
        </div>


        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  {[
                    "employee",
                    "date",
                    "status",
                    "tasks",
                    "hours",
                    "mood",
                    "reviewed",
                    "",
                    "action",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left"
                    >
                      {col ? t(col) : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20">
                      <div className="text-5xl mb-3">📭</div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {t("no_task_reports_found")}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((r) => (
                    <ExpandableRow
                      key={r.id}
                      report={r}
                      canDelete={canDelete}
                      handleDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t("page")}{" "}
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                {currentPage}
              </span>{" "}
              {t("of")}{" "}
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                {totalPages}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {t("prev")}
              </button>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
                {currentPage}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {t("next")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskReportListPage;