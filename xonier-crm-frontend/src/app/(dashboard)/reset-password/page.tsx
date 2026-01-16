"use client";
import ResetPassword from "@/src/components/pages/reset-password/ResetPassword";
import { MARGIN_TOP, SIDEBAR_WIDTH } from "@/src/constants/constants";
import React, { useState, useEffect, JSX, FormEvent } from "react";
import extractErrorMessages from "../../utils/error.utils";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthService } from "@/src/services/auth.service";

const page = (): JSX.Element => {
  const [err, setErr] = useState<string[] | string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePasswordChange = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setErr(null);
    setIsLoading(true);
    try {
      if (formData.newPassword !== formData.confirmNewPassword) {
        toast.error(
          "Your password are not matching, please check and try again"
        );
        setErr("Your password are not matching, please check and try again");
        return
      }

      if (formData.oldPassword === formData.newPassword) {
        toast.error("Your old and new password are same, please use different");
        return;
      }

      const result = await AuthService.changePassword(formData);
      if (result.status === 200) {
        setFormData({
          oldPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });

        toast.success("password reset successfully");
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
        toast.error(`${messages}`);
      }
    } finally {
        setIsLoading(false)
    }
  };
  return (
    <div className={`ml-[${SIDEBAR_WIDTH}] mt-${MARGIN_TOP} p-6`}>
      <ResetPassword
        formData={formData}
        handleChange={handleChange}
        onSubmit={handlePasswordChange}
        isLoading={isLoading}
        err={err}
      />
    </div>
  );
};

export default page;
