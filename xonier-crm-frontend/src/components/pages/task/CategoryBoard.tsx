"use client";
import { CategoryBoardProps, PendingDrop, TaskItem } from "@/src/types/task/task.types";
import { useRef, useState } from "react";
import MarkFinalModal, { MarkFinalPayload } from "./Marrkfinalmodal";
import { toast } from "react-toastify";
import { getColorOption } from "./createStatusModal";
import BoardCard from "./BoardCard";
import { useTranslation } from "react-i18next";
import { Check, CheckCircle2, Folder, Inbox } from "lucide-react";

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
  const { t } = useTranslation();
  const boardRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

  const handleAutoScroll = (e: React.DragEvent) => {
    const container = boardRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const threshold = 500;
    const speed = 10;
    const mouseX = e.clientX;

    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    if (mouseX < rect.left + threshold) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft -= speed;
      }, 16);
    } else if (mouseX > rect.right - threshold) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft += speed;
      }, 16);
    }
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
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
    stopAutoScroll();
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

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    stopAutoScroll();
  };

  const isCategoryEmoji = categoryIcon && categoryIcon !== "❓" && categoryIcon !== "?";

  return (
    <>
      <div className="mb-10">
        {/* Category Swimlane Header Bar */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-8.5 h-8.5 rounded-xl flex items-center justify-center text-sm shadow-2xs shrink-0"
              style={{
                backgroundColor: categoryColor ? `${categoryColor}15` : "rgba(100, 116, 139, 0.1)",
                color: categoryColor || "#0891b2",
                border: `1px solid ${categoryColor ? `${categoryColor}30` : "rgba(100, 116, 139, 0.2)"}`,
              }}
            >
              {isCategoryEmoji ? categoryIcon : <Folder size={16} />}
            </span>
            <div className="flex items-center gap-2.5 min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {categoryName}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 tabular-nums">
                {tasks.length} {t("task_2")}{tasks.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Status Breakdown Summary Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {statuses.map((s) => {
              const count = tasks.filter((t) => t?.status?.id === s.id).length;
              const dotColor = s.color && s.color.toLowerCase() !== "#ffffff" ? s.color : "#0891b2";
              return (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-600 dark:text-slate-400"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="truncate max-w-[90px]">{s.name}</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">{count}</span>
                  {s.isFinal && <Check size={10} className="text-emerald-500 shrink-0" />}
                </span>
              );
            })}
          </div>
        </div>

        {/* Board Columns Scroll Area */}
        <div
          ref={boardRef}
          className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar items-start"
          onDragLeave={handleDragLeave}
          onDragOver={(e) => {
            handleAutoScroll(e);
          }}
        >
          {statuses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <Inbox className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-medium">{t("no_statuses_for_this_category")}</p>
            </div>
          ) : (
            statuses.map((status) => {
              const columnTasks = tasks.filter((t) => t?.status?.id === status.id);
              const isDragOver = dragOverStatusId === status.id;
              const isFinal = status.isFinal;
              const dotColor =
                status.color && status.color.toLowerCase() !== "#ffffff"
                  ? status.color
                  : "#0891b2";

              return (
                <div
                  key={status.id}
                  className={`flex flex-col rounded-2xl transition-all duration-150 min-w-[280px] max-w-[315px] flex-shrink-0 p-2.5 ${
                    isDragOver
                      ? "border-2 border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/30 ring-2 ring-cyan-500/20"
                      : "bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800"
                  }`}
                  onDragOver={(e) => handleDragOver(e, status.id)}
                  onDrop={(e) => handleDrop(e, status.id)}
                >
                  {/* Column Header: High Contrast, Clean, Professional */}
                  <div className="flex items-center justify-between px-3 py-2 mb-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/70 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {isFinal ? (
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      ) : (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ring-2 ring-slate-100 dark:ring-slate-700"
                          style={{ backgroundColor: dotColor }}
                        />
                      )}
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white capitalize truncate tracking-tight">
                        {status.name}
                      </h3>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full tabular-nums shrink-0">
                        {columnTasks.length}
                      </span>
                    </div>

                    {isFinal && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shrink-0">
                        <Check size={9} strokeWidth={3} />
                        {t("final_2")}
                      </span>
                    )}
                  </div>

                  {/* Task Cards Container */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[140px] max-h-[640px] custom-scrollbar">
                    {columnTasks.length === 0 ? (
                      <div className={`flex flex-col items-center justify-center py-8 rounded-xl border border-dashed transition-colors ${isDragOver ? "border-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/20" : "border-slate-200 dark:border-slate-700/60"}`}>
                        <Inbox className="w-5 h-5 mb-1 text-slate-300 dark:text-slate-600" />
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          {isDragOver ? t("drop_here") : t("no_tasks")}
                        </p>
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <BoardCard
                          handleDragEnd={handleDragEnd}
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
                      <div className="flex items-center justify-center py-2.5 rounded-xl border border-dashed border-cyan-400 dark:border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/20">
                        <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">{t("drop_here")}</p>
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

export default CategoryBoard;