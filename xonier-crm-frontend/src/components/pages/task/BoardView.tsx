import { BoardViewProps } from "@/src/types/task/task.types";
import CategoryBoard from "./CategoryBoard";

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