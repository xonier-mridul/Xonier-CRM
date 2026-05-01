import { TASK_PRIORITY } from "../types/task/task.types";

export const SIDEBAR_WIDTH = "280px"
export const MARGIN_TOP = "12"
export const SUPER_ADMIN_ROLE_CODE:string = "SUPER_ADMIN"
export const STOP_DISPLAY_MS = 4000;

export const PRIORITY_STYLE: Record<
  TASK_PRIORITY,
  { cls: string; dot: string; label: string }
> = {
  [TASK_PRIORITY.LOW]: {
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    dot: "bg-slate-400",
    label: "Low",
  },
  [TASK_PRIORITY.MEDIUM]: {
    cls: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-400",
    label: "Medium",
  },
  [TASK_PRIORITY.HIGH]: {
    cls: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    dot: "bg-orange-500",
    label: "High",
  },
  [TASK_PRIORITY.URGENT]: {
    cls: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    dot: "bg-rose-500",
    label: "Urgent",
  },
};