"use client";

import React, { useEffect } from "react";
import { StatusTableProps, ColorOption } from "@/src/types/task/status.types";
import { COLOR_OPTIONS, PERMISSIONS } from "@/src/constants/enum";
import { StatusModal } from "@/src/components/pages/task/createStatusModal";
import { MdDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { CategoryItem } from "@/src/types/task/category.types";
import { CategoryService } from "@/src/services/category.service";
import { useTranslation } from "react-i18next";
import { Layers, CheckCircle2, Search, Plus, Inbox, Check } from "lucide-react";
import CategoryBadge from "./CategoryBadge";

function getColorOption(hex: string | null): ColorOption {
  return COLOR_OPTIONS.find((c) => c.hex === hex) ?? COLOR_OPTIONS[0];
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded-lg w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ── Main Table Component ──────────────────────────────────────────────────────
const StatusTable = ({
  statusData,
  currentPage,
  pageLimit,
  isLoading,
  loading,
  isPopupShow,
  setIsPopupShow,
  formData,
  setFormData,
  editTarget,
  handleSubmit,
  handleUpdate,
  handleEdit,
  handleDelete,
  handleClosePopup,
  hasPermissions,
  totalPages,
  handlepagechange,
  handleSearch,
  handleCategory,
  err,
}: StatusTableProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState<string>("");
  const [categories, setCategories] = React.useState<CategoryItem[]>([]);

  const filtered = statusData.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = hasPermissions(PERMISSIONS.taskStatusCreate);
  const canEdit = hasPermissions(PERMISSIONS.taskStatusUpdate);
  const canDelete = hasPermissions(PERMISSIONS.taskStatusDelete);

  const fetchCategories = async () => {
    try {
      const res = await CategoryService.getAll({ currentPage: 1, pageLimit: 100, search: "" });
      if (res.status === 200) setCategories(res.data.data.data ?? []);
    } catch (e) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(e);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <>
      {isPopupShow && (
        <StatusModal
          formData={formData}
          setFormData={setFormData}
          editTarget={editTarget}
          isLoading={isLoading}
          handleSubmit={handleSubmit}
          handleUpdate={handleUpdate}
          handleClosePopup={handleClosePopup}
          isFinal={formData.isFinal}
          err={err}
        />
      )}

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200/60 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t("task_statuses")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("define_and_manage_task_lifecycle_statuses")}
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setIsPopupShow(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white text-xs font-bold shadow-sm shadow-cyan-500/20 hover:shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={15} strokeWidth={2.5} />
            {t("new_status")}
          </button>
        )}
      </div>

      {/* Top 2 KPI Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4 shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200/60 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <Layers size={18} />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {statusData.length}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("total_statuses")}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4 shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {statusData.length}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("active")}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex items-center gap-3 mb-5 max-w-md ml-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            onChange={(e) => {
              setSearch(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder={t("search_statuses")}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition shadow-2xs"
          />
        </div>

        <select
          onChange={(e) => handleCategory(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition shadow-2xs cursor-pointer"
        >
          <option value="">{t("all_categories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
                <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">
                  #
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("status")}
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("category")}
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20">
                  {t("order")}
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("color")}
                </th>
                {(canEdit || canDelete) && (
                  <th className="text-right px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("actions")}
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {isLoading ? (
                Array.from({ length: pageLimit > 5 ? 5 : pageLimit }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 dark:text-slate-500">
                    <Inbox className="w-10 h-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {t("no_statuses_found")}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => {
                  const colorOpt = getColorOption(s.color);
                  const statusDotColor =
                    s.color && s.color.toLowerCase() !== "#ffffff"
                      ? s.color
                      : "#0891b2";

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors group"
                    >
                      {/* # Index */}
                      <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 text-xs font-mono tabular-nums">
                        {String((currentPage - 1) * pageLimit + i + 1).padStart(2, "0")}
                      </td>

                      {/* Status Name + Dot + Final Badge */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-slate-100 dark:ring-slate-700 shadow-2xs"
                            style={{ backgroundColor: statusDotColor }}
                          />
                          <span className="text-xs font-semibold text-slate-900 dark:text-white capitalize">
                            {s.name}
                          </span>
                          {s.isFinal && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 shrink-0">
                              <Check size={9} strokeWidth={3} />
                              FINAL
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="px-5 py-3.5">
                        {s.category ? (
                          <CategoryBadge
                            color={getColorOption(typeof s.category === "object" ? s.category.color : null)}
                            icon={typeof s.category === "object" ? s.category.icon || "" : ""}
                            name={typeof s.category === "object" ? s.category.name : String(s.category)}
                          />
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>

                      {/* Order */}
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                        {s.order ?? 0}
                      </td>

                      {/* Color Swatch */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shadow-2xs shrink-0"
                            style={{ backgroundColor: s.color && s.color.toLowerCase() !== "#ffffff" ? s.color : "#ffffff" }}
                          />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">
                            {colorOpt.label}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      {(canEdit || canDelete) && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleEdit(s)}
                                title={t("edit") || "Edit Status"}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                              >
                                <MdOutlineEdit className="text-base" />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleDelete(s.id)}
                                title={t("delete") || "Delete Status"}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50 cursor-pointer"
                              >
                                <MdDeleteOutline className="text-base" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t("showing")}{" "}
            {t("page") || "page"}{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentPage}
            </span>{" "}
            {t("of")}{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => handlepagechange(-1)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer"
            >
              {t("prev")}
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium px-1 tabular-nums">
              {currentPage}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => handlepagechange(1)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer"
            >
              {t("next")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StatusTable;