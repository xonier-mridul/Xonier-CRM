// src/app/(dashboard)/settings/company/page.tsx

"use client";

import React, { useState, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import SearchableSelect from "@/src/components/common/SearchableSelect";
import { FiSave, FiAlertCircle, FiInfo } from "react-icons/fi";
import { TbBuilding } from "react-icons/tb";
import Image from "next/image";
import { COMPANY_SIZE_OPTIONS, COUNTRY_OPTIONS, TIMEZONE_OPTIONS } from "@/src/constants/company";
import { useCompanySettings } from "@/src/hooks/useCompanySetting";
import { CompanySettingUpdatePayload } from "@/src/types/companySetting/company.types";
import PhoneInputField from "@/src/components/common/PhoneInput";
import CompanyService from "@/src/services/company.service";
import { toast } from "react-toastify";
import { AxiosError } from "axios";

const COMPANY_CURRENCIES = [
  { value: "USD", label: "$ — USD — US Dollar" },
  { value: "EUR", label: "€ — EUR — Euro" },
  { value: "GBP", label: "£ — GBP — Pound Sterling" },
  { value: "AED", label: "د.إ — AED — UAE Dirham" },
  { value: "INR", label: "₹ — INR — Indian Rupee" },
  { value: "SAR", label: "﷼ — SAR — Saudi Riyal" },
];

const CompanySettingsPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    company,
    loading,
    saving,
    errors,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    setErrors,
    updateCompany,
  } = useCompanySettings();

  const [formData, setFormData] = useState<CompanySettingUpdatePayload>({
    companyName: "",
    industry: "",
    email: "",
    number: "",
    companySize: undefined,
    country: undefined,
    timezone: undefined,
    website: "",
    address: "",
    registrationNumber: "",
    tradeNumber: "",
    currency: "USD",
    paymentMethods: [],
    paymentTerms: [],
  });
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [paymentMethodInput, setPaymentMethodInput] = useState("");
  const [paymentTermInput, setPaymentTermInput] = useState("");

  useEffect(() => {
    if (!company) return;
    // Hydrate the editable form after the asynchronous company settings load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData({
      companyName: company.companyName || "",
      industry: company.industry || "",
      email: company.email || "",
      number: company.number || "",
      companySize: company.companySize,
      country: company.country,
      timezone: company.timezone,
      website: company.website || "",
      address: company.address || "",
      registrationNumber: company.registrationNumber || "",
      tradeNumber: company.tradeNumber || "",
      currency: company.currency || "USD",
      paymentMethods: company.paymentMethods || [],
      paymentTerms: company.paymentTerms || [],
    });
  }, [company]);

  useEffect(() => {
    if (!company?.logoFileId) return;
    let objectUrl: string | null = null;
    let active = true;
    CompanyService.getCompanyLogo()
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setLogoPreviewUrl(objectUrl);
      })
      .catch(() => setLogoPreviewUrl(null));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [company?.logoFileId]);

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      await CompanyService.uploadCompanyLogo(file);
      const logoBlob = await CompanyService.getCompanyLogo();
      setLogoPreviewUrl(URL.createObjectURL(logoBlob));
      toast.success("Company logo uploaded and saved");
    } catch (error: unknown) {
      const message = error instanceof AxiosError
        ? error.response?.data?.message
        : undefined;
      toast.error(message || "Failed to upload company logo");
    } finally {
      setUploadingLogo(false);
    }
  };

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

  const handleInputChange = (field: keyof CompanySettingUpdatePayload, value: string | string[] | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);

    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const addPaymentOption = (field: "paymentMethods" | "paymentTerms", value: string) => {
    const option = value.trim();
    if (!option || (formData[field] || []).some((item) => item.toLowerCase() === option.toLowerCase())) return;
    handleInputChange(field, [...(formData[field] || []), option]);
    if (field === "paymentMethods") setPaymentMethodInput("");
    else setPaymentTermInput("");
  };

  const removePaymentOption = (field: "paymentMethods" | "paymentTerms", index: number) => {
    handleInputChange(field, (formData[field] || []).filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateCompany(formData);
    if (success) {
      if (formData.currency) {
        window.localStorage.setItem("companyCurrency", formData.currency);
        window.dispatchEvent(new Event("company-currency-changed"));
      }
      setHasUnsavedChanges(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          <p className="text-slate-600 dark:text-slate-400">{t("loading_company_details")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 mx-auto mt-10 max-w-7xl">
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

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  ${errors.companyName
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
                {formData.companyName.length}/100 {t("characters")}
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
                  ${errors.industry
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

            {/* Company Email */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("company_email")}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`px-3 py-2.5 rounded-lg border text-sm outline-none transition-all
                  ${errors.email
                    ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-slate-200 dark:border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  }
                  bg-white dark:bg-gray-700 text-slate-900 dark:text-white`}
                placeholder={t("enter_company_email")}
              />
              {errors.email && (
                <span className="text-sm text-red-500">{errors.email}</span>
              )}
            </div>

            <PhoneInputField
              label={t("company_phone_number")}
              value={formData.number}
              onChange={(value) => handleInputChange("number", value)}
              error={errors.number}
              required
            />

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("website")}
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                className={`px-3 py-2.5 rounded-lg border text-sm outline-none transition-all
                  ${errors.website
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

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Company logo
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                disabled={uploadingLogo}
                onChange={(e) => void handleLogoUpload(e.target.files?.[0])}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white"
              />
              {uploadingLogo && <span className="text-sm text-slate-500">Uploading logo…</span>}
              {logoPreviewUrl && (
              <div className="mt-2 flex h-16 max-w-48 items-center rounded border border-slate-200 bg-white p-2">
                <Image src={logoPreviewUrl} alt="Company logo preview" width={180} height={64} unoptimized className="max-h-full max-w-full object-contain" />
              </div>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400">
                PNG or JPEG, up to 5 MB. Uploads are stored with this company’s account.
              </span>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Business address
              </label>
              <textarea
                value={formData.address || ""}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleInputChange("address", e.target.value)}
                rows={3}
                maxLength={500}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white"
                placeholder="Street, city, state, postal code, country"
              />
            </div>
          </div>
        </div>

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
                onChange={(e) => handleInputChange("companySize", e.target.value || undefined)}
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

            <SearchableSelect
              label={t("country")}
              options={COUNTRY_OPTIONS}
              value={formData.country || ""}
              onChange={(value) => handleInputChange("country", value || undefined)}
              placeholder={t("select_country")}
            />

            <SearchableSelect
              label={t("timezone")}
              options={TIMEZONE_OPTIONS}
              value={formData.timezone || ""}
              onChange={(value) => handleInputChange("timezone", value || undefined)}
              placeholder={t("select_timezone")}
            />

            <SearchableSelect
              label={t("currency")}
              options={COMPANY_CURRENCIES}
              value={formData.currency || "USD"}
              onChange={(value) => handleInputChange("currency", value)}
              placeholder={t("select_currency")}
            />
          </div>
        </div>

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
                onChange={(e) => handleInputChange("registrationNumber", e.target.value)}
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

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Invoice & Quotation Payment Presets</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Add comma-separated options that admins and users can select while creating documents.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Methods</label>
              <div className="flex gap-2">
                <input type="text" value={paymentMethodInput} onChange={(e) => setPaymentMethodInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPaymentOption("paymentMethods", paymentMethodInput); } }} className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white" placeholder="e.g. Bank Transfer" />
                <button type="button" onClick={() => addPaymentOption("paymentMethods", paymentMethodInput)} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.paymentMethods || []).map((method, index) => <span key={`${method}-${index}`} className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-sm text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200">{method}<button type="button" onClick={() => removePaymentOption("paymentMethods", index)} aria-label={`Remove ${method}`} className="font-bold text-cyan-600 hover:text-red-600">×</button></span>)}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Terms Presets</label>
              <div className="flex gap-2">
                <input type="text" value={paymentTermInput} onChange={(e) => setPaymentTermInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPaymentOption("paymentTerms", paymentTermInput); } }} className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white" placeholder="e.g. Net 30" />
                <button type="button" onClick={() => addPaymentOption("paymentTerms", paymentTermInput)} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.paymentTerms || []).map((term, index) => <span key={`${term}-${index}`} className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-sm text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200">{term}<button type="button" onClick={() => removePaymentOption("paymentTerms", index)} aria-label={`Remove ${term}`} className="font-bold text-cyan-600 hover:text-red-600">×</button></span>)}
              </div>
            </div>
          </div>
        </div>

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
              {/* Company ID */}
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

              {company.subdomain && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-slate-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                    {t("subdomain")}
                  </span>
                  <p className="text-sm text-slate-900 dark:text-white">{company.subdomain}</p>
                </div>
              )}

              {company.status && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-slate-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                    {t("status")}
                  </span>
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium
                    ${company.status === "ACTIVE"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    }`}>
                    {company.status}
                  </span>
                </div>
              )}

              {company.createdAt && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-slate-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">
                    {t("created_at")}
                  </span>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {new Date(company.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
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
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

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
