"use client"
import { CategoryBoardProps, PendingDrop, TaskItem } from "@/src/types/task/task.types";
import { useRef, useState } from "react";
import MarkFinalModal, { MarkFinalPayload } from "./Marrkfinalmodal";
import { toast } from "react-toastify";
import { getColorOption } from "./createStatusModal";
import BoardCard from "./BoardCard";
import { useTranslation } from "react-i18next";

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
  const boardRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
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

  const handleAutoScroll = (e:React.DragEvent)=>{
    const container = boardRef.current
    if(!container) return;

    const rect = container.getBoundingClientRect();

    const threshold = 500
    const speed = 10

    const mouseX = e.clientX

    if(scrollIntervalRef.current){
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }

    if(mouseX < rect.left + threshold){
      scrollIntervalRef.current= setInterval(()=>{
        container.scrollLeft -= speed;
      },16)
    }
    else if(mouseX > rect.right - threshold){
      scrollIntervalRef.current = setInterval(()=>{
      container.scrollLeft +=speed},16)
    }
  };

  const stopAutoScroll=()=>{
    if(scrollIntervalRef.current){
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatusId(statusId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatusId(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatusId: string) => {
    stopAutoScroll()
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

  const handleDragEnd =(e: React.DragEvent<HTMLDivElement>)=>{
    stopAutoScroll()
  }

  return (
    <>
      <div className="mb-8 max-h-130 overflow-y-scroll ">
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
              {tasks.length} {t("task_2")}{tasks.length !== 1 ? "s" : ""}
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
                  {s.icon} {tasks.filter((t) => t?.status?.id === s.id).length}
                  {s.isFinal && " ✓"}
                </span>
              );
            })}
          </div>
        </div>

       <div
  ref={boardRef}
  className="flex gap-4 overflow-x-auto pb-3"
  onDragLeave={handleDragLeave}
  onDragOver={(e) => {
    handleAutoScroll(e);
  }}
>
          {statuses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
              <span className="text-3xl mb-2">🗂️</span>
              <p className="text-sm font-semibold">{t("no_statuses_for_this_category")}</p>
            </div>
          ) : (
            statuses.map((status) => {
              const columnTasks = tasks.filter((t) => t?.status?.id === status.id);
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
                          {t("final_2")}
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
                      <div className="flex items-center justify-center py-3 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-600 bg-blue-50/60 dark:bg-blue-900/20">
                        <p className="text-xs text-blue-500 font-semibold">{t("drop_here")}</p>
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

export default CategoryBoard