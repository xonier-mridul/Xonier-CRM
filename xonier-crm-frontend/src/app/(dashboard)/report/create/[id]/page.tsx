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
  low: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700/60 dark:text-slate-400 dark:border-slate-600",
  medium: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  high: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  critical: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
};

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-rose-500",
};

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

const PENDING_STATUSES: TaskItemStatus[] = [
  TaskItemStatus.PENDING,
  TaskItemStatus.IN_PROGRESS,
  TaskItemStatus.CARRIED_FORWARD,
  TaskItemStatus.BLOCKED,
];

const COMPLETED_STATUSES: TaskItemStatus[] = [
  TaskItemStatus.COMPLETED,
];

// ── Reusable UI ───────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
      {children}
      {required && <span className="text-rose-400 ml-0.5">*</span>}
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
      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600/70 bg-white dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/30"
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
      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600/70 bg-white dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/30"
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
      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600/70 bg-white dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/30"
    />
  );
}

function PriorityBadge({ value }: { value: string }) {
  const { t } = useTranslation();
  const style = PRIORITY_STYLES[value] ?? PRIORITY_STYLES.low;
  const dot = PRIORITY_DOT[value] ?? "bg-gray-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {t(`${value}`)}
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
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border capitalize transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            ${value === p
              ? PRIORITY_STYLES[p] + " scale-105 shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-600 dark:hover:text-slate-400"
            }`}
        >
          {t(`${p}`)}
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
    <div className="group relative bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-800/80 dark:to-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 hover:border-indigo-200 dark:hover:border-indigo-700/50 hover:shadow-md hover:shadow-slate-200/60 dark:hover:shadow-slate-900/40 transition-all duration-300">
      <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-r-full" />
      <div className="flex items-start gap-3 pl-3">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 shadow-sm">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.title}</span>
            {item.priority && <PriorityBadge value={item.priority} />}
            {item.linkedTaskId && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                {item.linkedTaskId}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">{item.description}</p>
          )}
          {item.estimatedHours && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">
              <span>⏱</span> {t("estimated")} <b className="text-slate-600 dark:text-slate-300">{item.estimatedHours}h</b>
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
    <div className="relative bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 shadow-sm hover:shadow-md hover:shadow-slate-200/60 dark:hover:shadow-slate-900/40 transition-all duration-300 group">
      <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-400 to-violet-500 rounded-r-full" />
      
      <div className="flex items-center justify-between mb-4 pl-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-[11px] font-extrabold shadow-sm">
            {index + 1}
          </div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("task")}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-200"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="space-y-3.5 pl-3">
        <div>
          <FieldLabel required>{t("task_title")}</FieldLabel>
          <TextInput value={item.title} onChange={v => onChange("title", v)} placeholder={t("what_are_you_working_on")} />
        </div>
        <div>
          <FieldLabel>{t("description")}</FieldLabel>
          <TextArea value={item.description ?? ""} onChange={v => onChange("description", v)} placeholder={t("brief_details")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>{t("estimated_hours")}</FieldLabel>
            <NumberInput value={item.estimatedHours} onChange={v => onChange("estimatedHours", v)} placeholder={t("eg_hours")} min={0.5} max={24} />
          </div>
          <div>
            <FieldLabel>{t("linked_task_id")}</FieldLabel>
            <TextInput value={item.linkedTaskId ?? ""} onChange={v => onChange("linkedTaskId", v)} placeholder={t("task_id")} />
          </div>
        </div>
        <div>
          <FieldLabel>{t("priority_2")}</FieldLabel>
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

  const STATUS_OPTIONS: { value: TaskItemStatus; label: string; icon: string; activeClass: string }[] = [
    { value: "completed" as TaskItemStatus, label: t("completed"), icon: "✅", activeClass: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700" },
    { value: "in_progress" as TaskItemStatus, label: t("in_progress"), icon: "🔄", activeClass: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700" },
    { value: "carried_forward" as TaskItemStatus, label: t("carried_forward"), icon: "⏭", activeClass: "bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700" },
    { value: "blocked" as TaskItemStatus, label: t("blocked"), icon: "🚧", activeClass: "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700" },
    { value: "pending" as TaskItemStatus, label: t("pending"), icon: "⏳", activeClass: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700" },
  ];

  return (
    <div
      className={`relative bg-white dark:bg-slate-900/50 rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 group
        ${isCompleted
          ? "border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-700/70 hover:shadow-emerald-500/5"
          : "border-amber-200/80 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700/70 hover:shadow-amber-500/5"
        }`}
    >
      <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full ${isCompleted ? "bg-gradient-to-b from-emerald-400 to-teal-500" : "bg-gradient-to-b from-amber-400 to-orange-500"}`} />

      <div className="flex items-center justify-between mb-4 pl-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold text-white shadow-sm
              ${isCompleted
                ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                : "bg-gradient-to-br from-amber-400 to-orange-500"
              }`}
          >
            {index + 1}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isCompleted ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600 dark:text-amber-500"}`}>
            {isCompleted ? `✅ ${t("completed")}` : `⏳ ${t("pending")}`}
          </span>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-200"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3.5 pl-3">
        <div>
          <FieldLabel required>{t("task_title")}</FieldLabel>
          <TextInput
            value={item.title}
            onChange={v => onChange("title", v)}
            placeholder={isCompleted ? t("what_completed") : t("what_pending")}
            disabled={readOnly}
          />
        </div>
        <div>
          <FieldLabel>{t("description")}</FieldLabel>
          <TextArea
            value={item.description ?? ""}
            onChange={v => onChange("description", v)}
            placeholder={t("details_done")}
            disabled={readOnly}
          />
        </div>

        {!readOnly ? (
          <div>
            <FieldLabel>
              {t("status")}{" "}
              <span className="normal-case text-indigo-500 dark:text-indigo-400 font-semibold text-[9px] ml-1">
                {t("status_help_text")}
              </span>
            </FieldLabel>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange("status", opt.value)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-200
                    ${item.status === opt.value
                      ? opt.activeClass + " scale-105 shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-600 dark:hover:text-slate-400"
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
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border ${opt.activeClass}`}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </span>
                ) : null;
              })()}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <FieldLabel>{t("est_hours")}</FieldLabel>
            <NumberInput
              value={item.estimatedHours}
              onChange={v => onChange("estimatedHours", v)}
              placeholder={t("eg_hours")}
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
              placeholder={t("eg_hours")}
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
              placeholder={t("task_id")}
              disabled={readOnly}
            />
          </div>
        </div>

        <div>
          <FieldLabel>
            {t("completion")}{" "}
            <span className={`font-extrabold normal-case text-xs ml-1 ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {item.completionPercentage}%
            </span>
          </FieldLabel>
          <div className="mt-2">
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gradient-to-r from-amber-400 to-orange-500"}`}
                style={{ width: `${item.completionPercentage}%` }}
              />
            </div>
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
            <div className="flex justify-between text-[10px] text-slate-400 -mt-0.5">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
        </div>

        {item.status === "blocked" && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <FieldLabel>{t("blocker_reason")}</FieldLabel>
            <TextArea
              value={item.blockerReason ?? ""}
              onChange={v => onChange("blockerReason", v)}
              placeholder={t("blocker_reason_2")}
              disabled={readOnly}
            />
          </div>
        )}

        <div>
          <FieldLabel>{t("priority_2")}</FieldLabel>
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
  const { t, i18n } = useTranslation();
  
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

  const [morningItems, setMorningItems] = useState<ReturnType<typeof EMPTY_MORNING_ITEM>[]>([EMPTY_MORNING_ITEM()]);
  const [morningGoals, setMorningGoals] = useState("");

  const [eveningItems, setEveningItems] = useState<TaskReportItem[]>([]);
  const [achievements, setAchievements] = useState("");
  const [blockers, setBlockers] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [overallMood, setOverallMood] = useState<WorkMood | "">("");
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);
  const [isEditingMorning, setIsEditingMorning] = useState(false);
  const [err, setErr] = useState<string | string[]>("");

  const completedItems = eveningItems.filter(i => COMPLETED_STATUSES.includes(i.status as TaskItemStatus));
  const pendingItems = eveningItems.filter(i => PENDING_STATUSES.includes(i.status as TaskItemStatus));

  const user = useSelector((state: RootState) => state.auth.user);

  const MOODS: { value: WorkMood; emoji: string; label: string; color: string }[] = [
    { value: "excellent" as WorkMood, emoji: "🚀", label: t("excellent"), color: "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300" },
    { value: "good" as WorkMood, emoji: "😊", label: t("good"), color: "border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500 text-blue-700 dark:text-blue-300" },
    { value: "neutral" as WorkMood, emoji: "😐", label: t("neutral"), color: "border-slate-400 bg-slate-50 dark:bg-slate-700 dark:border-slate-500 text-slate-700 dark:text-slate-300" },
    { value: "tired" as WorkMood, emoji: "😴", label: t("tired"), color: "border-amber-400 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-500 text-amber-700 dark:text-amber-300" },
    { value: "stressed" as WorkMood, emoji: "😰", label: t("stressed"), color: "border-rose-400 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-500 text-rose-700 dark:text-rose-300" },
  ];

  const loadReportData = useCallback((report: TaskReport) => {
    setExistingReport(report);

    if (report.morningAgenda?.items?.length) {
      setMorningItems(report.morningAgenda.items.map(i => ({ ...i })));
    }
    if (report.morningAgenda?.goals) {
      setMorningGoals(report.morningAgenda.goals);
    }

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

    if (report.eveningReport?.achievements) setAchievements(report.eveningReport.achievements);
    if (report.eveningReport?.blockers) setBlockers(report.eveningReport.blockers);
    if (report.eveningReport?.tomorrowPlan) setTomorrowPlan(report.eveningReport.tomorrowPlan);
    if (report.eveningReport?.overallMood) setOverallMood(report.eveningReport.overallMood);

    setActiveTab(report.morningAgenda?.isSubmitted ? "evening" : "morning");
    setIsFinalSubmitted(report.eveningReport?.isSubmitted ?? false);

    setIsLoading(false);
  }, []);



const loadReport = useCallback(async () => {
  setIsLoading(true);

  try {
    if (isNew) {
      if (!user?.id) {
        setActiveTab("morning");
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

      setActiveTab("morning");
      return;
    }

    const res = await TaskReportService.getReportById(id);

    if (res.status === 200) {
      const report: TaskReport | undefined =
        res.data?.data || res.data;

      if (report) {
        loadReportData(report);
      }
    }
  } catch (error) {
    console.error("🔴 Load report error:", error);
  } finally {
    setIsLoading(false);
  }
}, [id, isNew, today, user, loadReportData]);


useEffect(() => { loadReport(); }, [loadReport]);


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

  const submitMorning = async () => {
    if (morningItems.some(i => !i.title.trim())) {
      toast.error(t("toast.fill_all_titles"));
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

      if (res.status === 200 || res.status === 201) {
        toast.success(t("toast.morning_submitted"));

        const reportId =
          res.data?.data?.id   ||
          res.data?.data?._id  ||
          res.data?.id         ||
          res.data?._id;

        if (reportId) {
          router.replace(`/report/create/${reportId}`);
        } else {
          toast.error(t("toast.no_report_id"));
        }
      }
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      toast.error(err.response?.data?.message || t("toast.morning_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateMorning = async () => {
    if (morningItems.some(i => !i.title.trim())) {
      toast.error(t("toast.fill_all_titles"));
      return;
    }
    if (!existingReport?.id) {
      toast.error(t("toast.report_not_found"));
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
        toast.success(t("toast.morning_updated"));
        setIsEditingMorning(false);
        await loadReport();
      }
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      toast.error(err.response?.data?.message || t("toast.morning_update_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

 const handleEveningSubmit = async () => {
  try {
    const { isConfirmed, isChecked } = await ConfirmPopup({
      title: t("save_evening_title"),
      text: t("save_evening_text"),
      btnTxt: "yes_save",
      checkedBtnTxt: "yes_submit",
      checkedTitle: t("submit_evening_title"),
      checkedText: t("submit_evening_text"),
      showCheckbox: true,
      checkboxLabel: t("final_submission_help"),
      checkboxDefaultChecked: isFinalSubmitted,
    });

    if (isConfirmed) {
      setIsFinalSubmitted(isChecked);
      await submitEvening(isChecked);
    }
  } catch (error) {
    console.error(error);
    toast.error(t("toast.something_wrong"));
  }
};

const submitEvening = async (finalSubmit: boolean) => {
  setErr("");
  if (!existingReport?.id) {
    toast.error(t("toast.submit_morning_first"));
    return;
  }
  const valid = eveningItems.filter(i => i.title.trim());
  if (valid.length === 0) {
    toast.error(t("toast.add_one_task"));
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
        isSubmitted: finalSubmit,
      },
    };
    let res = null;
    if (!finalSubmit) {
      res = await TaskReportService.updateEveningReport(existingReport.id, payload);
    } else {
      res = await TaskReportService.submitEveningReport(existingReport.id, payload);
    }
    if (res?.status === 200) {
      toast.success(t("toast.evening_submitted"));
      await loadReport();
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errM = extractErrorMessages(error);
      toast.error(errM[0]);
      setErr(errM);
    } else {
      toast.error(t("toast.something_wrong"));
    }
  } finally {
    setIsSubmitting(false);
  }
};



  const morningSubmitted = existingReport?.morningAgenda?.isSubmitted ?? false;
  const eveningSubmitted = existingReport?.eveningReport?.isSubmitted ?? false;
  const morningReadOnly = morningSubmitted && !isEditingMorning;

  const actualHour =
    Number(completedItems.reduce((s, i) => s + (i.actualHours ?? 0), 0).toFixed(1)) +
    Number(pendingItems.reduce((s, i) => s + (i.actualHours ?? 0), 0).toFixed(1));

  const totalMorningEstHours = Number(morningItems.reduce((s, i) => s + (i.estimatedHours ?? 0), 0).toFixed(1));

  const morningPriorityCounts = morningItems.reduce((acc, item) => {
    const p = item.priority || "medium";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalEveningTasks = eveningItems.length;
  const eveningCompletedCount = completedItems.length;
  const eveningPendingCount = pendingItems.length;
  const eveningCompletionRate = totalEveningTasks > 0 ? Math.round((eveningCompletedCount / totalEveningTasks) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="w-14 h-14 rounded-full border-4 border-indigo-100 dark:border-indigo-900/50" />
            <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{t("loading_report")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 ">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-5 border-b border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/25 shrink-0">
              📝
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                  {t("page_title")}
                </h1>
                
                {!isNew && existingReport && (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      morningSubmitted
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${morningSubmitted ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`} />
                      {t("morning")}: {morningSubmitted ? t("status_badge.done") : t("status_badge.pending")}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      eveningSubmitted
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        : morningSubmitted
                        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${eveningSubmitted ? "bg-emerald-500" : morningSubmitted ? "bg-amber-400 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`} />
                      {t("evening")}: {eveningSubmitted ? t("status_badge.done") : morningSubmitted ? t("status_badge.pending") : "🔒"}
                    </span>
                    {existingReport.isReviewed && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        ✓ {t("manager_reviewed")}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {new Date().toLocaleDateString(
                  i18n.language === "hi"
                    ? "hi-IN"
                    : i18n.language === "pt" || i18n.language === "po"
                    ? "pt-BR"
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

          <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner shrink-0">
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
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed
                    ${isActive
                      ? tab === "morning"
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/25"
                        : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700/50"
                    }`}
                >
                  <span>{tab === "morning" ? "🌅" : "🌆"}</span>
                  {tab === "morning" ? t("morning_agenda") : t("evening_report")}
                  {isDone && (
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center ${isActive ? "bg-white/25" : "bg-emerald-500"}`}>
                      <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                  {isLocked && !isDone && <span className="text-[11px]">🔒</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {activeTab === "morning" && (
            <>
              <div className="lg:col-span-8 space-y-6">

                {morningSubmitted && !isEditingMorning && (
                  <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm shrink-0 shadow-sm">✓</div>
                      <div>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{t("morning_submitted")}</p>
                        <p className="text-[11px] text-emerald-600/80 dark:text-emerald-500/70 mt-0.5">
                          {existingReport?.morningAgenda?.submittedAt
                            ? `${t("submitted_at")} ${new Date(existingReport.morningAgenda.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                            : t("already_submitted")
                          }
                        </p>
                      </div>
                    </div>
                    {!eveningSubmitted && (
                      <button
                        type="button"
                        onClick={() => setIsEditingMorning(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs font-bold transition-all shrink-0 shadow-sm"
                      >
                        {t("edit_plan")}
                      </button>
                    )}
                  </div>
                )}

                {morningSubmitted && isEditingMorning && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/60 shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm shrink-0 shadow-sm">✏️</div>
                    <div>
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{t("editing_morning")}</p>
                      <p className="text-[11px] text-amber-600/80 dark:text-amber-500/70 mt-0.5">{t("editing_help")}</p>
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🎯</span>
                      <div>
                        <h2 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-widest">{t("todays_goal")}</h2>
                        <p className="text-[11px] text-slate-400">{t("goal_help")}</p>
                      </div>
                    </div>
                    {morningReadOnly ? (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/40">
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium italic leading-relaxed">
                          {morningGoals || <span className="text-gray-400 not-italic">{t("no_goal_set")}</span>}
                        </p>
                      </div>
                    ) : (
                      <TextArea
                        value={morningGoals}
                        onChange={setMorningGoals}
                        placeholder={t("main_focus")}
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-700/60 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-base shadow-sm">
                        🌅
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{t("morning_agenda")}</h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                            {morningItems.length} {morningItems.length === 1 ? t("task") : t("tasks")}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {totalMorningEstHours}h {t("est")}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {morningReadOnly
                            ? t("plan_readonly")
                            : isEditingMorning
                              ? t("plan_editing")
                              : t("plan_help")}
                        </p>
                      </div>
                    </div>

                    {!morningReadOnly && (
                      <button
                        type="button"
                        onClick={() => setMorningItems(items => [...items, EMPTY_MORNING_ITEM()])}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        <span>+</span> {t("add_task")}
                      </button>
                    )}
                  </div>

                  {morningItems.length === 0 ? (
                    <div className="py-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center mb-4">
                      <span className="text-3xl mb-2 block">📝</span>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t("no_tasks_planned")}</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">{t("no_tasks_help")}</p>
                      {!morningReadOnly && (
                        <button
                          type="button"
                          onClick={() => setMorningItems(items => [...items, EMPTY_MORNING_ITEM()])}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-bold"
                        >
                          + {t("add_task")}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 mb-5">
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
                  )}

                  {!morningReadOnly && (
                    <button
                      type="button"
                      onClick={() => setMorningItems(items => [...items, EMPTY_MORNING_ITEM()])}
                      className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-500 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      {t("add_another_task")}
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">

                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        {t("overview")}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        morningSubmitted
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                      }`}>
                        {morningSubmitted ? `✓ ${t("submitted")}` : t("draft")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/40 text-center">
                        <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{morningItems.length}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">{t("tasks_planned")}</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 text-center">
                        <div className="text-2xl font-extrabold text-amber-500">{totalMorningEstHours}h</div>
                        <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-bold uppercase tracking-wide mt-0.5">{t("est_hours")}</div>
                      </div>
                    </div>

                    {morningItems.length > 0 && (
                      <div className="mb-5 pb-5 border-b border-slate-100 dark:border-slate-700/60">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{t("priority_breakdown")}</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {PRIORITIES.map(p => {
                            const count = morningPriorityCounts[p] || 0;
                            if (count === 0) return null;
                            return (
                              <span key={p} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border capitalize ${PRIORITY_STYLES[p]}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[p]}`} />
                                {count} {t(`${p}`)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {morningReadOnly ? (
                        <>
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center gap-2.5 mb-2">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">✓</span>
                            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">{t("morning_submitted")}</span>
                          </div>
                          {!eveningSubmitted && (
                            <button
                              type="button"
                              onClick={() => setIsEditingMorning(true)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-all shadow-sm"
                            >
                              ✏️ {t("edit_plan")}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveTab("evening")}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                          >
                            {t("goto_evening")} 
                          </button>
                        </>
                      ) : isEditingMorning ? (
                        <>
                          <button
                            type="button"
                            onClick={updateMorning}
                            disabled={isSubmitting || morningItems.every(i => !i.title.trim())}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-md shadow-amber-500/25 active:scale-95"
                          >
                            {isSubmitting ? (
                              <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> {t("updating")}</>
                            ) : (
                              <>✏️ {t("update_morning")}</>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsEditingMorning(false); loadReport(); }}
                            disabled={isSubmitting}
                            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-all"
                          >
                            {t("cancel")}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={submitMorning}
                            disabled={isSubmitting || morningItems.every(i => !i.title.trim())}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-md shadow-amber-500/25 active:scale-95"
                          >
                            {isSubmitting ? (
                              <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> {t("submitting")}</>
                            ) : (
                              <><span>🌅</span> {t("submit_morning")}</>
                            )}
                          </button>
                          <p className="text-[11px] text-slate-400 text-center leading-normal mt-1">
                            {t("submit_help")}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/30 dark:from-slate-800/60 dark:via-slate-800/40 dark:to-slate-800/20 rounded-2xl border border-indigo-100/80 dark:border-indigo-900/40 p-5 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-base">💡</span>
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">{t("productivity_tips")}</h4>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span><b>{t("tip1_title")}</b> {t("tip1_text")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span><b>{t("tip2_title")}</b> {t("tip2_text")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span><b>{t("tip3_title")}</b> {t("tip3_text")}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {activeTab === "evening" && (
            <>
              <div className="lg:col-span-8 space-y-6">

                {eveningSubmitted && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm shrink-0 shadow-sm">🔒</div>
                    <div>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{t("evening_locked")}</p>
                      <p className="text-[11px] text-emerald-600/80 dark:text-emerald-500/70 mt-0.5">
                        {existingReport?.eveningReport?.submittedAt
                          ? `${t("submitted_at")} ${new Date(existingReport.eveningReport.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} ${t("evening_readonly")}`
                          : `${t("already_submitted")} ${t("evening_readonly")}`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {!eveningSubmitted && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/60">
                    <span className="text-base shrink-0 mt-0.5">💡</span>
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                      {t("evening_help")}
                    </p>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-700/60 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
                        ✓
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{t("completed_tasks")}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                            {completedItems.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{t("completed_help")}</p>
                      </div>
                    </div>

                    {!eveningSubmitted && (
                      <button
                        type="button"
                        onClick={() => addEveningItem("completed" as TaskItemStatus)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        <span>+</span> {t("add_task")}
                      </button>
                    )}
                  </div>

                  {completedItems.length === 0 ? (
                    <div className="py-10 rounded-2xl border-2 border-dashed border-emerald-100 dark:border-emerald-900/30 text-center mb-3 bg-emerald-50/20 dark:bg-emerald-900/5">
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">{t("no_completed")}</p>
                      <p className="text-xs text-slate-400 mt-1">{t("no_completed_help")}</p>
                    </div>
                  ) : (
                    <div className="space-y-4 mb-4">
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
                      className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-500 dark:hover:text-emerald-100 hover:border-emerald-400 hover:text-emerald-700 dark:hover:bg-green-200/70  hover:bg-emerald-50/40 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2"
                    >
                     
                      {t("add_completed_task")}
                    </button>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-700/60 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
                        ⏳
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{t("pending_tasks")}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                            {pendingItems.length}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{t("pending_help")}</p>
                      </div>
                    </div>

                    {!eveningSubmitted && (
                      <button
                        type="button"
                        onClick={() => addEveningItem("carried_forward" as TaskItemStatus)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-700 hover:bg-amber-100 text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        <span>+</span> {t("add_task")}
                      </button>
                    )}
                  </div>

                  {pendingItems.length === 0 ? (
                    <div className="py-10 rounded-2xl border-2 border-dashed border-amber-100 dark:border-amber-900/30 text-center mb-3 bg-amber-50/20 dark:bg-amber-900/5">
                      <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">{t("all_completed")}</p>
                      <p className="text-xs text-slate-400 mt-1">{t("all_completed_help")}</p>
                    </div>
                  ) : (
                    <div className="space-y-4 mb-4">
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
                      className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-500 dark:hover:bg-amber-200/70 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/40 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2"
                    >
                     
                      {t("add_pending_task")}
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 lg:sticky top-6 right-4 self-start space-y-5">

                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600" />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        {t("summary")}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        eveningSubmitted
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                      }`}>
                        {eveningSubmitted ? `✓ ${t("submitted")}` : t("in_progress")}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/40 mb-4">
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-600 dark:text-slate-300">{t("completion_rate")}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{eveningCompletionRate}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${eveningCompletionRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-5">
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 text-center">
                        <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{completedItems.length}</div>
                        <div className="text-[9px] text-emerald-700/80 dark:text-emerald-400/80 font-bold uppercase tracking-wide mt-0.5">{t("completed")}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 text-center">
                        <div className="text-xl font-extrabold text-amber-500">{pendingItems.length}</div>
                        <div className="text-[9px] text-amber-700/80 dark:text-amber-400/80 font-bold uppercase tracking-wide mt-0.5">{t("pending")}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40 text-center">
                        <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{actualHour}h</div>
                        <div className="text-[9px] text-indigo-700/80 dark:text-indigo-400/80 font-bold uppercase tracking-wide mt-0.5">{t("actual_hours")}</div>
                      </div>
                    </div>

                    <div className="mb-5 pb-5 border-b border-slate-100 dark:border-slate-700/60">
                      <FieldLabel>{t("overall_mood")}</FieldLabel>
                      <div className="grid grid-cols-5 gap-1.5 mt-2">
                        {MOODS.map(m => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => !eveningSubmitted && setOverallMood(m.value)}
                            disabled={eveningSubmitted}
                            title={m.label}
                            className={`flex flex-col items-center py-2 rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                              ${overallMood === m.value
                                ? `${m.color} scale-105 shadow-sm`
                                : "border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-600 hover:scale-105"
                              }`}
                          >
                            <span className="text-xl">{m.emoji}</span>
                            <span className="text-[8px] font-bold mt-1 truncate max-w-[50px]">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                   <div className="space-y-2">

                    {err && <p className="text-rose-500 text-xs font-medium">{err}</p>}
                  {!eveningSubmitted && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5 mb-4">
                      <input
                        type="checkbox"
                        id="finalSubmitCheck"
                        name="isFinalSubmitted"
                        checked={isFinalSubmitted}
                        onChange={(e) => setIsFinalSubmitted(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-indigo-500 cursor-pointer shrink-0"
                      />
                      <div>
                        <FieldLabel>{t("final_submission")}</FieldLabel>
                        <label htmlFor="finalSubmitCheck" className="text-[11px] text-slate-500 dark:text-slate-400 font-medium cursor-pointer leading-tight block mt-0.5">
                          {t("final_submission_help")}
                        </label>
                      </div>
                    </div>
                  )}
                  </div>

                    <div className="space-y-2">
                      {err && <p className="text-rose-500 text-xs font-medium">{err}</p>}
                      {!eveningSubmitted ? (
                        <button
                          type="button"
                          onClick={handleEveningSubmit}
                          disabled={isSubmitting || eveningItems.filter(i => i.title.trim()).length === 0}
                          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all duration-200 active:scale-95 shadow-md shadow-emerald-500/25"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              {t("submitting")}
                            </>
                          ) : (
                            <>
                              <span>🌆</span>
                              {!isFinalSubmitted
                                ? t("save_evening")
                                : t("submit_evening")
                              }
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                          <span className="text-emerald-600 dark:text-emerald-400 text-base">🔒</span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {t("report_locked")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">📝</span>
                    <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      {t("retrospective")}
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                    <FieldLabel>{t("achievements")}</FieldLabel>
                    <TextArea
                      value={achievements}
                      onChange={setAchievements}
                      placeholder={t("achievements_2")}
                      rows={2}
                      disabled={eveningSubmitted}
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50/40 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
                    <FieldLabel>{t("blockers_challenges")}</FieldLabel>
                    <TextArea
                      value={blockers}
                      onChange={setBlockers}
                      placeholder={t("blockers_3")}
                      rows={2}
                      disabled={eveningSubmitted}
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/40 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                    <FieldLabel>{t("tomorrows_plan")}</FieldLabel>
                    <TextArea
                      value={tomorrowPlan}
                      onChange={setTomorrowPlan}
                      placeholder={t("tomorrow")}
                      rows={2}
                      disabled={eveningSubmitted}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default TaskReportCreatePage;