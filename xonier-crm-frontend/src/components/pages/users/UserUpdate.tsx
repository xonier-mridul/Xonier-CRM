import React from "react";
import Input from "../../ui/Input";
import { USER_STATUS, UserUpdatePageProps } from "@/src/types";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import { FaPlus, FaXmark } from "react-icons/fa6";
import FormButton from "../../ui/FormButton";
import ErrorComponent from "../../ui/ErrorComponent";
import Skeleton from "react-loading-skeleton";
import { div } from "framer-motion/client";
import { FormInput } from "lucide-react";

const UserUpdate = ({
  formData,
  isLoading,
  handleChange,
  handleRemoveRole,
  handleUserRoleChange,
  roleData,
  loading,
  handleSubmit,
  err,
  handleStatus,
  handleStatusChange,
  statusData,
  statusErr,
  statusLoading,
  passwordData,
  handlePassChange,
  handlePasswordSubmit,
  passErr,
  isPassLoading
}: UserUpdatePageProps) => {
  return (
    <>
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-5">
          <h2 className="text-slate-900 dark:text-white font-medium text-3xl capitalize">
            Update user information
          </h2>

          {err && <ErrorComponent error={err} />}

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-4 w-full">
            <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit}>
              {!isLoading ? (
                <Input
                  label="First Name"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                />
              ) : (
                <div className="flex flex-col gap-1">
                  {" "}
                  <Skeleton
                    height={14}
                    width={80}
                    className="animate-pulse"
                  />{" "}
                  <Skeleton height={34} width={500} className="animate-pulse" />
                </div>
              )}
              {!isLoading ? (
                <Input
                  label="Last Name"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                />
              ) : (
                <div className="flex flex-col gap-1">
                  {" "}
                  <Skeleton
                    height={14}
                    width={80}
                    className="animate-pulse"
                  />{" "}
                  <Skeleton height={34} width={500} className="animate-pulse" />
                </div>
              )}
              {!isLoading ? (
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                />
              ) : (
                <div className="flex flex-col gap-1">
                  {" "}
                  <Skeleton
                    height={14}
                    width={80}
                    className="animate-pulse"
                  />{" "}
                  <Skeleton height={34} width={500} className="animate-pulse" />
                </div>
              )}
              {!isLoading ? (
                <Input
                  label="phone"
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone"
                />
              ) : (
                <div className="flex flex-col gap-1">
                  {" "}
                  <Skeleton
                    height={14}
                    width={80}
                    className="animate-pulse"
                  />{" "}
                  <Skeleton height={34} width={500} className="animate-pulse" />
                </div>
              )}

              {!isLoading ? (
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    User Role
                  </label>

                  <select
                    onChange={handleUserRoleChange}
                    className="w-full px-3 py-2 rounded-md border
                      bg-white dark:bg-gray-700 text-black dark:text-white
                      border-gray-300 dark:border-gray-300/30"
                  >
                    <option value="">Select user role</option>
                    {roleData.map((role) => (
                      <option
                        key={role.id}
                        value={role.id}
                        hidden={role.code === SUPER_ADMIN_ROLE_CODE}
                        disabled={role.code === SUPER_ADMIN_ROLE_CODE}
                      >
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {formData.userRole.length > 0 && (
                    <div className="col-span-1 flex flex-wrap gap-2 mt-2">
                      {formData.userRole.map((roleId) => {
                        const role = roleData.find((r) => r.id === roleId);
                        if (!role) return null;

                        return (
                          <span
                            key={roleId}
                            className="flex items-center gap-2 px-3 py-1
                            bg-blue-100 text-blue-700 rounded-full text-sm"
                          >
                            {role.name}

                            <button
                              type="button"
                              onClick={() => handleRemoveRole(roleId)}
                              className="hover:text-red-500 transition"
                            >
                              <FaXmark size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {" "}
                  <Skeleton
                    height={14}
                    width={80}
                    className="animate-pulse"
                  />{" "}
                  <Skeleton height={34} width={500} className="animate-pulse" />
                </div>
              )}
              {!isLoading ? (
                <Input
                  label="company"
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Company Name"
                />
              ) : (
                <div className="flex flex-col gap-1">
                  {" "}
                  <Skeleton
                    height={14}
                    width={80}
                    className="animate-pulse"
                  />{" "}
                  <Skeleton height={34} width={500} className="animate-pulse" />
                </div>
              )}
              {err && (
                <div className="flex items-end">
                  <p className="text-red-500">{err}</p>
                </div>
              )}
              <FormButton
                className="col-span-2"
                isLoading={loading}
                disabled={
                  formData.firstName === "" ||
                  formData.lastName === "" ||
                  formData.email === "" ||
                  formData.phone === "" ||
                  formData.userRole.length <= 0
                }
              >
                {" "}
                Update User Info{" "}
              </FormButton>
            </form>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <h2 className="text-slate-900 dark:text-white font-medium text-3xl capitalize">
            Update user status
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-4 w-full">
            <form onSubmit={handleStatus} className="grid grid-cols-1 gap-4">
            {isLoading ? <div className="flex flex-col gap-1">
                  {" "}
                  <Skeleton
                    height={14}
                    width={80}
                    className="animate-pulse"
                  />{" "}
                  <Skeleton height={34} width={1100} className="animate-pulse" />
                </div> :<div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                User Status
              </label>

              <select
                onChange={handleStatusChange}
                name="status"
                value={statusData.status}
                className="w-full px-3 py-2 rounded-md border capitalize
                      bg-white dark:bg-gray-700 text-black dark:text-white
                      border-gray-300 dark:border-gray-300/30"
              >
                <option value="" hidden>
                  Select user status
                </option>

                <option value={USER_STATUS.ACTIVE}>{USER_STATUS.ACTIVE}</option>
                <option value={USER_STATUS.INACTIVE}>{USER_STATUS.INACTIVE}</option>
                <option value={USER_STATUS.DELETED}>{USER_STATUS.DELETED}</option>
                <option value={USER_STATUS.SUSPENDED}>{USER_STATUS.SUSPENDED}</option>
              </select>
            </div> }
            {statusErr && (
                <div className="flex items-center justify-end w-full">
                  <p className="text-red-500">{statusErr}</p>
                </div>
              )}
            <FormButton isLoading={statusLoading} disabled={statusData.status === ""}>Update Status</FormButton>
            </form>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <h2 className="text-slate-900 dark:text-white font-medium text-3xl capitalize">
            Update user Password
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-4 w-full">
            <span className="text-slate-600 dark:text-slate-400  text-sm"><span className="text-red-500 text-lg">*</span> Password should one uppercase, one lowercase, one special character and min length 8</span>
            <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 gap-4">
              <Input name="password" type="password" label="New Password" onChange={handlePassChange}  value={passwordData.password} placeholder="Password"/>
              <Input name="confirmPassword" type="password" label="Confirm Password" onChange={handlePassChange} value={passwordData.confirmPassword} placeholder="Confirm Password"/>
              {passErr && (
                <div className="flex w-full items-center justify-end">
                  <p className="text-red-500">{passErr}</p>
                </div>
              )}
              <FormButton disabled={passwordData.password.length < 8 || passwordData.confirmPassword.length < 8 || (passwordData.confirmPassword.trim() !== passwordData.password.trim()) } isLoading={isPassLoading}>Update Password</FormButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserUpdate;
