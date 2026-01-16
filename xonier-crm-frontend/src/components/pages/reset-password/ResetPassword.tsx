"use client";

import React from "react";
import Input from "../../ui/Input";
import FormButton from "../../ui/FormButton";
import { ChangePasswordProps } from "@/src/types";

const ResetPassword: React.FC<ChangePasswordProps> = ({
  formData,
  handleChange,
  onSubmit,
  isLoading, err
}) => {
  return (
    <div className=" w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 ">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
        Change Password
      </h2>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        
        <Input
          label="Old Password"
          type="password"
          name="oldPassword"
          value={formData.oldPassword}
          onChange={handleChange}
          placeholder="Enter old password"
          required
        />

        
        <Input
          label="New Password"
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="Enter new password"
          required
        />

        
        <Input
          label="Confirm New Password"
          type="password"
          name="confirmNewPassword"
          value={formData.confirmNewPassword}
          onChange={handleChange}
          placeholder="Re-enter new password"
          required
        />

        {err && <div className="flex justify-end items-center">
            <p className="text-red-500">{err}</p></div>}

        
        <FormButton isLoading={isLoading} disabled={formData.confirmNewPassword === "" || formData.newPassword === "" || formData.oldPassword === ""}> Submit </FormButton>
      </form>
    </div>
  );
};

export default ResetPassword;
