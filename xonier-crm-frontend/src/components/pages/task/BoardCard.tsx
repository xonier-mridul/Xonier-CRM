"use client";
import React from "react";
import { TASK_PRIORITY, BoardCardProps } from "@/src/types/task/task.types";
import { useRouter } from "next/navigation";
import { getColorOption } from "./createStatusModal";
import { MdDelete, MdEdit, MdOutlineMessage } from "react-icons/md";
import { Star, Play, Pause, Square, Calendar, AlertCircle } from "lucide-react";
import CategoryBadge from "./CategoryBadge";
import { useTranslation } from "react-i18next";

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.trim()?.[0] || "";
  const l = lastName?.trim()?.[0] || "";
  return (f + l).toUpperCase() || "U";
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function BoardCard({
  task,
  handleDragEnd,
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
  const { t } = useTranslation();

  const pri = {
    [TASK_PRIORITY.URGENT]: {
      cls: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/70",
      dot: "bg-rose-500",
      label: t("priority_urgent") || "Urgent",
    },
    [TASK_PRIORITY.HIGH]: {
      cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/70",
      dot: "bg-amber-500",
      label: t("priority_high") || "High",
    },
    [TASK_PRIORITY.MEDIUM]: {
      cls: "bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300 border-slate-200/80 dark:border-slate-600",
      dot: "bg-sky-500",
      label: t("priority_medium") || "Medium",
    },
    [TASK_PRIORITY.LOW]: {
      cls: "bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/60",
      dot: "bg-slate-400",
      label: t("priority_low") || "Low",
    },
  }[task.priority] || {
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200",
    dot: "bg-slate-400",
    label: task.priority || "Normal",
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const router = useRouter();

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
      onDragEnd={handleDragEnd}
      onClick={() => router.push(`/task/detail/${task.id}`)}
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-700 transition-all duration-150 group select-none relative"
    >
      {/* Top Metadata Row: Priority Badge, Category Tag & Hover Quick Actions */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${pri.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
            {pri.label}
          </span>

          {task.category && (
            <div className="max-w-[130px] min-w-0">
              <CategoryBadge
                color={getColorOption(task.category.color || null)}
                icon={task.category.icon || ""}
                name={task.category.name}
              />
            </div>
          )}
        </div>

        {/* Hover Quick Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {canRemark && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemark(task); }}
              title="Add remark"
              className="p-1 rounded-md text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition cursor-pointer"
            >
              <MdOutlineMessage className="text-sm" />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(task.id); }}
              title="Edit task"
              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
            >
              <MdEdit className="text-sm" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              title="Delete task"
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50 cursor-pointer"
            >
              <MdDelete className="text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Task Title & Description */}
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug mb-1 line-clamp-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
        {task.title}
      </h3>
      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 font-normal leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
              #{tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-400">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Unified Bottom Row: Assignees & Due Date on left, Timer on right */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2 min-w-0">
          {/* Assignees */}
          <div className="flex -space-x-1.5 shrink-0">
            {task.assignedTo?.length === 0 ? (
              <span className="text-[10px] italic text-slate-400 dark:text-slate-500">{t("unassigned")}</span>
            ) : (
              <>
                {task.assignedTo.slice(0, 3).map((u) => (
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/users/${u.id}`); }}
                    key={u.id}
                    title={`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || t("user")}
                    className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-cyan-600 to-cyan-500 text-white border-2 border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-bold cursor-pointer hover:scale-110 transition-transform shadow-2xs"
                  >
                    {getInitials(u.firstName, u.lastName)}
                  </button>
                ))}
                {task.assignedTo.length > 3 && (
                  <div className="w-6.5 h-6.5 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                    +{task.assignedTo.length - 3}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <span className={`text-[10px] font-medium flex items-center gap-1 shrink-0 ${
              isOverdue
                ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded font-semibold"
                : "text-slate-400 dark:text-slate-500"
            }`}>
              {isOverdue ? <AlertCircle className="w-3 h-3 text-rose-500" /> : <Calendar className="w-3 h-3 text-slate-400" />}
              {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
            </span>
          )}

          {/* Rating */}
          {task.rating && (
            <div className="flex items-center gap-0.5 text-amber-500 text-xs font-semibold shrink-0">
              <Star size={11} fill="currentColor" />
              <span className="tabular-nums">{task.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Timer Control / Display */}
        <div className="shrink-0 ml-2">
          {isFinalStatus ? (
            hasTimer && canViewTimer ? (
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                {formatSeconds(displaySeconds)}
              </span>
            ) : null
          ) : isStopped ? (
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 tabular-nums bg-slate-50 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
              {formatSeconds(displaySeconds)}
            </span>
          ) : hasTimer ? (
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-white tabular-nums">
                {formatSeconds(displaySeconds)}
              </span>
              <div className="flex items-center gap-0.5 ml-0.5">
                {isRunning && canPauseTimer && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onTimer(task); }}
                    title={t("pause_timer")}
                    className="p-1 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                  >
                    <Pause size={10} fill="currentColor" />
                  </button>
                )}
                {isPaused && canResumeTimer && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onTimer(task); }}
                    title={t("resume_timer")}
                    className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                  >
                    <Play size={10} fill="currentColor" />
                  </button>
                )}
                {canStopTimer && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onStop(task); }}
                    title={t("stop_timer")}
                    className="p-1 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <Square size={9} fill="currentColor" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            canStartTimer && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onTimer(task); }}
                title={t("start_timer_2")}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                <Play size={10} fill="currentColor" className="text-cyan-600 dark:text-cyan-400" />
                <span>{t("start_timer")}</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default BoardCard;