"use client"
import { PRIORITY_STYLE } from "@/src/constants/constants";
import { BoardCardProps } from "@/src/types/task/task.types";
import { useRouter } from "next/navigation";
import { getColorOption } from "./createStatusModal";
import { MdDelete, MdEdit, MdOutlineMessage } from "react-icons/md";
import { Star } from "lucide-react";
import CategoryBadge from "./CategoryBadge";
import { useTranslation } from "react-i18next";

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

    function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}



  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={handleDragEnd}
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
  <div className="mb-2 flex items-center max-w-[50%] min-w-0">
    
    <span
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold 
      ${statusColor.bg} ${statusColor.text} 
      w-full min-w-0`}
    >
     
      <span className="shrink-0">
        {task.status?.icon ?? "📌"}
      </span>

      
      <span className="truncate block min-w-0">
        {task.status?.name ?? task.statusName ?? "—"}
      </span>
    </span>

  </div>

  {task.category && (
    <div className="mb-2 max-w-[50%] min-w-0">
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
            <span className="text-[10px] italic text-gray-300 dark:text-gray-600">{t("unassigned")} </span>
          ) : (
            <>
              {task.assignedTo.slice(0, 2).map((u) => (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/users/${u.id}`); }}
                  key={u.id}
                  title={u.firstName}
                  className="px-2 h-6 rounded-full bg-linear-to-br cursor-pointer hover:scale-105 from-blue-400 to-indigo-600 border-2 border-white dark:border-gray-800 flex items-center justify-center capitalize text-white text-[8px] font-bold shrink-0"
                >
                  {u.firstName ?? "N/A"} {u?.lastName}
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
                {t("total")}
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
              {t("logged")}
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
                  title={t("pause_timer")}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
                    <rect x="6" y="1" width="2.5" height="8" rx="0.5" />
                  </svg>
                  {t("pause")}
                </button>
              )}
              {isPaused && canResumeTimer && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onTimer(task); }}
                  title={t("resume_timer")}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
                  </svg>
                  {t("resume")}
                </button>
              )}
              {canStopTimer && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onStop(task); }}
                  title={t("stop_timer")}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <rect x="1" y="1" width="8" height="8" rx="1" />
                  </svg>
                  {t("stop")}
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
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20 border border-dashed border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
              </svg>
              {t("start_timer")} 
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default BoardCard