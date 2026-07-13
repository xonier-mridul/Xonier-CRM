"use client";

import React, { Dispatch, SetStateAction, useEffect } from "react";
import { StatusItem, StatusPayload, StatusPermissions, StatusTableProps, ColorOption } from "@/src/types/task/status.types";
import { COLOR_OPTIONS, PERMISSIONS } from "@/src/constants/enum";
import { StatusModal, StatusBadge } from "@/src/components/pages/task/createStatusModal";
import { MdDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { CategoryItem } from "@/src/types/task/category.types";
import { CategoryService } from "@/src/services/category.service";
import { useTranslation } from "react-i18next";
function getColorOption(hex: string | null): ColorOption {
  return COLOR_OPTIONS.find(c => c.hex === hex) ?? COLOR_OPTIONS[0];
}
// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1, 2, 3, 4, 5].map(i => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
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
  const [category, setCategory] = React.useState<string>("");
  const [categories, setCategories] = React.useState<CategoryItem[]>([]);

  const filtered = statusData.filter(
    s =>
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


      <div className="flex items-start justify-between mb-8 dark:text-white">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⚡</span>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight dark:text-white">
              {t("task_statuses")}
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            {t("define_and_manage_task_lifecycle_statuses")}
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setIsPopupShow(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-sm font-bold shadow-md shadow-cyan-200 transition-all"
          >
            <span className="text-base">＋</span> {t("new_status")}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-7">
        {[
          { label: "Total Statuses", value: statusData.length, icon: "📋", color: "bg-cyan-50 border-cyan-100" },
          { label: "Active", value: statusData.length, icon: "🟢", color: "bg-emerald-50 border-emerald-100" },
          //   { label: "Your Role",      value: isAdmin ? "Admin" : "Member", icon: "🔑", color: "bg-violet-50 border-violet-100" },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-4 p-4 rounded-2xl border ${s.color}`}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-xl font-extrabold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative grid grid-cols-2 mb-5 max-w-sm ml-auto gap-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        
        <input
          type="text"
          onChange={e => handleSearch(e.target.value)}
          placeholder={t("search_statuses")}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition bg-white"
        />
        <select
          onChange={(e) => { handleCategory(e.target.value); }}
          className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition"
        >
          <option value="">{t("all_categories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full text-sm">

          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">

              <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8">
                #
              </th>

              <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("status")}
              </th>

              <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("category")}
              </th>
              <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("order")}
              </th>

              <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("color")}
              </th>

              {(canEdit || canDelete) && (
                <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("actions")}
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">

            {isLoading ? (
              Array.from({ length: pageLimit > 5 ? 5 : pageLimit }).map((_, i) => (
                <SkeletonRow key={i} />
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <div className="text-4xl mb-2">🔍</div>
                  <div className="text-sm font-medium">{t("no_statuses_found")}</div>
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => {
                const colorOpt = getColorOption(s.color);
                const icon = s.icon;

                return (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-700/50 transition-colors group"
                  >

                    {/* # */}
                    <td className="px-5 py-4 text-gray-400 dark:text-gray-500 text-xs font-mono">
                      {String((currentPage - 1) * pageLimit + i + 1).padStart(2, "0")}
                    </td>

                    {/* Badge */}
                    <td className="px-5 py-4">
                      <StatusBadge color={colorOpt} icon={icon || "⚡"} name={s.name} />
                    </td>

                    {/* Description */}
                    {/* <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">
                      {s.description || (
                        <span className="italic text-gray-300 dark:text-gray-600">
                          No description
                        </span>
                      )}
                    </td> */}
                    {/* Category */}
                    <td className="px-5 py-4">
                      <StatusBadge color={getColorOption(s.category.color)} icon={s.category.icon || "❓"} name={s.category.name} />
                    </td>
                    <td className="px-5 py-4">
                      {s.order}
                    </td>

                    {/* Color */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                          style={{ backgroundColor: s.color ?? "#64748b" }}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {colorOpt.label}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    {(canEdit || canDelete) && (
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleEdit(s)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition"
                            >
                              <span className="items-center justify-center rounded-md bg-cyan-100/80 text-cyan-500 border-cyan-100">
                                <MdOutlineEdit className="text-sm" />
                              </span>
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleDelete(s.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition disabled:opacity-50"
                            >
                              <span className="items-center justify-center rounded-md bg-red-100/80 text-red-500 border-red-100">
                                <MdDeleteOutline className="text-sm" />
                              </span>
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

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("showing")}{" page "}
            <span className="font-semibold text-gray-600 dark:text-gray-300">
              {currentPage}
            </span>{" "}
            {t("of")}{" "}
            <span className="font-semibold text-gray-600 dark:text-gray-300">{totalPages}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => handlepagechange(-1)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {t("prev")}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-1">
              {currentPage}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => handlepagechange(1)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
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