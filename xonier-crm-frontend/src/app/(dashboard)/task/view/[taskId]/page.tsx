"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import api from "@/src/lib/axios";
import Link from "next/link";
import { getColorOption, StatusBadge } from "@/src/components/pages/task/createStatusModal";
import { PERMISSIONS } from "@/src/constants/enum";
import { usePermissions } from "@/src/hooks/usePermissions";
import { TaskActivity } from "@/src/types/task/task.types";
import { ChevronRight } from "lucide-react";
import { TASK_ACTIVITY_ACTION } from "@/src/constants/enum";
import { useSelector } from "react-redux";

type Raw = Record<string, unknown>;

interface AssignedUser {
  id: string;
  firstName: string;
  lastName?: string;

  email?: string;
}

interface TaskStatus {
  id: string;
  name: string;
  color: string;
  icon?: string;
  order?: number;
  isFinal?: boolean;
}

interface TaskCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface Task {
  id: string;
  task_id: string;
  title: string;
  description?: string;
  priority: string;
  status: TaskStatus;
  category: TaskCategory;
  assignedTo: AssignedUser[];
  dueDate?: string;
  completedAt?: string;
  tags?: string[];
  order?: number;
  estimatedHours?: number;
  isRecurring?: boolean;
  recurrenceType?: string;
  isOverdue?: boolean;
  createdAt: string;
  createdBy?: Raw;
  activities: TaskActivity;
}

interface KanbanColumn {
  status: TaskStatus;
  tasks: Task[];
  count: number;
}

interface KanbanBoard {
  category: TaskCategory;
  columns: KanbanColumn[];
  totalStatuses: number;
}

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  low: { label: "Low", color: "#64748b", bg: "rgba(100,116,139,0.1)" },
  medium: { label: "Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  high: { label: "High", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  urgent: { label: "Urgent", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  LOW: { label: "Low", color: "#64748b", bg: "rgba(100,116,139,0.1)" },
  MEDIUM: { label: "Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  HIGH: { label: "High", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  URGENT: { label: "Urgent", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

function pickId(obj: Raw): string {
  return ((obj.id ?? obj._id) as string) || "";
}

function normalizeStatus(raw: Raw): TaskStatus {
  return {
    id: pickId(raw),
    name: (raw.name ?? "") as string,
    color: (raw.color ?? "#94a3b8") as string,
    icon: (raw.icon ?? "") as string,
    order: (raw.order ?? 0) as number,
    isFinal: (raw.isFinal ?? false) as boolean,
  };
}

function normalizeCategory(raw: Raw): TaskCategory {
  return {
    id: pickId(raw),
    name: (raw.name ?? "") as string,
    icon: (raw.icon ?? "") as string,
    color: (raw.color ?? "") as string,
  };
}

function normalizeAssignedTo(arr: unknown[]): AssignedUser[] {
  return (arr ?? [])
    .map((u) => {
      if (!u) return null;

      const obj = u as Raw;

      return {
        id: pickId(obj),
        firstName: (obj.firstName ?? "") as string,   // ✅ FIX
        lastName: (obj.lastName ?? "") as string,
        email: obj.email as string | undefined,
      };
    })
    .filter(Boolean) as AssignedUser[];
}

function normalizeTask(raw: Raw, colStatus: TaskStatus): Task {
  return {
    id: pickId(raw),
    task_id: (raw.task_id ?? raw.taskId ?? "") as string,
    title: (raw.title ?? "Untitled") as string,
    description: raw.description as string | undefined,
    priority: ((raw.priority ?? "medium") as string).toLowerCase(),
    status: colStatus,
    category: normalizeCategory((raw.category ?? {}) as Raw),
    assignedTo: normalizeAssignedTo((raw.assignedTo ?? []) as unknown[]),
    dueDate: raw.dueDate as string | undefined,
    completedAt: raw.completedAt as string | undefined,
    tags: (raw.tags ?? []) as string[],
    order: (raw.order ?? 0) as number,
    estimatedHours: raw.estimatedHours as number | undefined,
    isRecurring: (raw.isRecurring ?? false) as boolean,
    recurrenceType: raw.recurrenceType as string | undefined,
    isOverdue: (raw.isOverdue ?? false) as boolean,
    createdAt: (raw.createdAt ?? "") as string,
    createdBy: raw.createdBy as Raw | undefined,
    activities: raw.activities as TaskActivity,
  };
}

function normalizeFocusedTask(raw: Raw): Task {
  const statusRaw = (raw.status ?? {}) as Raw;
  return {
    id: pickId(raw),
    task_id: (raw.task_id ?? "") as string,
    title: (raw.title ?? "") as string,
    description: raw.description as string | undefined,
    priority: ((raw.priority ?? "medium") as string).toLowerCase(),
    status: normalizeStatus(statusRaw),
    category: normalizeCategory((raw.category ?? {}) as Raw),
    assignedTo: normalizeAssignedTo((raw.assignedTo ?? []) as unknown[]),
    dueDate: raw.dueDate as string | undefined,
    completedAt: raw.completedAt as string | undefined,
    tags: (raw.tags ?? []) as string[],
    order: (raw.order ?? 0) as number,
    estimatedHours: raw.estimatedHours as number | undefined,
    isRecurring: (raw.isRecurring ?? false) as boolean,
    recurrenceType: raw.recurrenceType as string | undefined,
    isOverdue: (raw.isOverdue ?? false) as boolean,
    createdAt: (raw.createdAt ?? "") as string,
    createdBy: raw.createdBy as Raw | undefined,
    activities: raw.activities as TaskActivity,
  };
}

function normalizeBoard(raw: Raw): KanbanBoard {
  const category = normalizeCategory((raw.category ?? {}) as Raw);
  const columns: KanbanColumn[] = ((raw.columns ?? []) as Raw[]).map((col) => {
    const status = normalizeStatus((col.status ?? {}) as Raw);
    const tasks = ((col.tasks ?? []) as Raw[]).map((t) =>
      normalizeTask(t, status),
    );
    return { status, tasks, count: tasks.length };
  });
  return { category, columns, totalStatuses: columns.length };
}

const apiFetchTask = (id: string) => api.get(`/task/${id}`);
const apiFetchKanban = (catId: string) => api.get(`/task/kanban/${catId}`);
const apiMoveTask = (
  id: string,
  statusId: string,
  categoryId: string,
  order: number,
) =>
  api.patch(`/task/move/${id}`, {
    status: statusId,
    category: categoryId,
    order,
  });

function Avatar({ link, name, title }: { link: string, name?: string; title?: string }) {
  const safeName = name || "U";

  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
  ];

  const color = colors[(safeName.charCodeAt(0) || 0) % colors.length];

  return (
    <Link href={link}
      title={title ?? safeName}
      style={{ backgroundColor: color }}
      className="px-2 py-1 rounded-full flex items-center hover:scale-105 justify-center capitalize text-white text-[9px] font-bold"
    >
      {safeName}
    </Link>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}

function TaskCard({
  task,
  isDragging,
  isHighlighted,
  onDragStart,
  onDragEnd,
  canStatusChange,
}: {
  task: Task;
  isDragging: boolean;
  isHighlighted: boolean;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragEnd: (e: React.DragEvent) => void;
  canStatusChange: boolean;
}) {
  const isOverdue =
    task.isOverdue ||
    (task.dueDate && !task.completedAt && new Date(task.dueDate) < new Date());
  const router = useRouter();
  return (
    <div
      draggable={canStatusChange}
      onDragStart={(e) => {
        if (!canStatusChange) return;
          onDragStart(e, task)
        }
      }
      onDragEnd={onDragEnd}
      onClick={() => { router.push(`/task/detail/${task.id}`) }}
      style={{ opacity: isDragging ? 0.35 : 1 }}
      className={[
        "group relative bg-white dark:bg-gray-800 rounded-xl p-3.5 select-none",
        "transition-all duration-150",
        canStatusChange
          ? "cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5"
          : "cursor-not-allowed opacity-60",
        isHighlighted
          ? "border-2 border-indigo-400 dark:border-indigo-500 shadow-md shadow-indigo-100 dark:shadow-indigo-900/30 ring-1 ring-indigo-200 dark:ring-indigo-700"
          : "border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600",
      ].join(" ")}
    >
      {isHighlighted && (
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 rounded-full ring-2 ring-white dark:ring-gray-800 flex items-center justify-center z-10">
          <span className="text-white text-[7px] font-black">★</span>
        </div>
      )}

      {isOverdue && !task.completedAt && (
        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-rose-400 to-red-500" />
      )}

      <div className="flex items-center justify-between mb-2">
        <PriorityBadge priority={task.priority} />
        <span className="text-[9px] font-mono text-gray-300 dark:text-gray-600 truncate max-w-[80px]">
          {task.task_id}
        </span>
      </div>

      <p className="text-sm font-semibold text-gray-800 dark:text-white leading-snug line-clamp-2 mb-2.5">
        {task.title}
      </p>

      {task.description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 mb-2">
          {task.description}
        </p>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-600"
            >
              #{tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] text-gray-400 bg-gray-50 dark:bg-gray-700">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2.5 border-t border-gray-50 dark:border-gray-700/50">
        <div className="flex -space-x-1.5">
          {task.assignedTo.length === 0 ? (
            <span className="text-[10px] text-gray-300 dark:text-gray-600 italic">
              Unassigned
            </span>
          ) : (
            <>
              {task?.assignedTo?.slice(0, 3).map((u) => {


                return (
                  <Avatar link={`/users/${u.id}`} key={u.id} name={`${u?.firstName} ${u?.lastName ?? ""}`} title={`${u?.firstName} ${u?.lastName ?? ""}`} />)
              })}
              {task.assignedTo.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[8px] font-bold text-gray-500">
                  +{task.assignedTo.length - 3}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {task.completedAt && (
            <span className="text-[10px] font-bold text-emerald-500">
              ✓ Done
            </span>
          )}
          {isOverdue && !task.completedAt && (
            <span className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 px-1.5 py-0.5 rounded">
              ⚠ Late
            </span>
          )}
          {task.dueDate && !isOverdue && !task.completedAt && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              {new Date(task.dueDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          )}
          {task.isRecurring && (
            <span
              className="text-[9px] text-indigo-400 dark:text-indigo-500"
              title={`Recurring: ${task.recurrenceType}`}
            >
              🔁
            </span>
          )}
        </div>
      </div>
      <div>
        {
          (task?.activities) &&
          // show latest activitie
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 w-full justify-end">
            <span className="text-gray-400 dark:text-gray-500 px-2 pt-4">
              {(task.activities.oldValue || task.activities.newValue) ? (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {task.activities.oldValue && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium line-through">
                      {task.activities.oldValue}
                    </span>
                  )}
                  {task.activities.oldValue && task.activities.newValue && (
                    <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
                  )}
                  {task.activities.newValue && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                      {task.activities.newValue}
                    </span>
                  )}
                  <span>by {task.activities.performedBy?.firstName}</span>
                </div>
              ) : (
                <span>
                  {task.activities.action.replace(/_/g, " ")} by {task.activities.performedBy?.firstName}
                </span>
              )}
            </span>
          </div>
        }
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  focusedTaskId,
  draggingTask,
  dragOverColId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDragLeave,
  canStatusChange,
}: {
  column: KanbanColumn;
  focusedTaskId: string;
  draggingTask: Task | null;
  dragOverColId: string | null;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent, statusId: string) => void;
  onDrop: (e: React.DragEvent, statusId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  canStatusChange: boolean;
}) {
  const { status, tasks } = column;
  const isOver = dragOverColId === status.id;

  return (
    <div
      className={[
        "flex flex-col rounded-2xl border-2 transition-all duration-150 w-72 shrink-0",
        isOver
          ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20"
          : "border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/30",
      ].join(" ")}
      onDragOver={(e) => onDragOver(e, status.id)}
      onDrop={(e) => onDrop(e, status.id)}
      onDragLeave={onDragLeave}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 rounded-t-2xl"
        style={{ borderTopColor: status.color, borderTopWidth: 3 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 shrink-0"
            style={{ backgroundColor: status.color || "#94a3b8" }}
          />
          <span className="text-sm font-bold text-gray-700 dark:text-white truncate">
            {status.icon && <span className="mr-1">{status.icon}</span>}
            {status.name}
          </span>
          {status.isFinal && (
            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-full shrink-0">
              FINAL
            </span>
          )}
        </div>
        <span
          className="text-xs font-black rounded-full px-2 py-0.5 min-w-[22px] text-center shrink-0 ml-2"
          style={{ backgroundColor: `${status.color}20`, color: status.color }}
        >
          {tasks.length}
        </span>
      </div>

      <div
        className={[
          "flex-1 p-3 space-y-2.5 overflow-y-auto min-h-[140px] max-h-[calc(100vh-380px)] transition-colors rounded-b-2xl",
          isOver ? "bg-indigo-50/30 dark:bg-indigo-900/10" : "",
        ].join(" ")}
      >
        {tasks.length === 0 ? (
          <div
            className={[
              "flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed transition-colors",
              isOver
                ? "border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                : "border-gray-200 dark:border-gray-600",
            ].join(" ")}
          >
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
              {isOver ? "Drop here" : "No tasks"}
            </p>
          </div>
        ) : (
          <>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isDragging={draggingTask?.id === task.id}
                isHighlighted={task.id === focusedTaskId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                canStatusChange={canStatusChange}
              />
            ))}
            {isOver &&
              draggingTask &&
              draggingTask.status?.id !== status.id && (
                <div className="flex items-center justify-center py-3 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-600 bg-indigo-50/60 dark:bg-indigo-900/20">
                  <p className="text-xs font-bold text-indigo-400 dark:text-indigo-500">
                    Drop here
                  </p>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 pb-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-72 shrink-0 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-3 space-y-3 animate-pulse"
        >
          <div className="flex justify-between items-center py-1">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-4 w-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
          {[1, 2, 3].slice(0, i % 2 === 0 ? 2 : 3).map((j) => (
            <div
              key={j}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 space-y-2"
            >
              <div className="flex justify-between">
                <div className="h-3 w-14 bg-gray-100 dark:bg-gray-700 rounded-full" />
                <div className="h-3 w-10 bg-gray-100 dark:bg-gray-700 rounded-full" />
              </div>
              <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-lg" />
              <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function TaskViewPage() {
  const params = useParams();
  const taskId = (params?.taskId ?? params?.id ?? "") as string;
  const router = useRouter();

  const [focusedTask, setFocusedTask] = useState<Task | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [boardCategory, setBoardCategory] = useState<TaskCategory | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [bgloader, setBgloader] = useState(false);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const canStatusChange = hasPermission(PERMISSIONS.taskStatusChange);
  const dragRef = useRef<Task | null>(null);
  const debouncingRef = useRef<NodeJS.Timeout | null>(null);
  const user = useSelector((state: any) => state.auth.user);

  useEffect(() => {
    if (!taskId) return;
    setLoadingTask(true);
    apiFetchTask(taskId)
      .then((res) => {
        const raw: Raw = res.data?.data ?? res.data;
        setFocusedTask(normalizeFocusedTask(raw));
      })
      .catch((err) => {
        console.error("Task fetch error:", err);
        toast.error("Task not found");
        router.back();
      })
      .finally(() => setLoadingTask(false));
  }, [taskId]);

  const loadBoard = useCallback(async (categoryId: string, force = false) => {
    if (!categoryId) return;

    try {
      if (force) {
        if (debouncingRef.current) clearTimeout(debouncingRef.current);
        debouncingRef.current = setTimeout(async () => {
          setBgloader(true);
          const res = await apiFetchKanban(categoryId);
          const raw: Raw = res.data?.data ?? res.data;
          const board = normalizeBoard(raw);
          setBoardCategory(board.category);
          setColumns(board.columns);
          setBgloader(false);
        }, 30000);
      }
      else{
          if(debouncingRef.current){
            clearTimeout(debouncingRef.current);
            debouncingRef.current = null;
          }
          setBgloader(true);
          const res = await apiFetchKanban(categoryId);
          const raw: Raw = res.data?.data ?? res.data;
          const board = normalizeBoard(raw);
          setBoardCategory(board.category);
          setColumns(board.columns);
      }

    } catch (err) {
      console.error("Board fetch error:", err);
      toast.error("Failed to load board");
    } finally {
      setLoadingBoard(false);
      setBgloader(false);
    }
  }, []);

  useEffect(() => {
    const catId = focusedTask?.category?.id;
    if (catId) loadBoard(catId);
  }, [focusedTask?.category?.id, loadBoard]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    dragRef.current = task;
    setDraggingTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("taskId", task.id);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingTask(null);
    setDragOverColId(null);
    dragRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    if (!hasPermission(PERMISSIONS.taskStatusChange)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColId(statusId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    if (!hasPermission(PERMISSIONS.taskStatusChange)) {
      toast.error("You don't have permission to move tasks");
      return;
    }
    setDragOverColId(null);
    const task = dragRef.current;
    dragRef.current = null;
    setDraggingTask(null);

    if (!task || task.status.id === targetStatusId) return;

    const targetCol = columns.find((c) => c.status.id === targetStatusId);
    if (!targetCol) return;

    setColumns((prev) =>
      prev.map((col) => {
        if (col.status.id === task.status.id) {
          return {
            ...col,
            tasks: col.tasks.filter((t) => t.id !== task.id),
            count: col.count - 1,
          };
        }
        if (col.status.id === targetStatusId) {
          const moved = {
            ...task,
            status: col.status,
            order: col.tasks.length,
          };
          return { ...col, tasks: [...col.tasks, moved], count: col.count + 1 };
        }
        return col;
      }),
    );

    if (task.id === taskId) {
      setFocusedTask((prev) =>
        prev ? { ...prev, status: targetCol.status } : prev,
      );
    }

    setMovingTaskId(task.id);
    try {
      const categoryId = focusedTask?.category?.id ?? task.category?.id ?? "";

      await apiMoveTask(
        task.id,
        targetStatusId,
        categoryId,
        targetCol.tasks.length,
      );
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => {
            if (t.id !== task.id) return t;

            return {
              ...t,
              activities: {
                ...t.activities,
                oldValue: task.activities.newValue,
                newValue: targetCol.status.name,
                action: TASK_ACTIVITY_ACTION.STATUS_CHANGED,
                performedBy: user,
              },
            };
          }),
        }))
      );
      // toast.success("Task moved");
      loadBoard(focusedTask?.category?.id ?? "", true);
    } catch (err) {
      console.error("Move error:", err);

      
      await loadBoard(focusedTask?.category?.id ?? "");

      if (axios.isAxiosError(err))
        toast.error(err.response?.data?.message ?? "Failed to move task");
    } finally {
      setMovingTaskId(null);
    }
  };

  const allTasks = columns.flatMap((c) => c.tasks);
  const totalTasks = allTasks.length;
  const completedCount = allTasks.filter((t) => t.completedAt).length;
  const overdueCount = allTasks.filter(
    (t) =>
      t.isOverdue ||
      (t.dueDate && !t.completedAt && new Date(t.dueDate) < new Date()),
  ).length;
  const progress =
    totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const liveTask = allTasks.find((t) => t.id === taskId) ?? focusedTask;

  const createdByName = (() => {
    const cb = focusedTask?.createdBy;
    if (!cb) return null;
    const fn = (cb.firstName ?? "") as string;
    const ln = (cb.lastName ?? "") as string;
    return [fn, ln].filter(Boolean).join(" ") || null;
  })();

  if (loadingTask) {
    return (
      <div className="ml-72 mt-14 p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 animate-pulse space-y-4">
          <div className="h-7 w-48 bg-gray-100 dark:bg-gray-700 rounded-xl" />
          <div className="h-4 w-80 bg-gray-100 dark:bg-gray-700 rounded-lg" />
          <div className="grid grid-cols-4 gap-4 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-100 dark:border-gray-600"
              />
            ))}
          </div>
          <BoardSkeleton />
        </div>
      </div>
    );
  }

  if (!focusedTask) return null;

  const displayCategory = boardCategory ?? focusedTask.category;

  return (
    <div className="ml-72 mt-14 p-6 min-h-screen bg-gray-50/40 dark:bg-gray-900/20">
      {/* <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 shadow-sm transition-all"
        >
          ← Back
        </button>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
          Tasks
        </span>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold truncate max-w-[200px]">
          {focusedTask.title}
        </span>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-xs text-indigo-500 font-semibold">Board</span>
      </div> */}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: `${focusedTask.category.color || "#6366f1"}15`,
                  color: focusedTask.category.color || "#6366f1",
                  borderColor: `${focusedTask.category.color || "#6366f1"}30`,
                }}
              >
                {focusedTask.category.icon && (
                  <span>{focusedTask.category.icon}</span>
                )}
                {focusedTask.category.name || "Category"}
              </span>
              <span className="text-[10px] font-mono text-gray-300 dark:text-gray-600">
                {focusedTask.task_id}
              </span>
              {focusedTask.isRecurring && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800/50">
                  🔁 {focusedTask.recurrenceType}
                </span>
              )}
            </div>

            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1.5 leading-tight">
              {focusedTask.title}
            </h1>

            {focusedTask.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl line-clamp-2 mb-1">
                {focusedTask.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <PriorityBadge priority={focusedTask.priority} />
              <StatusBadge color={getColorOption(focusedTask.status.color)} icon={focusedTask.status.icon} name={focusedTask.status.name} />
              {focusedTask.dueDate && (
                <span
                  className={`text-xs font-semibold flex items-center gap-1 ${!focusedTask.completedAt && new Date(focusedTask.dueDate) < new Date() ? "text-rose-500" : "text-gray-400 dark:text-gray-500"}`}
                >
                  📅{" "}
                  {new Date(focusedTask.dueDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}

              {focusedTask.estimatedHours && (
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  ⏱ {focusedTask.estimatedHours}h
                </span>
              )}

              {focusedTask.assignedTo.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    {focusedTask.assignedTo.slice(0, 4).map((u) => (
                      <Avatar link={`/users/${u.id}`} key={u.id} name={u.firstName} title={u.firstName} />
                    ))}
                    {focusedTask.assignedTo.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[8px] font-bold text-gray-500">
                        +{focusedTask.assignedTo.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {focusedTask.assignedTo.length === 1
                      ? focusedTask.assignedTo[0].firstName
                      : `${focusedTask.assignedTo.length} assignees`}
                  </span>
                </div>
              )}

              {createdByName && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  by{" "}
                  <strong className="text-gray-600 dark:text-gray-300">
                    {createdByName}
                  </strong>
                </span>
              )}

              {focusedTask.tags && focusedTask.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {focusedTask.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  strokeWidth="5"
                  fill="none"
                  stroke="#f1f5f9"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  strokeWidth="5"
                  fill="none"
                  stroke="#6366f1"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.7s ease" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-gray-700 dark:text-gray-300">
                {progress}%
              </span>
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">
              Done
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
          {[
            { label: "Total", value: totalTasks, icon: "📋", color: "#6366f1" },
            {
              label: "Completed",
              value: completedCount,
              icon: "✅",
              color: "#10b981",
            },
            {
              label: "Overdue",
              value: overdueCount,
              icon: "⚠️",
              color: "#ef4444",
            },
            {
              label: "Columns",
              value: columns.length,
              icon: "🗂️",
              color: "#f59e0b",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"
            >
              <span className="text-lg">{s.icon}</span>
              <div>
                <div
                  className="text-lg font-extrabold leading-none"
                  style={{ color: s.color }}
                >
                  {s.value}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-sm font-extrabold text-gray-700 dark:text-gray-300">
            {displayCategory?.icon && (
              <span className="mr-1">{displayCategory.icon}</span>
            )}
            {displayCategory?.name} — Kanban Board
          </h2>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
            ★ &nbsp;current task
          </span>

          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-600">
            ↔️ Drag to move
          </span>

          {movingTaskId && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 animate-pulse">
              <svg
                className="w-2.5 h-2.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Moving…
            </span>
          )}
        </div>

        <button
          onClick={() =>
            focusedTask.category?.id && loadBoard(focusedTask.category.id)
          }
          disabled={loadingBoard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 shadow-sm transition-all disabled:opacity-50"
        >
          {bgloader ? (
            <svg
              className="w-3 h-3 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : (
            <span>↻</span>
          )}
          Refresh
        </button>
      </div>

      {loadingBoard ? (
        <BoardSkeleton />
      ) : columns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <span className="text-5xl mb-4 opacity-30">📭</span>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
            No statuses found for this category
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Create statuses for this category first
          </p>
        </div>
      ) : (
        <div className="flex gap-4 pb-6 overflow-x-auto">
          {columns.map((col) => (
            <KanbanColumn
              key={col.status.id}
              column={col}
              focusedTaskId={taskId}
              draggingTask={draggingTask}
              dragOverColId={dragOverColId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragLeave={handleDragLeave}
              canStatusChange={canStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
