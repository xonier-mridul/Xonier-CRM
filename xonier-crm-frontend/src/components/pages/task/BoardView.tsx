import { BoardViewProps } from "@/src/types/task/task.types";
import CategoryBoard from "./CategoryBoard";
import { useTranslation } from "react-i18next";
import { Inbox } from "lucide-react";

export default function BoardView({
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
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: skeletonlength }).map((_, gi) => (
          <div key={gi} className="animate-pulse space-y-4">
            <div className="h-6 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="flex gap-4">
              {Array.from({ length: 3 }).map((_, ci) => (
                <div
                  key={ci}
                  className="min-w-[275px] bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 space-y-3"
                >
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  {Array.from({ length: 2 }).map((_, ti) => (
                    <div
                      key={ti}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-3.5 space-y-2.5"
                    >
                      <div className="h-3.5 w-16 bg-slate-100 dark:bg-slate-700 rounded-md" />
                      <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-md" />
                      <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-700 rounded-md" />
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
        color: task.category.color ?? "#0891b2",
        icon: task.category.icon ?? "",
      });
    }
  });
  const categories = Array.from(categoriesMap.values());

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
        <Inbox className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-semibold">{t("no_tasks_to_display")}</p>
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