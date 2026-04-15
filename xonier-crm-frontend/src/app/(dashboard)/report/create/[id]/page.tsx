"use client";

import React, { JSX, useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { TaskReportService } from "@/src/services/taskReport.service";
import { useParams } from "next/navigation";
import {
  TaskReport,
  TaskReportItem,
  WorkMood,
  TaskItemStatus,
} from "@/src/types/task/taskReport";
import { AxiosError } from "axios";

// ── Constants ─────────────────────────────────────────────────────────────────

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

// Status bucketing
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
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800/50"
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
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition resize-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800/50"
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
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800/50"
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
}) {
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
          {p}
        </button>
      ))}
    </div>
  );
}

// ── Morning Readonly Card ─────────────────────────────────────────────────────

function MorningReadonlyCard({ item, index }: {
  item: TaskReportItem | ReturnType<typeof EMPTY_MORNING_ITEM>; index: number;
}) {
  return (
    <div className="bg-gradient-to-r from-slate-50 to-white dark:from-gray-800/60 dark:to-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</span>
            {item.priority && <PriorityBadge value={item.priority} />}
            {item.linkedTaskId && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                {item.linkedTaskId}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">{item.description}</p>
          )}
          {item.estimatedHours && (
            <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
              <span>⏱</span> Estimated: <b className="text-gray-600 dark:text-gray-300">{item.estimatedHours}h</b>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Morning Edit Card ─────────────────────────────────────────────────────────

function MorningEditCard({ item, index, onChange, onRemove }: {
  item: ReturnType<typeof EMPTY_MORNING_ITEM>;
  index: number;
  onChange: (field: string, value: unknown) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm relative group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-extrabold">
            {index + 1}
          </div>
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Task</span>
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
          <FieldLabel required>Task Title</FieldLabel>
          <TextInput value={item.title} onChange={v => onChange("title", v)} placeholder="What are you going to work on?" />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <TextArea value={item.description ?? ""} onChange={v => onChange("description", v)} placeholder="Brief details about this task…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Estimated Hours</FieldLabel>
            <NumberInput value={item.estimatedHours} onChange={v => onChange("estimatedHours", v)} placeholder="e.g. 2.5" min={0.5} max={24} />
          </div>
          <div>
            <FieldLabel>Linked Task ID</FieldLabel>
            <TextInput value={item.linkedTaskId ?? ""} onChange={v => onChange("linkedTaskId", v)} placeholder="TASK-101" />
          </div>
        </div>
        <div>
          <FieldLabel>Priority</FieldLabel>
          <PrioritySelector value={item.priority ?? "medium"} onChange={v => onChange("priority", v)} />
        </div>
      </div>
    </div>
  );
}

// ── Evening Task Card ─────────────────────────────────────────────────────────

function EveningTaskCard({ item, index, onChange, onRemove, bucket, readOnly }: {
  item: TaskReportItem;
  index: number;
  onChange: (field: string, value: unknown) => void;
  onRemove: () => void;
  bucket: "completed" | "pending";
  readOnly?: boolean;
}) {
  const isCompleted = bucket === "completed";

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 shadow-sm relative group transition-all
        ${isCompleted
          ? "border-emerald-100 dark:border-emerald-800/50"
          : "border-amber-100 dark:border-amber-800/50"
        }`}
    >
      {/* Header */}
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
        {/* Only show remove button if NOT read-only */}
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
          <FieldLabel required>Task Title</FieldLabel>
          <TextInput
            value={item.title}
            onChange={v => onChange("title", v)}
            placeholder={isCompleted ? "What did you complete?" : "What is still pending?"}
            disabled={readOnly}
          />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <TextArea
            value={item.description ?? ""}
            onChange={v => onChange("description", v)}
            placeholder="Details about what was done / what's remaining…"
            disabled={readOnly}
          />
        </div>

        {/* Status selector — hidden when read-only, show badge instead */}
        {!readOnly ? (
          <div>
            <FieldLabel>
              Status{" "}
              <span className="normal-case text-indigo-500 dark:text-indigo-400 font-semibold text-[10px] ml-1">
                ← changing this moves the task between sections
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
            <FieldLabel>Status</FieldLabel>
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
            <FieldLabel>Est. Hours</FieldLabel>
            <NumberInput
              value={item.estimatedHours}
              onChange={v => onChange("estimatedHours", v)}
              placeholder="2"
              min={0.5}
              max={24}
              disabled={readOnly}
            />
          </div>
          {isCompleted ? (
            <div>
              <FieldLabel>Actual Hours</FieldLabel>
              <NumberInput
                value={item.actualHours}
                onChange={v => onChange("actualHours", v)}
                placeholder="2.5"
                min={0.5}
                max={24}
                disabled={readOnly}
              />
            </div>
          ) : (
            <div>
              <FieldLabel>Linked Task ID</FieldLabel>
              <TextInput
                value={item.linkedTaskId ?? ""}
                onChange={v => onChange("linkedTaskId", v)}
                placeholder="TASK-101"
                disabled={readOnly}
              />
            </div>
          )}
        </div>

        {/* Completion Slider */}
        <div>
          <FieldLabel>
            Completion:{" "}
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

        {/* Blocker reason only if blocked */}
        {item.status === "blocked" && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
            <FieldLabel>🚧 Blocker Reason</FieldLabel>
            <TextArea
              value={item.blockerReason ?? ""}
              onChange={v => onChange("blockerReason", v)}
              placeholder="What is blocking this task?"
              disabled={readOnly}
            />
          </div>
        )}

        <div>
          <FieldLabel>Priority</FieldLabel>
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
  const today = new Date().toISOString().split("T")[0];
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

  // Evening — single flat list; sections are derived by status
  const [eveningItems, setEveningItems] = useState<TaskReportItem[]>([]);
  const [achievements, setAchievements] = useState("");
  const [blockers, setBlockers] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [overallMood, setOverallMood] = useState<WorkMood | "">("");
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);

  // Derived buckets
  const completedItems = eveningItems.filter(i => COMPLETED_STATUSES.includes(i.status as TaskItemStatus));
  const pendingItems = eveningItems.filter(i => PENDING_STATUSES.includes(i.status as TaskItemStatus));

  // ── Load report ────────────────────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    if (isNew) {
      setActiveTab("morning");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const res = await TaskReportService.getById(id);
      if (res.status === 200) {
        const reportsData = res.data?.data?.data;
        const userReports = reportsData[0]?.reports ?? [];

        const report: TaskReport | undefined = userReports.find(
          (r: TaskReport) => r.reportDate === today
        );

        if (!report) {
          return;
        }

        setExistingReport(report);

        if (report.morningAgenda?.items?.length) {
          setMorningItems(report.morningAgenda.items.map(i => ({ ...i })));
        }

        if (report.morningAgenda?.goals) {
          setMorningGoals(report.morningAgenda.goals);
        }

        const existingCompleted: TaskReportItem[] =
          report.eveningReport?.completedItems ?? [];

        const existingPending: TaskReportItem[] =
          report.eveningReport?.pendingItems ?? [];

        const allEvening = [...existingCompleted, ...existingPending];

        if (allEvening.length > 0) {
          // Add missing morning tasks into evening
          const eveningTitles = new Set(
            allEvening.map(i => i.title.toLowerCase().trim())
          );

          const missingFromMorning =
            (report.morningAgenda?.items ?? [])
              .filter(i => !eveningTitles.has(i.title.toLowerCase().trim()))
              .map(i =>
                toEveningItem(i, { status: "pending" as TaskItemStatus })
              );

          setEveningItems([...allEvening, ...missingFromMorning]);
        } else if (report.morningAgenda?.isSubmitted) {
          // Pre-fill evening from morning
          setEveningItems(
            (report.morningAgenda.items ?? []).map(i =>
              toEveningItem(i, { status: "pending" as TaskItemStatus })
            )
          );
        }

        // Evening meta fields
        if (report.eveningReport?.achievements) {
          setAchievements(report.eveningReport.achievements);
        }

        if (report.eveningReport?.blockers) {
          setBlockers(report.eveningReport.blockers);
        }

        if (report.eveningReport?.tomorrowPlan) {
          setTomorrowPlan(report.eveningReport.tomorrowPlan);
        }

        if (report.eveningReport?.overallMood) {
          setOverallMood(report.eveningReport.overallMood);
        }

        // Smart tab switching
        setActiveTab(
          report.morningAgenda?.isSubmitted ? "evening" : "morning"
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => { loadReport(); }, [loadReport]);

  // ── Evening helpers ────────────────────────────────────────────────────────
  const updateEveningItem = (globalIdx: number, field: string, value: unknown) => {
    setEveningItems(items =>
      items.map((item, i) => i === globalIdx ? { ...item, [field]: value } : item)
    );
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
      if (res.status === 200 || res.status === 201) {
        toast.success("Morning agenda submitted! ✅");
        setActiveTab("evening");
        await loadReport();
      }
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;

      toast.error(
        err.response?.data?.message || "Failed to submit morning agenda"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Submit Evening ─────────────────────────────────────────────────────────
  const submitEvening = async () => {
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
          isSubmitted: eveningSubmitted ? eveningSubmitted : isFinalSubmitted,
        },
      };
      var res = null;
      if (eveningSubmitted) {
        res = await TaskReportService.updateEveningReport(existingReport.id, payload);
      } else {
        res = await TaskReportService.submitEveningReport(existingReport.id, payload);
      }
      if (res?.status === 200) {
        toast.success("Evening report submitted! 🌆");
        await loadReport();
      }
    } catch {
      toast.error("Failed to submit evening report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const morningSubmitted = existingReport?.morningAgenda?.isSubmitted ?? false;
  const eveningSubmitted = existingReport?.eveningReport?.isSubmitted ?? false;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="ml-72 mt-14 flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">Loading report…</p>
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
                Daily Task Report
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long", day: "2-digit", month: "long", year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* ── Status Banner ── */}
        {!isNew && existingReport && (
          <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${morningSubmitted ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`} />
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Morning:</span>
              <span className={`text-xs font-extrabold ${morningSubmitted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {morningSubmitted ? "Submitted ✓" : "Not Submitted"}
              </span>
            </div>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${eveningSubmitted ? "bg-emerald-500" : morningSubmitted ? "bg-amber-400 animate-pulse" : "bg-gray-200"}`} />
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Evening:</span>
              <span className={`text-xs font-extrabold ${eveningSubmitted ? "text-emerald-600 dark:text-emerald-400" : morningSubmitted ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                {eveningSubmitted ? "Submitted ✓" : morningSubmitted ? "Not Submitted" : "🔒 Locked"}
              </span>
            </div>
            {existingReport.isReviewed && (
              <>
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">Manager Reviewed ✓</span>
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
                {tab === "morning" ? "Morning Agenda" : "Evening Report"}
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

            {/* Submitted notice */}
            {morningSubmitted && (
              <div className="flex items-center gap-3 mb-6 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-sm shrink-0">✓</div>
                <div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Morning Agenda Submitted & Locked</p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80">
                    {existingReport?.morningAgenda?.submittedAt
                      ? `Submitted at ${new Date(existingReport.morningAgenda.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                      : "Already submitted"
                    } · This plan cannot be edited.
                  </p>
                </div>
              </div>
            )}

            {/* Section header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg shadow-md">🌅</div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Morning Agenda</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {morningSubmitted ? "Your plan for today (read-only)" : "Plan your day — what tasks will you tackle?"}
                </p>
              </div>
            </div>

            {/* Goal */}
            <div className={`mb-6 p-4 rounded-2xl border ${morningSubmitted ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30" : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800"}`}>
              <FieldLabel>🎯 Today&apos;s Goal / Focus</FieldLabel>
              {morningSubmitted ? (
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium italic min-h-[20px]">
                  {morningGoals || <span className="text-gray-400 not-italic">No goal set</span>}
                </p>
              ) : (
                <TextArea
                  value={morningGoals}
                  onChange={setMorningGoals}
                  placeholder="What is your main focus today?"
                  rows={2}
                />
              )}
            </div>

            {/* Items */}
            <div className="space-y-3 mb-5">
              {morningItems.map((item, idx) =>
                morningSubmitted
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

            {!morningSubmitted && (
              <button
                type="button"
                onClick={() => setMorningItems(items => [...items, EMPTY_MORNING_ITEM()])}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-indigo-400 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-bold transition-all flex items-center justify-center gap-2 mb-6"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Add Another Task
              </button>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{morningItems.length}</div>
                  <div className="text-[11px] text-gray-500 font-medium">Tasks Planned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-amber-500">
                    {morningItems.reduce((s, i) => s + (i.estimatedHours ?? 0), 0).toFixed(1)}h
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">Est. Hours</div>
                </div>
              </div>

              {morningSubmitted ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("evening")}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all active:scale-95 shadow-sm"
                >
                  Go to Evening Report →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitMorning}
                  disabled={isSubmitting || morningItems.every(i => !i.title.trim())}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all active:scale-95 shadow-sm"
                >
                  {isSubmitting
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Submitting…</>
                    : <><span>🌅</span> Submit Morning Agenda</>
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

            {/* Final submission locked banner */}
            {eveningSubmitted && (
              <div className="flex items-center gap-3 mb-6 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-sm shrink-0">🔒</div>
                <div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Evening Report Locked — Final Submission Complete</p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80">
                    {existingReport?.eveningReport?.submittedAt
                      ? `Submitted at ${new Date(existingReport.eveningReport.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                      : "Already submitted"
                    } · This report is read-only and cannot be edited.
                  </p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-lg shadow-md">🌆</div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Evening Report</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {eveningSubmitted
                    ? "This report has been finally submitted and is now read-only."
                    : "All morning tasks are pre-loaded. Change each task's status to move it between sections."
                  }
                </p>
              </div>
            </div>

            {/* Hint — only show when editable */}
            {!eveningSubmitted && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 mb-6">
                <span className="text-base shrink-0 mt-0.5">💡</span>
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                  Changing a task&apos;s <b>Status</b> to <b>Completed</b> automatically moves it to the green section.
                  Setting it to <b>In Progress / Pending / Blocked / Carried Forward</b> moves it to the amber section.
                </p>
              </div>
            )}

            {/* ── COMPLETED ── */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs">✅</div>
                <h3 className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Completed Tasks</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {completedItems.length}
                </span>
              </div>

              {completedItems.length === 0 ? (
                <div className="py-8 rounded-2xl border-2 border-dashed border-emerald-100 dark:border-emerald-900/30 text-center mb-3">
                  <p className="text-sm text-emerald-400 dark:text-emerald-600 font-semibold">No completed tasks yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">Change a task's status to "Completed" to move it here</p>
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

              {/* Add button — hidden when locked */}
              {!eveningSubmitted && (
                <button
                  type="button"
                  onClick={() => addEveningItem("completed" as TaskItemStatus)}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/60 text-emerald-500 dark:text-emerald-600 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  + Add Completed Task
                </button>
              )}
            </div>

            {/* ── PENDING ── */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs">⏳</div>
                <h3 className="text-sm font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending / In Progress / Blocked</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {pendingItems.length}
                </span>
              </div>

              {pendingItems.length === 0 ? (
                <div className="py-8 rounded-2xl border-2 border-dashed border-amber-100 dark:border-amber-900/30 text-center mb-3">
                  <p className="text-sm text-amber-400 dark:text-amber-600 font-semibold">All tasks completed! 🎉</p>
                  <p className="text-xs text-gray-400 mt-0.5">Amazing work today</p>
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

              {/* Add button — hidden when locked */}
              {!eveningSubmitted && (
                <button
                  type="button"
                  onClick={() => addEveningItem("carried_forward" as TaskItemStatus)}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-800/60 text-amber-500 dark:text-amber-600 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  + Add Pending Task
                </button>
              )}
            </div>

            {/* ── Summary fields ── */}
            <div className="space-y-4 mb-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                <FieldLabel>🏆 Achievements / Highlights</FieldLabel>
                <TextArea
                  value={achievements}
                  onChange={setAchievements}
                  placeholder="What are you proud of today? Any wins, improvements, or learnings?"
                  rows={3}
                  disabled={eveningSubmitted}
                />
              </div>
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <FieldLabel>🚧 Blockers / Challenges</FieldLabel>
                <TextArea
                  value={blockers}
                  onChange={setBlockers}
                  placeholder="Any blockers, issues, or challenges faced today?"
                  rows={2}
                  disabled={eveningSubmitted}
                />
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <FieldLabel>📅 Tomorrow&apos;s Plan</FieldLabel>
                <TextArea
                  value={tomorrowPlan}
                  onChange={setTomorrowPlan}
                  placeholder="What do you plan to work on tomorrow?"
                  rows={2}
                  disabled={eveningSubmitted}
                />
              </div>
              <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
                <FieldLabel>Overall Mood Today</FieldLabel>
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

              {/* Final submission checkbox — only visible when NOT yet submitted */}
              {!eveningSubmitted && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-700 items-center gap-3">
                  <FieldLabel>Final Submission</FieldLabel>
                  <input
                    type="checkbox"
                    name="isFinalSubmitted"
                    checked={isFinalSubmitted}
                    onChange={(e) => setIsFinalSubmitted(e.target.checked)}
                  />
                  <span className="text-sm text-orange-500 ml-2">
                    Final submission locks this report from further changes — only submitted reports will be considered.
                  </span>
                </div>
              )}
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-emerald-600">{completedItems.length}</div>
                  <div className="text-[11px] text-gray-500 font-medium">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-amber-500">{pendingItems.length}</div>
                  <div className="text-[11px] text-gray-500 font-medium">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-indigo-600">
                    {completedItems.reduce((s, i) => s + (i.actualHours ?? 0), 0).toFixed(1)}h
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">Actual Hours</div>
                </div>
                {overallMood && (
                  <div className="text-center">
                    <div className="text-2xl">{MOODS.find(m => m.value === overallMood)?.emoji ?? ""}</div>
                    <div className="text-[11px] text-gray-500 font-medium">Mood</div>
                  </div>
                )}
              </div>

              {/* Submit button — replaced with locked label after final submission */}
              {!eveningSubmitted ? (
                <button
                  type="button"
                  onClick={submitEvening}
                  disabled={isSubmitting || eveningItems.filter(i => i.title.trim()).length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all active:scale-95 shadow-sm"
                >
                  {isSubmitting
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Submitting…</>
                    : <><span>🌆</span> {!isFinalSubmitted ? "Save Evening Report" : "Submit Evening Report"}</>
                  }
                </button>
              ) : (
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">🔒</span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    Report locked — final submission complete
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TaskReportCreatePage;