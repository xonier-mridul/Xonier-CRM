"use client";

import React, { JSX, useState, useEffect, useCallback, WheelEvent } from "react";
import { toast } from "react-toastify";
import { TaskReportService } from "@/src/services/taskReport.service";

import {
  TaskReport,
  TaskReportItem,
  WorkMood,
  TaskItemStatus,
} from "@/src/types/task/taskReport";
import axios, { AxiosError } from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store"; 
import { useTranslation } from "react-i18next";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";




const PRIORITIES = ["low", "medium", "high", "critical"] as const;

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600",
  medium: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  high: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  critical: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const MOODS: { value: WorkMood; emoji: string; label: string; color: string }[] = [
  { value: "excellent" as WorkMood, emoji: "🚀", label: "Excellent", color: "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-500" },
  { value: "good" as WorkMood, emoji: "😊", label: "Good", color: "border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500" },
  { value: "neutral" as WorkMood, emoji: "😐", label: "Neutral", color: "border-gray-400 bg-gray-50 dark:bg-gray-700 dark:border-gray-500" },
  { value: "tired" as WorkMood, emoji: "😴", label: "Tired", color: "border-amber-400 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-500" },
  { value: "stressed" as WorkMood, emoji: "😰", label: "Stressed", color: "border-red-400 bg-red-50 dark:bg-red-900/30 dark:border-red-500" },
];

const PENDING_STATUSES: TaskItemStatus[] = [
  TaskItemStatus.PENDING,
  TaskItemStatus.IN_PROGRESS,
  TaskItemStatus.CARRIED_FORWARD,
  TaskItemStatus.BLOCKED,
];

const COMPLETED_STATUSES: TaskItemStatus[] = [
  TaskItemStatus.COMPLETED,
];

const STATUS_OPTIONS: { value: TaskItemStatus; label: string; icon: string }[] = [
  { value: "completed" as TaskItemStatus, label: "Completed", icon: "✅" },
  { value: "in_progress" as TaskItemStatus, label: "In Progress", icon: "🔄" },
  { value: "carried_forward" as TaskItemStatus, label: "Carried Forward", icon: "⏭" },
  { value: "blocked" as TaskItemStatus, label: "Blocked", icon: "🚧" },
  { value: "pending" as TaskItemStatus, label: "Pending", icon: "⏳" },
];

const EMPTY_MORNING_ITEM = (): Omit<TaskReportItem, "status"> & { status?: string } => ({
  title: "",
  description: "",
  estimatedHours: undefined,
  priority: "medium",
  linkedTaskId: "",
  completionPercentage: 0,
});

const toEveningItem = (
  src: TaskReportItem | ReturnType<typeof EMPTY_MORNING_ITEM>,
  overrides?: Partial<TaskReportItem>
): TaskReportItem => ({
  title: src.title ?? "",
  description: src.description ?? "",
  estimatedHours: src.estimatedHours,
  actualHours: undefined,
  status: "pending" as TaskItemStatus,
  priority: src.priority ?? "medium",
  linkedTaskId: src.linkedTaskId ?? "",
  blockerReason: "",
  completionPercentage: 0,
  ...overrides,
});

// ── Reusable UI ───────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, disabled,
}: {
  value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800/50"
    />
  );
}

function TextArea({
  value, onChange, placeholder, rows = 2, disabled,
}: {
  value: string; onChange?: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition resize-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800/50"
    />
  );
}

function NumberInput({
  value, onChange, placeholder, min, max, step = 0.5, disabled,
}: {
  value?: number; onChange?: (v?: number) => void; placeholder?: string;
  min?: number; max?: number; step?: number; disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={e => onChange?.(e.target.value === "" ? undefined : Number(e.target.value))}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onWheel={(e: WheelEvent<HTMLInputElement>) => e.currentTarget.blur()}
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800/50"
    />
  );
}


function PriorityBadge({ value }: { value: string }) {
  const style = PRIORITY_STYLES[value] ?? PRIORITY_STYLES.low;
  const dot = PRIORITY_DOT[value] ?? "bg-gray-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {value}
    </span>
  );
}

function PrioritySelector({
  value, onChange, disabled,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) 
{
  const { t } = useTranslation();

  return (
    <div className="flex gap-1.5 flex-wrap">
      {PRIORITIES.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          disabled={disabled}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border capitalize transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${value === p
              ? PRIORITY_STYLES[p]
              : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
        >
          {t(p)}
        </button>
      ))}
    </div>
  );
}

function MorningReadonlyCard({ item, index }: {
  item: TaskReportItem | ReturnType<typeof EMPTY_MORNING_ITEM>; index: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-gradient-to-r from-slate-50 to-white dark:from-gray-800/60 dark:to-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</span>
            {item.priority && <PriorityBadge value={item.priority} />}
            {item.linkedTaskId && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800">
                {item.linkedTaskId}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">{item.description}</p>
          )}
          {item.estimatedHours && (
            <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
              <span>⏱</span> {t("estimated_2")} <b className="text-gray-600 dark:text-gray-300">{item.estimatedHours}h</b>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MorningEditCard({ item, index, onChange, onRemove }: {
  item: ReturnType<typeof EMPTY_MORNING_ITEM>;
  index: number;
  onChange: (field: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm relative group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs font-extrabold">
            {index + 1}
          </div>
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t("task")}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <FieldLabel required>{t("task_title")}</FieldLabel>
          <TextInput value={item.title} onChange={v => onChange("title", v)} placeholder={t("what_are_you_going_to_work")} />
        </div>
        <div>
          <FieldLabel>{t("description")}</FieldLabel>
          <TextArea value={item.description ?? ""} onChange={v => onChange("description", v)} placeholder={t("brief_details_about_this_task")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>{t("estimated_hours")}</FieldLabel>
            <NumberInput value={item.estimatedHours} onChange={v => onChange("estimatedHours", v)} placeholder={t("e_g_2_5")} min={0.5} max={24} />
          </div>
          <div>
            <FieldLabel>{t("linked_task_id")}</FieldLabel>
            <TextInput value={item.linkedTaskId ?? ""} onChange={v => onChange("linkedTaskId", v)} placeholder={t("task_101")} />
          </div>
        </div>
        <div>
          <FieldLabel>{t("priority")}</FieldLabel>
          <PrioritySelector value={item.priority ?? "medium"} onChange={v => onChange("priority", v)} />
        </div>
      </div>
    </div>
  );
}

function EveningTaskCard({ item, index, onChange, onRemove, bucket, readOnly }: {
  item: TaskReportItem;
  index: number;
  onChange: (field: string, value: unknown) => void;
  onRemove: () => void;
  bucket: "completed" | "pending";
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const isCompleted = bucket === "completed";

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 shadow-sm relative group transition-all
        ${isCompleted
          ? "border-emerald-100 dark:border-emerald-800/50"
          : "border-amber-100 dark:border-amber-800/50"
        }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold
              ${isCompleted
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
              }`}
          >
            {index + 1}
          </div>
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {isCompleted ? "✅ Completed" : "⏳ Pending"}
          </span>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <FieldLabel required>{t("task_title")}</FieldLabel>
          <TextInput
            value={item.title}
            onChange={v => onChange("title", v)}
            placeholder={isCompleted ? "What did you complete?" : "What is still pending?"}
            disabled={readOnly}
          />
        </div>
        <div>
          <FieldLabel>{t("description_2")}</FieldLabel>
          <TextArea
            value={item.description ?? ""}
            onChange={v => onChange("description", v)}
            placeholder={t("details_about_what_was_done_what's")}
            disabled={readOnly}
          />
        </div>

        {!readOnly ? (
          <div>
            <FieldLabel>
              {t("status")}{" "}
              <span className="normal-case text-cyan-500 dark:text-cyan-400 font-semibold text-[10px] ml-1">
                {t("changing_this_moves_the_task_between_sections")}
              </span>
            </FieldLabel>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange("status", opt.value)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all
                    ${item.status === opt.value
                      ? COMPLETED_STATUSES.includes(opt.value)
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"
                        : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700"
                      : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                >
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <FieldLabel>{t("status")}</FieldLabel>
            <div className="mt-1">
              {(() => {
                const opt = STATUS_OPTIONS.find(o => o.value === item.status);
                return opt ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border
                      ${COMPLETED_STATUSES.includes(opt.value)
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"
                        : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700"
                      }`}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </span>
                ) : null;
              })()}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>{t("est_hours")}</FieldLabel>
            <NumberInput
              value={item.estimatedHours}
              onChange={v => onChange("estimatedHours", v)}
              placeholder={t("eg_2_2")}
              min={0.5}
              max={24}
              disabled={readOnly}
            />
          </div>
          <div>
            <FieldLabel>{t("actual_hours")}</FieldLabel>
            <NumberInput
              value={item.actualHours}
              onChange={v => onChange("actualHours", v)}
              placeholder={t("eg_2_2")}
              min={0.5}
              max={24}
              disabled={readOnly}
            />
          </div>
          <div>
            <FieldLabel>{t("linked_task_id")}</FieldLabel>
            <TextInput
              value={item.linkedTaskId ?? ""}
              onChange={v => onChange("linkedTaskId", v)}
              placeholder={t("task_101")}
              disabled={readOnly}
            />
          </div>
        </div>

        <div>
          <FieldLabel>
            {t("completion")}{" "}
            <span className={`font-extrabold ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {item.completionPercentage}%
            </span>
          </FieldLabel>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={item.completionPercentage}
            onChange={e => onChange("completionPercentage", Number(e.target.value))}
            disabled={readOnly}
            className={`w-full ${readOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${isCompleted ? "accent-emerald-500" : "accent-amber-500"}`}
          />
          <div className="flex justify-between text-[10px] text-gray-400 -mt-0.5">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>

        {item.status === "blocked" && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
            <FieldLabel>{t("blocker_reason")}</FieldLabel>
            <TextArea
              value={item.blockerReason ?? ""}
              onChange={v => onChange("blockerReason", v)}
              placeholder={t("what_is_blocking_this_task")}
              disabled={readOnly}
            />
          </div>
        )}

        <div>
          <FieldLabel>{t("priority")}</FieldLabel>
          <PrioritySelector
            value={item.priority ?? "medium"}
            onChange={v => onChange("priority", v)}
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TaskReportCreatePage = (): JSX.Element => {
  const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Kolkata",
});

const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isNew = id === "new";

  const [activeTab, setActiveTab] = useState<"morning" | "evening">("morning");
  const [existingReport, setExistingReport] = useState<TaskReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Morning
  const [morningItems, setMorningItems] = useState<ReturnType<typeof EMPTY_MORNING_ITEM>[]>([EMPTY_MORNING_ITEM()]);
  const [morningGoals, setMorningGoals] = useState("");

  // Evening
  const [eveningItems, setEveningItems] = useState<TaskReportItem[]>([]);
  const [achievements, setAchievements] = useState("");
  const [blockers, setBlockers] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [overallMood, setOverallMood] = useState<WorkMood | "">("");
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);
  const [isEditingMorning, setIsEditingMorning] = useState(false);
  const [err, setErr] = useState<string | string[]>("");

  // Derived buckets
  const completedItems = eveningItems.filter(i => COMPLETED_STATUSES.includes(i.status as TaskItemStatus));
  const pendingItems = eveningItems.filter(i => PENDING_STATUSES.includes(i.status as TaskItemStatus));

  const user = useSelector((state: RootState) => state.auth.user);

  const loadReportData = useCallback((report: TaskReport) => {
    console.log("🟢 Loading report data:", report);
    console.log("🟢 Morning submitted:", report.morningAgenda?.isSubmitted);
    console.log("🟢 Evening submitted:", report.eveningReport?.isSubmitted);

    setExistingReport(report);

    // Load morning agenda
    if (report.morningAgenda?.items?.length) {
      setMorningItems(report.morningAgenda.items.map(i => ({ ...i })));
    }
    if (report.morningAgenda?.goals) {
      setMorningGoals(report.morningAgenda.goals);
    }

    // Load evening items
    const existingCompleted: TaskReportItem[] = report.eveningReport?.completedItems ?? [];
    const existingPending: TaskReportItem[] = report.eveningReport?.pendingItems ?? [];
    const allEvening = [...existingCompleted, ...existingPending];

    if (allEvening.length > 0) {
      const eveningTitles = new Set(
        allEvening.map(i => i.title.toLowerCase().trim())
      );
      const missingFromMorning = (report.morningAgenda?.items ?? [])
        .filter(i => !eveningTitles.has(i.title.toLowerCase().trim()))
        .map(i => toEveningItem(i, { status: "pending" as TaskItemStatus }));
      setEveningItems([...allEvening, ...missingFromMorning]);
    } else if (report.morningAgenda?.isSubmitted) {
      setEveningItems(
        (report.morningAgenda.items ?? []).map(i =>
          toEveningItem(i, { status: "pending" as TaskItemStatus })
        )
      );
    }

    // Load summary fields
    if (report.eveningReport?.achievements) setAchievements(report.eveningReport.achievements);
    if (report.eveningReport?.blockers) setBlockers(report.eveningReport.blockers);
    if (report.eveningReport?.tomorrowPlan) setTomorrowPlan(report.eveningReport.tomorrowPlan);
    if (report.eveningReport?.overallMood) setOverallMood(report.eveningReport.overallMood);

    // ✅ Set correct tab
    setActiveTab(report.morningAgenda?.isSubmitted ? "evening" : "morning");
    setIsFinalSubmitted(report.eveningReport?.isSubmitted ?? false);

    setIsLoading(false);
  }, []);

  // ── Load report ────────────────────────────────────────────────────────────
const loadReport = useCallback(async () => {
    setIsLoading(true);

    try {
      if (isNew) {
        // ✅ Check if today's report exists using user ID
        if (!user?.id) {
          setActiveTab("morning");
          setIsLoading(false);
          return;
        }

        const res = await TaskReportService.getById(user.id);

        if (res.status === 200) {
          const reportsData = res.data?.data?.data;
          const userReports = reportsData?.[0]?.reports ?? [];

          const todayReport: TaskReport | undefined = userReports.find(
            (r: TaskReport) => r.reportDate === today
          );

          if (todayReport) {
            loadReportData(todayReport);
            return;
          }
        }

        // No report for today — show empty morning form
        setActiveTab("morning");
        setIsLoading(false);
        return;

      } else {
        // ✅ Real report ID — use getReportById
        const res = await TaskReportService.getReportById(id);

        console.log("🟢 getReportById response:", res.data);

        if (res.status === 200) {
          // ✅ This returns single report directly — not grouped
          const report: TaskReport =
            res.data?.data ||  // check your actual response structure
            res.data;

          console.log("🟢 Report:", report);

          if (!report) {
            setIsLoading(false);
            return;
          }

          loadReportData(report);
        }
      }
    } catch (error) {
      console.error("🔴 Load report error:", error);
      setIsLoading(false);
    }
  }, [id, isNew, today, user?.id]);

  useEffect(() => { loadReport(); }, [loadReport]);

  // ── Evening item helpers ───────────────────────────────────────────────────
  const updateEveningItem = (globalIdx: number, field: string, value: unknown) => {
    const isC = value === "completed";
    const isP = value === "in_progress";
    const isCF = value === "carried_forward";
    const isB = value === "blocked";

    if (isC) {
      setEveningItems(items =>
        items.map((item, i) => i === globalIdx ? { ...item, [field]: value, completionPercentage: 100, actualHours: item.estimatedHours } : item)
      );
    } else if (isP) {
      setEveningItems(items =>
        items.map((item, i) => i === globalIdx ? { ...item, [field]: value, completionPercentage: 50 } : item)
      );
    } else if (isCF) {
      setEveningItems(items =>
        items.map((item, i) => i === globalIdx ? { ...item, [field]: value, completionPercentage: 50 } : item)
      );
    } else if (isB) {
      setEveningItems(items =>
        items.map((item, i) => i === globalIdx ? { ...item, [field]: value, completionPercentage: 0 } : item)
      );
    } else {
      setEveningItems(items =>
        items.map((item, i) => i === globalIdx ? { ...item, [field]: value } : item)
      );
    }
  };

  const removeEveningItem = (globalIdx: number) => {
    setEveningItems(items => items.filter((_, i) => i !== globalIdx));
  };

  const addEveningItem = (defaultStatus: TaskItemStatus) => {
    setEveningItems(items => [
      ...items,
      toEveningItem(EMPTY_MORNING_ITEM(), {
        status: defaultStatus,
        completionPercentage: defaultStatus === "completed" ? 100 : 0,
      }),
    ]);
  };

  // ── Submit Morning ─────────────────────────────────────────────────────────
const submitMorning = async () => {
    if (morningItems.some(i => !i.title.trim())) {
      toast.error("Please fill in all task titles");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        reportDate: today,
        morningAgenda: {
          items: morningItems.map(i => ({
            title: i.title.trim(),
            description: i.description || undefined,
            estimatedHours: i.estimatedHours,
            priority: i.priority,
            linkedTaskId: i.linkedTaskId || undefined,
            completionPercentage: 0,
          })),
          goals: morningGoals.trim() || undefined,
        },
      };

      const fn = existingReport?.id
        ? TaskReportService.updateMorningAgenda(existingReport.id, payload)
        : TaskReportService.createMorningAgenda(payload);

      const res = await fn;

      console.log("🟢 Morning submit response:", res.data);

      if (res.status === 200 || res.status === 201) {
        toast.success("Morning agenda submitted! ✅");

        // ✅ Get report ID from response
        const reportId =
          res.data?.data?.id   ||
          res.data?.data?._id  ||
          res.data?.id         ||
          res.data?._id;

        console.log("🟢 Report ID from response:", reportId);

        if (reportId) {
          // ✅ Redirect to real report ID URL
          router.replace(`/report/create/${reportId}`);
          // useEffect will trigger loadReport with real id automatically
        } else {
          // Fallback — no id in response
          toast.error("Could not get report ID. Please refresh.");
        }
      }
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      toast.error(err.response?.data?.message || "Failed to submit morning agenda");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Update Morning ─────────────────────────────────────────────────────────
  const updateMorning = async () => {
    if (morningItems.some(i => !i.title.trim())) {
      toast.error("Please fill in all task titles");
      return;
    }
    if (!existingReport?.id) {
      toast.error("Report not found");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        reportDate: today,
        morningAgenda: {
          items: morningItems.map(i => ({
            title: i.title.trim(),
            description: i.description || undefined,
            estimatedHours: i.estimatedHours,
            priority: i.priority,
            linkedTaskId: i.linkedTaskId || undefined,
            completionPercentage: 0,
          })),
          goals: morningGoals.trim() || undefined,
        },
      };
      const res = await TaskReportService.updateMorningAgenda(existingReport.id, payload);
      if (res.status === 200 || res.status === 201) {
        toast.success("Morning agenda updated! ✅");
        setIsEditingMorning(false);
        await loadReport();
      }
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      toast.error(err.response?.data?.message || "Failed to update morning agenda");
    } finally {
      setIsSubmitting(false);
    }
  };

const handleEveningSubmit = async () => {
  try {
    const confirm = await ConfirmPopup({
      title: !isFinalSubmitted 
        ? t("save_evening_report_title") 
        : t("submit_evening_report_title"),
      text: !isFinalSubmitted
        ? t("save_evening_report_text")
        : t("submit_evening_report_text"),
      btnTxt: !isFinalSubmitted 
        ? t("yes_save") 
        : t("yes_submit"),
    }).catch(() => false);

    if (confirm){
    await submitEvening();
    }

  } catch (error) {

    if (error !== false && error !== "cancel" && error !== "dismiss") {
      toast.error(t("something_went_wrong"));
    }
  }
};

  // ── Submit Evening ─────────────────────────────────────────────────────────
  const submitEvening = async () => {
    setErr("");
    if (!existingReport?.id) {
      toast.error("Please submit your morning agenda first");
      return;
    }
    const valid = eveningItems.filter(i => i.title.trim());
    if (valid.length === 0) {
      toast.error("Please add at least one task");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        eveningReport: {
          completedItems: valid.filter(i => COMPLETED_STATUSES.includes(i.status as TaskItemStatus)),
          pendingItems: valid.filter(i => PENDING_STATUSES.includes(i.status as TaskItemStatus)),
          achievements: achievements.trim() || undefined,
          blockers: blockers.trim() || undefined,
          tomorrowPlan: tomorrowPlan.trim() || undefined,
          overallMood: overallMood as WorkMood || undefined,
          isSubmitted: isFinalSubmitted,
        },
      };
      let res = null;
      if (!isFinalSubmitted) {
        res = await TaskReportService.updateEveningReport(existingReport.id, payload);
      } else {
        res = await TaskReportService.submitEveningReport(existingReport.id, payload);
      }
      if (res?.status === 200) {
        toast.success("Evening report submitted! 🌆");
        await loadReport();
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const errM = extractErrorMessages(error);
        toast.error(errM[0]);
        setErr(errM);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived flags ──────────────────────────────────────────────────────────
  const morningSubmitted = existingReport?.morningAgenda?.isSubmitted ?? false;
  const eveningSubmitted = existingReport?.eveningReport?.isSubmitted ?? false;
  const morningReadOnly = morningSubmitted && !isEditingMorning;
  const { t, i18n } = useTranslation();

  const actualHour =
    Number(completedItems.reduce((s, i) => s + (i.actualHours ?? 0), 0).toFixed(1)) +
    Number(pendingItems.reduce((s, i) => s + (i.actualHours ?? 0), 0).toFixed(1));

  if (isLoading) {
    return (
      <div className="ml-72 mt-14 flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-200 border-t-cyan-600 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">{t("loading_report")}</p>
        </div>
      </div>
    );
  }

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <div className="ml-72 mt-14">
      <div className="p-6 w-full mb-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">📝</span>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {t("daily_task_report")}
              </h1>
            </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
  {new Date().toLocaleDateString(
    i18n.language === "hi"
      ? "hi-IN"
      : i18n.language === "pt" || i18n.language === "po"
      ? "pt-BR" // Use Brazilian Portuguese instead of Portugal Portuguese
      : "en-GB",
    {
      weekday: "long",
      day: "2-digit", 
      month: "long",
      year: "numeric",
    }
  )}
</p>
          </div>
        </div>

        {/* ── Status Banner ── */}
        {!isNew && existingReport && (
          <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${morningSubmitted ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`} />
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t("morning")}</span>
              <span className={`text-xs font-extrabold ${morningSubmitted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {morningSubmitted ? "Submitted ✓" : "Not Submitted"}
              </span>
            </div>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${eveningSubmitted ? "bg-emerald-500" : morningSubmitted ? "bg-amber-400 animate-pulse" : "bg-gray-200"}`} />
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t("evening")}</span>
              <span className={`text-xs font-extrabold ${eveningSubmitted ? "text-emerald-600 dark:text-emerald-400" : morningSubmitted ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                {eveningSubmitted ? "Submitted ✓" : morningSubmitted ? "Not Submitted" : "🔒 Locked"}
              </span>
            </div>
            {existingReport.isReviewed && (
              <>
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <span className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400">{t("manager_reviewed")}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6 w-fit">
          {(["morning", "evening"] as const).map(tab => {
            const isActive = activeTab === tab;
            const isDone = tab === "morning" ? morningSubmitted : eveningSubmitted;
            const isLocked = tab === "evening" && !morningSubmitted;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                disabled={isLocked}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed
                  ${isActive
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
              >
                <span>{tab === "morning" ? "🌅" : "🌆"}</span>
                {tab === "morning" ? t("morning_agenda") : t("evening_report")}
                {isDone && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
                {isLocked && !isDone && <span className="text-gray-400 dark:text-gray-500">🔒</span>}
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════
            MORNING TAB
        ════════════════════════════════════════════════════ */}
        {activeTab === "morning" && (
          <div className="bg-white dark:bg-gray-700 rounded-xl border border-slate-900/10 dark:border-gray-600 p-6">

            {/* Submitted & not editing — show green banner with Edit button */}
            {morningSubmitted && !isEditingMorning && (
              <div className="flex items-center justify-between gap-3 mb-6 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-sm shrink-0">✓</div>
                  <div>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{t("morning_agenda_submitted")}</p>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80">
                      {existingReport?.morningAgenda?.submittedAt
                        ? `Submitted at ${new Date(existingReport.morningAgenda.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                        : "Already submitted"
                      }
                    </p>
                  </div>
                </div>
                {/* Hide edit button once evening is finally locked */}
                {!eveningSubmitted && (
                  <button
                    type="button"
                    onClick={() => setIsEditingMorning(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-cyan-200 dark:border-cyan-700 bg-white dark:bg-gray-800 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 text-xs font-bold transition-all shrink-0"
                  >
                    {t("edit_plan")}
                  </button>
                )}
              </div>
            )}

            {/* Editing mode — show amber banner */}
            {morningSubmitted && isEditingMorning && (
              <div className="flex items-center gap-3 mb-6 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white text-sm shrink-0">✏️</div>
                <div>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{t("editing_morning_agenda")}</p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
                    {t("changes_will_update_your_existing_plan")}
                  </p>
                </div>
              </div>
            )}

            {/* Section header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg shadow-md">🌅</div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{t("morning_agenda")}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
  {morningReadOnly
    ? t("your_plan_for_today_read_only")
    : isEditingMorning
      ? t("update_your_plan_changes_will_be_saved_when_you_click_update")
      : t("plan_your_day_what_tasks_will_you_tackle")}
</p>
              </div>
            </div>

            {/* Goal */}
            <div className={`mb-6 p-4 rounded-2xl border ${morningReadOnly ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30" : "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-800"}`}>
              <FieldLabel>{t("Today's Goal / Focus")}</FieldLabel>
              {morningReadOnly ? (
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium italic min-h-[20px]">
                  {morningGoals || <span className="text-gray-400 not-italic">{t("no_goal_set")}</span>}
                </p>
              ) : (
                <TextArea
                  value={morningGoals}
                  onChange={setMorningGoals}
                  placeholder={t("what_is_your_main_focus_today")}
                  rows={2}
                />
              )}
            </div>

            {/* Items */}
            <div className="space-y-3 mb-5">
              {morningItems.map((item, idx) =>
                morningReadOnly
                  ? <MorningReadonlyCard key={idx} item={item as TaskReportItem} index={idx} />
                  : (
                    <MorningEditCard
                      key={idx}
                      item={item}
                      index={idx}
                      onChange={(f, v) =>
                        setMorningItems(items => items.map((it, i) => i === idx ? { ...it, [f]: v } : it))
                      }
                      onRemove={() => setMorningItems(items => items.filter((_, i) => i !== idx))}
                    />
                  )
              )}
            </div>

            {/* Add task — hidden when read-only */}
            {!morningReadOnly && (
              <button
                type="button"
                onClick={() => setMorningItems(items => [...items, EMPTY_MORNING_ITEM()])}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-cyan-400 dark:hover:border-cyan-600 hover:text-cyan-600 dark:hover:text-cyan-400 text-sm font-bold transition-all flex items-center justify-center gap-2 mb-6"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {t("add_another_task")}
              </button>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{morningItems.length}</div>
                  <div className="text-[11px] text-gray-500 font-medium">{t("tasks_planned")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-amber-500">
                    {morningItems.reduce((s, i) => s + (i.estimatedHours ?? 0), 0).toFixed(1)}h
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">{t("est_hours")}</div>
                </div>
              </div>

              {/* Footer action buttons — three states */}
              {morningReadOnly ? (
                // State 1: submitted & not editing → go to evening
                <button
                  type="button"
                  onClick={() => setActiveTab("evening")}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm transition-all active:scale-95 shadow-sm"
                >
                  {t("go_to_evening_report")}
                </button>
              ) : isEditingMorning ? (
                // State 2: editing existing submission → cancel / update
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsEditingMorning(false); loadReport(); }}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 font-bold text-sm transition-all"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={updateMorning}
                    disabled={isSubmitting || morningItems.every(i => !i.title.trim())}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all active:scale-95 shadow-sm"
                  >
                    {isSubmitting
                      ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> {t("updating")}</>
                      : <><span>✏️</span> {t("update_morning_agenda")}</>
                    }
                  </button>
                </div>
              ) : (
                // State 3: new / not yet submitted → submit
                <button
                  type="button"
                  onClick={submitMorning}
                  disabled={isSubmitting || morningItems.every(i => !i.title.trim())}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all active:scale-95 shadow-sm"
                >
                  {isSubmitting
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> {t("submitting_2")}</>
                    : <><span>🌅</span> {t("submit_morning_agenda")}</>
                  }
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            EVENING TAB
        ════════════════════════════════════════════════════ */}
        {activeTab === "evening" && (
          <div className="bg-white dark:bg-gray-700 rounded-xl border border-slate-900/10 dark:border-gray-600 p-6">

            {eveningSubmitted && (
              <div className="flex items-center gap-3 mb-6 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-sm shrink-0">🔒</div>
                <div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{t("evening_report_locked_final_submission_complete")}</p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80">
                    {existingReport?.eveningReport?.submittedAt
                      ? `Submitted at ${new Date(existingReport.eveningReport.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                      : "Already submitted"
                    } {t("this_report_is_read_only_and_cannot_be_edited")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-600 flex items-center justify-center text-lg shadow-md">🌆</div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{t("evening_report")}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {eveningSubmitted
                    ? "This report has been finally submitted and is now read-only."
                    : "All morning tasks are pre-loaded. Change each task's status to move it between sections."
                  }
                </p>
              </div>
            </div>

            {!eveningSubmitted && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 mb-6">
                <span className="text-base shrink-0 mt-0.5">💡</span>
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                  {t("changing_a_task_apos_s")} <b>{t("status")}</b> {t("to_3")} <b>{t("completed")}</b> {t("automatically_moves_it_to_the_green_section_setting_it_to")} <b>{t("in_progress_pending_blocked_carried_forward")}</b> {t("moves_it_to_the_amber_section")}
                </p>
              </div>
            )}

            {/* ── COMPLETED ── */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs">✅</div>
                <h3 className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{t("completed_tasks")}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {completedItems.length}
                </span>
              </div>

              {completedItems.length === 0 ? (
                <div className="py-8 rounded-2xl border-2 border-dashed border-emerald-100 dark:border-emerald-900/30 text-center mb-3">
                  <p className="text-sm text-emerald-400 dark:text-emerald-600 font-semibold">{t("no_completed_tasks_yet")}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t("change_a_task's_status_to_completed")}</p>
                </div>
              ) : (
                <div className="space-y-4 mb-3">
                  {eveningItems.map((item, globalIdx) =>
                    COMPLETED_STATUSES.includes(item.status as TaskItemStatus) ? (
                      <EveningTaskCard
                        key={globalIdx}
                        item={item}
                        index={completedItems.findIndex((_, i) => eveningItems.indexOf(completedItems[i]) === globalIdx)}
                        bucket="completed"
                        onChange={(f, v) => updateEveningItem(globalIdx, f, v)}
                        onRemove={() => removeEveningItem(globalIdx)}
                        readOnly={eveningSubmitted}
                      />
                    ) : null
                  )}
                </div>
              )}

              {!eveningSubmitted && (
                <button
                  type="button"
                  onClick={() => addEveningItem("completed" as TaskItemStatus)}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/60 text-emerald-500 dark:text-emerald-600 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  {t("add_completed_task")}
                </button>
              )}
            </div>

            {/* ── PENDING ── */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs">⏳</div>
                <h3 className="text-sm font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">{t("pending_in_progress_blocked")}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {pendingItems.length}
                </span>
              </div>

              {pendingItems.length === 0 ? (
                <div className="py-8 rounded-2xl border-2 border-dashed border-amber-100 dark:border-amber-900/30 text-center mb-3">
                  <p className="text-sm text-amber-400 dark:text-amber-600 font-semibold">{t("all_tasks_completed")}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t("amazing_work_today")}</p>
                </div>
              ) : (
                <div className="space-y-4 mb-3">
                  {eveningItems.map((item, globalIdx) =>
                    PENDING_STATUSES.includes(item.status as TaskItemStatus) ? (
                      <EveningTaskCard
                        key={globalIdx}
                        item={item}
                        index={pendingItems.findIndex((_, i) => eveningItems.indexOf(pendingItems[i]) === globalIdx)}
                        bucket="pending"
                        onChange={(f, v) => updateEveningItem(globalIdx, f, v)}
                        onRemove={() => removeEveningItem(globalIdx)}
                        readOnly={eveningSubmitted}
                      />
                    ) : null
                  )}
                </div>
              )}

              {!eveningSubmitted && (
                <button
                  type="button"
                  onClick={() => addEveningItem("carried_forward" as TaskItemStatus)}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-800/60 text-amber-500 dark:text-amber-600 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  {t("add_pending_task")}
                </button>
              )}
            </div>

            {/* ── Summary fields ── */}
            <div className="space-y-4 mb-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                <FieldLabel>{t("achievements_highlights")}</FieldLabel>
                <TextArea
                  value={achievements}
                  onChange={setAchievements}
                  placeholder={t("what_are_you_proud_of_today")}
                  rows={3}
                  disabled={eveningSubmitted}
                />
              </div>
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <FieldLabel>{t("blockers_challenges")}</FieldLabel>
                <TextArea
                  value={blockers}
                  onChange={setBlockers}
                  placeholder={t("any_blockers_issues_or_challenges_faced")}
                  rows={2}
                  disabled={eveningSubmitted}
                />
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <FieldLabel>{t("tomorrow_apos_s_plan")}</FieldLabel>
                <TextArea
                  value={tomorrowPlan}
                  onChange={setTomorrowPlan}
                  placeholder={t("what_do_you_plan_to_work")}
                  rows={2}
                  disabled={eveningSubmitted}
                />
              </div>
              <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
                <FieldLabel>{t("overall_mood_today")}</FieldLabel>
                <div className="flex gap-2.5 mt-2 flex-wrap">
                  {MOODS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => !eveningSubmitted && setOverallMood(m.value)}
                      disabled={eveningSubmitted}
                      className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                        ${overallMood === m.value
                          ? `${m.color} scale-105 shadow-sm`
                          : "border-transparent bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600"
                        }`}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {!eveningSubmitted && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-700 items-center gap-3">
                  <FieldLabel>{t("final_submission")}</FieldLabel>
                  <input
                    type="checkbox"
                    name="isFinalSubmitted"
                    checked={isFinalSubmitted}
                    onChange={(e) => setIsFinalSubmitted(e.target.checked)}
                  />
                  <span className="text-sm text-orange-500 ml-2">
                    {t("final_submission_locks_this_report_from")}
                  </span>
                </div>
              )}
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-emerald-600">{completedItems.length}</div>
                  <div className="text-[11px] text-gray-500 font-medium">{t("completed")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-amber-500">{pendingItems.length}</div>
                  <div className="text-[11px] text-gray-500 font-medium">{t("pending")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-cyan-600">{actualHour}h</div>
                  <div className="text-[11px] text-gray-500 font-medium">{t("actual_hours")}</div>
                </div>
                {overallMood && (
                  <div className="text-center">
                    <div className="text-2xl">{MOODS.find(m => m.value === overallMood)?.emoji ?? ""}</div>
                    <div className="text-[11px] text-gray-500 font-medium">{t("mood")}</div>
                  </div>
                )}
              </div>

             <div className="flex flex-col items-end gap-3">
                  {err && <p className="text-red-500 text-sm">{err}</p>}
                  {!eveningSubmitted ? (
                    <button
                      type="button"
                      onClick={handleEveningSubmit} 
                      disabled={isSubmitting || eveningItems.filter(i => i.title.trim()).length === 0}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all active:scale-95 shadow-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          {t("submitting_2")}
                        </>
                      ) : (
                        <>
                          <span>🌆</span>
                          {!isFinalSubmitted 
                            ? t("save_evening_report") 
                            : t("submit_evening_report")
                          }
                        </>
                      )}
                    </button>
                  ) : (
                      <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <span className="text-emerald-600 dark:text-emerald-400 text-lg">🔒</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          {t("report_locked_final_submission_complete")}
                        </span>
                      </div>
                    )}
                  </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TaskReportCreatePage;