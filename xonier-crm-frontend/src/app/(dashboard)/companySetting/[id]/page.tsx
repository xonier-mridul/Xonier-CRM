// src/app/(dashboard)/settings/company/[id]/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import SearchableSelect from "@/src/components/common/SearchableSelect";
import { FiSave, FiAlertCircle, FiInfo, FiLock } from "react-icons/fi";
import { TbBuilding } from "react-icons/tb";
import {
  COUNTRY_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/src/constants/company";
import PhoneInputField from "@/src/components/common/PhoneInput";
import CompanyService from "@/src/services/company.service";

// ============================================================
// Types
// ============================================================

interface RawCompanyResponse {
  id: string;
  companyId?: string;
  companyName: string;
  industry?: string;
  email?: string; // read-only, not updatable
  number?: string;
  companySize?: string | number;
  country?: string | null;
  timezone?: string | null;
  website?: string | null;
  registrationNumber?: string | null;
  tradeNumber?: string | null;
  userLimit?: number;
  slug?: string;
  subDomain?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

// Only fields accepted by the PATCH endpoint
interface CompanyUpdatePayload {
  companyName: string;
  industry: string;
  number: string;
  companySize?: string;
  website: string;
  timezone?: string;
  registrationNumber: string;
  tradeNumber: string;
  userLimit: number;
  country?: string;
  subDomain: string;
  status: string;
}

// Full form state (includes read-only companyEmail for display)
interface CompanyFormState extends CompanyUpdatePayload {
  companyEmail: string; // NOT part of update payload — read-only
}

interface CompanyDisplayData {
  id: string;
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
}

type FormErrors = Partial<Record<keyof CompanyFormState, string>> & {
  submit?: string;
};

// ============================================================
// Config — matches backend enum EXACTLY
// ============================================================

// ⚠️ These values MUST exactly match the backend enum
const COMPANY_SIZE_OPTIONS = [
  { value: "50", label: "1 - 50 employees" },
  { value: "50-100", label: "50 - 100 employees" },
  { value: "100-200", label: "100 - 200 employees" },
  { value: "200-300", label: "200 - 300 employees" },
  { value: "300-400", label: "300 - 400 employees" },
  { value: "400-500", label: "400 - 500 employees" },
  { value: "500-1000", label: "500 - 1000 employees" },
  { value: "1000-2000", label: "1000 - 2000 employees" },
  { value: "2000-5000", label: "2000 - 5000 employees" },
];

const DEFAULT_COUNTRY = "IN"; // ISO code for India, must match COUNTRY_OPTIONS value

const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  IN: "Asia/Kolkata",
  US: "America/New_York",
  GB: "Europe/London",
  AE: "Asia/Dubai",
  CA: "America/Toronto",
  AU: "Australia/Sydney",
  SG: "Asia/Singapore",
  DE: "Europe/Berlin",
  FR: "Europe/Paris",
  AF: "Asia/Kabul",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const emptyForm: CompanyFormState = {
  companyName: "",
  industry: "",
  companyEmail: "",
  number: "",
  companySize: undefined,
  country: undefined,
  timezone: undefined,
  website: "",
  registrationNumber: "",
  tradeNumber: "",
  userLimit: 0,
  subDomain: "",
  status: "active",
};

// ============================================================
// Helpers
// ============================================================

// Parses enum value into [min, max] for numeric bucketing
// "50" -> [0, 50] (first bucket: 1-50)
// "50-100" -> [50, 100]
// "2000-5000" -> [2000, 5000]
const parseSizeBucket = (value: string): [number, number] => {
  if (!value.includes("-")) {
    return [0, parseInt(value, 10)];
  }
  const [min, max] = value.split("-").map((v) => parseInt(v.trim(), 10));
  return [min, max];
};

// Given a raw numeric/string size, resolve it to the EXACT backend enum value
const resolveCompanySizeOption = (
  size: string | number | undefined | null
): string | undefined => {
  if (size === undefined || size === null || size === "") return undefined;

  const sizeStr = String(size).trim();

  // 1. Direct match — if raw value already matches an enum exactly (e.g. "50", "50-100")
  const directMatch = COMPANY_SIZE_OPTIONS.find((o) => o.value === sizeStr);
  if (directMatch) return directMatch.value;

  // 2. Numeric bucketing — for arbitrary numbers like 75, 250, etc.
  const numSize = parseInt(sizeStr, 10);
  if (isNaN(numSize)) return undefined;

  for (const option of COMPANY_SIZE_OPTIONS) {
    const [, max] = parseSizeBucket(option.value);
    if (numSize <= max) {
      return option.value;
    }
  }

  // Falls beyond largest bucket -> return the largest bucket
  return COMPANY_SIZE_OPTIONS[COMPANY_SIZE_OPTIONS.length - 1].value;
};

const resolveTimezoneForCountry = (countryCode: string | undefined): string | undefined => {
  if (!countryCode) return undefined;
  const tz = COUNTRY_TIMEZONE_MAP[countryCode];
  if (!tz) return undefined;
  const exists = TIMEZONE_OPTIONS.some((o) => o.value === tz);
  return exists ? tz : undefined;
};

const unwrap = (res: any): RawCompanyResponse => {
  return res?.data?.data ?? res?.data ?? res;
};

// Map raw API response -> full form state
const mapResponseToForm = (raw: RawCompanyResponse): CompanyFormState => {
  const resolvedCountry = raw.country || DEFAULT_COUNTRY;
  const resolvedTimezone =
    raw.timezone && raw.timezone.trim() !== ""
      ? raw.timezone
      : resolveTimezoneForCountry(resolvedCountry);

  return {
    companyName: raw.companyName || "",
    industry: raw.industry || "",
    companyEmail: raw.email || "",
    number: raw.number || "",
    companySize: resolveCompanySizeOption(raw.companySize),
    country: resolvedCountry,
    timezone: resolvedTimezone,
    website: raw.website || "",
    registrationNumber: raw.registrationNumber || "",
    tradeNumber: raw.tradeNumber || "",
    userLimit: raw.userLimit ?? 0,
    subDomain: raw.subDomain || "",
    status: raw.status || "active",
  };
};

// Map raw API response -> read-only display fields
const mapResponseToDisplay = (raw: RawCompanyResponse): CompanyDisplayData => ({
  id: raw.id,
  slug: raw.slug,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

// Map form state -> EXACT update payload accepted by backend
const mapFormToPayload = (form: CompanyFormState): CompanyUpdatePayload => ({
  companyName: form.companyName,
  industry: form.industry,
  number: form.number,
  companySize: form.companySize,
  website: form.website,
  timezone: form.timezone,
  registrationNumber: form.registrationNumber,
  tradeNumber: form.tradeNumber,
  userLimit: Number(form.userLimit) || 0,
  country: form.country,
  subDomain: form.subDomain,
  status: form.status,
});

// ============================================================
// Component
// ============================================================

const CompanySettingsPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [company, setCompany] = useState<CompanyDisplayData | null>(null);
  const [formData, setFormData] = useState<CompanyFormState>(emptyForm);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // ---- Fetch company by id ----
  const fetchCompany = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res: any = await CompanyService.getById(id);
      const raw = unwrap(res);

      setCompany(mapResponseToDisplay(raw));
      setFormData(mapResponseToForm(raw));
    } catch (error) {
      console.error("Failed to fetch company:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  // ---- Warn on unload with unsaved changes ----
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleInputChange = (field: keyof CompanyFormState, value: any) => {
    // companyEmail is read-only — ignore any attempt to change it
    if (field === "companyEmail") return;

    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-update timezone when country changes
      if (field === "country") {
        const autoTz = resolveTimezoneForCountry(value);
        if (autoTz) {
          updated.timezone = autoTz;
        }
      }

      return updated;
    });

    setHasUnsavedChanges(true);

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.companyName?.trim()) {
      newErrors.companyName = t("company_name_is_required");
    }
    if (!formData.industry?.trim()) {
      newErrors.industry = t("industry_is_required");
    }
    if (!formData.number?.trim()) {
      newErrors.number = t("phone_number_is_required");
    }
    if (formData.userLimit === undefined || formData.userLimit < 0) {
      newErrors.userLimit = t("user_limit_must_be_valid");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!id) return;
  if (!validate()) return;

  setSaving(true);
  setErrors((prev) => ({ ...prev, submit: undefined }));

  // Keep original email before API update
  const originalEmail = formData.companyEmail;
  const phone = formData.number

  try {
    const payload = mapFormToPayload(formData);

    const res: any = await CompanyService.update(id, payload as any);
    const raw = unwrap(res);

    setCompany(mapResponseToDisplay(raw));

    const updatedForm = mapResponseToForm(raw);


    setFormData({
      ...updatedForm,
      companyEmail: originalEmail,
      number:phone
    });

    setHasUnsavedChanges(false);

  } catch (error: any) {
    console.error("Failed to update company:", error);

    const detail = error?.response?.data?.detail;
    let message = t("something_went_wrong");

    if (Array.isArray(detail) && detail.length > 0) {
      message = detail.map((d: any) => d.msg).join(", ");
    } else if (typeof detail === "string") {
      message = detail;
    } else if (error?.response?.data?.message) {
      message = error.response.data.message;
    } else if (error?.message) {
      message = error.message;
    }

    setErrors((prev) => ({ ...prev, submit: message }));
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          <p className="text-slate-600 dark:text-slate-400">
            {t("loading_company_details")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 mx-auto ml-72 mt-10 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
            <TbBuilding className="text-2xl text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {t("company_settings")}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {t("manage_your_organization_information")}
            </p>
          </div>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <FiAlertCircle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {t("unsaved_changes")}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t("you_have_unsaved_changes_save_them")}
            </p>
          </div>
        </div>
      )}

      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <FiAlertCircle className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium text-red-900 dark:text-red-200">
            {errors.submit}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ===================== BASIC INFORMATION ===================== */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t("basic_information")}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t("basic_company_details_and_contact_info")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("company_name")}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
                className={`px-3 py-2.5 rounded-lg border text-sm outline-none transition-all
                  ${
                    errors.companyName
                      ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-200 dark:border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  }
                  bg-white dark:bg-gray-700 text-slate-900 dark:text-white`}
                placeholder={t("enter_company_name")}
                maxLength={100}
              />
              {errors.companyName && (
                <span className="text-sm text-red-500">{errors.companyName}</span>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {(formData.companyName || "").length}/100 {t("characters")}
              </span>
            </div>

            {/* Industry */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("industry")}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => handleInputChange("industry", e.target.value)}
                className={`px-3 py-2.5 rounded-lg border text-sm outline-none transition-all
                  ${
                    errors.industry
                      ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-200 dark:border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  }
                  bg-white dark:bg-gray-700 text-slate-900 dark:text-white`}
                placeholder={t("enter_industry")}
              />
              {errors.industry && (
                <span className="text-sm text-red-500">{errors.industry}</span>
              )}
            </div>

            {/* Company Email — READ ONLY, not part of update schema */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                {t("company_email")}
                <FiLock className="text-slate-400 text-xs" title={t("cannot_be_changed")} />
              </label>
              <input
                type="email"
                value={formData.companyEmail}
                disabled
                readOnly
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-900 text-sm outline-none text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t("company_email_cannot_be_changed")}
              </span>
            </div>

            {/* Phone Number */}
            <PhoneInputField
              label={t("company_phone_number")}
              value={formData.number}
              onChange={(value) => handleInputChange("number", value)}
              error={errors.number}
              required
            />

            {/* Website */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("website")}
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                className={`px-3 py-2.5 rounded-lg border text-sm outline-none transition-all
                  ${
                    errors.website
                      ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-200 dark:border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  }
                  bg-white dark:bg-gray-700 text-slate-900 dark:text-white`}
                placeholder="https://example.com"
              />
              {errors.website && (
                <span className="text-sm text-red-500">{errors.website}</span>
              )}
            </div>
          </div>
        </div>

        {/* ===================== ORGANIZATION DETAILS ===================== */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t("organization_details")}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t("company_size_location_and_timezone_preferences")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Size */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("company_size")}
              </label>
              <select
                value={formData.companySize || ""}
                onChange={(e) =>
                  handleInputChange("companySize", e.target.value || undefined)
                }
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white"
              >
                <option value="">{t("select_company_size")}</option>
                {COMPANY_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Country */}
            <SearchableSelect
              label={t("country")}
              options={COUNTRY_OPTIONS}
              value={formData.country || ""}
              onChange={(value) => handleInputChange("country", value || undefined)}
              placeholder={t("select_country")}
            />

            {/* Timezone */}
            <SearchableSelect
              label={t("timezone")}
              options={TIMEZONE_OPTIONS}
              value={formData.timezone || ""}
              onChange={(value) => handleInputChange("timezone", value || undefined)}
              placeholder={t("select_timezone")}
            />

            {/* User Limit */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("user_limit")}
              </label>
              <input
                type="number"
                min={0}
                value={formData.userLimit}
                onChange={(e) =>
                  handleInputChange("userLimit", parseInt(e.target.value, 10) || 0)
                }
                className={`px-3 py-2.5 rounded-lg border text-sm outline-none transition-all
                  ${
                    errors.userLimit
                      ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-200 dark:border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  }
                  bg-white dark:bg-gray-700 text-slate-900 dark:text-white`}
                placeholder={t("enter_user_limit")}
              />
              {errors.userLimit && (
                <span className="text-sm text-red-500">{errors.userLimit}</span>
              )}
            </div>

            {/* Sub Domain */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("sub_domain")}
              </label>
              <input
                type="text"
                value={formData.subDomain}
                onChange={(e) => handleInputChange("subDomain", e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white"
                placeholder={t("enter_sub_domain")}
              />
            </div>

            {/* Status */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("status")}
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white capitalize"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ===================== LEGAL INFORMATION ===================== */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t("legal_information")}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t("registration_and_trade_details")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("registration_number")}
              </label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={(e) =>
                  handleInputChange("registrationNumber", e.target.value)
                }
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white"
                placeholder={t("enter_registration_number")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("trade_number")}
              </label>
              <input
                type="text"
                value={formData.tradeNumber}
                onChange={(e) => handleInputChange("tradeNumber", e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white"
                placeholder={t("enter_trade_number")}
              />
            </div>
          </div>
        </div>

        {/* ===================== SYSTEM INFORMATION (read-only) ===================== */}
        {company && (
          <div className="bg-slate-50 dark:bg-gray-800/50 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiInfo className="text-slate-600 dark:text-slate-400" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {t("system_information")}
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t("read_only_system_generated_information")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-slate-200 dark:border-gray-700">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                  {t("company_id")}
                </span>
                <p className="text-sm text-slate-900 dark:text-white font-mono break-all">
                  {company.id}
                </p>
              </div>

              {company.slug && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-slate-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                    {t("slug")}
                  </span>
                  <p className="text-sm text-slate-900 dark:text-white">{company.slug}</p>
                </div>
              )}

              {company.createdAt && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-slate-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                    {t("created_at")}
                  </span>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {new Date(company.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}

              {company.updatedAt && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-slate-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                    {t("last_updated")}
                  </span>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {new Date(company.updatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== ACTIONS ===================== */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={saving || !hasUnsavedChanges}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t("saving")}
              </>
            ) : (
              <>
                <FiSave />
                {t("save_changes")}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanySettingsPage;