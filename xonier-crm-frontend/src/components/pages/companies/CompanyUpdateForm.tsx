"use client";

import React, { useEffect, useRef, useState } from "react";
import Input from "../../ui/Input";
import FormButton from "../../ui/FormButton";
import ErrorComponent from "../../ui/ErrorComponent";
import { Company, CompanyUpdateFormProps, CompanyUpdatePayload } from "@/src/types/company/company.types";
import { COMPANY_STATUS, COUNTRY_CODE, NUMBER_OF_EMPLOYEES } from "@/src/constants/enum";
import { FiMail, FiCheck, FiX, FiShield, FiAlertTriangle } from "react-icons/fi";
import { BsBuildings } from "react-icons/bs";
import { AnimatePresence, motion } from "framer-motion";
import { sizeOptions } from "@/src/constants/constants";





const statusOptions = Object.values(COMPANY_STATUS).filter(
  (s) => s !== COMPANY_STATUS.DELETED
);

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

type FormErrors = Partial<Record<keyof CompanyUpdatePayload, string>>;

function validate(form: CompanyUpdatePayload): FormErrors {
  const errors: FormErrors = {};
  if (form.companyName !== undefined && form.companyName.trim().length < 3)
    errors.companyName = "Company name must be at least 3 characters";
  if (form.industry !== undefined && !form.industry.trim())
    errors.industry = "Industry cannot be empty";
  if (form.number !== undefined && !form.number.trim())
    errors.number = "Phone cannot be empty";
  if (form.userLimit !== undefined && form.userLimit < 1)
    errors.userLimit = "User limit must be at least 1";
  return errors;
}

const OtpOverlay: React.FC<{
  adminEmail: string;
  adminId: string;
  isVerifying: boolean;
  onVerify: (userId: string, email: string, otp: number) => Promise<void>;
  onResend: (userId: string) => Promise<void>;
  loading:boolean
}> = ({ adminEmail, adminId, isVerifying, onVerify, onResend, loading }) => {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 200);
    startCooldown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    setOtpError("");
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const updated = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => (updated[i] = ch));
    setOtp(updated);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) { setOtpError("Please enter all 6 digits"); return; }
    await onVerify(adminId, adminEmail, Number(code));
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    await onResend(adminId);
    setOtp(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    startCooldown();
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-150 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-2xl w-full max-w-md p-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <FiAlertTriangle className="text-amber-500 text-3xl" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            Email Not Verified
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Verify the admin email before editing this company.
          </p>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-6">
            {adminEmail}
          </p>

          <div className="flex items-center gap-3 mb-3 w-full justify-center" onPaste={handlePaste}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otp[i]}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`h-12 w-11 text-center text-xl font-bold rounded-xl border-2 bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white transition-all focus:outline-none ${
                  otpError
                    ? "border-red-400 dark:border-red-500"
                    : otp[i]
                    ? "border-blue-500 dark:border-blue-400"
                    : "border-slate-200 dark:border-gray-600 focus:border-blue-400"
                }`}
              />
            ))}
          </div>

          {otpError && (
            <p className="text-sm text-red-500 mb-3 w-full text-left">{otpError}</p>
          )}

          <FormButton
            onClick={handleVerify}
            isLoading={isVerifying}
            disabled={isVerifying || otp.join("").length < OTP_LENGTH}
            className="mt-2 bg-blue-600 hover:bg-blue-700"
          >
            <FiCheck className="text-base" /> Verify & Continue
          </FormButton>

          <div className="mt-4 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <span>Didn't receive it?</span>
            {cooldown > 0 ? (
              <span className="text-blue-500 font-medium tabular-nums">Resend in {cooldown}s</span>
            ) : (
              <button onClick={handleResend} disabled={loading} className="text-blue-600 disabled:text-blue-300 dark:text-blue-400 font-semibold hover:underline">
                {loading ? "resending..." : "Resend OTP"}
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-5 bg-slate-50 dark:bg-gray-800 rounded-lg px-4 py-3 w-full text-left">
            A verification code was sent when the company was created. Check the admin's inbox or resend above.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CompanyUpdateForm: React.FC<CompanyUpdateFormProps> = ({
  company,
  isSubmitting,
  isVerifying,
  error,
  onUpdate,
  onVerifyOtp,
  onResendOtp,
  loading
}) => {
  const isUnverified = company.status === COMPANY_STATUS.PENDING_VERIFICATION;
  
  const [form, setForm] = useState<CompanyUpdatePayload>({
    companyName: company.companyName,
    industry: company.industry,
    number: company.number,
    companySize: company.companySize,
    website: company.website ?? "",
    timezone: company.timezone ?? "",
    country: company.country,
    userLimit: company.userLimit,
    subDomain: company.subDomain ?? "",
    status: company.status,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const set = (field: keyof CompanyUpdatePayload, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    const changed: CompanyUpdatePayload = {};
    (Object.keys(form) as (keyof CompanyUpdatePayload)[]).forEach((key) => {
      const original = (company as Record<string, unknown>)[key];
      if (form[key] !== original && form[key] !== "" && form[key] !== undefined) {
        (changed as Record<string, unknown>)[key] = form[key];
      }
    });

    if (Object.keys(changed).length === 0) return;
    await onUpdate(changed);
  };

  const adminId = typeof company.primary_admin === "object" && company.primary_admin !== null
    ? (company.primary_admin as { id: string }).id
    : company.primary_admin ?? "";

  const adminEmail = company.email;

  return (
    <>
      <AnimatePresence>
        {isUnverified && (
          <OtpOverlay
            adminEmail={adminEmail}
            adminId={adminId}
            isVerifying={isVerifying}
            onVerify={onVerifyOtp}
            onResend={onResendOtp}
            loading={loading}
          />
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-6">
        <ErrorComponent error={error} />

        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100 dark:border-gray-700">
            <BsBuildings className="text-blue-500 text-lg" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-base">
              Company Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Company Name"
              required
              value={form.companyName ?? ""}
              onChange={(e) => set("companyName", (e.target as HTMLInputElement).value)}
              error={formErrors.companyName}
            />
            <Input
              label="Industry"
              required
              value={form.industry ?? ""}
              onChange={(e) => set("industry", (e.target as HTMLInputElement).value)}
              error={formErrors.industry}
            />
            <Input
              label="Phone Number"
              required
              value={form.number ?? ""}
              onChange={(e) => set("number", (e.target as HTMLInputElement).value)}
              error={formErrors.number}
            />
            <Input
              label="Website"
              value={form.website ?? ""}
              onChange={(e) => set("website", (e.target as HTMLInputElement).value)}
            />
            <Input
              label="Sub Domain"
              value={form.subDomain ?? ""}
              onChange={(e) => set("subDomain", (e.target as HTMLInputElement).value)}
            />
            <Input
              label="Timezone"
              placeholder="Asia/Karachi"
              value={form.timezone ?? ""}
              onChange={(e) => set("timezone", (e.target as HTMLInputElement).value)}
            />
            <Input
              label="User Limit"
              type="number"
              value={form.userLimit ?? ""}
              onChange={(e) =>
                set("userLimit", (e.target as HTMLInputElement).value
                  ? Number((e.target as HTMLInputElement).value)
                  : undefined)
              }
              error={formErrors.userLimit}
            />

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Company Size
              </label>
              <select
                value={form.companySize ?? ""}
                onChange={(e) =>
                  set("companySize", (e.target.value as NUMBER_OF_EMPLOYEES) || undefined)
                }
                className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select size</option>
                {sizeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Country
              </label>
              <select
                value={form.country ?? ""}
                onChange={(e) =>
                  set("country", (e.target.value as COUNTRY_CODE) || undefined)
                }
                className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select country</option>
                {Object.values(COUNTRY_CODE).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100 dark:border-gray-700">
            <FiShield className="text-blue-500 text-lg" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-base">
              Status
            </h3>
          </div>

          <div className="flex flex-col gap-1 w-full max-w-xs">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Company Status
            </label>
            <select
              value={form.status ?? ""}
              onChange={(e) => set("status", e.target.value as COMPANY_STATUS)}
              className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <FormButton
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="max-w-[180px] bg-blue-600 hover:bg-blue-700"
          >
            <FiCheck className="text-base" /> Save Changes
          </FormButton>
        </div>
      </form>
    </>
  );
};

export default CompanyUpdateForm;