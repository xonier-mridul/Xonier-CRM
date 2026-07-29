"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MdOutlineMailOutline } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { AuthService } from "@/src/services/auth.service";

export interface verifyEmail{
  email:string
}

const Page = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!email.trim()) return;

  setLoading(true);
  
const payload = {
  email,
};

try {
  setLoading(true);

  const result = await AuthService.emailVerify(payload);

  if (result.status === 200) {
    sessionStorage.setItem("forgotPasswordEmail", email);

    toast.success(t("otp_sent_successfully"));

    router.push("/change-password");
  }
} catch (error) {
  console.error(error);
  toast.error(t("something_went_wrong"));
} finally {
  setLoading(false);
}
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-8">

        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-cyan-100 flex items-center justify-center">
            <MdOutlineMailOutline className="text-3xl text-cyan-600" />
          </div>
        </div>

        <h1 className="mt-6 text-center text-3xl font-bold text-slate-800">
          {t("forgot_password")}
        </h1>

        <p className="mt-2 text-center text-sm text-slate-500">
          {t("enter_registered_email_for_otp")}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {t("email_address")}
            </label>

            <input
              type="email"
              placeholder={t("enter_email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="flex w-full items-center justify-center rounded-xl bg-cyan-600 py-3 text-white font-semibold transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("sending")}
              </>
            ) : (
              t("send_otp")
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            ← {t("back_to_login")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Page;