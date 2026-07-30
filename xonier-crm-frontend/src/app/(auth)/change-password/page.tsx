"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { IoChevronBack } from "react-icons/io5";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa";
import FormButton from "@/src/components/ui/FormButton";
import { AuthService } from "@/src/services/auth.service";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { useTranslation } from "react-i18next";

const OTP_LENGTH = 6;

export interface verifyPasswordOtp{
        email: string,
        otp: string, 
        companyId:string,
        password: string,
        confirmPassword: string,
}

export default function SingleStepResetPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // ─── State ───────────────────────────────────
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [otp, setOtp] = useState<string>("");
  const [formData, setFormData] = useState({ newPassword: "", confirmPassword: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPwd, setShowPwd] = useState({ new: false, confirm: false });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ─── Init: Load Email ────────────────────────
  useEffect(() => {
    const userEmail = sessionStorage.getItem("forgotPasswordEmail");
   const userCompanyId = sessionStorage.getItem("forgotPasswordCompanyId");

    if (userEmail) setEmail(userEmail);
    if(userCompanyId) setCompanyId(userCompanyId);

    // else router.replace("/forgot-password");
  }, []);

  // ─── OTP Handlers ────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const otpArray = otp.split("");
    otpArray[index] = value;
    const newOtp = otpArray.join("").slice(0, OTP_LENGTH);
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const validatePasswordStrength = (password: string) => 
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);

  
    if (otp.length !== OTP_LENGTH) {
      toast.error(t("please_enter_6_digit_otp") || "Enter 6 digit OTP");
      return;
    }


    if (!validatePasswordStrength(formData.newPassword)) {
      toast.error(t("password_strength_error") || "Password must be 8+ chars, include uppercase, lowercase, number, and special char.");
      return;
    }

   
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error(t("password_mismatch") || "Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        email: email,
        otp: otp, 
        companyId: companyId,
        password: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      };

      const result = await AuthService.verifyChangePassword(payload); 
      
      if (result.status === 200) {
        toast.success(t("password_changed_successfully") || "Success!");
        sessionStorage.removeItem("forgotPasswordEmail");
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        setErrors(extractErrorMessages(error));
      } else {
        setErrors([t("something_went_wrong") || "Something went wrong"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50 min-h-screen p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 w-full max-w-[500px] flex flex-col gap-6">
        
        <button onClick={() => router.push("/forgot-password")} className="flex items-center gap-1.5 text-slate-700 font-medium hover:text-cyan-600 self-start">
          <IoChevronBack size={20} /> {t("step_back")}
        </button>

        <h1 className="text-2xl font-bold text-cyan-800">{t("reset_password")}</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* OTP Section */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">{t("enter_otp")}</label>
            <div className="flex gap-3 justify-center">
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <input key={i} ref={(el) => { inputRefs.current[i] = el; }}
                  maxLength={1} value={otp[i] || ""}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-12 text-center text-xl font-bold border-2 border-slate-300 rounded-xl focus:border-cyan-500 outline-none"
                />
              ))}
            </div>
          </div>

          {/* Password Section */}
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-1">{t("new_password")}</label>
              <input type={showPwd.new ? "text" : "password"} value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-slate-300 rounded-xl outline-none focus:border-cyan-500"
              />
              <button type="button" onClick={() => setShowPwd(s => ({...s, new: !s.new}))} className="absolute right-4 top-10 text-slate-500">
                {showPwd.new ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
              </button>
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-1">{t("confirm_password")}</label>
              <input type={showPwd.confirm ? "text" : "password"} value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className={`w-full pl-4 pr-12 py-3 bg-gray-50 border rounded-xl outline-none focus:border-cyan-500 ${
                  formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? "border-red-500" : "border-slate-300"
                }`}
              />
              <button type="button" onClick={() => setShowPwd(s => ({...s, confirm: !s.confirm}))} className="absolute right-4 top-10 text-slate-500">
                {showPwd.confirm ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
              </button>
              
              {/* Password Match Status */}
              {formData.confirmPassword && (
                <p className={`text-xs mt-1 font-semibold ${formData.newPassword === formData.confirmPassword ? "text-green-600" : "text-red-500"}`}>
                  {formData.newPassword === formData.confirmPassword 
                    ? (t("passwords_match") || "Passwords match") 
                    : (t("passwords_do_not_match") || "Passwords do not match")}
                </p>
              )}
            </div>
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 p-3 rounded-lg text-red-600 text-sm text-center">
              {errors.join(", ")}
            </div>
          )}

          <FormButton isLoading={isLoading}>{t("reset_password")}</FormButton>
        </form>
      </div>
    </div>
  );
}