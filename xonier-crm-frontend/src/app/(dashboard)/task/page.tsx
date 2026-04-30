"use client"
import React, {
  JSX,
  useState,
  useEffect,
  useRef,
  useCallback,
  ChangeEvent,
  FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { usePermissions } from "@/src/hooks/usePermissions";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { TaskService } from "@/src/services/tasks.service";
import { StatusService } from "@/src/services/status.service";
import { ColorOption } from "@/src/types/task/status.types";
import { MdEdit, MdDelete, MdOutlineMessage } from "react-icons/md";
import { TaskTimeLog } from "@/src/types/task/taskTimer.types";
import {
  StatusBadge,
  getColorOption,
} from "@/src/components/pages/task/createStatusModal";
import {
  TaskItem,
  TASK_PRIORITY,
  UpdateTaskStatusPayload,
  StatusOption,
} from "@/src/types/task/task.types";
import { PERMISSIONS } from "@/src/constants/enum";
import { IoMdEye } from "react-icons/io";
import { BsTicketDetailed } from "react-icons/bs";
import { CategoryItem } from "@/src/types/task/category.types";
import { CategoryService } from "@/src/services/category.service";
import UserSelect from "@/src/components/common/userselect";
import {
  MarkFinalModal,
  MarkFinalPayload,
} from "@/src/components/pages/task/Marrkfinalmodal";
import DateFilterButton from "@/src/components/common/dateFilter";
import { DateFilter } from "@/src/types/components/ui/dateFilter.types";
import { Star } from "lucide-react";
import {
  RemarkMessagePayload,
  RemarkService,
} from "@/src/services/remark.service";
import CreateRemarkPopup from "@/src/components/pages/task/CreateRemarkPopup";
import BlurryBackground from "@/src/components/common/BlurryBackground";
import { TimerService } from "@/src/services/timer.service";

type ViewMode = "list" | "board";

interface FinalStatusPayload extends UpdateTaskStatusPayload {
  remark?: string;
  feedbackStars?: number;
  actualHours?: number;
}

interface PendingDrop {
  task: TaskItem;
  targetStatus: StatusOption;
  categoryId: string;
}

interface TaskTimerEntry {
  logId: string;
  status: "running" | "paused" | "stopped";
  committedSeconds: number;
  segmentStartedAt: string | null;
  displaySeconds: number;
}

const STOP_DISPLAY_MS = 4000;

const PRIORITY_STYLE: Record<
  TASK_PRIORITY,
  { cls: string; dot: string; label: string }
> = {
  [TASK_PRIORITY.LOW]: {
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    dot: "bg-slate-400",
    label: "Low",
  },
  [TASK_PRIORITY.MEDIUM]: {
    cls: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-400",
    label: "Medium",
  },
  [TASK_PRIORITY.HIGH]: {
    cls: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    dot: "bg-orange-500",
    label: "High",
  },
  [TASK_PRIORITY.URGENT]: {
    cls: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    dot: "bg-rose-500",
    label: "Urgent",
  },
};

function parseBackendDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  return new Date(dateStr + "Z");
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function computeTimerState(log: TaskTimeLog): {
  committedSeconds: number;
  segmentStartedAt: string | null;
  displaySeconds: number;
} {
  let committedSeconds = 0;
  let segmentStartedAt: string | null = null;

  for (const seg of log.segments) {
    if (seg.pausedAt) {
      if (seg.durationSeconds && seg.durationSeconds > 0) {
        committedSeconds += seg.durationSeconds;
      } else {
        const start = parseBackendDate(seg.startedAt).getTime();
        const end = parseBackendDate(seg.pausedAt).getTime();
        committedSeconds += Math.max(0, Math.floor((end - start) / 1000));
      }
    } else {
      segmentStartedAt = seg.startedAt;
    }
  }

  const liveSeconds = segmentStartedAt
    ? Math.floor(
        (Date.now() - parseBackendDate(segmentStartedAt).getTime()) / 1000,
      )
    : 0;

  return {
    committedSeconds,
    segmentStartedAt,
    displaySeconds: committedSeconds + Math.max(0, liveSeconds),
  };
}

function CategoryBadge({
  color,
  icon,
  name,
}: {
  color: ColorOption;
  icon: string;
  name: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}
    >
      <span>{icon}</span>
      {name}
    </span>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse border-b border-gray-50 dark:border-gray-700">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div
            className={`h-4 bg-gray-100 dark:bg-gray-700 rounded-lg ${i === 1 ? "w-full" : "w-2/3"}`}
          />
        </td>
      ))}
    </tr>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
      {(["list", "board"] as ViewMode[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            view === v
              ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          {v === "list" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="1" y="6.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="1" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="5.25" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="9.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          )}
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  );
}

interface BoardCardProps {
  task: TaskItem;
  canEdit: boolean;
  canRemark: boolean;
  canDelete: boolean;
  canViewTimer: boolean;
  canStartTimer: boolean;
  canPauseTimer: boolean;
  canResumeTimer: boolean;
  canStopTimer: boolean;
  deleting: boolean;
  taskTimerMap: Map<string, TaskTimerEntry>;
  activeTimerTaskId: string | null;
  liveElapsedSeconds: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, task: TaskItem) => void;
  onRemark: (task: TaskItem) => void;
  onTimer: (task: TaskItem) => void;
  onStop: (task: TaskItem) => void;
}

function BoardCard({
  task,
  canEdit,
  canRemark,
  canDelete,
  canViewTimer,
  canStartTimer,
  canPauseTimer,
  canResumeTimer,
  canStopTimer,
  deleting,
  taskTimerMap,
  activeTimerTaskId,
  liveElapsedSeconds,
  onEdit,
  onDelete,
  onDragStart,
  onRemark,
  onTimer,
  onStop,
}: BoardCardProps) {
  const pri = PRIORITY_STYLE[task.priority];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const router = useRouter();
  const statusColor = getColorOption(task.status.color);

  const entry = taskTimerMap.get(task.id);

  const isRunning = entry?.status === "running" && activeTimerTaskId === task.id;
  const isPaused = entry?.status === "paused";
  const isStopped = entry?.status === "stopped";
  const hasTimer = isRunning || isPaused || isStopped;
  const isFinalStatus = task.status?.isFinal === true;
  const canTimer = canStartTimer || canPauseTimer || canResumeTimer || canStopTimer;

  const displaySeconds = isRunning
    ? liveElapsedSeconds
    : (entry?.displaySeconds ?? 0);



  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => router.push(`/task/detail/${task.id}`)}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all group select-none"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pri.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
          {pri.label}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canRemark && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemark(task); }}
              className="p-1 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
            >
              <MdOutlineMessage className="text-sm" />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(task.id); }}
              className="p-1 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
            >
              <MdEdit className="text-sm" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition disabled:opacity-50"
            >
              <MdDelete className="text-sm" />
            </button>
          )}
        </div>
      </div>

      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-2 line-clamp-3">
        {task.title}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-2">
        {task.description ?? ""}
      </p>

      <div className="flex items-center justify-between">
        <div className="mb-2 flex items-center">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 line-clamp-1 rounded-full text-xs font-semibold ${statusColor.bg} ${statusColor.text}`}>
            <span>{task.status?.icon ?? "📌"}</span>
            {task.status?.name ?? task.statusName ?? "—"}
          </span>
        </div>
        {task.category && (
          <div className="mb-2">
            <CategoryBadge
              color={getColorOption(task.category.color || null)}
              icon={task.category.icon || "❓"}
              name={task.category.name}
            />
          </div>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              #{tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-400">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2.5 border-t border-gray-50 dark:border-gray-700 mt-1">
        <div className="flex -space-x-1.5">
          {task.assignedTo.length === 0 ? (
            <span className="text-[10px] italic text-gray-300 dark:text-gray-600">Unassigned </span>
          ) : (
            <>
              {task.assignedTo.slice(0, 2).map((u) => (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/users/${u.id}`); }}
                  key={u.id}
                  title={u.firstName}
                  className="px-2 h-6 rounded-full bg-linear-to-br cursor-pointer hover:scale-105 from-blue-400 to-indigo-600 border-2 border-white dark:border-gray-800 flex items-center justify-center capitalize text-white text-[8px] font-bold shrink-0"
                >
                  {u.firstName} {u?.lastName}
                </button>
              ))}
              {task.assignedTo.length > 2 && (
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[8px] font-bold text-gray-500 shrink-0">
                  +{task.assignedTo.length - 2}
                </div>
              )}
            </>
          )}
        </div>
        {task.dueDate && (
          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${isOverdue ? "text-rose-500" : "text-gray-400 dark:text-gray-500"}`}>
            {isOverdue && "⚠️"}
            {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5 w-full justify-end mt-2">
        {task.rating && (
          <div className="flex items-center gap-0.5 text-yellow-500 text-xs font-bold">
            <Star size={12} fill="currentColor" />
            &nbsp;
            <span>{task.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

    <div className={` mt-2 pt-2  ${entry && "border-gray-100 border-t dark:border-gray-700"}  `}>
        {isFinalStatus ? (
          hasTimer && canViewTimer ? (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-300 dark:bg-gray-500" />
              <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                {formatSeconds(displaySeconds)}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                TOTAL
              </span>
            </div>
          ) : null
        ) : isStopped ? (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-400 dark:bg-gray-500" />
            <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300 tabular-nums">
              {formatSeconds(displaySeconds)}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              LOGGED ✓
            </span>
          </div>
        ) : hasTimer ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-xs font-mono font-bold text-gray-800 dark:text-white tabular-nums">
                {formatSeconds(displaySeconds)}
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                isRunning
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              }`}>
                {isRunning ? "LIVE" : "PAUSED"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isRunning && canPauseTimer && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onTimer(task); }}
                  title="Pause timer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
                    <rect x="6" y="1" width="2.5" height="8" rx="0.5" />
                  </svg>
                  Pause
                </button>
              )}
              {isPaused && canResumeTimer && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onTimer(task); }}
                  title="Resume timer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
                  </svg>
                  Resume
                </button>
              )}
              {canStopTimer && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onStop(task); }}
                  title="Stop timer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <rect x="1" y="1" width="8" height="8" rx="1" />
                  </svg>
                  Stop
                </button>
              )}
            </div>
          </div>
        ) : (
          canStartTimer && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTimer(task); }}
              title="Start timer"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20 border border-dashed border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
              </svg>
              Start Timer 
            </button>
          )
        )}
      </div>
    </div>
  );
}

interface CategoryBoardProps {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  tasks: TaskItem[];
  statuses: StatusOption[];
  canEdit: boolean;
  canRemark: boolean;
  canDelete: boolean;
  canViewTimer: boolean;
  canStartTimer: boolean;
  canPauseTimer: boolean;
  canResumeTimer: boolean;
  canStopTimer: boolean;
  canChangeStatus: boolean;
  canMarkFinal: boolean;
  deleting: boolean;
  taskTimerMap: Map<string, TaskTimerEntry>;
  activeTimerTaskId: string | null;
  liveElapsedSeconds: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (taskId: string, payload: FinalStatusPayload) => Promise<void>;
  onRemark: (task: TaskItem) => void;
  onTimer: (task: TaskItem) => void;
  onStop: (task: TaskItem) => void;
}

function CategoryBoard({
  categoryId,
  categoryName,
  categoryColor,
  categoryIcon,
  tasks,
  statuses,
  canEdit,
  canRemark,
  canDelete,
  canViewTimer,
  canStartTimer,
  canPauseTimer,
  canResumeTimer,
  canStopTimer,
  canChangeStatus,
  canMarkFinal,
  deleting,
  taskTimerMap,
  activeTimerTaskId,
  liveElapsedSeconds,
  onEdit,
  onDelete,
  onStatusChange,
  onRemark,
  onTimer,
  onStop,
}: CategoryBoardProps) {
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
  const dragTaskRef = useRef<TaskItem | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);

  const handleDragStart = (e: React.DragEvent, task: TaskItem) => {
    dragTaskRef.current = task;
    e.dataTransfer.effectAllowed = "move";
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => { el.style.opacity = "0.5"; }, 0);
    e.currentTarget.addEventListener("dragend", () => { el.style.opacity = "1"; }, { once: true });
  };

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatusId(statusId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatusId(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    setDragOverStatusId(null);
    const task = dragTaskRef.current;
    dragTaskRef.current = null;
    if (!task || task.status.id === targetStatusId) return;
    const targetStatus = statuses.find((s) => s.id === targetStatusId);
    if (!targetStatus) return;
    if (targetStatus.isFinal) {
      if (!canMarkFinal) { toast.error("You don't have permission to mark tasks as final."); return; }
      setPendingDrop({ task, targetStatus, categoryId });
      return;
    }
    if (!canChangeStatus) { toast.error("No permission to change status."); return; }
    onStatusChange(task.id, { status: targetStatusId, category: categoryId });
  };

  const handleFinalConfirm = async (payload: MarkFinalPayload) => {
    if (!pendingDrop) return;
    const { task, targetStatus } = pendingDrop;
    setPendingDrop(null);
    await onStatusChange(task.id, {
      status: targetStatus.id,
      category: categoryId,
      remark: payload.remark,
      rating: payload.feedbackStars,
      actual_hours: payload.actualHours,
      actual_days: payload.actualDays,
    });
  };

  return (
    <>
      <div className="mb-8 max-h-130 overflow-y-scroll">
        <div
          className="flex items-center gap-3 mb-4 pb-3 border-b-2 sticky top-0 bg-white dark:bg-slate-700"
          style={{ borderColor: categoryColor + "40" }}
        >
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm"
            style={{ backgroundColor: categoryColor + "20", border: `1.5px solid ${categoryColor}40` }}
          >
            {categoryIcon}
          </span>
          <div className="flex items-center gap-3 flex-1">
            <h2 className="text-base font-extrabold text-gray-800 dark:text-white tracking-tight">
              {categoryName}
            </h2>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: categoryColor + "18", color: categoryColor }}
            >
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {statuses.map((s) => {
              const sc = getColorOption(s.color);
              return (
                <span
                  key={s.id}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.text}`}
                  style={{ backgroundColor: s.color ? `${s.color}15` : "#f1f5f9", borderColor: s.color ? `${s.color}30` : "#e2e8f0" }}
                >
                  {s.icon} {tasks.filter((t) => t.status.id === s.id).length}
                  {s.isFinal && " ✓"}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-3" onDragLeave={handleDragLeave}>
          {statuses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
              <span className="text-3xl mb-2">🗂️</span>
              <p className="text-sm font-semibold">No statuses for this category</p>
            </div>
          ) : (
            statuses.map((status) => {
              const columnTasks = tasks.filter((t) => t.status.id === status.id);
              const isDragOver = dragOverStatusId === status.id;
              const isFinal = status.isFinal;
              return (
                <div
                  key={status.id}
                  className={`flex flex-col rounded-2xl border-2 transition-all min-w-[260px] max-w-[300px] flex-shrink-0 ${
                    isDragOver
                      ? "border-blue-400 bg-blue-50/60 dark:bg-blue-900/20"
                      : isFinal
                        ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10"
                        : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                  }`}
                  onDragOver={(e) => handleDragOver(e, status.id)}
                  onDrop={(e) => handleDrop(e, status.id)}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 shrink-0" style={{ backgroundColor: status.color ?? "#94a3b8" }} />
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {status.icon && <span className="mr-1">{status.icon}</span>}
                        {status.name}
                      </span>
                      {isFinal && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800 ml-1">
                          FINAL
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-full px-2 py-0.5 min-w-[22px] text-center">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className={`flex-1 p-2.5 space-y-2 overflow-y-auto min-h-[100px] transition-colors ${isDragOver ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}`}>
                    {columnTasks.length === 0 ? (
                      <div className={`flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed transition-colors ${isDragOver ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-600"}`}>
                        <span className="text-xl mb-1 opacity-40">📋</span>
                        <p className="text-[10px] text-gray-400 font-medium">{isDragOver ? "Drop here" : "No tasks"}</p>
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <BoardCard
                          key={task.id}
                          task={task}
                          canEdit={canEdit}
                          canRemark={canRemark}
                          canDelete={canDelete}
                          canViewTimer={canViewTimer}
                          canStartTimer={canStartTimer}
                          canPauseTimer={canPauseTimer}
                          canResumeTimer={canResumeTimer}
                          canStopTimer={canStopTimer}
                          deleting={deleting}
                          taskTimerMap={taskTimerMap}
                          activeTimerTaskId={activeTimerTaskId}
                          liveElapsedSeconds={liveElapsedSeconds}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onDragStart={handleDragStart}
                          onRemark={onRemark}
                          onTimer={onTimer}
                          onStop={onStop}
                        />
                      ))
                    )}
                    {columnTasks.length > 0 && isDragOver && (
                      <div className="flex items-center justify-center py-3 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-600 bg-blue-50/60 dark:bg-blue-900/20">
                        <p className="text-xs text-blue-500 font-semibold">Drop here</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {pendingDrop && (
        <MarkFinalModal
          taskTitle={pendingDrop.task.title}
          statusName={pendingDrop.targetStatus.name}
          statusColor={pendingDrop.targetStatus.color ?? "#22c55e"}
          onConfirm={handleFinalConfirm}
          onCancel={() => setPendingDrop(null)}
        />
      )}
    </>
  );
}

interface BoardViewProps {
  tasks: TaskItem[];
  statusOptions: StatusOption[];
  canEdit: boolean;
  canRemark: boolean;
  canDelete: boolean;
  canViewTimer: boolean;
  canStartTimer: boolean;
  canPauseTimer: boolean;
  canResumeTimer: boolean;
  canStopTimer: boolean;
  canChangeStatus: boolean;
  canMarkFinal: boolean;
  deleting: boolean;
  isLoading: boolean;
  skeletonlength: number;
  taskTimerMap: Map<string, TaskTimerEntry>;
  activeTimerTaskId: string | null;
  liveElapsedSeconds: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (taskId: string, payload: FinalStatusPayload) => Promise<void>;
  onRemark: (task: TaskItem) => void;
  onTimer: (task: TaskItem) => void;
  onStop: (task: TaskItem) => void;
}

function BoardView({
  tasks,
  statusOptions,
  canEdit,
  canRemark,
  canDelete,
  canViewTimer,
  canStartTimer,
  canPauseTimer,
  canResumeTimer,
  canStopTimer,
  canChangeStatus,
  canMarkFinal,
  deleting,
  isLoading,
  skeletonlength,
  taskTimerMap,
  activeTimerTaskId,
  liveElapsedSeconds,
  onEdit,
  onDelete,
  onStatusChange,
  onRemark,
  onTimer,
  onStop,
}: BoardViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: skeletonlength }).map((_, gi) => (
          <div key={gi} className="animate-pulse">
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
            <div className="flex gap-4">
              {Array.from({ length: 3 }).map((_, ci) => (
                <div key={ci} className="min-w-[260px] bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-3 space-y-3">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  {Array.from({ length: 2 }).map((_, ti) => (
                    <div key={ti} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 space-y-2">
                      <div className="h-3 w-12 bg-gray-100 dark:bg-gray-700 rounded" />
                      <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const categoriesMap = new Map<string, { id: string; name: string; color: string; icon: string }>();
  tasks.forEach((task) => {
    if (task.category && !categoriesMap.has(task.category.id)) {
      categoriesMap.set(task.category.id, {
        id: task.category.id,
        name: task.category.name,
        color: task.category.color ?? "#6366f1",
        icon: task.category.icon ?? "📁",
      });
    }
  });
  const categories = Array.from(categoriesMap.values());

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-5xl mb-3">📭</span>
        <p className="text-sm font-semibold">No tasks to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {categories.map((cat) => {
        const catStatuses = statusOptions.filter(
          (s) => s.category?.id === cat.id || (s as any).category === cat.id,
        );
        const catTasks = tasks.filter((t) => t.category?.id === cat.id);
        return (
          <CategoryBoard
            key={cat.id}
            categoryId={cat.id}
            categoryName={cat.name}
            categoryColor={cat.color}
            categoryIcon={cat.icon}
            tasks={catTasks}
            statuses={catStatuses}
            canEdit={canEdit}
            canRemark={canRemark}
            canDelete={canDelete}
            canViewTimer={canViewTimer}
            canStartTimer={canStartTimer}
            canPauseTimer={canPauseTimer}
            canResumeTimer={canResumeTimer}
            canStopTimer={canStopTimer}
            canChangeStatus={canChangeStatus}
            canMarkFinal={canMarkFinal}
            deleting={deleting}
            taskTimerMap={taskTimerMap}
            activeTimerTaskId={activeTimerTaskId}
            liveElapsedSeconds={liveElapsedSeconds}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onRemark={onRemark}
            onTimer={onTimer}
            onStop={onStop}
          />
        );
      })}
    </div>
  );
}

interface CategoryMultiSelectProps {
  categories: CategoryItem[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function CategoryMultiSelect({ categories, selected, onChange }: CategoryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };

  const selectedCategories = categories.filter((c) => selected.includes(c.id));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition min-w-[160px] max-w-[240px]"
      >
        <span className="flex-1 text-left truncate">
          {selected.length === 0 ? (
            <span className="text-gray-400">All Categories</span>
          ) : selected.length === 1 ? (
            <span className="flex items-center gap-1.5">
              <span>{selectedCategories[0]?.icon}</span>
              <span className="truncate">{selectedCategories[0]?.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">{selected.length}</span>
              <span className="text-gray-600 dark:text-gray-300">categories</span>
            </span>
          )}
        </span>
        {selected.length > 0 ? (
          <span onClick={(e) => { e.stopPropagation(); onChange([]); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer text-xs ml-1">✕</span>
        ) : (
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {categories.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No categories found</p>
            ) : (
              categories.map((cat) => {
                const isSelected = selected.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggle(cat.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${isSelected ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"}`}
                  >
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300 dark:border-gray-500"}`}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="text-base shrink-0">{cat.icon ?? "📁"}</span>
                    <span className="truncate font-medium">{cat.name}</span>
                    {cat.color && <span className="w-2 h-2 rounded-full shrink-0 ml-auto" style={{ backgroundColor: cat.color }} />}
                  </button>
                );
              })
            )}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
              <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium transition-colors">
                Clear all ({selected.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TaskListPage = (): JSX.Element => {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [taskData, setTaskData] = useState<TaskItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const [remarkLoad, setRemarkLoad] = useState(false);
  const [remarkPopup, setRemarkPopup] = useState(false);
  const [selectedRemarkTask, setSelectedRemarkTask] = useState<TaskItem | null>(null);
  const [remarkPayload, setRemarkPayload] = useState<RemarkMessagePayload>({ taskId: "", content: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filtrCategory, setFiltrCategory] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>({ fromDate: "", toDate: "" });

  const [taskTimerMap, setTaskTimerMap] = useState<Map<string, TaskTimerEntry>>(new Map());
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const restoredRef = useRef(false);

  const canViewTimer = hasPermission(PERMISSIONS.taskTimerRead);
  const canStartTimer = hasPermission(PERMISSIONS.taskTimerStart);
  const canPauseTimer = hasPermission(PERMISSIONS.taskTimerPause);
  const canResumeTimer = hasPermission(PERMISSIONS.taskTimerResume);
  const canStopTimer = hasPermission(PERMISSIONS.taskTimerStop);

  const canCreate = hasPermission(PERMISSIONS.createTask);
  const canView = hasPermission(PERMISSIONS.readTask);
  const canEdit = hasPermission(PERMISSIONS.updateTask);
  const canRemark = hasPermission(PERMISSIONS.createRemark);
  const canDelete = hasPermission(PERMISSIONS.deleteTask);
  const canChangeStatus = hasPermission(PERMISSIONS.taskStatusChange);
  const canMarkFinal = hasPermission(PERMISSIONS.markFinal);
  const showActions = canEdit || canDelete || canView;

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (!activeTimerTaskId) return;
    const entry = taskTimerMap.get(activeTimerTaskId);
    if (!entry || entry.status !== "running" || !entry.segmentStartedAt) return;

    const segStartMs = parseBackendDate(entry.segmentStartedAt).getTime();
    setLiveElapsedSeconds(entry.committedSeconds + Math.floor((Date.now() - segStartMs) / 1000));

    timerIntervalRef.current = setInterval(() => {
      setLiveElapsedSeconds(entry.committedSeconds + Math.floor((Date.now() - segStartMs) / 1000));
    }, 1000);

    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [activeTimerTaskId, taskTimerMap]);

  const applyLog = useCallback((taskId: string, log: TaskTimeLog) => {
    const { committedSeconds, segmentStartedAt, displaySeconds } = computeTimerState(log);

    setTaskTimerMap((prev) => {
      const next = new Map(prev);
      if (log.status === "running") {
        next.set(taskId, { logId: log.id, status: "running", committedSeconds, segmentStartedAt, displaySeconds });
      } else if (log.status === "paused") {
        next.set(taskId, { logId: log.id, status: "paused", committedSeconds, segmentStartedAt: null, displaySeconds });
      } else {
        next.delete(taskId);
      }
      return next;
    });

    if (log.status === "running") {
      setActiveTimerTaskId(taskId);
      setLiveElapsedSeconds(displaySeconds);
    } else if (log.status === "paused" || log.status === "stopped") {
      setActiveTimerTaskId((prev) => (prev === taskId ? null : prev));
      if (log.status === "stopped") {
        setTaskTimerMap((prev) => {
          const next = new Map(prev);
          next.delete(taskId);
          return next;
        });
      }
    }
  }, []);

  const restoreActiveTimer = useCallback(async (tasks: TaskItem[]) => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const results = await Promise.allSettled(
      tasks.map((task) =>
        TimerService.getActiveTimer(task.id).then((res) => ({
          taskId: task.id,
          log: res.data?.data as TaskTimeLog | null | undefined,
        })),
      ),
    );

    const newMap = new Map<string, TaskTimerEntry>();
    let newActiveTaskId: string | null = null;
    let newLiveElapsed = 0;

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { taskId, log } = result.value;
      if (!log || log.status === "stopped") continue;

      const { committedSeconds, segmentStartedAt, displaySeconds } = computeTimerState(log);

      if (log.status === "running") {
        newMap.set(taskId, { logId: log.id, status: "running", committedSeconds, segmentStartedAt, displaySeconds });
        newActiveTaskId = taskId;
        newLiveElapsed = displaySeconds;
      } else if (log.status === "paused") {
        newMap.set(taskId, { logId: log.id, status: "paused", committedSeconds, segmentStartedAt: null, displaySeconds });
      }
    }

    if (newMap.size > 0) {
      setTaskTimerMap(newMap);
      setActiveTimerTaskId(newActiveTaskId);
      if (newActiveTaskId) setLiveElapsedSeconds(newLiveElapsed);
    }
  }, []);

  const handleTimer = async (task: TaskItem) => {
    try {
      const entry = taskTimerMap.get(task.id);
      const isThisRunning = activeTimerTaskId === task.id && entry?.status === "running";
      const isThisPaused = entry?.status === "paused";

      if (isThisRunning) {
        if (!canPauseTimer) { toast.error("You don't have permission to pause timers."); return; }
        const res = await TimerService.pause(entry!.logId);
        applyLog(task.id, res.data.data);
        return;
      }

      if (isThisPaused) {
        if (!canResumeTimer) { toast.error("You don't have permission to resume timers."); return; }
        if (activeTimerTaskId && activeTimerTaskId !== task.id) {
          toast.error("Please pause your current running timer first. You can only track one task timer at a time.");
          return;
        }
        const res = await TimerService.resume(entry!.logId);
        applyLog(task.id, res.data.data);
        return;
      }

      if (!canStartTimer) { toast.error("You don't have permission to start timers."); return; }
      if (activeTimerTaskId && activeTimerTaskId !== task.id) {
        toast.error("Please pause your current running timer first. You can only track one task timer at a time.");
        return;
      }

      const res = await TimerService.start(task.id);
      applyLog(task.id, res.data.data);
    } catch (error) {
      if (axios.isAxiosError(error))
        toast.error(error.response?.data?.message ?? "Timer action failed");
    }
  };

  const handleStop = async (task: TaskItem) => {
    if (!canStopTimer) { toast.error("You don't have permission to stop timers."); return; }
    const entry = taskTimerMap.get(task.id);
    if (!entry) return;

    try {
      const res = await TimerService.stop(entry.logId);
      const log: TaskTimeLog = res.data.data;
      const finalSeconds = log.totalSeconds ?? entry.displaySeconds;

      setTaskTimerMap((prev) => {
        const next = new Map(prev);
        next.set(task.id, { logId: entry.logId, status: "stopped", committedSeconds: finalSeconds, segmentStartedAt: null, displaySeconds: finalSeconds });
        return next;
      });

      if (activeTimerTaskId === task.id) {
        setActiveTimerTaskId(null);
        setLiveElapsedSeconds(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }

      toast.success(`Timer stopped — ${formatSeconds(finalSeconds)} logged`);

      setTimeout(() => {
        setTaskTimerMap((prev) => {
          const next = new Map(prev);
          if (next.get(task.id)?.status === "stopped") next.delete(task.id);
          return next;
        });
      }, STOP_DISPLAY_MS);
    } catch (error) {
      if (axios.isAxiosError(error))
        toast.error(error.response?.data?.message ?? "Failed to stop timer");
    }
  };

  const handleOpenRemark = (task: TaskItem) => {
    setSelectedRemarkTask(task);
    setRemarkPayload({ taskId: task.id, content: "" });
    setRemarkPopup(true);
  };

  const handleCloseRemark = () => {
    setRemarkPopup(false);
    setSelectedRemarkTask(null);
    setRemarkPayload({ taskId: "", content: "" });
  };

  const handleRemark = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRemarkPayload((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddRemark = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setRemarkLoad(true);
    try {
      const result = await RemarkService.create(remarkPayload);
      if (result.status === 201) { handleCloseRemark(); toast.success("Remark created successfully"); }
    } catch (error) {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.message ?? "Something went wrong");
    } finally {
      setRemarkLoad(false);
    }
  };

  const fetchTaskAll = useCallback(async () => {
    try {
      const res = await TaskService.getAll({
        currentPage,
        pageLimit: viewMode === "board" ? 500 : pageLimit,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        category: filtrCategory.length > 0 ? filtrCategory.join(",") : undefined,
        search: search || undefined,
        user: filterAssigned || undefined,
        fromDate: dateFilter.fromDate || undefined,
        toDate: dateFilter.toDate || undefined,
      });
      if (res.status === 200) {
        const d = res.data?.data || {};
        const tasks: TaskItem[] = d.data ?? [];
        setTaskData(tasks);
        setTotalCount(tasks.length);
        if (!restoredRef.current && tasks.length > 0) restoreActiveTimer(tasks);
      }
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      if (axios.isAxiosError(e)) toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageLimit, viewMode, filterStatus, filterPriority, filtrCategory, search, filterAssigned, dateFilter, restoreActiveTimer]);

  const fetchTasks = useCallback(
    (silent = false) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (silent) {
        debounceRef.current = setTimeout(fetchTaskAll, 3000);
      } else {
        setIsLoading(true);
        fetchTaskAll();
      }
    },
    [fetchTaskAll],
  );

  const fetchStatuses = async () => {
    try {
      const res = await StatusService.getAll({ currentPage: 1, pageLimit: 100, search: "" });
      if (res.status === 200) setStatusOptions(res.data.data.data ?? []);
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await CategoryService.getAll({ currentPage: 1, pageLimit: 100, search: "" });
      if (res.status === 200) setCategories(res.data.data.data ?? []);
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
    }
  };

  useEffect(() => { setCurrentPage(1); }, [filterAssigned]);
  useEffect(() => { fetchStatuses(); fetchCategories(); }, []);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, payload: FinalStatusPayload): Promise<void> => {
    const previousData = taskData;
    setTaskData((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const matchedStatus = statusOptions.find((s) => s.id === payload.status);
        return { ...t, status: matchedStatus ? { ...t.status, ...matchedStatus } : { ...t.status, id: payload.status } };
      }),
    );
    try {
      const res = await TaskService.updateStatus(taskId, payload);
      if (res.status === 200) fetchTasks(true);
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      setTaskData(previousData);
      if (axios.isAxiosError(e)) toast.error(e.response?.data?.message ?? "Failed to update status");
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    setDeleting(true);
    try {
      const confirmed = await ConfirmPopup({ title: "Delete Task?", text: "This cannot be undone.", btnTxt: "Yes, Delete" });
      if (confirmed) {
        const res = await TaskService.delete(id);
        if (res.status === 200) { toast.success("Task deleted successfully"); await fetchTasks(); }
      }
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      if (axios.isAxiosError(e)) toast.error(e.response?.data?.message ?? "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const handleSearch = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(val); setCurrentPage(1); }, 300);
  };

  const colCount = showActions ? 8 : 7;
  const hasFilters = !!(search || filterStatus || filterPriority || filterAssigned || filtrCategory.length > 0);

  return (
    <>
      {remarkPopup && (
        <>
          <BlurryBackground />
          <CreateRemarkPopup
            remarkPayload={remarkPayload}
            task={selectedRemarkTask}
            onChange={handleRemark}
            onCancel={handleCloseRemark}
            handleAddRemark={handleAddRemark}
            remarkLoad={remarkLoad}
          />
        </>
      )}

      <div className="ml-72 mt-14">
        <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-2xl">📋</span>
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">All Tasks</h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">View, filter, and manage all project tasks.</p>
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={() => router.push("/task/create")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-bold shadow-md shadow-blue-200 dark:shadow-blue-900/40 transition-all"
              >
                <span>＋</span> New Task
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-4 mb-7">
            {[
              { label: "Total Tasks", value: totalCount, icon: "📋", bg: "bg-blue-50 border-blue-100", priority: "" },
              { label: "High", value: taskData.filter((t) => t.priority === TASK_PRIORITY.HIGH).length, icon: "🟠", bg: "bg-orange-50 border-orange-100", priority: TASK_PRIORITY.HIGH },
              { label: "Urgent", value: taskData.filter((t) => t.priority === TASK_PRIORITY.URGENT).length, icon: "🔴", bg: "bg-rose-50 border-rose-100", priority: TASK_PRIORITY.URGENT },
              { label: "This Page", value: taskData.length, icon: "📄", bg: "bg-emerald-50 border-emerald-100", priority: "" },
            ].map((s) => (
              <div
                key={s.label}
                onClick={() => { if (s.priority) { setFilterPriority(s.priority === filterPriority ? "" : s.priority); setCurrentPage(1); } }}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${s.bg} ${s.priority ? "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]" : "cursor-default"} ${s.priority && filterPriority === s.priority ? "ring-2 ring-offset-1 ring-blue-400 shadow-md" : ""}`}
              >
                <span className="text-xl">{s.icon}</span>
                <div>
                  <div className="text-xl font-extrabold text-gray-900 dark:text-black">{s.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                    {s.label}
                    {s.priority && filterPriority === s.priority && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">active</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 mb-5">
            <div className="relative min-w-[100px] max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search tasks…"
                className="pl-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
              />
            </div>
            <select
              value={filterPriority}
              onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            >
              <option value="">All Priorities</option>
              {Object.values(TASK_PRIORITY).map((p) => (
                <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
              ))}
            </select>
            <CategoryMultiSelect categories={categories} selected={filtrCategory} onChange={(val) => { setFiltrCategory(val); setCurrentPage(1); }} />
            <UserSelect
              mode="single"
              value={filterAssigned}
              onChange={setFilterAssigned}
              placeholder="Search assignee…"
              cls="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
            <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter} />
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSearch(""); setFilterStatus(""); setFilterPriority(""); setCurrentPage(1); setFilterAssigned(""); setFiltrCategory([]); setDateFilter({ fromDate: "", toDate: "" }); }}
                className="ml-auto px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5"
              >
                <span>✕</span> Clear
              </button>
            )}
            <div className="w-px h-7 bg-gray-200 dark:bg-gray-600 ml-auto" />
            <ViewToggle view={viewMode} onChange={(v) => { setViewMode(v); setCurrentPage(1); }} />
          </div>

          {viewMode === "board" && (
            <BoardView
              tasks={taskData}
              statusOptions={statusOptions}
              canEdit={canEdit}
              canRemark={canRemark}
              canDelete={canDelete}
              canViewTimer={canViewTimer}
              canStartTimer={canStartTimer}
              canPauseTimer={canPauseTimer}
              canResumeTimer={canResumeTimer}
              canStopTimer={canStopTimer}
              canChangeStatus={canChangeStatus}
              canMarkFinal={canMarkFinal}
              deleting={deleting}
              isLoading={isLoading}
              skeletonlength={categories.length}
              taskTimerMap={taskTimerMap}
              activeTimerTaskId={activeTimerTaskId}
              liveElapsedSeconds={liveElapsedSeconds}
              onEdit={(id) => router.push(`/task/update/${id}`)}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onRemark={handleOpenRemark}
              onTimer={handleTimer}
              onStop={handleStop}
            />
          )}

          {viewMode === "list" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="text-nowrap overflow-x-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                      {[
                        { label: "#", cls: "w-12" },
                        { label: "Title", cls: "" },
                        { label: "Category", cls: "w-36" },
                        { label: "Status", cls: "w-36" },
                        { label: "Priority", cls: "w-28" },
                        { label: "Assigned", cls: "w-28" },
                        { label: "Created By", cls: "w-28" },
                        { label: "Due Date", cls: "w-28" },
                        ...(showActions ? [{ label: "Actions", cls: "w-28 text-right" }] : []),
                      ].map((col) => (
                        <th key={col.label} className={`px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left ${col.cls}`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={colCount} />)
                    ) : taskData.length === 0 ? (
                      <tr>
                        <td colSpan={colCount} className="text-center py-20 text-gray-400 dark:text-gray-500">
                          <div className="text-5xl mb-3">📭</div>
                          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No tasks found</p>
                          {hasFilters && <p className="text-xs text-gray-400 mt-1">Try clearing your filters</p>}
                          {canCreate && !hasFilters && (
                            <button type="button" onClick={() => router.push("/task/create")} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 transition">
                              + Create first task
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      taskData.map((task, i) => {
                        const pri = PRIORITY_STYLE[task.priority];
                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                        return (
                          <tr key={task.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors group">
                            <td className="px-5 py-4 text-xs font-mono text-gray-400 dark:text-gray-500">
                              {String((currentPage - 1) * pageLimit + i + 1).padStart(2, "0")}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-gray-900 dark:text-white text-sm truncate max-w-xs">{task.title}</div>
                              {task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {task.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">#{tag}</span>
                                  ))}
                                  {task.tags.length > 3 && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-400">+{task.tags.length - 3}</span>}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <CategoryBadge color={getColorOption(task.category.color || null)} icon={task.category.icon || "❓"} name={task.category.name} />
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge color={getColorOption(task.status.color)} icon={task.status.icon || "⚡"} name={task.status.name} />
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${pri.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
                                {pri.label}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {task.assignedTo.length === 0 ? (
                                <span className="text-xs italic text-gray-300 dark:text-gray-600">Unassigned</span>
                              ) : (
                                <div className="flex -space-x-2">
                                  {task.assignedTo.slice(0, 2).map((u) => (
                                    <div key={u.id} title={u.firstName} className="ps-1 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 border-2 border-white dark:border-gray-800 flex items-center px-2 py-1 capitalize justify-center text-white text-[12px] font-bold shrink-0">
                                      {u.firstName} {u?.lastName ?? ""}
                                    </div>
                                  ))}
                                  {task.assignedTo.length > 2 && (
                                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">
                                      +{task.assignedTo.length - 2}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{task.createdBy?.firstName} {task.createdBy?.lastName}</p>
                            </td>
                            <td className="px-5 py-4">
                              {task.dueDate ? (
                                <span className={`text-xs font-semibold ${isOverdue ? "text-rose-500" : "text-gray-600 dark:text-gray-300"}`}>
                                  {isOverdue && <span className="mr-1">⚠️</span>}
                                  {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                              ) : (
                                <span className="text-xs italic text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            {showActions && (
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  {canView && (
                                    <button type="button" onClick={() => router.push(`/task/detail/${task.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 transition">
                                      <BsTicketDetailed className="text-sm" />
                                    </button>
                                  )}
                                  {canView && (
                                    <button type="button" onClick={() => router.push(`/task/view/${task.id}?userid=${task.assignedTo[0]?.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 transition">
                                      <IoMdEye className="text-sm" />
                                    </button>
                                  )}
                                  {canEdit && (
                                    <button type="button" onClick={() => router.push(`/task/update/${task.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 transition">
                                      <MdEdit className="text-sm" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button type="button" disabled={deleting} onClick={() => handleDelete(task.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 transition disabled:opacity-50">
                                      <MdDelete className="text-sm" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Showing page <span className="font-semibold text-gray-600 dark:text-gray-300">{currentPage}</span> of <span className="font-semibold text-gray-600 dark:text-gray-300">{totalCount}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={currentPage <= 1 || isLoading} onClick={() => setCurrentPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    ← Prev
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-1">{currentPage}</span>
                  <button type="button" disabled={currentPage >= totalCount || isLoading} onClick={() => setCurrentPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TaskListPage;