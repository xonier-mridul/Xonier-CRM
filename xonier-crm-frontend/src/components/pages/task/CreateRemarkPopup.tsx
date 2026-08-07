import { CreateRemarkProps } from "@/src/types/task/remark.types";
import React, { JSX } from "react";
import { FaXmark } from "react-icons/fa6";
import { IoSaveOutline, IoTimeOutline, IoPersonOutline, IoFlagOutline } from "react-icons/io5";
import { TASK_PRIORITY } from "@/src/types/task/task.types";
import { getColorOption } from "@/src/components/pages/task/createStatusModal";
import { useTranslation } from "react-i18next";

const PRIORITY_STYLE: Record<TASK_PRIORITY, { cls: string; dot: string; label: string }> = {
  [TASK_PRIORITY.LOW]: { cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400", label: "Low" },
  [TASK_PRIORITY.MEDIUM]: { cls: "bg-amber-50 text-amber-600", dot: "bg-amber-400", label: "Medium" },
  [TASK_PRIORITY.HIGH]: { cls: "bg-orange-50 text-orange-600", dot: "bg-orange-500", label: "High" },
  [TASK_PRIORITY.URGENT]: { cls: "bg-rose-50 text-rose-600", dot: "bg-rose-500", label: "Urgent" },
};

const CreateRemarkPopup = ({
  remarkPayload,
  task,
  onChange,
  onCancel,
  handleAddRemark,
  remarkLoad,
}: CreateRemarkProps): JSX.Element => {
  const { t } = useTranslation();
  const pri = task ? PRIORITY_STYLE[task.priority] : null;
  const statusColor = task ? getColorOption(task.status.color) : null;
  const isOverdue = task?.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div className="fixed inset-0 z-[199] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
              <span className="text-base">💬</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{t("add_remark")}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t("leave_a_note_on_this_task")}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:rotate-90"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {task && (
          <div className="mx-6 mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{t("task_reference")}</p>

            <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 mb-3">
              {task.title}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {pri && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pri.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
                  {pri.label}
                </span>
              )}

              {statusColor && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor.bg} ${statusColor.text}`}>
                  <span>{task.status?.icon ?? "📌"}</span>
                  {task.status?.name}
                </span>
              )}

              {task.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <span>{task.category.icon}</span>
                  {task.category.name}
                </span>
              )}

              {task.dueDate && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isOverdue ? "bg-rose-50 text-rose-600" : "bg-gray-100 text-gray-500"}`}>
                  <IoTimeOutline className="w-3 h-3" />
                  {isOverdue && "⚠️ "}
                  {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}

              {task.assignedTo.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                  <IoPersonOutline className="w-3 h-3" />
                  {task.assignedTo[0].firstName}
                  {task.assignedTo.length > 1 && ` +${task.assignedTo.length - 1}`}
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleAddRemark} className="px-6 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {t("remark")} <span className="text-red-500">*</span>
            </label>
            <textarea
              name="content"
              rows={4}
              onChange={onChange}
              value={remarkPayload.content}
              placeholder={t("write_your_remark_here")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1 text-right">{remarkPayload.content.length} {t("characters")}</p>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={remarkPayload.content.trim() === "" || remarkLoad}
              className="px-5 py-2 rounded-xl text-sm font-medium bg-cyan-600 hover:bg-cyan-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <IoSaveOutline className="w-4 h-4" />
              {remarkLoad ? "Creating…" : "Add Remark"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRemarkPopup;