"use client";

import React, { Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import {
    CategoryItem,
    CategoryPayload,
    CategoryTableProps,
    ColorOption,
} from "@/src/types/task/category.types";
import { COLOR_OPTIONS, TASK_VISIBILITY } from "@/src/constants/enum";
import { useTranslation } from "react-i18next";

const ICON_OPTIONS: string[] = [
    "📁", "🗂️", "🏷️", "📦", "🔖", "🧩", "⚙️", "🎨",
    "📐", "🔬", "💼", "🛠️", "📊", "🧪", "🌐",
];

function getColorOption(hex: string | null): ColorOption {
    return COLOR_OPTIONS.find((c) => c.hex === hex) ?? COLOR_OPTIONS[0];
}

function CategoryBadge({
    color,
    icon,
    name,
}: {
    color: ColorOption;
    icon: string;
    name: string;
}) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}>
            <span>{icon}</span>
            {name}
        </span>
    );
}

interface ModalProps {
    formData: CategoryPayload;
    setFormData: Dispatch<SetStateAction<CategoryPayload>>;
    editTarget: CategoryItem | null;
    isLoading: boolean;
    handleSubmit: () => Promise<void>;
    handleUpdate: () => Promise<void>;
    handleClosePopup: () => void;
    err: string | string[] | null;
}

function CategoryModal({
    formData,
    setFormData,
    editTarget,
    isLoading,
    handleSubmit,
    handleUpdate,
    handleClosePopup,
    err,
}: ModalProps) {
  const { t } = useTranslation();
    const isEdit = !!editTarget;
    const selectedColor = getColorOption(formData.color ||COLOR_OPTIONS[0].hex);
    const selectedIcon = formData.icon || ICON_OPTIONS[0];

    
    React.useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    if (typeof window === "undefined") return null;

    return createPortal(
      <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 dark:bg-white/20 backdrop-blur-sm"
                onClick={handleClosePopup}
            />  

            {/* Modal */}
            <div className="relative z-50 w-full max-w-lg my-auto bg-white dark:bg-gray-900/90 max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-900/30 bg-gray-50 dark:bg-gray-900">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            {isEdit ? t("edit_category") : t("create_new_category")}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {isEdit ? t("update_the_category_details_below") : t("define_a_new_task_category")}
                        </p>
                    </div>

                    <button
                        onClick={handleClosePopup}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">

                    {/* Preview */}
                    <div className="flex items-center gap-3 p-3  rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                        <span className="text-sm text-gray-500 dark:text-gray-100">{t("preview")}</span>
                        <CategoryBadge
                            color={selectedColor}
                            icon={selectedIcon}
                            name={formData.name || "Category Name"}
                        />
                    </div>

                    {/* Error */}
                    {err && (
                        <div className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-xs text-rose-600 dark:text-rose-400">
                            {Array.isArray(err) ? err.join(", ") : err}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            {t("category_name")}
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            placeholder={t("category_name_2")}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            {t("description")}
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, description: e.target.value }))
                            }
                            rows={2}
                            placeholder={t("description")}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                    </div>

                    {/* Visibility */}
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            {t("visibility")}
                        </label>
                        <select
                            value={formData.visibility}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, visibility: e.target.value }))
                            }
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        >
                            {Object.values(TASK_VISIBILITY).map((v) => (
                                <option key={v} value={v}>
                                    {t(v)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Icon */}
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            {t("icon")}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {ICON_OPTIONS.map((ic) => (
                                <button
                                    key={ic}
                                    type="button"
                                    onClick={() => setFormData((prev) => ({ ...prev, icon: ic }))}
                                    className={`w-9 h-9 rounded-lg border ${selectedIcon === ic
                                        ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30"
                                        : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                                        }`}
                                >
                                    {ic}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            {t("color")}
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {COLOR_OPTIONS.map((c) => (
                                <button
                                    key={c.label}
                                    type="button"
                                    onClick={() =>
                                        setFormData((prev) => ({ ...prev, color: c.hex }))
                                    }
                                    className={`w-7 h-7 rounded-full ${formData.color === c.hex
                                        ? "ring-2 ring-black dark:ring-white scale-110"
                                        : ""
                                        }`}
                                    style={{ backgroundColor: c.hex }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                    <button
                        onClick={handleClosePopup}
                        className="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                    >
                        {t("cancel")}
                    </button>

                    <button
                        disabled={isLoading}
                        onClick={isEdit ? handleUpdate : handleSubmit}
                        className="px-5 py-2 rounded-xl text-sm text-white bg-cyan-600 disabled:opacity-50"
                    >
                        {isLoading ? "Loading..." : isEdit ? t("save") : t("create")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default CategoryModal;