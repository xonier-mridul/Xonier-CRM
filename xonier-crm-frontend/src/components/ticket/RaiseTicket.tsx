"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  FiTag,
  FiBox,
  FiLayers,
  FiBriefcase,
  FiFlag,
  FiPaperclip,
  FiUpload,
  FiX,
  FiFile,
  FiSend,
  FiCheckCircle,
  FiUserCheck,
  FiAlertCircle,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

/* ---------------------------------- */
/* Types                               */
/* ---------------------------------- */

type Priority = "LOW" | "MEDIUM" | "HIGH";

interface TicketFormData {
  subject: string;
  description: string;
  issueType: string;
  product: string;
  module: string;
  department: string;
  priority: Priority | "";
  assignedTo: string;
}

interface FormErrors {
  subject?: string;
  description?: string;
  issueType?: string;
  product?: string;
  module?: string;
  department?: string;
  priority?: string;
}

interface RaiseTicketFormProps {
  isAdmin?: boolean;
}

/* ---------------------------------- */
/* Dummy Data                          */
/* ---------------------------------- */

const issueTypeOptions = ["bug", "feature_request", "integration_issue", "billing", "other"];
const productOptions = ["trakeroo_crm", "trakeroo_mail", "trakeroo_analytics"];
const moduleOptions = ["contacts_sync", "dashboard", "billing_module", "reports", "settings"];
const departmentOptions = [
  "sales_operations",
  "marketing",
  "engineering",
  "customer_success",
  "it_admin",
];

const dummyAgents = [
  { id: "AG-01", name: "Ravi Kumar", department: "Engineering" },
  { id: "AG-02", name: "Neha Verma", department: "Customer Success" },
  { id: "AG-03", name: "Suresh Iyer", department: "Sales Operations" },
  { id: "AG-04", name: "Priya Nair", department: "Marketing" },
];

const priorityConfig: Record<
  Priority,
  { key: string; base: string; active: string }
> = {
  LOW: {
    key: "priority_low",
    base: "border-gray-200 text-gray-500 bg-white",
    active: "border-gray-400 bg-gray-100 text-gray-900",
  },
  MEDIUM: {
    key: "priority_medium",
    base: "border-amber-200 text-amber-500 bg-white",
    active: "border-amber-400 bg-amber-50 text-amber-700",
  },
  HIGH: {
    key: "priority_high",
    base: "border-red-200 text-red-500 bg-white",
    active: "border-red-400 bg-red-50 text-red-700",
  },
};

/* ---------------------------------- */
/* Helpers                             */
/* ---------------------------------- */

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

const initialFormData: TicketFormData = {
  subject: "",
  description: "",
  issueType: "",
  product: "",
  module: "",
  department: "",
  priority: "",
  assignedTo: "",
};

/* ---------------------------------- */
/* Main Component                      */
/* ---------------------------------- */

export default function RaiseTicketForm({ isAdmin = false }: RaiseTicketFormProps) {
  const { t } = useTranslation();
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<TicketFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const updateField = <K extends keyof TicketFormData>(field: K, value: TicketFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!formData.subject.trim()) nextErrors.subject = t("error_field_required");
    if (!formData.description.trim()) nextErrors.description = t("error_field_required");
    if (!formData.issueType) nextErrors.issueType = t("error_field_required");
    if (!formData.product) nextErrors.product = t("error_field_required");
    if (!formData.module) nextErrors.module = t("error_field_required");
    if (!formData.department) nextErrors.department = t("error_field_required");
    if (!formData.priority) nextErrors.priority = t("error_field_required");

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Dummy submit simulation — no backend call
    setTimeout(() => {

      setIsSubmitting(false);
      setIsSuccess(true);
      setFormData(initialFormData);
      setFiles([]);
      toast.success(t("ticket_created_title"))
      router.back()

      setTimeout(() => setIsSuccess(false), 4000);
    }, 1400);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="mb-8 border-gray-100 bg-white border p-6 md:p-8 rounded-3xl mt-5  ">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t("raise_new_ticket")}</h2>
        <p className="text-sm text-gray-500 mt-1">{t("raise_ticket_subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-3xl border border-gray-100 bg-white  p-6 md:p-8 ">
        {/* Subject */}
        <FormField
          label={t("subject")}
          htmlFor="subject"
          icon={FiTag}
          error={errors.subject}
        >
          <input
            id="subject"
            type="text"
            value={formData.subject}
            onChange={(e) => updateField("subject", e.target.value)}
            placeholder={t("subject_placeholder") ?? ""}
            className={inputClasses(!!errors.subject)}
          />
        </FormField>

        {/* Issue Type / Product / Module */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <FormField label={t("issue_type")} htmlFor="issueType" icon={FiAlertCircle} error={errors.issueType}>
            <select
              id="issueType"
              value={formData.issueType}
              onChange={(e) => updateField("issueType", e.target.value)}
              className={selectClasses(!!errors.issueType)}
            >
              <option value="">{t("select_placeholder")}</option>
              {issueTypeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`issue_type_${opt}`)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("product")} htmlFor="product" icon={FiBox} error={errors.product}>
            <select
              id="product"
              value={formData.product}
              onChange={(e) => updateField("product", e.target.value)}
              className={selectClasses(!!errors.product)}
            >
              <option value="">{t("select_placeholder")}</option>
              {productOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`product_${opt}`)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("module")} htmlFor="module" icon={FiLayers} error={errors.module}>
            <select
              id="module"
              value={formData.module}
              onChange={(e) => updateField("module", e.target.value)}
              className={selectClasses(!!errors.module)}
            >
              <option value="">{t("select_placeholder")}</option>
              {moduleOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`module_${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Department + Assign To (admin only) */}
        <div className={`grid grid-cols-1 gap-5 ${isAdmin ? "sm:grid-cols-2" : ""}`}>
          <FormField label={t("department")} htmlFor="department" icon={FiBriefcase} error={errors.department}>
            <select
              id="department"
              value={formData.department}
              onChange={(e) => updateField("department", e.target.value)}
              className={selectClasses(!!errors.department)}
            >
              <option value="">{t("select_placeholder")}</option>
              {departmentOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`department_${opt}`)}
                </option>
              ))}
            </select>
          </FormField>

          {isAdmin && (
            <FormField label={t("assign_to")} htmlFor="assignedTo" icon={FiUserCheck}>
              <select
                id="assignedTo"
                value={formData.assignedTo}
                onChange={(e) => updateField("assignedTo", e.target.value)}
                className={selectClasses(false)}
              >
                <option value="">{t("unassigned")}</option>
                {dummyAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} — {agent.department}
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </div>

        {/* Priority */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <FiFlag className="text-[#1BA2C3]" size={14} />
            {t("priority")}
          </label>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(priorityConfig) as Priority[]).map((value) => {
              const config = priorityConfig[value];
              const isActive = formData.priority === value;
              return (
                <motion.button
                  key={value}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => updateField("priority", value)}
                  className={`rounded-xl border-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
                    isActive ? config.active : config.base
                  }`}
                >
                  {t(config.key)}
                </motion.button>
              );
            })}
          </div>
          {errors.priority && <p className="mt-1.5 text-xs text-red-500">{errors.priority}</p>}
        </div>

        {/* Description */}
        <FormField label={t("description")} htmlFor="description" error={errors.description}>
          <textarea
            id="description"
            rows={5}
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder={t("description_placeholder") ?? ""}
            className={`${inputClasses(!!errors.description)} resize-none`}
          />
        </FormField>

        {/* Attachments */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <FiPaperclip className="text-[#1BA2C3]" size={14} />
            {t("attachments")}
          </label>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? "border-[#1BA2C3] bg-[#1BA2C3]/5"
                : "border-gray-200 hover:border-[#1BA2C3]/40 hover:bg-gray-50"
            }`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1BA2C3]/10 text-[#1BA2C3]">
              <FiUpload size={18} />
            </div>
            <p className="text-sm font-medium text-gray-700">{t("upload_drag_drop")}</p>
            <p className="text-xs text-gray-400">{t("upload_file_types")}</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between rounded-xl border border-gray-100 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                      <FiFile size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeFile(index)}
                    aria-label={t("remove_file")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <FiX size={14} />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setFormData(initialFormData);
              setFiles([]);
              setErrors({});
            }}
            className="w-full sm:w-auto rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t("cancel")}
          </motion.button>

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1BA2C3] to-[#33BF8B] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                />
                {t("submitting")}
              </>
            ) : (
              <>
                <FiSend size={16} />
                {t("submit_ticket")}
              </>
            )}
          </motion.button>
        </div>

      </form>


      {/* Success Banner */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 md:p-8  overflow-hidden"
          >
            <FiCheckCircle className="shrink-0 text-emerald-500" size={20} />
            <div>
              <p className="text-sm font-semibold text-emerald-800">{t("ticket_created_title")}</p>
              <p className="text-xs text-emerald-600 mt-0.5">{t("ticket_created_desc")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </motion.div>
  );
}

/* ---------------------------------- */
/* Shared Field Wrapper                */
/* ---------------------------------- */

interface FormFieldProps {
  label: string;
  htmlFor: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, htmlFor, icon: Icon, error, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        {Icon && <Icon className="text-[#1BA2C3]" size={14} />}
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

/* ---------------------------------- */
/* Shared Class Helpers                */
/* ---------------------------------- */

function inputClasses(hasError: boolean): string {
  return `w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition-all focus:bg-white focus:ring-2 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-gray-200 focus:border-[#1BA2C3] focus:ring-[#1BA2C3]/20"
  }`;
}

function selectClasses(hasError: boolean): string {
  return `w-full appearance-none rounded-xl border bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition-all focus:bg-white focus:ring-2 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-gray-200 focus:border-[#1BA2C3] focus:ring-[#1BA2C3]/20"
  }`;
}