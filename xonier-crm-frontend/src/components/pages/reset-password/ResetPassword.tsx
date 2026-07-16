"use client";

import React from "react";
import Input from "../../ui/Input";
import FormButton from "../../ui/FormButton";
import { ChangePasswordProps } from "@/src/types";
import { useTranslation } from "react-i18next";

const ResetPassword: React.FC<ChangePasswordProps> = ({
  formData,
  handleChange,
  onSubmit,
  isLoading, err
}) => {
  const { t } = useTranslation();
  return (
    <div className=" w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 ">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
        {t("change_password")}
      </h2>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        
        <Input
          label={t("old_password")}
          type="password"
          name="oldPassword"
          value={formData.oldPassword}
          onChange={handleChange}
          placeholder={t("enter_old_password")}
          required
        />

        
        <Input
          label={t("new_password")}
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder={t("enter_new_password")}
          required
        />

        
        <Input
          label={t("confirm_new_password")}
          type="password"
          name="confirmNewPassword"
          value={formData.confirmNewPassword}
          onChange={handleChange}
          placeholder={t("re_enter_new_password")}
          required
        />

        {err && <div className="flex justify-end items-center">
            <p className="text-red-500">{err}</p></div>}

        
        <FormButton isLoading={isLoading} disabled={formData.confirmNewPassword === "" || formData.newPassword === "" || formData.oldPassword === ""}> {t("submit")} </FormButton>
      </form>
    </div>
  );
};

export default ResetPassword;
