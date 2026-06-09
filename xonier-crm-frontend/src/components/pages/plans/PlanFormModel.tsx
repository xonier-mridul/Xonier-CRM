"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CreatePlanPayload, PlanFeaturePayload, UpdatePlanPayload, Plan } from "@/src/types/plan/plan.types";
import { Feature } from "@/src/types/plan/plan.types";
import { CURRENCY, DISCOUNT_TYPE, PLAN_STATUS, PLAN_VISIBILITY } from "@/src/constants/enum";


import Input from "../../ui/Input";
import FormButton from "../../ui/FormButton";
import { IoClose, IoAdd, IoTrash, IoChevronDown, IoSearch } from "react-icons/io5";
import { ImSpinner2 } from "react-icons/im";
import { FeatureService } from "@/src/services/feature.service";
import { CURRENCY_SYMBOL } from "@/src/constants/constants";

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePlanPayload | UpdatePlanPayload) => Promise<void>;
  isLoading: boolean;
  editData?: Plan | null;
}

const defaultFeature = (): PlanFeaturePayload => ({
  feature: "",
  is_unlimited: true,
  limit: null,
  limit_override: null,
  is_enabled: true,
});

const defaultForm = (): CreatePlanPayload => ({
  name: "",
  description: "",
  price: { monthlyPrice: 0, yearlyPrice: 0 },
  discount: null,
  discountType: DISCOUNT_TYPE.PERCENTAGE,
  currency: CURRENCY.USD,
  discountApply: null,
  discountTill: null,
  features: [],
  status: PLAN_STATUS.ACTIVE,
  visibility: PLAN_VISIBILITY.PUBLIC,
  trial_days: 0,
});

interface FeatureDropdownProps {
  selectedId: string;
  onChange: (id: string, name: string) => void;
}

const FeatureDropdown: React.FC<FeatureDropdownProps> = ({ selectedId, onChange }) => {
  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [selectedName, setSelectedName] = useState<string>("");

  const listRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchFeatures = useCallback(async (pageNum: number, searchVal: string, reset: boolean) => {
    setFetchLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (searchVal.trim()) filters.search = searchVal.trim();
      const result = await FeatureService.getAll(pageNum, 10, filters);
      if (result.status === 200) {
        const data = result.data.data;
        setTotalPages(data.totalPages);
        setFeatures((prev) => (reset ? data.data : [...prev, ...data.data]));
      }
    } catch {
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setPage(1);
      setSearch("");
      fetchFeatures(1, "", true);
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchFeatures(1, val, true);
    }, 350);
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || fetchLoading || page >= totalPages) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (nearBottom) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFeatures(nextPage, search, false);
    }
  };

  const handleSelect = (feature: Feature) => {
    setSelectedName(feature.name);
    onChange(feature.id, feature.name);
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-200 block mb-1">Feature</label>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500 flex items-center justify-between text-sm"
      >
        <span className={selectedName ? "text-gray-900 dark:text-white capitalize" : "text-gray-400"}>
          {selectedName || "Select a feature"}
        </span>
        <IoChevronDown className={`text-gray-400 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <IoSearch className="text-gray-400 text-sm shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search features..."
              className="w-full text-sm outline-none bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>

          <div ref={listRef} onScroll={handleScroll} className="max-h-52 overflow-y-auto">
            {features.length === 0 && !fetchLoading && (
              <div className="py-6 text-center text-sm text-gray-400">No features found</div>
            )}

            {features.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSelect(f)}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-violet-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors ${
                  selectedId === f.id
                    ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="capitalize">{f.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{f.feature_key}</span>
                </div>
                {selectedId === f.id && (
                  <span className="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full shrink-0">
                    Selected
                  </span>
                )}
              </button>
            ))}

            {fetchLoading && (
              <div className="flex justify-center items-center py-3">
                <ImSpinner2 className="animate-spin text-violet-500 text-lg" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PlanFormModal: React.FC<PlanFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  editData,
}) => {
  const [form, setForm] = useState<CreatePlanPayload>(defaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name,
        description: editData.description,
        price: editData.price,
        discount: editData.discount,
        discountType: editData.discountType,
        currency: editData.currency,
        discountApply: editData.discountApply,
        discountTill: editData.discountTill,
        features: editData.features.map((f) => ({
          feature: typeof f.feature === "string" ? f.feature : f.feature.id,
          is_unlimited: f.is_unlimited,
          limit: f.limit,
          limit_override: f.limit_override,
          is_enabled: f.is_enabled,
        })),
        status: editData.status,
        visibility: editData.visibility,
        trial_days: editData.trial_days,
      });
    } else {
      setForm(defaultForm());
    }
    setErrors({});
  }, [editData, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name || form.name.length < 2) newErrors.name = "Name must be at least 2 characters";
    if (!form.description) newErrors.description = "Description is required";
    if (form.price.monthlyPrice < 0) newErrors.monthlyPrice = "Monthly price must be >= 0";
    if (form.price.yearlyPrice < 0) newErrors.yearlyPrice = "Yearly price must be >= 0";
    if (form.discount !== null && form.discount !== undefined && form.discount < 0)
      newErrors.discount = "Discount must be >= 0";
    const unselected = (form.features || []).filter((f) => !f.feature);
    if (unselected.length) newErrors.features = `${unselected.length} feature(s) have no selection`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  const updateFeature = (index: number, key: keyof PlanFeaturePayload, value: unknown) => {
    const updated = [...(form.features || [])];
    updated[index] = { ...updated[index], [key]: value };
    setForm((prev) => ({ ...prev, features: updated }));
  };

  const removeFeature = (index: number) => {
    setForm((prev) => ({
      ...prev,
      features: (prev.features || []).filter((_, i) => i !== index),
    }));
  };

  const handleFeatureSelect = (index: number, id: string) => {
    updateFeature(index, "feature", id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editData ? "Edit Plan" : "Create Plan"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-lg cursor-pointer dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors group hover:text-red-500 hover:bg-red-50"
          >
            <IoClose className="text-xl group-hover:rotate-90" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Plan Name"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: (e.target as HTMLInputElement).value }))}
                error={errors.name}
                placeholder="e.g. Professional"
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Description"
                required
                type="textarea"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: (e.target as HTMLTextAreaElement).value }))}
                error={errors.description}
                placeholder="Describe this plan..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200 block mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value as CURRENCY }))}
                className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {Object.values(CURRENCY).map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_SYMBOL[c]} — {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Monthly Price
                <span className="ml-1.5 text-xs font-normal text-violet-500 dark:text-violet-400">
                  ({CURRENCY_SYMBOL[form.currency ?? CURRENCY.USD]} {form.currency})
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 dark:text-gray-400 select-none">
                  {CURRENCY_SYMBOL[form.currency ?? CURRENCY.USD]}
                </span>
                <input
                  required
                  type="number"
                  min={0}
                  step="any"
                  value={form.price.monthlyPrice}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, price: { ...p.price, monthlyPrice: parseFloat(e.target.value) || 0, yearlyPrice: (parseFloat(e.target.value) * 12) || 0 } }))
                  }
                  className={`w-full pl-7 pr-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.monthlyPrice ? "border-red-500 focus:ring-red-500" : ""}`}
                />
              </div>
              {errors.monthlyPrice && <span className="text-sm text-red-500">{errors.monthlyPrice}</span>}
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Yearly Price
                <span className="ml-1.5 text-xs font-normal text-violet-500 dark:text-violet-400">
                  ({CURRENCY_SYMBOL[form.currency ?? CURRENCY.USD]} {form.currency})
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 dark:text-gray-400 select-none">
                  {CURRENCY_SYMBOL[form.currency ?? CURRENCY.USD]}
                </span>
                <input
                  required
                  type="number"
                  min={0}
                  step="any"
                  value={form.price.yearlyPrice}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, price: { ...p.price, yearlyPrice: parseFloat(e.target.value) || 0 } }))
                  }
                  className={`w-full pl-7 pr-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500 ${errors.yearlyPrice ? "border-red-500 focus:ring-red-500" : ""}`}
                />
              </div>
              {errors.yearlyPrice && <span className="text-sm text-red-500">{errors.yearlyPrice}</span>}
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as PLAN_STATUS }))}
                className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {Object.values(PLAN_STATUS).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Visibility</label>
              <select
                value={form.visibility}
                onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value as PLAN_VISIBILITY }))}
                className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {Object.values(PLAN_VISIBILITY).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <Input
              label="Discount"
              type="number"
              min={0}
              step="any"
              value={form.discount ?? ""}
              onChange={(e) => {
                const val = (e.target as HTMLInputElement).value;
                setForm((p) => ({ ...p, discount: val === "" ? null : parseFloat(val) }));
              }}
              error={errors.discount}
              placeholder="e.g. 10"
            />

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Discount Type</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as DISCOUNT_TYPE }))}
                className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {Object.values(DISCOUNT_TYPE).map((d) => (
                  <option key={d} value={d} className="capitalize">{d}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Discount Apply</label>
              <select
                value={form.discountApply ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    discountApply: (e.target.value as "monthly" | "yearly" | "both") || null,
                  }))
                }
                className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">None</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="both">Both</option>
              </select>
            </div>

            <Input
              label="Discount Till"
              type="date"
              value={form.discountTill?.split("T")[0] ?? ""}
              onChange={(e) => {
                const val = (e.target as HTMLInputElement).value;
                setForm((p) => ({ ...p, discountTill: val ? new Date(val).toISOString() : null }));
              }}
            />

            <Input
              label="Trial Days"
              type="number"
              min={0}
              value={form.trial_days ?? 0}
              onChange={(e) =>
                setForm((p) => ({ ...p, trial_days: Number((e.target as HTMLInputElement).value) }))
              }
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Features</h3>
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({ ...p, features: [...(p.features || []), defaultFeature()] }))
                }
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-green-600 group font-medium"
              >
                <IoAdd className="text-lg " /> Add Feature
              </button>
            </div>

            {errors.features && <p className="text-xs text-red-500">{errors.features}</p>}

            {(form.features || []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                No features added yet
              </p>
            )}

            {(form.features || []).map((feat, i) => (
              <div
                key={i}
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-xl flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Feature {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFeature(i)}
                    className="h-7 w-7 flex items-center justify-center rounded-md bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors"
                  >
                    <IoTrash className="text-sm" />
                  </button>
                </div>

                <FeatureDropdown
                  selectedId={feat.feature}
                  onChange={(id) => handleFeatureSelect(i, id)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feat.is_unlimited}
                      onChange={(e) => updateFeature(i, "is_unlimited", e.target.checked)}
                      className="accent-blue-600"
                    />
                    Unlimited
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feat.is_enabled}
                      onChange={(e) => updateFeature(i, "is_enabled", e.target.checked)}
                      className="accent-blue-600"
                    />
                    Enabled
                  </label>
                </div>

                {!feat.is_unlimited && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Limit"
                      type="number"
                      min={0}
                      value={feat.limit ?? ""}
                      onChange={(e) =>
                        updateFeature(i, "limit", Number((e.target as HTMLInputElement).value) || null)
                      }
                    />
                    <Input
                      label="Limit Override"
                      type="number"
                      min={0}
                      value={feat.limit_override ?? ""}
                      onChange={(e) =>
                        updateFeature(i, "limit_override", Number((e.target as HTMLInputElement).value) || null)
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-md border hover:text-red-500 cursor-pointer hover:border-red-300  border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <FormButton isLoading={isLoading} className="flex-1">
              {editData ? "Update Plan" : "Create Plan"}
            </FormButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanFormModal;