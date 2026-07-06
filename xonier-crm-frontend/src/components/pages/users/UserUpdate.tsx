import React, { useEffect, useRef, useState } from "react";
import Input from "../../ui/Input";
import { passwordCheck, USER_STATUS, UserUpdatePageProps } from "@/src/types";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import { FaXmark } from "react-icons/fa6";
import FormButton from "../../ui/FormButton";
import ErrorComponent from "../../ui/ErrorComponent";
import Skeleton from "react-loading-skeleton";
import Select, { SelectOption } from "../../ui/Select";
import { Company } from "@/src/types/company/company.types";
import { IoCheckmarkCircle } from "react-icons/io5";
import { FaRegCircle } from "react-icons/fa";

interface ExtendedUserUpdatePageProps extends UserUpdatePageProps {
  companyData: Company[];
  companyLoading: boolean;
  onCompanyScrollEnd: () => void;
  companyHasMore: boolean;
  isAdmin: boolean;
  formData: any;
  handleChange: any;
  checks:passwordCheck[]
}

const  UserUpdate = ({
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
  isPassLoading,
  isAdmin,
  companyData,
  companyLoading,
  onCompanyScrollEnd,
  companyHasMore,
  checks
}: ExtendedUserUpdatePageProps) => {
  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  const selectedCompany = companyData.find(
    (c) => c.id === formData.companyId || c.companyId === formData.companyId
  );

  const filteredCompanies = companyData.filter((c) =>
    c.companyName.toLowerCase().includes(companySearch.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(e.target as Node)
      ) {
        setCompanyOpen(false);
        setCompanySearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (nearBottom && companyHasMore && !companyLoading) {
      onCompanyScrollEnd();
    }
  };

  const handleCompanySelect = (companyId: string) => {
    handleChange({
      target: { name: "companyId", value: companyId },
    } as React.ChangeEvent<HTMLInputElement>);
    setCompanyOpen(false);
    setCompanySearch("");
  };

  const handleClearCompany = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleChange({
      target: { name: "companyId", value: "" },
    } as React.ChangeEvent<HTMLInputElement>);
  };

 const isPasswordValid = checks.every((check) => check.valid);


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
                  <Skeleton height={14} width={80} />
                  <Skeleton height={34} width={500} />
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
                  <Skeleton height={14} width={80} />
                  <Skeleton height={34} width={500} />
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
                  <Skeleton height={14} width={80} />
                  <Skeleton height={34} width={500} />
                </div>
              )}

              {!isLoading ? (
                <Input
                  label="Phone"
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone"
                />
              ) : (
                <div className="flex flex-col gap-1">
                  <Skeleton height={14} width={80} />
                  <Skeleton height={34} width={500} />
                </div>
              )}

              {isAdmin &&
                (!isLoading ? (
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      User Role
                    </label>
                    <select
                      onChange={handleUserRoleChange}
                      className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">Select user role</option>
                      {roleData.map((role: any) => (
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
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.userRole.map((roleId: string) => {
                          const role = roleData.find(
                            (r: any) => r.id === roleId
                          );
                          if (!role) return null;
                          return (
                            <span
                              key={roleId}
                              className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
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
                    <Skeleton height={14} width={80} />
                    <Skeleton height={34} width={500} />
                  </div>
                ))}

              {isAdmin && (!isLoading ? (
                <div className="flex flex-col gap-1 w-full" ref={companyDropdownRef}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">
                    Company
                  </label>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCompanyOpen((p) => !p)}
                      className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-700 text-left text-sm border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500 flex items-center justify-between"
                    >
                      <span
                        className={
                          selectedCompany
                            ? "text-black dark:text-white"
                            : "text-gray-400"
                        }
                      >
                        {selectedCompany
                          ? selectedCompany.companyName
                          : "Select company"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {selectedCompany && (
                          <span
                            onClick={handleClearCompany}
                            className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded"
                          >
                            <FaXmark size={11} />
                          </span>
                        )}
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${companyOpen ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>

                    {companyOpen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                          <input
                            autoFocus
                            type="text"
                            value={companySearch}
                            onChange={(e) => setCompanySearch(e.target.value)}
                            placeholder="Search company..."
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                          />
                        </div>

                        <ul
                          ref={listRef}
                          onScroll={handleListScroll}
                          className="max-h-52 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50"
                        >
                          <li>
                            <button
                              type="button"
                              onClick={() => handleCompanySelect("")}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              No company
                            </button>
                          </li>

                          {filteredCompanies.length > 0 ? (
                            filteredCompanies.map((company) => {
                              const id = company.id ?? company.companyId;
                              const isSelected = formData.companyId === id;
                              return (
                                <li key={id}>
                                  <button
                                    type="button"
                                    onClick={() => handleCompanySelect(id)}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                      isSelected
                                        ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                  >
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-medium truncate">
                                        {company.companyName}
                                      </span>
                                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                        {company.companyId}
                                      </span>
                                    </div>
                                    {isSelected && (
                                      <svg
                                        className="w-4 h-4 text-violet-500 flex-shrink-0 ml-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    )}
                                  </button>
                                </li>
                              );
                            })
                          ) : (
                            <li className="px-4 py-6 text-center text-sm text-gray-400">
                              No companies found
                            </li>
                          )}

                          {companyLoading && (
                            <li className="px-4 py-3 flex items-center justify-center gap-2 text-xs text-gray-400">
                              <svg
                                className="animate-spin w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="opacity-25"
                                />
                                <path
                                  fill="currentColor"
                                  className="opacity-75"
                                  d="M4 12a8 8 0 018-8v8z"
                                />
                              </svg>
                              Loading more...
                            </li>
                          )}

                          {!companyHasMore && companyData.length > 0 && (
                            <li className="px-4 py-2 text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700">
                              All companies loaded
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <Skeleton height={14} width={80} />
                  <Skeleton height={34} width={500} />
                </div>
              ))}

              {err && (
                <div className="flex items-end col-span-2">
                  <p className="text-red-500 text-sm">{err}</p>
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
                Update User Info
              </FormButton>
            </form>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-5">
            <h2 className="text-slate-900 dark:text-white font-medium text-3xl capitalize">
              Update user status
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-4 w-full">
              <form
                onSubmit={handleStatus}
                className="grid grid-cols-1 gap-4"
              >
                {isLoading ? (
                  <div className="flex flex-col gap-1">
                    <Skeleton height={14} width={80} />
                    <Skeleton height={34} width={1100} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      User Status
                    </label>
                    <select
                      onChange={handleStatusChange}
                      name="status"
                      value={statusData.status}
                      className="w-full px-3 py-2 rounded-md border capitalize bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-300/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="" hidden>
                        Select user status
                      </option>
                      <option value={USER_STATUS.ACTIVE}>
                        {USER_STATUS.ACTIVE}
                      </option>
                      <option value={USER_STATUS.INACTIVE}>
                        {USER_STATUS.INACTIVE}
                      </option>
                      <option value={USER_STATUS.DELETED}>
                        {USER_STATUS.DELETED}
                      </option>
                      <option value={USER_STATUS.SUSPENDED}>
                        {USER_STATUS.SUSPENDED}
                      </option>
                    </select>
                  </div>
                )}
                {statusErr && (
                  <div className="flex items-center justify-end w-full">
                    <p className="text-red-500 text-sm">{statusErr}</p>
                  </div>
                )}
                <FormButton
                  isLoading={statusLoading}
                  disabled={statusData.status === ""}
                >
                  Update Status
                </FormButton>
              </form>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <h2 className="text-slate-900 dark:text-white font-medium text-3xl capitalize">
            Update user Password
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-4 w-full">
            {/* <span className="text-slate-600 dark:text-slate-400 text-sm">
              <span className="text-red-500 text-lg">*</span> Password should
              have one uppercase, one lowercase, one special character and min
              length 8
            </span> */}
            <form
              onSubmit={handlePasswordSubmit}
              className="grid grid-cols-1 gap-4"
            >
              <Input
                name="password"
                type="password"
                label="New Password"
                onChange={handlePassChange}
                value={passwordData.password}
                placeholder="Password"
              />
              <Input
                name="confirmPassword"
                type="password"
                label="Confirm Password"
                onChange={handlePassChange}
                value={passwordData.confirmPassword}
                placeholder="Confirm Password"
              />
                <div className="space-y-2 ">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">Password Criteria:</span>
                    <div className="grid grid-cols-3">
                        {checks.map((check, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-2 text-sm ${
                              check.valid? "text-green-600" : "text-gray-400"
                            }`}
                          >
                            {check.valid ? (
                              <IoCheckmarkCircle className="text-lg" />
                            ) : (
                              <FaRegCircle className="text-sm" />
                            )}
    
                            <span>{check.label}</span>
                          </div>
                        ))}
                        </div>
                  </div>
              {passErr && (
                <div className="flex w-full items-center justify-end">
                  <p className="text-red-500 text-sm">{passErr}</p>
                </div>
              )}
              <FormButton
                disabled={
                  !isPasswordValid ||
                  passwordData.confirmPassword.trim() !==
                  passwordData.password.trim()
                }
                isLoading={isPassLoading}
              >
                Update Password
              </FormButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserUpdate;