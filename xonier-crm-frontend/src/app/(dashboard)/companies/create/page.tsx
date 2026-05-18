"use client";

import React, { useEffect, useState } from "react";
import CreateCompanyForm from "@/src/components/pages/companies/CreateCompanyForm";
import { Plan } from "@/src/types/plan/plan.types";
import { CompanyCreatePayload, CreateCompanyResponse } from "@/src/types/company/company.types";
import axios from "axios";
import extractErrorMessages from "@/src/app/utils/error.utils";
import { toast } from "react-toastify";
import { PlanService } from "@/src/services/plan.service";
import CompanyService from "@/src/services/company.service";
import { useRouter } from "next/navigation";
import { BsBuildings } from "react-icons/bs";

const CreateCompanyPage = () => {
  const [planData, setPlanData] = useState<Plan[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();

  const getPlanData = async () => {
    try {
      const result = await PlanService.getAll(1, 100);
      if (result.status === 200) setPlanData(result.data.data.data);
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) toast.error(`${extractErrorMessages(error)}`);
      else toast.error("Something went wrong");
    }
  };

  useEffect(() => { getPlanData(); }, []);

  const handleSubmit = async (
    payload: CompanyCreatePayload
  ): Promise<CreateCompanyResponse | null> => {
    setIsSubmitting(true);
    try {
      const res = await CompanyService.create(payload);
      toast.success("Company created — verification OTP sent to admin email");
      return res.data;
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) toast.error(`${extractErrorMessages(error)}`);
      else toast.error("Something went wrong");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (
    userId: string,
    email: string,
    otp: number
  ) => {
    setIsVerifying(true);
    try {
      await CompanyService.verifyOtp({ userId, email, otp });
      toast.success("Email verified — company is now active!");
      router.push("/companies");
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) toast.error(`${extractErrorMessages(error)}`);
      else toast.error("Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async (userId: string) => {
    try {
      await CompanyService.resendOtp({ userId });
      toast.success("New OTP sent to admin email");
    } catch (error) {
      if (axios.isAxiosError(error)) toast.error(`${extractErrorMessages(error)}`);
    }
  };

  return (
    <div className="mt-10 ml-72 min-h-screen p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <BsBuildings className="text-white text-base" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Register Company</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-12">
          Create a new company and its primary admin account
        </p>
      </div>

      <CreateCompanyForm
        planData={planData}
        isSubmitting={isSubmitting}
        isVerifying={isVerifying}
        onSubmit={handleSubmit}
        onVerifyOtp={handleVerifyOtp}
        onResendOtp={handleResendOtp}
      />
    </div>
  );
};

export default CreateCompanyPage;