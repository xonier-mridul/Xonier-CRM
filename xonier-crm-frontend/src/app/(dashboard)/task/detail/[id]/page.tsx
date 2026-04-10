"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { TaskActivity, TaskItem, TASK_PRIORITY } from "@/src/types/task/task.types";
import { TASK_ACTIVITY_ACTION } from "@/src/constants/enum";
import { toast } from "react-toastify";
import { TaskService } from "@/src/services/tasks.service";
import ComingSoonOverlay from "@/src/components/ui/ComingSoonOverlay";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  Tag,
  Layers,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Paperclip,
  ArrowUpDown,
  UserPlus,
  UserCheck,
  Trash2,
  RotateCcw,
  CircleDot,
  ChevronRight,
  Flame,
  TrendingUp,
  Minus,
  ChevronsUp,
  Link2,
  Building2,
  Plus,
  ListChecks,
  X,
  Circle,
  GripVertical,
  Pencil,
  CheckCheck,
  Activity,
  Zap,
  Target,
  BarChart3,
  Timer,
  Star,
} from "lucide-react";
import RemarkModal from "@/src/components/pages/task/RemarkModal";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  assignedTo?: { id: string; firstName: string; lastName?: string; avatar?: string };
  priority?: TASK_PRIORITY;
}

// ─── Priority Config ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TASK_PRIORITY, { label: string; colorClass: string; bgClass: string; gradient: string; icon: React.ReactNode }> = {
  [TASK_PRIORITY.LOW]: {
    label: "Low",
    colorClass: "text-slate-500 dark:text-slate-400",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    gradient: "from-slate-400 to-slate-500",
    icon: <Minus size={12} />,
  },
  [TASK_PRIORITY.MEDIUM]: {
    label: "Medium",
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-900/30",
    gradient: "from-amber-400 to-orange-400",
    icon: <TrendingUp size={12} />,
  },
  [TASK_PRIORITY.HIGH]: {
    label: "High",
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-50 dark:bg-orange-900/30",
    gradient: "from-orange-400 to-red-400",
    icon: <ChevronsUp size={12} />,
  },
  [TASK_PRIORITY.URGENT]: {
    label: "Urgent",
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-900/30",
    gradient: "from-red-500 to-rose-600",
    icon: <Flame size={12} />,
  },
};

const ACTION_CONFIG: Record<TASK_ACTIVITY_ACTION, { icon: React.ReactNode; color: string; dot: string; bg: string }> = {
  [TASK_ACTIVITY_ACTION.CREATED]: { icon: <CircleDot size={12} />, color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  [TASK_ACTIVITY_ACTION.STATUS_CHANGED]: { icon: <ArrowUpDown size={12} />, color: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20" },
  [TASK_ACTIVITY_ACTION.ASSIGNED]: { icon: <UserPlus size={12} />, color: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500", bg: "bg-sky-50 dark:bg-sky-900/20" },
  [TASK_ACTIVITY_ACTION.REASSIGNED]: { icon: <UserCheck size={12} />, color: "text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  [TASK_ACTIVITY_ACTION.PRIORITY_CHANGED]: { icon: <ChevronsUp size={12} />, color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  [TASK_ACTIVITY_ACTION.DUE_DATE_CHANGED]: { icon: <Calendar size={12} />, color: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" },
  [TASK_ACTIVITY_ACTION.COMMENTED]: { icon: <MessageSquare size={12} />, color: "text-slate-600 dark:text-slate-400", dot: "bg-slate-500", bg: "bg-slate-50 dark:bg-slate-900/20" },
  [TASK_ACTIVITY_ACTION.ATTACHMENT_ADDED]: { icon: <Paperclip size={12} />, color: "text-teal-600 dark:text-teal-400", dot: "bg-teal-500", bg: "bg-teal-50 dark:bg-teal-900/20" },
  [TASK_ACTIVITY_ACTION.COMPLETED]: { icon: <CheckCircle2 size={12} />, color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  [TASK_ACTIVITY_ACTION.REOPENED]: { icon: <RotateCcw size={12} />, color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  [TASK_ACTIVITY_ACTION.DELETED]: { icon: <Trash2 size={12} />, color: "text-red-600 dark:text-red-400", dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
  [TASK_ACTIVITY_ACTION.UPDATED]: { icon: <Pencil size={12} />, color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (
  date: string | null | undefined
): string => {
  if (!date) return "—";

  const parsedDate = new Date(
    date.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1") + "Z"
  );

  return parsedDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatRelativeTime = (date: string): string => {
  const diff = Date.now() - new Date(date.replace(" ", "T") + "Z").getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const AvatarCircle = ({ name, avatar, size = "sm" }: { name: string; avatar?: string; size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "lg" ? "w-10 h-10 text-sm" : size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]";
  const colors = [
    "bg-gradient-to-br from-violet-500 to-purple-600",
    "bg-gradient-to-br from-sky-500 to-blue-600",
    "bg-gradient-to-br from-emerald-500 to-teal-600",
    "bg-gradient-to-br from-amber-500 to-orange-500",
    "bg-gradient-to-br from-rose-500 to-pink-600",
    "bg-gradient-to-br from-indigo-500 to-blue-600",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatar)
    return <img src={avatar} alt={name} className={`${sizeClass} rounded-full object-cover ring-2 ring-white dark:ring-gray-900`} />;
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-gray-900 flex-shrink-0 shadow-sm`}>
      {name[0]?.toUpperCase()}
    </div>
  );
};

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-xl ${className}`} />
);

const TaskDetailSkeleton = () => (
  <div className="ml-72 mt-14 p-6 space-y-6">
    <SkeletonBlock className="h-10 w-2/3" />
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-52" />
      </div>
      <div className="space-y-4">
        <SkeletonBlock className="h-52" />
        <SkeletonBlock className="h-36" />
      </div>
    </div>
  </div>
);

const MetaRow = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 py-3.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
    <div className="flex items-center gap-1.5 w-32 shrink-0 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
      <span className="text-gray-400 dark:text-gray-600">{icon}</span>
      {label}
    </div>
    <div className="flex-1 text-sm text-gray-700 dark:text-gray-200 font-medium">{children}</div>
  </div>
);

// ─── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon, accent }: {
  label: string; value: React.ReactNode; sub?: string; icon: React.ReactNode; accent: string;
}) => (
  <div className={`relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm`}>
    <div className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl ${accent}`} />
    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${accent} bg-opacity-10`}>
      <span className="opacity-80">{icon}</span>
    </div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</p>
    {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
  </div>
);

// ─── Progress Ring ────────────────────────────────────────────────────────────

const ProgressRing = ({ percent, size = 64, stroke = 5 }: { percent: number; size?: number; stroke?: number }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = percent === 100 ? "#10b981" : percent >= 60 ? "#8b5cf6" : percent >= 30 ? "#f59e0b" : "#6b7280";
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-gray-100 dark:text-gray-800" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
};

// ─── Activity Log (Fixed + Scrollable) ────────────────────────────────────────

const ActivityLog = ({ activities, loading }: { activities: TaskActivity[]; loading: boolean }) => {
  const completed = activities.filter((a) => a.action === TASK_ACTIVITY_ACTION.COMPLETED).length;
  const pct = activities.length === 0 ? 0 : Math.round((completed / activities.length) * 100);

  // Calculate a "progress" based on latest status change if available
  const progressPercent = (() => {
    // Try to derive from events: weight completed/status events
    const total = activities.length;
    if (total === 0) return 0;
    const positiveEvents = activities.filter(a =>
      [TASK_ACTIVITY_ACTION.COMPLETED, TASK_ACTIVITY_ACTION.STATUS_CHANGED, TASK_ACTIVITY_ACTION.ATTACHMENT_ADDED].includes(a.action)
    ).length;
    return Math.min(100, Math.round((positiveEvents / total) * 100));
  })();

  const barColor =
    progressPercent === 100 ? "from-emerald-400 to-emerald-500" :
      progressPercent >= 60 ? "from-violet-500 to-purple-600" :
        progressPercent >= 30 ? "from-amber-400 to-orange-400" :
          "from-slate-300 to-slate-400";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-none flex flex-col"
      style={{ height: "600px" }}>

      {/* Fixed Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Activity size={15} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Activity Log</h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{activities.length} events recorded</p>
            </div>
          </div>
          {activities.length > 0 && (
            <span className="text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 px-3 py-1.5 rounded-full font-bold border border-violet-100 dark:border-violet-800">
              {activities.length} events
            </span>
          )}
        </div>

        {/* Progress bar section */}
        {activities.length > 0 && (
          <div className="mb-4 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={13} className="text-gray-400 dark:text-gray-500" />
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Activity Progress</span>
              </div>
              <span className={`text-sm font-black ${progressPercent === 100 ? "text-emerald-500" : "text-gray-700 dark:text-gray-200"}`}>
                {progressPercent}%
              </span>
            </div>
            <div className="relative h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700 ease-out relative`}
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{activities.filter(a => a.action === TASK_ACTIVITY_ACTION.COMPLETED).length} completions</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{activities.filter(a => a.action === TASK_ACTIVITY_ACTION.STATUS_CHANGED).length} status changes</span>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-1" />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {loading ? (
          <div className="space-y-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 items-start">
                <SkeletonBlock className="w-8 h-8 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-3/4" />
                  <SkeletonBlock className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Activity size={24} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">No activity recorded yet</p>
            <p className="text-xs text-gray-300 dark:text-gray-600">Actions will appear here as they happen</p>
          </div>
        ) : (
          <div className="space-y-1 pb-2">
            {activities.map((activity, index) => {
              const cfg = ACTION_CONFIG[activity.action] ?? { icon: <CircleDot size={12} />, color: "text-gray-500", dot: "bg-gray-400", bg: "bg-gray-50 dark:bg-gray-800" };
              const isLast = index === activities.length - 1;
              return (
                <div key={activity.id} className="flex gap-3 relative group">
                  {!isLast && <div className="absolute left-[15px] top-9 bottom-0 w-px bg-gradient-to-b from-gray-200 dark:from-gray-700 to-transparent" />}
                  <div className={`w-8 h-8 rounded-xl ${cfg.bg} border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0 z-10 ${cfg.color} transition-transform group-hover:scale-110`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 pb-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-snug font-medium">{activity.description}</p>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0 mt-0.5 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-100 dark:border-gray-700">{formatRelativeTime(activity.createdAt)}</span>
                    </div>
                    {(activity.oldValue || activity.newValue) && (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {activity.oldValue && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-[11px] font-semibold line-through">{activity.oldValue}</span>
                        )}
                        {activity.oldValue && activity.newValue && <ChevronRight size={10} className="text-gray-400 flex-shrink-0" />}
                        {activity.newValue && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">{activity.newValue}</span>
                        )}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 capitalize font-medium">{activity.action.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatDateTime(activity.createdAt)}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 "> by {activity.performedBy.firstName} {activity.performedBy.lastName}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── SubTask Item ──────────────────────────────────────────────────────────────

const SubTaskItem = ({
  subtask, onToggle, onDelete, onEdit,
}: {
  subtask: SubTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(subtask.title);

  const handleSave = () => {
    if (editVal.trim() && editVal !== subtask.title) onEdit(subtask.id, editVal.trim());
    setEditing(false);
  };

  return (
    <div className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-150
      ${subtask.isCompleted
        ? "bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30"
        : "bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-sm"
      }`}>
      <GripVertical size={13} className="text-gray-300 dark:text-gray-600 shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
      <button onClick={() => onToggle(subtask.id)} className="shrink-0 transition-transform hover:scale-110">
        {subtask.isCompleted
          ? <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400" />
          : <Circle size={18} className="text-gray-300 dark:text-gray-600 hover:text-violet-400 transition-colors" />}
      </button>
      {editing ? (
        <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          className="flex-1 text-sm bg-white dark:bg-gray-900 border border-violet-300 dark:border-violet-700 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
        />
      ) : (
        <span className={`flex-1 text-sm font-medium ${subtask.isCompleted ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-200"}`}>
          {subtask.title}
        </span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!editing && (
          <button onClick={() => { setEditing(true); setEditVal(subtask.title); }}
            className="p-1 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 text-gray-400 hover:text-violet-600 transition-colors">
            <Pencil size={12} />
          </button>
        )}
        <button onClick={() => onDelete(subtask.id)}
          className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

// ─── SubTask Section ───────────────────────────────────────────────────────────

const SubTaskSection = ({ taskId }: { taskId: string }) => {
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const load = useCallback(async () => {
    try {
      const res = await TaskService.getSubTasks(taskId);
      if (res.status === 200) {
        const raw = res.data.data;
        setSubtasks(Array.isArray(raw) ? raw : raw ? [raw] : []);
      }
    } catch { } finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const newTask: SubTask = {
      id: "string",
      title: newTitle,
      isCompleted: newTitle.length == 4,
      createdAt: "klsklz"
    }
    setSubtasks((p) => [...p, newTask]);
    // try {
    //   const res = await TaskService.createSubTask(taskId, { title: newTitle.trim() });
    //   if (res.status === 200 || res.status === 201) {
    //     setSubtasks((p) => [...p, res.data.data]);
    //     toast.success("Sub-task added");
    //   }
    // } catch (e) {
    //   if (axios.isAxiosError(e)) toast.error(e.response?.data?.message ?? "Failed");
    // } finally { setNewTitle(""); setAdding(false); }
  };

  const handleToggle = async (id: string) => {
    const st = subtasks.find((s) => s.id === id);
    if (!st) return;
    setSubtasks((p) => p.map((s) => s.id === id ? { ...s, isCompleted: !s.isCompleted } : s));
    try { await TaskService.updateSubTask(taskId, id, { isCompleted: !st.isCompleted }); }
    catch { setSubtasks((p) => p.map((s) => s.id === id ? { ...s, isCompleted: st.isCompleted } : s)); toast.error("Failed"); }
  };

  const handleDelete = async (id: string) => {
    setSubtasks((p) => p.filter((s) => s.id !== id));
    try { await TaskService.deleteSubTask(taskId, id); toast.success("Removed"); }
    catch { toast.error("Failed"); load(); }
  };

  const handleEdit = async (id: string, title: string) => {
    setSubtasks((p) => p.map((s) => s.id === id ? { ...s, title } : s));
    try { await TaskService.updateSubTask(taskId, id, { title: title.trim() }); }
    catch { toast.error("Failed"); load(); }
  };

  const completed = subtasks.filter((s) => s.isCompleted).length;
  const total = subtasks.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const filtered = subtasks.filter((s) => filter === "all" ? true : filter === "active" ? !s.isCompleted : s.isCompleted);
  const barColor = pct === 100 ? "from-emerald-400 to-emerald-500" : pct >= 60 ? "from-violet-400 to-violet-600" : pct >= 30 ? "from-amber-400 to-amber-500" : "from-gray-300 to-gray-400";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-violet-50/50 to-purple-50/30 dark:from-violet-900/10 dark:to-purple-900/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <ListChecks size={15} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Sub-tasks</h3>
            {total > 0 && <p className="text-[11px] text-gray-400 dark:text-gray-500">{completed} of {total} done</p>}
          </div>
          {total > 0 && (
            <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full font-bold">{total}</span>
          )}
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-colors shadow-sm">
          <Plus size={13} />Add sub-task
        </button>
      </div>

      <div className="p-5 space-y-4">
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ProgressRing percent={pct} size={48} stroke={4} />
                <div>
                  <p className={`text-2xl font-black leading-none ${pct === 100 ? "text-emerald-500" : "text-gray-900 dark:text-white"}`}>{pct}%</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">complete</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-gray-900 dark:text-white">{completed}<span className="text-gray-400 font-normal text-sm"> / {total}</span></p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">tasks done</p>
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
            {pct === 100 && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2 border border-emerald-100 dark:border-emerald-900/40 font-semibold">
                <CheckCheck size={13} />All sub-tasks completed! 🎉
              </div>
            )}
          </div>
        )}

        {total > 0 && (
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
            {(["all", "active", "completed"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${filter === f ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
                {f}{f !== "all" && <span className="ml-1 opacity-60">({f === "active" ? total - completed : completed})</span>}
              </button>
            ))}
          </div>
        )}

        {adding && (
          <div className="flex items-center gap-2 p-3.5 bg-violet-50/60 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 rounded-xl">
            <Circle size={16} className="text-violet-300 dark:text-violet-600 shrink-0" />
            <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewTitle(""); } }}
              placeholder="Sub-task title… (Enter to save, Esc to cancel)"
              className="flex-1 text-sm bg-transparent focus:outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleAdd} className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors"><Plus size={13} /></button>
              <button onClick={() => { setAdding(false); setNewTitle(""); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><X size={13} /></button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <ListChecks size={22} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {filter === "all" ? "No sub-tasks yet" : `No ${filter} sub-tasks`}
            </p>
            {filter === "all" && <button onClick={() => setAdding(true)} className="text-xs text-violet-500 hover:underline font-semibold">Add your first sub-task</button>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((st) => (
              <SubTaskItem key={st.id} subtask={st} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

const page = () => {
  const [taskData, setTaskData] = useState<TaskItem | null>(null);
  const [taskActivity, setTaskActivity] = useState<TaskActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const { id } = useParams();

  const getTaskData = async (taskId: string) => {
    try {
      const result = await TaskService.getById(taskId);
      if (result.status === 200) setTaskData(result.data.data);
    } catch (e) {
      if (axios.isAxiosError(e)) toast.error(e.response?.data?.message ?? "Failed to load task");
    } finally { setIsLoading(false); }
  };

  const getTaskActivity = async (taskId: string) => {
    try {
      const result = await TaskService.getActivity(taskId);
      if (result.status === 200) {
        const raw = result.data.data;
        setTaskActivity(Array.isArray(raw) ? raw : raw ? [raw] : []);
      }
    } catch (e) {
      if (axios.isAxiosError(e)) toast.error(e.response?.data?.message ?? "Failed to load activity");
    } finally { setActivityLoading(false); }
  };

  useEffect(() => {
    if (!id) return;
    const taskId = String(id);
    getTaskData(taskId);
    getTaskActivity(taskId);
  }, []);

  if (isLoading) return <TaskDetailSkeleton />;

  if (!taskData) {
    return (
      <div className="ml-72 mt-14 p-6 flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto">
            <AlertCircle size={28} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Task not found</p>
        </div>
      </div>
    );
  }

  const priority = PRIORITY_CONFIG[taskData.priority];
  const isOverdue = taskData.dueDate && new Date(taskData.dueDate as string) < new Date();
  const isDueSoon = !isOverdue && taskData.dueDate && new Date(taskData.dueDate as string) < new Date(Date.now() + 86400000 * 2);
  const taskId = String(id);

  // Task completion percent from subtasks if available, else activity-based
  const taskProgressPct = (() => {
    if (taskData.completedAt) return 100;
    if (taskData.estimatedHours && taskData.actualHours) {
      return Math.min(100, Math.round((taskData.actualHours / taskData.estimatedHours) * 100));
    }
    return 0;
  })();

  const taskProgressColor =
    taskProgressPct === 100 ? "from-emerald-400 to-emerald-500" :
      taskProgressPct >= 60 ? "from-violet-500 to-purple-600" :
        taskProgressPct >= 30 ? "from-amber-400 to-orange-400" :
          "from-gray-300 to-gray-400";

  return (
    <div className="ml-72 mt-14">
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full mb-10">
        <div className="p-6 max-w-[1400px] space-y-5">

          {/* ── Hero Banner ── */}
          <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            {/* Subtle gradient decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50/40 via-transparent to-purple-50/20 dark:from-violet-900/10 dark:via-transparent dark:to-purple-900/5 pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-100/50 to-transparent dark:from-violet-900/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative p-6">
              {/* Breadcrumb-style context tags */}
              <div className="flex items-center gap-2 mb-3 flex-wrap w-full">
                <div className="flex items-center justify-between gap-3 w-full">
                  {taskData.category && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
                      <Layers size={11} />
                      {taskData.category?.name ?? taskData.categoryName}
                    </span>
                  )}
                  {taskData.entityType && taskData.entityName && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 rounded-full border border-sky-100 dark:border-sky-900/40">
                      <Link2 size={11} />
                      {taskData.entityType} · {taskData.entityName}
                    </span>
                  )}
                  {/* <Link href={`/task/update/${taskData.id}`} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-center flex items-center gap-2"><MdOutlineEdit /> Edit Task</Link> */}
                </div>
              </div>

              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-3">
                    {taskData.title}
                  </h1>

                  {/* Status + Priority badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border"
                      style={{
                        backgroundColor: taskData.status?.color ? `${taskData.status.color}18` : undefined,
                        color: taskData.status?.color ?? "",
                        borderColor: taskData.status?.color ? `${taskData.status.color}30` : undefined,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: taskData.status?.color ?? "" }} />
                      {taskData.status?.name ?? taskData.statusName}
                    </span>

                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${priority.bgClass} ${priority.colorClass}`}>
                      {priority.icon}
                      {priority.label}
                    </span>

                    {taskData.isRecurring && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                        <RefreshCw size={11} />
                        Recurring · {taskData.recurrenceType}
                      </span>
                    )}

                    {taskData.completedAt && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                        <CheckCircle2 size={11} />
                        Completed {formatDate(taskData.completedAt)}
                      </span>
                    )}
                  </div>

                  {/* Task-level progress bar */}
                  {(taskData.estimatedHours || taskData.completedAt) && (
                    <div className="mt-4 max-w-md">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <Target size={10} />Task Progress
                        </span>
                        <span className={`text-xs font-black ${taskProgressPct === 100 ? "text-emerald-500" : "text-gray-600 dark:text-gray-300"}`}>
                          {taskProgressPct}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${taskProgressColor} rounded-full transition-all duration-700`}
                          style={{ width: `${taskProgressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right quick stats */}
                <div className="hidden xl:flex flex-col gap-3 shrink-0 min-w-[200px]">
                  {taskData.dueDate && (
                    <div className={`px-4 py-3 rounded-xl border text-center ${isOverdue ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40"
                      : isDueSoon ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isOverdue ? "text-red-400" : isDueSoon ? "text-amber-500" : "text-gray-400"}`}>
                        {isOverdue ? "⚠ Overdue" : isDueSoon ? "⏰ Due Soon" : "Due Date"}
                      </p>
                      <p className={`text-sm font-black ${isOverdue ? "text-red-600 dark:text-red-400" : isDueSoon ? "text-amber-600 dark:text-amber-400" : "text-gray-800 dark:text-gray-100"}`}>
                        {formatDate(taskData.dueDate as string)}
                      </p>
                    </div>
                  )}
                  {taskData.createdBy && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <AvatarCircle name={`${taskData.createdBy.firstName} ${taskData.createdBy.lastName ?? ""}`} size="md" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Created by</p>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{taskData.createdBy.firstName}</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>


          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Estimated"
              value={taskData.estimatedHours ? `${taskData.estimatedHours}h` : "—"}
              sub="planned hours"
              icon={<Timer size={18} className="text-violet-500" />}
              accent="bg-violet-500"
            />
            <StatCard
              label="Actual"
              value={taskData.actualHours ? `${taskData.actualHours}h` : "—"}
              sub="hours logged"
              icon={<Clock size={18} className="text-blue-500" />}
              accent="bg-blue-500"
            />
            <StatCard
              label="Activities"
              value={taskActivity.length || "0"}
              sub="events recorded"
              icon={<Zap size={18} className="text-amber-500" />}
              accent="bg-amber-500"
            />
            <StatCard
              label="Priority"
              value={priority.label}
              sub="task urgency"
              icon={<Star size={18} className="text-rose-500" />}
              accent="bg-rose-500"
            />
          </div>

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

            {/* Left column */}
            <div className="xl:col-span-2 space-y-5">

              {/* Description */}
              {taskData.description && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <MessageSquare size={13} className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Description</h3>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{taskData.description}</p>
                  </div>
                </div>
              )}

              {/* Sub-tasks */}
              {/* <ComingSoonOverlay show={true}>
              </ComingSoonOverlay> */}
              <SubTaskSection taskId={taskId} />


              {/* ── Activity Log (Fixed height + scrollable) ── */}
              <ActivityLog activities={taskActivity} loading={activityLoading} />
            </div>

            {/* Right sidebar */}
            <div className="space-y-5">
              {/* Tags */}
              {taskData.tags && taskData.tags.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Tag size={13} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Tags</h3>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      {taskData.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 hover:border-violet-200 transition-colors">
                          <Tag size={10} /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Assignees */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                    <User size={13} className="text-sky-500 dark:text-sky-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Assigned To</h3>
                </div>
                <div className="p-4">
                  {taskData.assignedTo && taskData.assignedTo.length > 0 ? (
                    <div className="space-y-2">
                      {taskData.assignedTo.map((user) => (
                        <Link
                          key={user.id}
                          href={`/users/${user.id}`}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                        >
                          <div key={user.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                            <AvatarCircle name={`${user.firstName} ${user.lastName ?? ""}`} avatar={user.avatar} size="md" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2">
                        <User size={18} className="text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">No assignees</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Time Tracking */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                    <TrendingUp size={13} className="text-violet-500 dark:text-violet-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Time Tracking</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/10 rounded-xl p-3 text-center border border-violet-100 dark:border-violet-900/30">
                      <p className="text-[10px] font-black uppercase tracking-wider text-violet-400 mb-1">Estimated</p>
                      <p className="text-2xl font-black text-violet-700 dark:text-violet-300">
                        {taskData.estimatedHours ?? "—"}
                        {taskData.estimatedHours && <span className="text-xs font-bold opacity-60 ml-0.5">h</span>}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/10 rounded-xl p-3 text-center border border-sky-100 dark:border-sky-900/30">
                      <p className="text-[10px] font-black uppercase tracking-wider text-sky-400 mb-1">Actual</p>
                      <p className="text-2xl font-black text-sky-700 dark:text-sky-300">
                        {taskData.actualHours ?? "—"}
                        {taskData.actualHours && <span className="text-xs font-bold opacity-60 ml-0.5">h</span>}
                      </p>
                    </div>
                  </div>
                  {taskData.estimatedHours ? (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                        <span className="font-semibold">Progress</span>
                        <span className="font-black text-gray-700 dark:text-gray-200">
                          {Math.min(100, Math.round(((taskData.actualHours ?? 0) / taskData.estimatedHours) * 100))}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((taskData.actualHours ?? 0) / taskData.estimatedHours) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center font-medium">No estimate set</p>
                  )}
                </div>
              </div>

              {/* Recurrence */}
              {taskData.isRecurring && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                      <RefreshCw size={13} className="text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recurrence</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Frequency</span>
                      <span className="text-xs font-black capitalize text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg">{taskData.recurrenceType}</span>
                    </div>
                    {taskData.recurrenceEndsAt && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Ends on</span>
                        <span className="text-xs font-black text-gray-700 dark:text-gray-200">{formatDate(taskData.recurrenceEndsAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Details */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Layers size={13} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Details</h3>
                </div>
                <div className="p-5">
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    <MetaRow icon={<Calendar size={11} />} label="Due Date">
                      {taskData.dueDate ? (
                        <span className={`font-semibold ${isOverdue ? "text-red-600 dark:text-red-400" : isDueSoon ? "text-amber-600 dark:text-amber-400" : ""}`}>
                          {formatDate(taskData.dueDate as string)}
                          {isOverdue && <span className="ml-2 text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-md">OVERDUE</span>}
                          {!isOverdue && isDueSoon && <span className="ml-2 text-[10px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md">SOON</span>}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </MetaRow>
                    <MetaRow icon={<Calendar size={11} />} label="Start Date">
                      {taskData.startDate ? <span className="font-semibold">{formatDate(taskData.startDate as string)}</span> : <span className="text-gray-400">—</span>}
                    </MetaRow>
                    <MetaRow icon={<Clock size={11} />} label="Hours">
                      {taskData.estimatedHours
                        ? <span className="font-semibold">{taskData.estimatedHours}h estimated{taskData.actualHours ? ` · ${taskData.actualHours}h actual` : ""}</span>
                        : <span className="text-gray-400">—</span>}
                    </MetaRow>
                    {taskData.entityType && (
                      <MetaRow icon={<Building2 size={11} />} label="Linked To">
                        <span className="capitalize font-semibold">{taskData.entityType}{taskData.entityName ? ` · ${taskData.entityName}` : ""}</span>
                      </MetaRow>
                    )}
                    <MetaRow icon={<User size={11} />} label="Created By">
                      {taskData.createdBy ? (
                        <div className="flex items-center gap-2">
                          <AvatarCircle name={`${taskData.createdBy.firstName} ${taskData.createdBy.lastName ?? ""}`} />
                          <span className="font-semibold">{taskData.createdBy.firstName} {taskData.createdBy.lastName}</span>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </MetaRow>
                    <MetaRow icon={<Clock size={11} />} label="Created">
                      <span className="font-semibold">{formatDateTime(taskData.createdAt)}</span>
                    </MetaRow>
                    <MetaRow icon={<Clock size={11} />} label="Updated">
                      <span className="font-semibold">{formatDateTime(taskData.updatedAt)}</span>
                    </MetaRow>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {taskData.attachments && taskData.attachments.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                        <Paperclip size={13} className="text-teal-500 dark:text-teal-400" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Attachments</h3>
                    </div>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full font-bold">{taskData.attachments.length}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {taskData.attachments.map((att, i) => (
                      <a key={i} href={att} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 border border-gray-100 dark:border-gray-700 hover:border-teal-200 dark:hover:border-teal-800 transition-all group">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                          <Paperclip size={13} className="text-teal-500 dark:text-teal-400" />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 font-medium">{att.split("/").pop()}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
          {/* Remark Chat  */}
          {/* <button
            onClick={() => setShowRemarkModal(true)}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg"
          >
            Open Remarks
          </button> */}
          {(
            <RemarkModal
              taskId={taskId}
              // onClose={()=>{setShowRemarkModal(false)}}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default page;