"use client";

import React, { Dispatch, SetStateAction } from "react";
import {
    CategoryItem,
    CategoryPayload,
    CategoryTableProps,
    ColorOption,
} from "@/src/types/task/category.types";
import { COLOR_OPTIONS, PERMISSIONS, TASK_VISIBILITY } from "@/src/constants/enum";
import CategoryModal from "@/src/components/pages/task/createModal";
import { MdDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { FolderTree, Folder, Plus, Search, CheckCircle2, Inbox } from "lucide-react";

function getColorOption(hex: string | null): ColorOption {
    return COLOR_OPTIONS.find((c) => c.hex === hex) ?? COLOR_OPTIONS[0];
}

function getInitials(firstName?: string, lastName?: string): string {
    const f = firstName?.trim()?.[0] || "";
    const l = lastName?.trim()?.[0] || "";
    return (f + l).toUpperCase() || "U";
}

// ── CategoryBadge ─────────────────────────────────────────────────────────────
function CategoryBadge({
    color,
    icon,
    name,
}: {
    color: ColorOption;
    icon: string;
    name: string;
}) {
    const isEmojiFallback = !icon || icon === "❓" || icon === "?";
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${color?.bg ?? "bg-slate-100"} ${color?.text ?? "text-slate-700"} border border-current/15`}
        >
            <span className="shrink-0 text-xs">
                {isEmojiFallback ? <Folder className="w-3 h-3 inline" /> : icon}
            </span>
            <span>{name}</span>
        </span>
    );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
    return (
        <tr className="animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <td key={i} className="px-5 py-4">
                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-lg w-3/4" />
                </td>
            ))}
        </tr>
    );
}

// ── Main Table Component ──────────────────────────────────────────────────────
const CategoryTable = ({
    categoryData,
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
    isBlur,
    handlepagechange,
    handleSearch,
    err,
}: CategoryTableProps) => {
    const { t } = useTranslation();
    const [search, setSearch] = React.useState<string>("");

    const filtered = categoryData.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.description ?? "").toLowerCase().includes(search.toLowerCase())
    );

    const canCreate = hasPermissions(PERMISSIONS.taskCategoryCreate);
    const canEdit = hasPermissions(PERMISSIONS.taskCategoryUpdate);
    const canDelete = hasPermissions(PERMISSIONS.taskCategoryDelete);

    return (
        <>
            {/* Modal */}
            {isPopupShow && (
                <CategoryModal
                    formData={formData}
                    setFormData={setFormData}
                    editTarget={editTarget}
                    isLoading={isLoading}
                    handleSubmit={handleSubmit}
                    handleUpdate={handleUpdate}
                    handleClosePopup={handleClosePopup}
                    err={err}
                />
            )}

            {/* Page Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/60 flex items-center justify-center shrink-0">
                            <FolderTree size={17} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {t("task_categories")}
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 pl-10.5">
                        {t("organise_and_manage_task_categories_for")}
                    </p>
                </div>

                {canCreate && (
                    <button
                        type="button"
                        onClick={() => setIsPopupShow(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                        <Plus size={15} /> {t("new_category")}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                {[
                    {
                        label: t("total_categories") || "Total Categories",
                        value: categoryData.length,
                        icon: FolderTree,
                        accentColor: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/60 dark:border-cyan-800/60",
                    },
                    {
                        label: t("active_status") || "Active",
                        value: categoryData.length,
                        icon: CheckCircle2,
                        accentColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60",
                    },
                ].map((s) => {
                    const Icon = s.icon;
                    return (
                        <div
                            key={s.label}
                            className="flex items-center gap-3.5 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 shadow-2xs"
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${s.accentColor}`}>
                                <Icon size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                                    {s.value}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                    {s.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative mb-5 max-w-xs ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                    type="text"
                    onChange={(e) => {
                        handleSearch(e.target.value);
                    }}
                    placeholder={t("search_categories")}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition shadow-2xs"
                />
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-700">
                            <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10">
                                #
                            </th>
                            <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {t("category")}
                            </th>
                            <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {t("description")}
                            </th>
                            <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {t("color")}
                            </th>
                            <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {t("created_by")}
                            </th>
                            {(canEdit || canDelete) && (
                                <th className="text-right px-5 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    {t("actions")}
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                        {isLoading ? (
                            Array.from({ length: pageLimit > 5 ? 5 : pageLimit }).map(
                                (_, i) => <SkeletonRow key={i} />
                            )
                        ) : categoryData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="text-center py-16 text-slate-400 dark:text-slate-500"
                                >
                                    <Inbox className="w-8 h-8 mb-2 mx-auto opacity-50" />
                                    <div className="text-xs font-medium">
                                        {t("no_categories_found_2")}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            categoryData.map((c, i) => {
                                const colorOpt = getColorOption(c.color);
                                const icon = c.icon ?? "";
                                return (
                                    <tr
                                        key={c.id}
                                        className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors group"
                                    >
                                        {/* # */}
                                        <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 text-xs font-mono tabular-nums">
                                            {String(
                                                (currentPage - 1) * pageLimit + i + 1
                                            ).padStart(2, "0")}
                                        </td>

                                        {/* Badge */}
                                        <td className="px-5 py-3.5">
                                            <CategoryBadge
                                                color={colorOpt}
                                                icon={icon}
                                                name={c.name}
                                            />
                                        </td>

                                        {/* Description */}
                                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs max-w-xs truncate">
                                            {c.description || (
                                                <span className="italic text-slate-300 dark:text-slate-600">
                                                    {t("no_description")}
                                                </span>
                                            )}
                                        </td>

                                        {/* Color swatch */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-2xs shrink-0"
                                                    style={{ backgroundColor: c.color ?? "#64748b" }}
                                                />
                                                <span className="text-xs text-slate-600 dark:text-slate-300 capitalize">
                                                    {colorOpt.label}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Created By */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-[9px] font-bold shrink-0 shadow-2xs">
                                                    {getInitials(c.createdBy?.firstName, c.createdBy?.lastName)}
                                                </span>
                                                <span className="text-xs text-slate-600 dark:text-slate-300 capitalize truncate max-w-[130px]">
                                                    {c.createdBy
                                                        ? `${c.createdBy.firstName || ""} ${c.createdBy.lastName || ""}`.trim()
                                                        : "—"}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        {(canEdit || canDelete) && (
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(c)}
                                                            title={t("edit") || "Edit"}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition cursor-pointer"
                                                        >
                                                            <MdOutlineEdit className="text-base" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            disabled={loading}
                                                            onClick={() => handleDelete(c.id)}
                                                            title={t("delete") || "Delete"}
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

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t("showing")}{" page "}
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

export default CategoryTable;