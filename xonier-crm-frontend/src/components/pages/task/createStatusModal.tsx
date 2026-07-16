// ── Modal ─────────────────────────────────────────────────────────────────────
import { ModalProps, StatusItem, StatusPayload, ColorOption } from "@/src/types/task/status.types";
import { COLOR_OPTIONS } from "@/src/constants/enum";
import { createPortal } from "react-dom";
import { CategoryService } from "@/src/services/category.service";
import { useState, useEffect } from "react";
import { CategoryItem } from "@/src/types/task/category.types";
import { useTranslation } from "react-i18next";
export function getColorOption(hex: string | null): ColorOption {
    return COLOR_OPTIONS.find(c => c.hex === hex) ?? COLOR_OPTIONS[0];
}
const ICON_OPTIONS: string[] = [
    "⚡", "🔵", "✅", "🔄", "⏳", "⏸️", "🚀", "🔧", "📌", "🎯", "💡", "🛑", "🕐",
];
export function StatusBadge({ color, icon, name }: { color: ColorOption; icon?: string; name: string }) {
    if (!icon) icon = "⚡";
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}>
            <span>{icon}</span>
            {name}
        </span>
    );
}
export function StatusModal({
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

    const selectedColor = getColorOption(formData.color || null);
    const selectedIcon = formData.icon || ICON_OPTIONS[0];
    const selectedCategory = formData.category || "";
    const [categorys, setCategorys] = useState<CategoryItem[]>([]);

    const featchCategorys = async () => {
        const result = await CategoryService.getAll({});
        if (result.status === 200) {
            setCategorys(result.data.data?.data);
        }
    };
    useEffect(() => {
        featchCategorys();
    }, []);
    
    if (typeof window === "undefined") return null;
    return createPortal(
        <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={handleClosePopup}
            />

            {/* Panel */}
            <div className="relative h-180 z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-scroll">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                            {isEdit ? "Edit Status" : "Create New Status"}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {isEdit
                                ? "Update the status details below"
                                : "Define a new task status for your project"}
                        </p>
                    </div>
                    <button
                        onClick={handleClosePopup}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Live Preview */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-sm text-gray-500 font-medium">{t("preview")}</span>
                        <StatusBadge
                            color={selectedColor}
                            icon={selectedIcon}
                            name={formData.name || "Status Name"}
                        />
                    </div>

                    {/* Error */}
                    {err && (
                        <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-600 font-medium">
                            {Array.isArray(err) ? err.join(", ") : err}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t("status_name")} <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e =>
                                setFormData(prev => ({ ...prev, name: e.target.value }))
                            }
                            placeholder={t("e_g_in_progress")}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition"
                        />
                    </div>

                    {/* Description */}
                    {/* <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={e =>
                                setFormData(prev => ({ ...prev, description: e.target.value }))
                            }
                            placeholder="Briefly describe when this status applies…"
                            rows={2}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition resize-none"
                        />
                    </div> */}

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t("category")}
                        </label>
                        <select
                            value={formData.category || ""}
                            onChange={e =>
                                setFormData(prev => ({
                                    ...prev,
                                    category: e.target.value
                                }))
                            }
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 "
                        >
                            <option value="" disabled>{t("select_category_3")}</option>

                            {categorys.map(c => (
                                <option key={c.id} value={String(c.id)}>
                                    <div  className="flex gap-15 items-center">
                                          {c.icon || "❓"}
                                     {/* {t("nbsp")} */}
                                      {c.name}
                                    </div>
                                  
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Is Final */}
                    {/* Is Final - Segmented Cards */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t("status_type")}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, isFinal: false }))}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${!formData.isFinal
                                    ? "border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm"
                                    : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
                                    }`}
                            >
                                <span className="text-base">🔄</span> {t("ongoing")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, isFinal: true }))}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${formData.isFinal
                                    ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                                    : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
                                    }`}
                            >
                                <span className="text-base">🏁</span> {t("final")}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t("status_order")} <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.order}
                            onChange={e =>
                                setFormData(prev => ({ ...prev, order: Number(e.target.value) }))
                            }
                            onBlur={() => formData.order}
                            placeholder={t("eg_2")}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition"
                        />
                    </div>

                    {/* Icon Picker */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t("icon")}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {ICON_OPTIONS.map(ic => (
                                <button
                                    key={ic}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, icon: ic }))}
                                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition ${selectedIcon === ic
                                        ? "border-cyan-500 bg-cyan-50 shadow-sm"
                                        : "border-gray-200 hover:border-gray-300 bg-white"
                                        }`}
                                >
                                    {ic}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t("color")}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map(c => (
                                <button
                                    key={c.label}
                                    type="button"
                                    title={c.label}
                                    onClick={() => setFormData(prev => ({ ...prev, color: c.hex }))}
                                    className={`w-7 h-7 rounded-full border-2 transition-all ${formData.color === c.hex
                                        ? "border-gray-800 scale-125 shadow-md"
                                        : "border-transparent hover:scale-110"
                                        }`}
                                    style={{ backgroundColor: c.hex }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <button
                        type="button"
                        onClick={handleClosePopup}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition"
                    >
                        {t("cancel")}
                    </button>
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={isEdit ? handleUpdate : handleSubmit}
                        className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading && (
                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        )}
                        {isEdit ? "Save Changes" : "Create Status"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
