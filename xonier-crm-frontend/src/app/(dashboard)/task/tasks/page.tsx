"use client";

import React, { JSX, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { usePermissions } from "@/src/hooks/usePermissions";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { TaskService } from "@/src/services/tasks.service";
import { StatusService } from "@/src/services/status.service";
import { ColorOption, StatusItem } from "@/src/types/task/status.types";
import { MdEdit, MdDelete, MdOutlineEdit } from "react-icons/md";
import { StatusBadge ,getColorOption} from "@/src/components/pages/task/createStatusModal";
import {
  TaskItem,
  TASK_PRIORITY,
  UpdateTaskStatusPayload,
  StatusOption,
} from "@/src/types/task/task.types";
import { COLOR_OPTIONS, PERMISSIONS } from "@/src/constants/enum";
import { IoMdEye } from "react-icons/io";


type ViewMode = "list" | "board";


const PRIORITY_STYLE: Record<TASK_PRIORITY, { cls: string; dot: string; label: string }> = {
  [TASK_PRIORITY.LOW]: { cls: "bg-slate-100  text-slate-600  dark:bg-slate-800  dark:text-slate-400", dot: "bg-slate-400", label: "Low" },
  [TASK_PRIORITY.MEDIUM]: { cls: "bg-amber-50   text-amber-600  dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-400", label: "Medium" },
  [TASK_PRIORITY.HIGH]: { cls: "bg-orange-50  text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", dot: "bg-orange-500", label: "High" },
  [TASK_PRIORITY.URGENT]: { cls: "bg-rose-50    text-rose-600   dark:bg-rose-900/30 dark:text-rose-400", dot: "bg-rose-500", label: "Urgent" },
};


function CategoryBadge({ color, icon, name }: { color: ColorOption; icon: string; name: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}>
      <span>{icon}</span>
      {name}
    </span>
  );
}




interface StatusDropdownProps {
  task: TaskItem;
  statusOptions: StatusOption[];
  onChange: (taskId: string, payload: UpdateTaskStatusPayload) => Promise<void>;
  disabled: boolean;
}

function StatusDropdown({ task, statusOptions, onChange, disabled }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = statusOptions.find(s => s.id === task.status.id);

  const handleSelect = async (statusId: string) => {
    if (statusId === task.status.id) { setOpen(false); return; }
    setBusy(true);
    setOpen(false);
    await onChange(task.id, { status: statusId });
    setBusy(false);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => !disabled && !busy && setOpen(p => !p)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all select-none ${disabled || busy ? "opacity-60 cursor-default" : "cursor-pointer hover:shadow-sm hover:scale-105"
          }`}
        style={{
          backgroundColor: current?.color ? `${current.color}15` : "#f1f5f9",
          color: current?.color === "#ffffff" || current?.color === "#fff" ? "#000000" : current?.color ?? "#64748b",
          borderColor: current?.color ? `${current.color}35` : "#e2e8f0",
        }}
      >
        {busy
          ? <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
          : <span className="text-xs">{current?.icon ?? "📌"}</span>
        }
        <span>{current?.name ?? task.statusName ?? "—"}</span>
        {!disabled && !busy && <span className="text-[10px] opacity-50 ml-0.5">▾</span>}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-40 w-48 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xl py-1.5 overflow-hidden">
          <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Change Status</p>
          {statusOptions.map(s => (
            <button
              key={s.id} type="button"
              onClick={() => handleSelect(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${s.id === task.status.id ? "bg-gray-50 dark:bg-gray-700" : ""
                }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span>{s.icon}</span>
              <span className="text-gray-700 dark:text-gray-300 flex-1">{s.name}</span>
              {s.id === task.status.id && <span className="text-blue-500 text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse border-b border-gray-50 dark:border-gray-700">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className={`h-4 bg-gray-100 dark:bg-gray-700 rounded-lg ${i === 1 ? "w-full" : "w-2/3"}`} />
        </td>
      ))}
    </tr>
  );
}


function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
      <button
        type="button"
        onClick={() => onChange("list")}
        title="List View"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === "list"
            ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
      >
        {/* List icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="1" y="6.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="1" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
        List
      </button>
      <button
        type="button"
        onClick={() => onChange("board")}
        title="Board View"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === "board"
            ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
      >
        
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
          <rect x="5.25" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
          <rect x="9.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
        </svg>
        Board
      </button>
    </div>
  );
}


interface BoardCardProps {
  task: TaskItem;
  canEdit: boolean;
  canDelete: boolean;
  deleting: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, task: TaskItem) => void;
}

function BoardCard({ task, canEdit, canDelete, deleting, onEdit, onDelete, onDragStart }: BoardCardProps) {
  const pri = PRIORITY_STYLE[task.priority];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all group select-none"
    >
      
      <div className="flex items-center justify-between mb-2.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pri.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
          {pri.label}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onEdit(task.id); }}
              className="p-1 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
            >
              <MdEdit className="text-sm" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={e => { e.stopPropagation(); onDelete(task.id); }}
              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition disabled:opacity-50"
            >
              <MdDelete className="text-sm" />
            </button>
          )}
        </div>
      </div>

      
      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-2 line-clamp-2">
        {task.title}
      </p>

      
      {task.category && (
        <div className="mb-2">
          <CategoryBadge
            color={getColorOption(task.category.color || null)}
            icon={task.category.icon || "❓"}
            name={task.category.name}
          />
        </div>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.tags.slice(0, 2).map(tag => (
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
        {/* Assignees */}
        <div className="flex -space-x-1.5">
          {task.assignedTo.length === 0 ? (
            <span className="text-[10px] italic text-gray-300 dark:text-gray-600">Unassigned</span>
          ) : (
            <>
              {task.assignedTo.slice(0, 3).map(u => (
                <div
                  key={u.id} title={u.firstName}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                >
                  {u.firstName} {u.lastName ?? ""}
                </div>
              ))}
              {task.assignedTo.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[8px] font-bold text-gray-500 shrink-0">
                  +{task.assignedTo.length - 3}
                </div>
              )}
            </>
          )}
        </div>

        {/* Due date */}
        {task.dueDate && (
          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${isOverdue ? "text-rose-500" : "text-gray-400 dark:text-gray-500"}`}>
            {isOverdue && "⚠️"}
            {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Board Column ──────────────────────────────────────────────────────────────
interface BoardColumnProps {
  status: StatusOption;
  tasks: TaskItem[];
  canEdit: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
  deleting: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, task: TaskItem) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, statusId: string) => void;
  isDragOver: boolean;
}

function BoardColumn({
  status, tasks, canEdit, canDelete, canChangeStatus, deleting,
  onEdit, onDelete, onDragStart, onDragOver, onDrop, isDragOver,
}: BoardColumnProps) {
  return (
    <div
      className={`flex flex-col rounded-2xl border-2 transition-all min-w-[280px] max-w-[320px] flex-1 ${isDragOver
          ? "border-blue-400 bg-blue-50/60 dark:bg-blue-900/20 shadow-lg shadow-blue-100 dark:shadow-blue-900/20"
          : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
        }`}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, status.id)}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white dark:ring-gray-800"
            style={{ backgroundColor: status.color ?? "#94a3b8" }}
          />
          <span className="text-sm font-bold text-gray-800 dark:text-white">
            {status.icon && <span className="mr-1">{status.icon}</span>}
            {status.name}
          </span>
        </div>
        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-full px-2 py-0.5 min-w-[24px] text-center">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className={`flex-1 p-3 space-y-2.5 overflow-y-auto min-h-[120px] transition-colors ${isDragOver ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
        }`}>
        {tasks.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed transition-colors ${isDragOver
              ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-gray-600"
            }`}>
            <span className="text-2xl mb-1 opacity-40">📋</span>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              {isDragOver ? "Drop here" : "No tasks"}
            </p>
          </div>
        ) : (
          tasks.map(task => (
            <BoardCard
              key={task.id}
              task={task}
              canEdit={canEdit}
              canDelete={canDelete}
              deleting={deleting}
              onEdit={onEdit}
              onDelete={onDelete}
              onDragStart={onDragStart}
            />
          ))
        )}

        {/* Drop zone indicator when column has cards */}
        {tasks.length > 0 && isDragOver && (
          <div className="flex items-center justify-center py-3 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-600 bg-blue-50/60 dark:bg-blue-900/20">
            <p className="text-xs text-blue-500 dark:text-blue-400 font-semibold">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Board View ────────────────────────────────────────────────────────────────
interface BoardViewProps {
  tasks: TaskItem[];
  statusOptions: StatusOption[];
  canEdit: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
  deleting: boolean;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (taskId: string, payload: UpdateTaskStatusPayload) => Promise<void>;
}

function BoardView({
  tasks, statusOptions, canEdit, canDelete, canChangeStatus,
  deleting, isLoading, onEdit, onDelete, onStatusChange,
}: BoardViewProps) {
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
  const dragTaskRef = useRef<TaskItem | null>(null);

  const handleDragStart = (e: React.DragEvent, task: TaskItem) => {
    dragTaskRef.current = task;
    e.dataTransfer.effectAllowed = "move";
    // ghost image styling via opacity
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => { el.style.opacity = "0.5"; }, 0);
    e.currentTarget.addEventListener("dragend", () => { el.style.opacity = "1"; }, { once: true });
  };

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatusId(statusId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    setDragOverStatusId(null);
    const task = dragTaskRef.current;
    dragTaskRef.current = null;
    if (!task) return;
    if (task.status.id === targetStatusId) return;
    if (!canChangeStatus) {
      toast.error("No permission to change status");
      return;
    }
    await onStatusChange(task.id, { status: targetStatusId ,category:task.category.id });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // only clear if truly leaving the column (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStatusId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4  pb-4 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="min-w-[280px] max-w-[320px] flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-3 space-y-3 animate-pulse">
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 space-y-2.5">
                <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex gap-4  pb-4 flex-wrap"
      onDragLeave={handleDragLeave}
    >
      {statusOptions.map(status => {
        const columnTasks = tasks.filter(t => t.status.id === status.id);
        return (
          <BoardColumn
            key={status.id}
            status={status}
            tasks={columnTasks}
            canEdit={canEdit}
            canDelete={canDelete}
            canChangeStatus={canChangeStatus}
            deleting={deleting}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={handleDragStart}
            onDragOver={e => handleDragOver(e, status.id)}
            onDrop={handleDrop}
            isDragOver={dragOverStatusId === status.id}
          />
        );
      })}

      {statusOptions.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-5xl mb-3">📭</span>
          <p className="text-sm font-semibold">No statuses configured</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TaskListPage = (): JSX.Element => {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [taskData, setTaskData] = useState<TaskItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const canCreate = hasPermission(PERMISSIONS.createTask);
  const canView = hasPermission(PERMISSIONS.readTask)
  const canEdit = hasPermission(PERMISSIONS.updateTask);
  const canDelete = hasPermission(PERMISSIONS.deleteTask);
  const canChangeStatus = hasPermission(PERMISSIONS.taskStatusUpdate);
  const showActions = canEdit || canDelete;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch tasks ───────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await TaskService.getAll({
        currentPage,
        pageLimit: viewMode === "board" ? 500 : pageLimit, // fetch all for board
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        search: search || undefined,
      });
      if (res.status === 200) {
        const d = res.data?.data||[];
        setTaskData(d.data ?? []);
        setTotalCount(Number(d.totalPages ?? 0));
      }
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      if (axios.isAxiosError(e)) toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageLimit, filterStatus, filterPriority, search, viewMode]);

  const fetchStatuses = async () => {
    try {
      const res = await StatusService.getAll({ currentPage: 1, pageLimit: 100, search: "" });
      if (res.status === 200) setStatusOptions(res.data.data.data ?? []);
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
    }
  };

  useEffect(() => { fetchStatuses(); }, []);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(fetchTasks, 400);
    return () => clearTimeout(t);
  }, [search]);

  
  const handleStatusChange = async (
    taskId: string,
    payload: UpdateTaskStatusPayload
  ): Promise<void> => {
    
    if (viewMode === "board") {
      const targetStatus = statusOptions.find(s => s.id === payload.status);
      if (targetStatus) {
        setTaskData(prev => prev.map(t =>
          t.id === taskId
            ? {
              ...t,
            }
            : t
        ));
      }
    }
    try {
      const res = await TaskService.updateStatus(taskId, payload);
      if (res.status === 200) {
        toast.success("Status updated");
         fetchTasks();
      }
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      if (axios.isAxiosError(e)) {
        toast.error("Failed to update status");
        fetchTasks(); 
      }
    }
  };

  
  const handleDelete = async (id: string): Promise<void> => {
    setDeleting(true);
    try {
      const confirmed = await ConfirmPopup({
        title: "Delete Task?",
        text: "This cannot be undone.",
        btnTxt: "Yes, Delete",
      });
      if (confirmed) {
        const res = await TaskService.delete(id);
        if (res.status === 200) {
          toast.success("Task deleted successfully");
          await fetchTasks();
        }
      }
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      if (axios.isAxiosError(e))
        toast.error(e.response?.data?.message ?? "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };
  const handleSearch = (val: string) => {
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearch(val);
    }, 300);
  };

  const totalPages = Math.ceil(totalCount / pageLimit);
  const hasFilters = !!(search || filterStatus || filterPriority);
  const colCount = showActions ? 8 : 7;

  return (
    <div className="ml-72 mt-14">
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full">

        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">📋</span>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                All Tasks
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View, filter, and manage all project tasks.
            </p>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => router.push("/task/tasks/create")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-bold shadow-md shadow-blue-200 dark:shadow-blue-900/40 transition-all"
            >
              <span>＋</span> New Task
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          {[
            { label: "Total", value: totalCount, icon: "📋", bg: "bg-blue-50   border-blue-100" },
            { label: "High", value: taskData.filter(t => t.priority === TASK_PRIORITY.HIGH).length, icon: "🟠", bg: "bg-orange-50 border-orange-100" },
            { label: "Urgent", value: taskData.filter(t => t.priority === TASK_PRIORITY.URGENT).length, icon: "🔴", bg: "bg-rose-50   border-rose-100" },
            { label: "This Page", value: taskData.length, icon: "📄", bg: "bg-emerald-50 border-emerald-100" },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg}`}>
              <span className="text-xl">{s.icon}</span>
              <div>
                <div className="text-xl font-extrabold text-gray-900 dark:text-black">{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</div>
              </div>
            </div>
          ))}
        </div>


        <div className="flex flex-wrap items-center gap-3 mb-5">

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"

              onChange={e => handleSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
            />
          </div>


          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(s => (
              <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
            ))}
          </select>


          <select
            value={filterPriority}
            onChange={e => { setFilterPriority(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
          >
            <option value="">All Priorities</option>
            {Object.values(TASK_PRIORITY).map(p => (
              <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
            ))}
          </select>

          {hasFilters && (
            <button
            type="button"
            onClick={() => { setSearch(""); setFilterStatus(""); setFilterPriority(""); setCurrentPage(1); }}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5"
            >
              <span>✕</span> Clear
            </button>
          )}
          {/* <div className="w-px h-7 bg-gray-200 dark:bg-gray-600 ml-auto" />
          <ViewToggle view={viewMode} onChange={v => { setViewMode(v); setCurrentPage(1); }} /> */}
        </div>

        {viewMode === "board" && (
          <BoardView
            tasks={taskData}
            statusOptions={statusOptions}
            canEdit={canEdit}
            canDelete={canDelete}
            canChangeStatus={canChangeStatus}
            deleting={deleting}
            isLoading={isLoading}
            onEdit={id => router.push(`/task/tasks/update/${id}`)}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
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
                      { label: "Due Date", cls: "w-28" },
                      ...(showActions ? [{ label: "Actions", cls: "w-28 text-right" }] : []),
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
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={colCount} />)
                  ) : taskData.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="text-center py-20 text-gray-400 dark:text-gray-500">
                        <div className="text-5xl mb-3">📭</div>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No tasks found</p>
                        {hasFilters && <p className="text-xs text-gray-400 mt-1">Try clearing your filters</p>}
                        {canCreate && !hasFilters && (
                          <button
                            type="button"
                            onClick={() => router.push("/task/tasks/create")}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 transition"
                          >
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
                        <tr
                          key={task.id}
                          className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors group"
                        >
                          {/* # */}
                          <td className="px-5 py-4 text-xs font-mono text-gray-400 dark:text-gray-500">
                            {String((currentPage - 1) * pageLimit + i + 1).padStart(2, "0")}
                          </td>

                          {/* Title */}
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm truncate max-w-xs">
                              {task.title}
                            </div>
                            {task.categoryName && (
                              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{task.categoryName}</div>
                            )}
                            {task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {task.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                    #{tag}
                                  </span>
                                ))}
                                {task.tags.length > 3 && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-400">
                                    +{task.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Category badge */}
                          <td className="px-5 py-4">
                            <CategoryBadge
                              color={getColorOption(task.category.color || null)}
                              icon={task.category.icon || "❓"}
                              name={task.category.name}
                            />
                          </td>

                          {/* Status — inline dropdown */}
                          <td className="px-5 py-4">
                            {/* <StatusDropdown
                              task={task}
                              statusOptions={statusOptions}
                              onChange={handleStatusChange}
                              disabled={!canChangeStatus}
                            /> */}
                            <StatusBadge color={getColorOption(task.status.color)} icon={task.status.icon || "⚡"} name={task.status.name} />
                          </td>

                          {/* Priority */}
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${pri.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
                              {pri.label}
                            </span>
                          </td>

                          {/* Assigned */}
                          <td className="px-5 py-4">
                            {task.assignedTo.length === 0 ? (
                              <span className="text-xs italic text-gray-300 dark:text-gray-600">Unassigned</span>
                            ) : (
                              <div className="flex -space-x-2">
                                {task.assignedTo.slice(0, 2).map(u => (
                                  <div
                                    key={u.id} title={u.firstName}
                                    className=" rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 border-2 border-white dark:border-gray-800 flex items-center px-2 py-1 capitalize justify-center text-white text-[12px] font-bold shrink-0"
                                  >
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

                          {/* Due Date */}
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
                              <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                                {canView && (
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/task/tasks/view/${task.id}`)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 transition cursor-pointer"
                                  >
                                    <span className="items-center justify-center  text-green-500 ">
                                      <IoMdEye className="text-sm" />
                                    </span>
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/task/tasks/update/${task.id}`)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 transition"
                                  >
                                    <span className="items-center justify-center rounded-md bg-blue-100/80 text-blue-500 border-blue-100">
                                      <MdEdit className="text-sm" />
                                    </span>
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    disabled={deleting}
                                    onClick={() => handleDelete(task.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:text-rose-400 transition disabled:opacity-50"
                                  >
                                    <span className="items-center justify-center rounded-md bg-rose-100/80 text-rose-500 border-rose-100">
                                      <MdDelete className="text-sm" />
                                    </span>
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
                Showing{" page "} 
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-600 dark:text-gray-300">{totalCount}</span> 
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
        )}
      </div>
    </div>
  );
};

export default TaskListPage;