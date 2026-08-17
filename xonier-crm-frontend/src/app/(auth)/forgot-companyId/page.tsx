"use client";

import React, { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MdOutlineMailOutline, MdContentCopy, MdCheckCircle, MdErrorOutline } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { AuthService } from "@/src/services/auth.service";

export interface verifyEmail {
  email: string;
}

export interface forgotCompanyIdPayload {
  email: string;
  companyName: string;
}

interface FindCompanyIdState {
  status: "success" | "error";
  companyId?: string;
  message?: string;
}

const Page = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FindCompanyIdState | null>(null);
  const [copied, setCopied] = useState(false);

  const handelChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // reset previous result whenever user edits the input again
    if (result) setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    setLoading(true);
    setResult(null);
    setCopied(false);

    const payload: forgotCompanyIdPayload = {
      email: email.trim(),
      companyName: companyName,
    };

    try {
      const response = await AuthService.findCompanyID(payload);


      const foundCompanyId =response?.data?.data?.companyId 

      if (response?.status === 200 && foundCompanyId) {
        setResult({ status: "success", companyId: foundCompanyId });
        toast.success(t("company_id_found_successfully"));
      } else {
        setResult({
          status: "error",
          message: t("company_id_not_found"),
        });
      }
    } catch (error) {
      console.error(error);
      setResult({
        status: "error",
        message: t("company_id_not_found"),
      });
      toast.error(t("something_went_wrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.companyId) return;
    try {
      await navigator.clipboard.writeText(result.companyId);
      setCopied(true);
      toast.success(t("copied_to_clipboard"));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error(t("copy_failed"));
    }
  };

  return (
    <div className="min-h-screen w- flex items-center justify-center bg-gradient-to-br from-cyan-50 dark:from-cyan-900 to-blue-50 dark:to-blue-900  px-4">
      <div className="w-full max-w-md rounded-3xl  dark:bg-slate-900 bg-white shadow-2xl border border-slate-200 dark:border-slate-600 p-8">
          {result?.status === "success" ? (
  <div className="mt-6 overflow-hidden rounded-xl border border-green-200 bg-green-50 p-4">
    <div className="flex items-center gap-2 text-green-700 font-semibold">
      <MdCheckCircle className="h-5 w-5 shrink-0" />
      <span>{t("company_id_found_successfully")}</span>
    </div>

    <div className="mt-3 flex w-full items-center justify-between gap-3 rounded-lg border border-green-300 bg-white px-3 py-2 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-x-auto">
        <span className="block whitespace-nowrap font-mono text-sm font-semibold leading-6 text-slate-800">
          {result.companyId}
        </span>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="flex shrink-0 items-center gap-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold leading-6 text-white transition hover:bg-cyan-700"
      >
        <MdContentCopy className="h-4 w-4" />
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  </div>

        ):(
             <div>
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-cyan-100 flex items-center justify-center">
            <MdOutlineMailOutline className="text-3xl text-cyan-600" />
          </div>
        </div>



        <h1 className="mt-6 text-center text-3xl dark:text-white font-bold text-slate-800">
          {t("forgot_companyId")}
        </h1>

        <p className="mt-2 text-center dark:text-stone-200 text-sm text-slate-500">
          {t("enter_registered_email_for_find")}
        </p>


        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm dark:text-gray-200 font-semibold text-slate-700">
              {t("email_address")}
            </label>

            <input
              type="email"
              name="email"
              placeholder={t("enter_email")}
              value={email}
              onChange={handelChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 
    focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 text-slate-600  focus:ring-teal-400/20"
            />
          </div>
           <div>
            <label className="mb-2 block text-sm dark:text-gray-200 font-semibold text-slate-700">
              {t("company_name")}
            </label>

            <input
              type="text"
              name="companyName"
              placeholder={t("xonier")}
              value={companyName}
              onChange={(e)=>setCompanyName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:ring-2 
    focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 text-slate-600  focus:ring-teal-400/20"
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
                {t("searching")}
              </>
            ) : (
              t("find_companyId")
            )}
          </button>
        </form>
        </div>
        )
    }
       

        {/* Result section */}
      

        {result?.status === "error" && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 font-semibold">
            <MdErrorOutline className="text-xl" />
            {result.message || t("company_id_not_found")}
          </div>
        )}

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