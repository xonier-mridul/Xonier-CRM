"use client";

import React, { useState, useRef, useEffect } from "react";
import Input from "@/src/components/ui/Input";
import { Plan } from "@/src/types/plan/plan.types";
import {
  CompanyCreatePayload,

  CreateCompanyResponse,
} from "@/src/types/company/company.types";
import {
  COUNTRY_CODE,
  NUMBER_OF_EMPLOYEES,
  CURRENCY,
  DISCOUNT_TYPE,
  BILLING_CYCLE,
} from "@/src/constants/enum";
import {
  FiArrowRight,
  FiArrowLeft,
  FiCheck,
  FiZap,
  FiShield,
  FiStar,
  FiMail,
} from "react-icons/fi";
import { BsBuildings } from "react-icons/bs";
import { sizeOptions } from "@/src/constants/constants";
import { useTranslation } from "react-i18next";

interface CreateCompanyFormProps {
  planData: Plan[];
  isSubmitting: boolean;
  isVerifying: boolean;
  onSubmit: (payload: CompanyCreatePayload) => Promise<CreateCompanyResponse | null>;
  onVerifyOtp: (userId: string, email: string, otp: number) => Promise<void>;
  onResendOtp: (userId: string) => Promise<void>;
}

const STEPS = ["Company Details", "Select Plan", "Verify Email"];

const countryOptions = Object.entries(COUNTRY_CODE).map(
  ([name, code]) => ({
    label: name
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    value: code,
  })
);


const currencySymbol: Record<string, string> = {
  [CURRENCY.USD]: "$",
  [CURRENCY.EUR]: "€",
  [CURRENCY.GBP]: "£",
};

const initialForm: CompanyCreatePayload = {
  companyName: "",
  industry: "",
  number: "",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
  adminPhone: "",
  password: "",
  companySize: undefined,
  website: "",
  timezone: "",
  country: undefined,
  userLimit: undefined,
  planId: undefined,
  billingCycle: BILLING_CYCLE.MONTHLY,
};

type FormErrors = Partial<Record<keyof CompanyCreatePayload, string>>;

function validateStep1(form: CompanyCreatePayload): FormErrors {
  const errors: FormErrors = {};
  if (!form.companyName.trim() || form.companyName.trim().length < 3)
    errors.companyName = "Company name must be at least 3 characters";
  if (!form.industry.trim()) errors.industry = "Industry is required";
  if (!form.number.trim()) errors.number = "Company phone is required";
  if (!form.adminFirstName.trim() || form.adminFirstName.trim().length < 3)
    errors.adminFirstName = "First name must be at least 3 characters";
  if (!form.adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail))
    errors.adminEmail = "Valid email is required";
  if (!form.adminPhone.trim()) errors.adminPhone = "Admin phone is required";
  if (!form.password || form.password.length < 8)
    errors.password = "Password must be at least 8 characters";
  if (
    !/[A-Z]/.test(form.password) ||
    !/[a-z]/.test(form.password) ||
    !/[0-9]/.test(form.password) ||
    !/[@$!%*?&#]/.test(form.password)
  )
    errors.password =
      "Password needs uppercase, lowercase, number & special character";
  return errors;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

const CreateCompanyForm: React.FC<CreateCompanyFormProps> = ({
  planData,
  isSubmitting,
  isVerifying,
  onSubmit,
  onVerifyOtp,
  onResendOtp,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CompanyCreatePayload>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});

  // step 3 state
  const [createdResponse, setCreatedResponse] = useState<CreateCompanyResponse | null>(null);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState<string>("");
  const [cooldown, setCooldown] = useState(0);
  const [isAdminPhoneEdited, setIsAdminPhoneEdited] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const set = (field: keyof CompanyCreatePayload, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleNext = () => {
    const errs = validateStep1(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setStep(1);
  };

  const handleSubmit = async () => {
    const response = await onSubmit(form);
    if (response) {
      setCreatedResponse(response);
      setStep(2);
      startCooldown();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    setOtpError("");
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const updated = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => (updated[i] = ch));
    setOtp(updated);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setOtpError("Please enter all 6 digits");
      return;
    }
    if (!createdResponse) return;
    setOtpError("");
    await onVerifyOtp(createdResponse.userId, form.adminEmail, Number(code));
  };

  const handleResend = async () => {
    if (cooldown > 0 || !createdResponse) return;
    await onResendOtp(createdResponse.userId);
    setOtp(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    startCooldown();
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const selectedPlan = planData.find((p) => p.id === form.planId);

  const getDiscountedPrice = (plan: Plan, cycle: BILLING_CYCLE) => {
    const base =
      cycle === BILLING_CYCLE.MONTHLY ? plan.price.monthlyPrice : plan.price.yearlyPrice;
    if (!plan.discount) return { base, final: base, saved: 0 };
    const applies =
      plan.discountApply === "both" ||
      (plan.discountApply === "monthly" && cycle === BILLING_CYCLE.MONTHLY) ||
      (plan.discountApply === "yearly" && cycle === BILLING_CYCLE.YEARLY);
    if (!applies) return { base, final: base, saved: 0 };
    const saved =
      plan.discountType === DISCOUNT_TYPE.PERCENTAGE
        ? parseFloat(((base * plan.discount) / 100).toFixed(2))
        : Math.min(plan.discount, base);
    return { base, final: parseFloat((base - saved).toFixed(2)), saved };
  };

  return (
    <div className="w-full ">
      {/* Step indicator */}
      <div className="flex items-center mb-10 gap-0">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2.5">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < step
                    ? "bg-emerald-500 text-white"
                    : i === step
                    ? "bg-teal-600 text-white ring-4 ring-teal-200 dark:ring-teal-900"
                    : "bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400"
                }`}
              >
                {i < step ? <FiCheck className="text-sm" /> : i + 1}
              </div>
              <span
                className={`text-sm font-medium transition-colors ${
                  i === step
                    ? "text-teal-600 dark:text-teal-400"
                    : i < step
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400 dark:text-gray-500"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 rounded-full transition-all duration-500 ${
                  i < step ? "bg-emerald-400" : "bg-slate-200 dark:bg-gray-700"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1 ── */}
      {step === 0 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100 dark:border-gray-700">
              <BsBuildings className="text-cyan-500 text-lg" />
              <h3 className="font-semibold text-slate-800 dark:text-white text-base">
                {t("company_information")}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5  items-end">
              <Input label={t("company_name")} required placeholder={t("xonier_technologies")} value={form.companyName} onChange={(e) => set("companyName", (e.target as HTMLInputElement).value)} error={errors.companyName} />
              <Input label={t("industry_2")} required placeholder={t("technology")} value={form.industry} onChange={(e) => set("industry", (e.target as HTMLInputElement).value)} error={errors.industry} />
              <Input label={t("company_phone")} required placeholder="+913001234567" value={form.number}  onChange={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  set("number", value);
                  if (!isAdminPhoneEdited) {
                    set("adminPhone", value);
                  }
                }} error={errors.number} />
              <Input label={t("website")} placeholder="https://company.io" value={form.website ?? ""} onChange={(e) => set("website", (e.target as HTMLInputElement).value)} />
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("company_size")}</label>
                <select value={form.companySize ?? ""} onChange={(e) => set("companySize", (e.target.value as NUMBER_OF_EMPLOYEES) || undefined)} className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm">
                  <option value="">{t("select_size")}</option>
                  {sizeOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("country")}</label>
                <select value={form.country ?? ""} onChange={(e) => set("country", (e.target.value as COUNTRY_CODE) || undefined)} className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm">
                  <option value="">{t("select_country")}</option>
                  {countryOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
              <Input label={t("timezone")} placeholder="Asia/Kolkata" value={form.timezone ?? ""} onChange={(e) => set("timezone", (e.target as HTMLInputElement).value)} />
              <Input label={t("user_limit")} type="number" placeholder="50" value={form.userLimit ?? ""} onChange={(e) => set("userLimit", (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : undefined)} />
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100 dark:border-gray-700">
              <FiShield className="text-cyan-500 text-lg" />
              <h3 className="font-semibold text-slate-800 dark:text-white text-base">{t("admin_account")}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
              <Input label={t("first_name")} required placeholder={t("first_name")} value={form.adminFirstName} onChange={(e) => set("adminFirstName", (e.target as HTMLInputElement).value)} error={errors.adminFirstName} />
              <Input label={t("last_name")} placeholder={t("last_name")} value={form.adminLastName ?? ""} onChange={(e) => set("adminLastName", (e.target as HTMLInputElement).value)} />
              <Input label={t("admin_email")} type="email" required placeholder={t("admin_company_io")} value={form.adminEmail} onChange={(e) => set("adminEmail", (e.target as HTMLInputElement).value)} error={errors.adminEmail} />
              <Input label={t("admin_phone")} required placeholder="+913009876543" value={form.adminPhone}   onChange={(e) => {setIsAdminPhoneEdited(true);
                set("adminPhone", (e.target as HTMLInputElement).value);
              }} error={errors.adminPhone} />
              <div className="md:col-span-2">
                <Input label={t("password_2")} type="password" required placeholder={t("min_8_chars_upper_lower_digit")} value={form.password} onChange={(e) => set("password", (e.target as HTMLInputElement).value)} error={errors.password} />
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button onClick={handleNext} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium text-sm transition-colors">
              {t("next_select_plan")} <FiArrowRight />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white">{t("choose_a_subscription_plan")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("optional_you_can_assign_a_plan")}</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-gray-700 p-1 rounded-xl">
              {[BILLING_CYCLE.MONTHLY, BILLING_CYCLE.YEARLY].map((cycle) => (
                <button key={cycle} onClick={() => set("billingCycle", cycle)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${form.billingCycle === cycle ? "bg-white dark:bg-gray-600 text-cyan-600 dark:text-cyan-400 shadow-sm" : "text-slate-500 dark:text-gray-400"}`}>
                  {cycle === BILLING_CYCLE.MONTHLY ? "Monthly" : "Yearly"}
                  {cycle === BILLING_CYCLE.YEARLY && (<span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">SAVE</span>)}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => set("planId", undefined)} className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all ${!form.planId ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/10" : "border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 dark:text-white text-sm">{t("no_plan_assign_later")}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t("create_the_company_first_add_subscription")}</p>
              </div>
              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${!form.planId ? "border-cyan-500 bg-cyan-500" : "border-slate-300 dark:border-gray-600"}`}>
                {!form.planId && <FiCheck className="text-white text-xs" />}
              </div>
            </div>
          </button>

          {planData.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">{t("no_active_plans_available")}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {planData.map((plan) => {
  // const { t } = useTranslation();
                const sym = currencySymbol[plan.currency] ?? "$";
                const { final, saved } = getDiscountedPrice(plan, form.billingCycle ?? BILLING_CYCLE.MONTHLY);
                const isSelected = form.planId === plan.id;
                const isFeatured = plan.trial_days > 0;
                return (
                  <button key={plan.id} onClick={() => set("planId", plan.id)} className={`relative text-left rounded-2xl border-2 p-5 transition-all duration-200 ${isSelected ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/10 shadow-lg shadow-cyan-100 dark:shadow-cyan-900/20" : "border-slate-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 bg-white dark:bg-gray-800"}`}>
                    {isFeatured && (<div className="absolute -top-2.5 left-4"><span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-amber-400 text-amber-900 rounded-full"><FiStar className="text-[10px]" /> {plan.trial_days}{t("d_free_trial")}</span></div>)}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white capitalize text-base">{plan.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 max-w-[160px]">{plan.description}</p>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all mt-0.5 ${isSelected ? "border-cyan-500 bg-cyan-500" : "border-slate-300 dark:border-gray-600"}`}>
                        {isSelected && <FiCheck className="text-white text-xs" />}
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-end gap-1">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{sym}{final}</span>
                        <span className="text-xs text-gray-400 mb-1">/{form.billingCycle === BILLING_CYCLE.MONTHLY ? "mo" : "yr"}</span>
                      </div>
                      {saved > 0 && (<span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{t("you_save")} {sym}{saved} ({plan.discount}{plan.discountType === DISCOUNT_TYPE.PERCENTAGE ? "%" : " off"})</span>)}
                    </div>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-1.5 border-t border-slate-100 dark:border-gray-700 pt-3">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <FiZap className="text-cyan-400 flex-shrink-0 text-[11px]" />
                            <span className="Capitalize">{typeof f.feature === "object" && f.feature !== null && "name" in f.feature ? (f.feature as { name: string }).name : "Feature"}{f.is_unlimited ? " — Unlimited" : f.limit ? ` — up to ${f.limit}` : ""}</span>
                          </li>
                        ))}
                        {plan.features.length > 4 && (<li className="text-xs text-gray-400 pl-4">+{plan.features.length - 4} {t("more")}</li>)}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedPlan && (
            <div className="flex items-center justify-between bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-200 dark:border-cyan-800 rounded-xl px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-600 flex items-center justify-center">
                  <FiCheck className="text-white text-sm" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white capitalize">{selectedPlan.name}</p>
                  <p className="text-xs text-gray-400">{form.billingCycle === BILLING_CYCLE.MONTHLY ? "Monthly billing" : "Annual billing"}</p>
                </div>
              </div>
              <p className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                {currencySymbol[selectedPlan.currency] ?? "$"}{getDiscountedPrice(selectedPlan, form.billingCycle ?? BILLING_CYCLE.MONTHLY).final}
                <span className="text-xs font-normal text-gray-400 ml-1">/{form.billingCycle === BILLING_CYCLE.MONTHLY ? "mo" : "yr"}</span>
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(0)} className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
              <FiArrowLeft /> {t("back")}
            </button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-7 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors">
              {isSubmitting ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" /></svg>{t("creating_2")}</>
              ) : (
                <>{t("create_company")} <FiArrowRight /></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: OTP Verification ── */}
      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex justify-center">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 p-8 text-center">
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div className="h-16 w-16 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <FiMail className="text-cyan-600 dark:text-cyan-400 text-3xl" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t("verify_admin_email")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t("we_sent_a_6_digit_code")}
              </p>
              <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-8">
                {form.adminEmail}
              </p>

              {/* OTP inputs */}
              <div className="flex items-center justify-center gap-3 mb-3" onPaste={handleOtpPaste}>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[i]}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`h-12 w-11 text-center text-xl font-bold rounded-xl border-2 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-0 ${
                      otpError
                        ? "border-red-400 dark:border-red-500"
                        : otp[i]
                        ? "border-cyan-500 dark:border-cyan-400"
                        : "border-slate-200 dark:border-gray-600 focus:border-cyan-400 dark:focus:border-cyan-500"
                    }`}
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-sm text-red-500 mb-4">{otpError}</p>
              )}

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={isVerifying || otp.join("").length < OTP_LENGTH}
                className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors mt-4"
              >
                {isVerifying ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" /></svg>{t("verifying")}</>
                ) : (
                  <><FiCheck /> {t("verify_activate")}</>
                )}
              </button>

              {/* Resend */}
              <div className="mt-5 flex items-center justify-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <span>{t("didn't_receive_it")}</span>
                {cooldown > 0 ? (
                  <span className="text-cyan-500 dark:text-cyan-400 font-medium tabular-nums">
                    {t("resend_in")} {cooldown}s
                  </span>
                ) : (
                  <button
                    onClick={handleResend}
                    className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
                  >
                    {t("resend_otp")}
                  </button>
                )}
              </div>

              {/* Info note */}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 bg-slate-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
                {t("the_company_and_admin_account_are")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCompanyForm;