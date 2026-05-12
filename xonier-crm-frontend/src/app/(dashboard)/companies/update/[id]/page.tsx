"use client";

import extractErrorMessages from "@/src/app/utils/error.utils";
import CompanyUpdateForm from "@/src/components/pages/companies/CompanyUpdateForm";
import CompanyService from "@/src/services/company.service";
import { Company, CompanyUpdatePayload } from "@/src/types/company/company.types";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { BsBuildings } from "react-icons/bs";
import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";

const EditCompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | string[]>("");

  const getCompanyData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await CompanyService.getById(id);
      setCompanyData(res.data.data);
    } catch (err) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(err);
      if (axios.isAxiosError(err)) {
        const msg = extractErrorMessages(err);
        setError(msg);
        toast.error(`${msg}`);
      } else {
        setError("Failed to load company data");
        toast.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getCompanyData();
  }, [id]);

  const handleUpdate = async (payload: CompanyUpdatePayload) => {
    if (!id) return;
    setIsSubmitting(true);
    setError("");
    try {
      await CompanyService.update(id, payload);
      toast.success("Company updated successfully");
      router.push("/companies");
    } catch (err) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(err);
      if (axios.isAxiosError(err)) {
        const msg = extractErrorMessages(err);
        setError(msg);
        toast.error(`${msg}`);
      } else {
        setError("Update failed");
        toast.error("Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (userId: string, email: string, otp: number) => {
    setIsVerifying(true);
    setError("");
    try {
      await CompanyService.verifyOtp({ userId, email, otp });
      toast.success("Email verified — you can now edit this company");
      await getCompanyData();
    } catch (err) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(err);
      if (axios.isAxiosError(err)) {
        const msg = extractErrorMessages(err);
        setError(msg);
        toast.error(`${msg}`);
      } else {
        toast.error("Verification failed");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async (userId: string) => {
    setLoading(true)
    try {
      await CompanyService.resendOtp({ userId });
      toast.success("New OTP sent to admin email");
    } catch (err) {
      if (axios.isAxiosError(err)) toast.error(`${extractErrorMessages(err)}`);
      else toast.error("Failed to resend OTP");
    } finally {
        setLoading(false)
    }
  };

  return (
    <div className="mt-10 ml-72 min-h-screen p-6">
      <div className="mb-8">
       
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <BsBuildings className="text-white text-base" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Edit Company
            </h1>
            {companyData && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {companyData.companyName} · {companyData.companyId}
              </p>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 p-6">
            <Skeleton height={24} width={200} className="mb-5" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} height={42} borderRadius={8} />
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 p-6">
            <Skeleton height={24} width={100} className="mb-5" />
            <Skeleton height={42} width={240} borderRadius={8} />
          </div>
        </div>
      ) : companyData ? (
        <CompanyUpdateForm
          company={companyData}
          isSubmitting={isSubmitting}
          isVerifying={isVerifying}
          error={error}
          onUpdate={handleUpdate}
          onVerifyOtp={handleVerifyOtp}
          onResendOtp={handleResendOtp}
          loading={loading}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <BsBuildings className="text-5xl mb-3 opacity-30" />
          <p className="text-sm">Company not found</p>
          <Link href="/companies" className="mt-3 text-sm text-blue-500 hover:underline">
            Back to Companies
          </Link>
        </div>
      )}
    </div>
  );
};

export default EditCompanyPage;