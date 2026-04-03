"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { TaskActivity, TaskItem, TASK_PRIORITY } from "@/src/types/task/task.types";
import { TASK_ACTIVITY_ACTION } from "@/src/constants/enum";
import { toast } from "react-toastify";
import { TaskService } from "@/src/services/tasks.service";
import { useParams } from "next/navigation";
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
} from "lucide-react";

const PRIORITY_CONFIG: Record<TASK_PRIORITY, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  [TASK_PRIORITY.LOW]: {
    label: "Low",
    color: "text-slate-500",
    bg: "bg-slate-100 dark:bg-slate-800",
    icon: <Minus size={13} />,
  },
  [TASK_PRIORITY.MEDIUM]: {
    label: "Medium",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    icon: <TrendingUp size={13} />,
  },
  [TASK_PRIORITY.HIGH]: {
    label: "High",
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    icon: <ChevronsUp size={13} />,
  },
  [TASK_PRIORITY.URGENT]: {
    label: "Urgent",
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/20",
    icon: <Flame size={13} />,
  },
};

const ACTION_CONFIG: Record<TASK_ACTIVITY_ACTION, { icon: React.ReactNode; color: string; dot: string }> = {
  [TASK_ACTIVITY_ACTION.CREATED]: {
    icon: <CircleDot size={14} />,
    color: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  [TASK_ACTIVITY_ACTION.STATUS_CHANGED]: {
    icon: <ArrowUpDown size={14} />,
    color: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  [TASK_ACTIVITY_ACTION.ASSIGNED]: {
    icon: <UserPlus size={14} />,
    color: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  [TASK_ACTIVITY_ACTION.REASSIGNED]: {
    icon: <UserCheck size={14} />,
    color: "text-indigo-600 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  [TASK_ACTIVITY_ACTION.PRIORITY_CHANGED]: {
    icon: <ChevronsUp size={14} />,
    color: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  [TASK_ACTIVITY_ACTION.DUE_DATE_CHANGED]: {
    icon: <Calendar size={14} />,
    color: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  [TASK_ACTIVITY_ACTION.COMMENTED]: {
    icon: <MessageSquare size={14} />,
    color: "text-slate-600 dark:text-slate-400",
    dot: "bg-slate-500",
  },
  [TASK_ACTIVITY_ACTION.ATTACHMENT_ADDED]: {
    icon: <Paperclip size={14} />,
    color: "text-teal-600 dark:text-teal-400",
    dot: "bg-teal-500",
  },
  [TASK_ACTIVITY_ACTION.COMPLETED]: {
    icon: <CheckCircle2 size={14} />,
    color: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  [TASK_ACTIVITY_ACTION.REOPENED]: {
    icon: <RotateCcw size={14} />,
    color: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  [TASK_ACTIVITY_ACTION.DELETED]: {
    icon: <Trash2 size={14} />,
    color: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
};

const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const formatRelativeTime = (date: string): string => {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

const getInitials = (firstName: string, lastName?: string): string =>
  `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

const AvatarCircle = ({ name, avatar, size = "sm" }: { name: string; avatar?: string; size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "lg" ? "w-9 h-9 text-sm" : size === "md" ? "w-7 h-7 text-xs" : "w-6 h-6 text-[10px]";
  const colors = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-indigo-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatar)
    return <img src={avatar} alt={name} className={`${sizeClass} rounded-full object-cover ring-2 ring-white dark:ring-gray-900`} />;
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white dark:ring-gray-900 flex-shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  );
};

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

const TaskDetailSkeleton = () => (
  <div className="ml-72 mt-14 p-6 space-y-6">
    <SkeletonBlock className="h-8 w-2/3" />
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-24" />
      </div>
      <div className="space-y-4">
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-32" />
      </div>
    </div>
  </div>
);

const MetaRow = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <div className="flex items-center gap-2 w-36 shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">
      <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      {label}
    </div>
    <div className="flex-1 text-sm text-gray-700 dark:text-gray-200">{children}</div>
  </div>
);

const SectionCard = ({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
      <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 tracking-tight">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const ActivityItem = ({ activity, isLast }: { activity: TaskActivity; isLast: boolean }) => {
  const cfg = ACTION_CONFIG[activity.action] ?? {
    icon: <CircleDot size={14} />,
    color: "text-gray-500",
    dot: "bg-gray-400",
  };

  return (
    <div className="flex gap-3 relative">
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-100 dark:bg-gray-800" />
      )}
      <div className={`w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 z-10 ${cfg.color}`}>
        {cfg.icon}
      </div>
      <div className="flex-1 pb-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{activity.description}</p>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0 mt-0.5">
            {formatRelativeTime(activity.createdAt)}
          </span>
        </div>
        {(activity.oldValue || activity.newValue) && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {activity.oldValue && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium line-through">
                {activity.oldValue}
              </span>
            )}
            {activity.oldValue && activity.newValue && (
              <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
            )}
            {activity.newValue && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                {activity.newValue}
              </span>
            )}
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span className="text-[11px] text-gray-400 dark:text-gray-500 capitalize">
            {activity.action.replace(/_/g, " ")}
          </span>
          <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {formatDateTime(activity.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

const page = () => {
  const [taskData, setTaskData] = useState<TaskItem | null>(null);
  const [taskActivity, setTaskActivity] = useState<TaskActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activityLoading, setActivityLoading] = useState<boolean>(true);

  const { id } = useParams();

  const getTaskData = async (taskId: string) => {
    try {
      const result = await TaskService.getById(taskId);
      if (result.status === 200) setTaskData(result.data.data);
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      if (axios.isAxiosError(e))
        toast.error(e.response?.data?.message ?? "Failed to load task");
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskActivity = async (taskId: string) => {
    try {
      const result = await TaskService.getActivity(taskId);
      if (result.status === 200) {
        const raw = result.data.data;
        setTaskActivity(Array.isArray(raw) ? raw : raw ? [raw] : []);
      }
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
      if (axios.isAxiosError(e))
        toast.error(e.response?.data?.message ?? "Failed to load activity");
    } finally {
      setActivityLoading(false);
    }
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
        <div className="text-center space-y-2">
          <AlertCircle size={32} className="text-gray-300 dark:text-gray-600 mx-auto" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Task not found</p>
        </div>
      </div>
    );
  }

  const priority = PRIORITY_CONFIG[taskData.priority];
  const isDueSoon = taskData.dueDate && new Date(taskData.dueDate as string) < new Date(Date.now() + 86400000 * 2);
  const isOverdue = taskData.dueDate && new Date(taskData.dueDate as string) < new Date();

  return (
    <div className="ml-72 mt-14 p-6 space-y-5 max-w-[1400px]">

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {taskData.category && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                <Layers size={11} />
                {taskData.category?.name ?? taskData.categoryName}
              </span>
            )}
            {taskData.entityType && taskData.entityName && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-2.5 py-1 rounded-full">
                <Link2 size={11} />
                {taskData.entityType} · {taskData.entityName}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
            {taskData.title}
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: taskData.status?.color ? `${taskData.status.color}18` : undefined,
                color: taskData.status?.color ?? "",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: taskData.status?.color ?? "" }} />
              {taskData.status?.name ?? taskData.statusName}
            </span>

            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${priority.bg} ${priority.color}`}>
              {priority.icon}
              {priority.label}
            </span>

            {taskData.isRecurring && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                <RefreshCw size={11} />
                Recurring · {taskData.recurrenceType}
              </span>
            )}

            {taskData.completedAt && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={11} />
                Completed {formatDate(taskData.completedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        <div className="xl:col-span-2 space-y-5">

          {taskData.description && (
            <SectionCard title="Description" icon={<MessageSquare size={15} />}>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {taskData.description}
              </p>
            </SectionCard>
          )}

          <SectionCard title="Details" icon={<Layers size={15} />}>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">

              <MetaRow icon={<Calendar size={13} />} label="Due Date">
                {taskData.dueDate ? (
                  <span className={`font-medium ${isOverdue ? "text-red-600 dark:text-red-400" : isDueSoon ? "text-amber-600 dark:text-amber-400" : "text-gray-700 dark:text-gray-200"}`}>
                    {formatDate(taskData.dueDate as string)}
                    {isOverdue && <span className="ml-2 text-xs font-semibold text-red-500">Overdue</span>}
                    {!isOverdue && isDueSoon && <span className="ml-2 text-xs font-semibold text-amber-500">Due soon</span>}
                  </span>
                ) : <span className="text-gray-400">—</span>}
              </MetaRow>

              <MetaRow icon={<Calendar size={13} />} label="Start Date">
                {taskData.startDate ? (
                  <span>{formatDate(taskData.startDate as string)}</span>
                ) : <span className="text-gray-400">—</span>}
              </MetaRow>

              <MetaRow icon={<Clock size={13} />} label="Estimated">
                {taskData.estimatedHours ? (
                  <span>{taskData.estimatedHours}h estimated{taskData.actualHours ? ` · ${taskData.actualHours}h actual` : ""}</span>
                ) : <span className="text-gray-400">—</span>}
              </MetaRow>

              {taskData.entityType && (
                <MetaRow icon={<Building2 size={13} />} label="Linked To">
                  <span className="capitalize">{taskData.entityType}{taskData.entityName ? ` · ${taskData.entityName}` : ""}</span>
                </MetaRow>
              )}

              <MetaRow icon={<User size={13} />} label="Created By">
                {taskData.createdBy ? (
                  <div className="flex items-center gap-2">
                    <AvatarCircle
                      name={`${taskData.createdBy.firstName} ${taskData.createdBy.lastName ?? ""}`}
              
                    />
                    <span>{taskData.createdBy.firstName} {taskData.createdBy.lastName}</span>
                  </div>
                ) : <span className="text-gray-400">—</span>}
              </MetaRow>

              <MetaRow icon={<Clock size={13} />} label="Created">
                <span>{formatDateTime(taskData.createdAt)}</span>
              </MetaRow>

              <MetaRow icon={<Clock size={13} />} label="Updated">
                <span>{formatDateTime(taskData.updatedAt)}</span>
              </MetaRow>

            </div>
          </SectionCard>

          {taskData.tags && taskData.tags.length > 0 && (
            <SectionCard title="Tags" icon={<Tag size={15} />}>
              <div className="flex flex-wrap gap-2">
                {taskData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                  >
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-gray-400 dark:text-gray-500"><Clock size={15} /></span>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 tracking-tight">Activity Log</h3>
              </div>
              {taskActivity.length > 0 && (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full font-medium">
                  {taskActivity.length} events
                </span>
              )}
            </div>
            <div className="p-5">
              {activityLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <SkeletonBlock className="h-4 w-3/4" />
                        <SkeletonBlock className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : taskActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                  <Clock size={28} className="text-gray-200 dark:text-gray-700" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">No activity recorded yet</p>
                </div>
              ) : (
                <div>
                  {taskActivity.map((activity, index) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      isLast={index === taskActivity.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">

          <SectionCard title="Assigned To" icon={<User size={15} />}>
            {taskData.assignedTo && taskData.assignedTo.length > 0 ? (
              <div className="space-y-3">
                {taskData.assignedTo.map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <AvatarCircle
                      name={`${user.firstName} ${user.lastName ?? ""}`}
                      avatar={user.avatar}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No assignees</p>
            )}
          </SectionCard>

          <SectionCard title="Progress" icon={<TrendingUp size={15} />}>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Time Tracking</span>
                {taskData.estimatedHours ? (
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {taskData.actualHours ?? 0}h / {taskData.estimatedHours}h
                  </span>
                ) : <span>Not set</span>}
              </div>
              {taskData.estimatedHours ? (
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((taskData.actualHours ?? 0) / taskData.estimatedHours) * 100)}%`,
                    }}
                  />
                </div>
              ) : (
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full" />
              )}

              <div className="pt-1 grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Estimated</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    {taskData.estimatedHours ?? "—"}
                    {taskData.estimatedHours && <span className="text-xs font-normal text-gray-400 ml-0.5">h</span>}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Actual</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    {taskData.actualHours ?? "—"}
                    {taskData.actualHours && <span className="text-xs font-normal text-gray-400 ml-0.5">h</span>}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          {taskData.isRecurring && (
            <SectionCard title="Recurrence" icon={<RefreshCw size={15} />}>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Frequency</span>
                  <span className="font-medium capitalize text-gray-800 dark:text-gray-200">{taskData.recurrenceType}</span>
                </div>
                {taskData.recurrenceEndsAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Ends on</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatDate(taskData.recurrenceEndsAt)}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {taskData.attachments && taskData.attachments.length > 0 && (
            <SectionCard title="Attachments" icon={<Paperclip size={15} />}>
              <div className="space-y-2">
                {taskData.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <Paperclip size={13} className="text-gray-400 group-hover:text-violet-500 transition-colors shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{att.split("/").pop()}</span>
                  </a>
                ))}
              </div>
            </SectionCard>
          )}

        </div>
      </div>
    </div>
  );
};

export default page;