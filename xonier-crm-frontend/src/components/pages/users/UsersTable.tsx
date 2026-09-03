import { UserTableComponentProps } from "@/src/types";

import React, { JSX, useRef, useMemo, useState, useEffect } from "react";
import { IoIosSearch } from "react-icons/io";

import { MdOutlineEdit, MdDeleteOutline } from "react-icons/md";
import { GoDotFill } from "react-icons/go";
import { FaRegEye } from "react-icons/fa";
import { USER_STATUS } from "@/src/types";
import Link from "next/link";
import { FaPlus, FaXmark } from "react-icons/fa6";
import { FiUserPlus } from "react-icons/fi";
import BlurryBackground from "../../common/BlurryBackground";
import Input from "../../ui/Input";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";
import FormButton from "../../ui/FormButton";
import Skeleton from "react-loading-skeleton";
import Pagination from "../../common/pagination";
import { countryCodes } from "@/src/constants/countryCodes";
import { countryCode } from "@/src/types";

import { ChevronDown, Search } from "lucide-react";
import { CompanySelectProps } from "@/src/types/company/company.types";
import { IoCheckmarkCircle } from "react-icons/io5";
import { FaRegCircle } from "react-icons/fa";
import { useTranslation } from "react-i18next";



  const CompanySelect: React.FC<
    CompanySelectProps & {
      onScrollEnd?: () => void;
      isLoading?: boolean;
      hasMore?: boolean;
      isFilter?: boolean;
      selectedCompanyId?: string;
      onClear?: () => void;
    }
  > = ({
    companyData,
    company,
    handleCompanyChange,
    onScrollEnd,
    isLoading = false,
    hasMore = false,
    isFilter = false,
    selectedCompanyId,
    onClear,
  }) => {
  const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const handleOutsideClick = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleOutsideClick);
      return () =>
        document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const filteredCompanies = useMemo(
      () =>
        companyData.filter((item) =>
          item.companyName.toLowerCase().includes(search.toLowerCase()),
        ),
      [companyData, search],
    );

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      if (nearBottom && hasMore && !isLoading && onScrollEnd) {
        onScrollEnd();
      }
    };

    const activeId = isFilter ? selectedCompanyId : company;
    const selectedCompany = companyData.find(
      (item) => item.id === activeId || item.id === activeId,
    );

   

    return (
      <div className="relative w-full max-w-xs " ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center justify-between overflow-hidden rounded-xl border px-4 py-2.5 text-sm  transition-all dark:bg-gray-500/30 hover:border-cyan-400 focus:outline-none  ${
            selectedCompany
              ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white"
          }`}
        >
          <span className="truncate text-sm ">
            {selectedCompany
              ? selectedCompany.companyName
              : isFilter
                ? "Filter by company"
                : "Select Company"}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {selectedCompany && onClear && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                  setOpen(false);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded"
              >
                <FaXmark size={11} />
              </span>
            )}
            <ChevronDown
              size={16}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl">
            <div className="border-b border-gray-100 dark:border-gray-700 p-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder={t("search_company")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-cyan-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div
              ref={listRef}
              onScroll={handleScroll}
              className="max-h-60 overflow-y-auto"
            >
              {isFilter && (
                <button
                  type="button"
                  onClick={() => {
                    if (onClear) onClear();
                    setOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700"
                >
                  {t("all_companies")}
                </button>
              )}

              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((item) => {
                  const id = item.id ?? (item as any)._id;
                  const isActive = activeId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        handleCompanyChange(id);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${
                        isActive
                          ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 font-semibold"
                          : "text-gray-700 dark:text-gray-200 hover:bg-cyan-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{item.companyName}</span>
                        {/* <span className="text-[10px] text-gray-400 font-normal truncate">{item.companyId}</span> */}
                      </div>
                      {isActive && (
                        <svg
                          className="w-4 h-4 text-cyan-500 shrink-0 ml-2"
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
                  );
                })
              ) : (
                <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  {t("no_company_found")}
                </div>
              )}

              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400">
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
                  {t("loading_more_2")}
                </div>
              )}

              {!hasMore && companyData.length > 0 && (
                <div className="py-2 text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700">
                  {t("all_companies_loaded")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

export const UsersTable = ({
  currentPage,
  pageLimit,
  userData,
  handleDelete,
  isLoading,
  isRoleLoading,
  isPopupShow,
  setIsPopupShow,
  formData,
  roleData,
  handleChange,
  handleUserRoleChange,
  handleRemoveRole,
  handleSubmit,
  setPageLimit,
  totalPage,
  setFormData,
  err,
  loading,
  setCurrentPages,
  setSearchFilter,
  isAdmin,
  handleCompanyFilter,
  companyHasMore,
  companyLoading,
  onCompanyScrollEnd,
  selectedCompanyId,
  companyData,
  handleCompanyChange,
  checks
}: UserTableComponentProps): JSX.Element => {
  const { t } = useTranslation();
  const [selectedcountryCode, setCountryCode] = useState("+91");
  const { hasPermission } = usePermissions();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [search, setSearch] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [company, setCompany] = useState("");



const isPasswordValid = checks.every((check) => check.valid);


  const handleLimit = (n: string) => {
    setPageLimit(Number(n));
    setCurrentPages(1);
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearchFilter(search);
    }, 500);
  }, [search]);

  useEffect(() => {
    setFormData((p) => ({
      ...p,
      phone: `${selectedcountryCode}${phoneNumber}`,
    }));
  }, [selectedcountryCode, phoneNumber]);

  // Add these to your UserTableComponentProps type:
  // companyLoading: boolean
  // companyHasMore: boolean
  // onCompanyScrollEnd: () => void
  // selectedCompanyId: string

  // Replace the CompanySelect component and the filter section in the table header:



  return (
    <>
      {isPopupShow && (
        <>
          <BlurryBackground onClick={() => setIsPopupShow(false)} />
         <div className="fixed top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-700 p-6 rounded-xl  z-[200] flex flex-col gap-5 shadow-xl w-150 min-h-140 ">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">{t("create_user")}</h2>
              <button
                className="text-2xl text-gray-500 hover:text-red-500 cursor-pointer hover:rotate-90 transition-all duration-300"
                onClick={() => setIsPopupShow(false)}
              >
                <FaXmark />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="md:grid gap-4 text-xs md:text-lg">
              <Input
                label={t("firstname")}
                type="text"
                name="firstName"
                placeholder={t("first_name")}
                value={formData.firstName}
                onChange={handleChange}
              />
              <Input
                label={t("lastname")}
                type="text"
                name="lastName"
                placeholder={t("last_name")}
                value={formData.lastName}
                onChange={handleChange}
              />
              <Input
                label={t("email_2")}
                type="email"
                name="email"
                placeholder={t("email_address")}
                value={formData.email}
                onChange={handleChange}
              />
              <div className="flex relative flex-col gap-1 w-full">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t("user_role")}
                </label>

               {isRoleLoading ? (
                    <div
                      className="w-full px-3 py-2 rounded-md border text-[16px]
                      bg-white dark:bg-gray-700
                      border-gray-300 dark:border-gray-300/30
                      flex items-center justify-between"
                    >
                      <span className="text-gray-400 dark:bg-gray-900/30">
                        {t("loading")}
                      </span>

                      <div className="w-4 h-4 border-2 border-gray-300 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <select
                      onChange={handleUserRoleChange}
                      className="w-full px-3 py-2 rounded-md border text-[16px]
                      bg-white dark:bg-gray-700 text-black dark:text-white
                      border-gray-300 dark:border-gray-900/30 outline-none"
                    >
                      <option value="" className="dark:bg-gray-900/30">
                        {t("select_user_role")}
                      </option>

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
                  )}
                {formData.userRole.length > 0 && (
                  <div className="col-span-1 flex flex-wrap gap-2 mt-2">
                    {formData.userRole.map((roleId) => {
                      const role = roleData.find((r) => r.id === roleId);
                      if (!role) return null;

                      return (
                        <span
                          key={roleId}
                          className="flex items-center gap-2 px-3 py-1
            bg-cyan-100 text-cyan-700 rounded-full text-sm"
                        >
                          {role.name}

                          <button
                            type="button"
                            onClick={() => handleRemoveRole(roleId)}
                            className="hover:text-red-500 transition cursor-pointer"
                          >
                            <FaXmark size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t("phone")}
                </label>

                <div className="flex gap-2">
                  {/* Country Code */}
                  <select
                    value={selectedcountryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-2 text-sm w-30  rounded-lg border outline-none border-gray-300 dark:border-gray-300/30 bg-white dark:bg-gray-900/30 text-black dark:text-white"
                  >
                    {countryCodes.map((c: countryCode) => (
                      <option key={c.code} value={c.code}>
                        {c.label} ({c.code})
                      </option>
                    ))}
                  </select>

                  {/* Phone Input */}
                  <input
                    type="text"
                    name="phone"
                    placeholder={t("phone_number")}
                    value={`${phoneNumber}`}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-300/30 bg-white dark:bg-gray-900/30 text-black dark:text-white outline-none"
                  />
                </div>
              </div>
              <Input
                label={t("password")}
                type="password"
                name="password"
                placeholder={t("password_2")}
                value={formData.password}
                onChange={handleChange}
              />
              <Input
                label={t("confirm_password_2")}
                type="password"
                name="confirmPassword"
                placeholder={t("confirm_password")}
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <div className="space-y-2 ">
                <span className="text-sm text-slate-500 dark:text-slate-200">{t("password_criteria")}</span>
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
           
              {isAdmin && (
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t("company")}
                  </label>
                  <CompanySelect
                    companyData={companyData}
                    company={formData.companyId || ""}
                    handleCompanyChange={handleCompanyChange}
                    onScrollEnd={onCompanyScrollEnd}
                    isLoading={companyLoading}
                    hasMore={companyHasMore}
                  />
                </div>
              )}

              {err && (
                <div className="flex justify-end col-span-2">
                  <p className="text-red-500">{err}</p>
                </div>
              )}


              <FormButton
                isLoading={loading}
                disabled={
                  formData.firstName === "" ||
                  formData.lastName === "" ||
                  formData.email === "" ||
                  formData.phone === "" ||
                  formData.password === "" ||
                  formData.userRole.length <= 0||
                  !isPasswordValid
                }
                className="col-span-2"
              >
                {" "}
                {t("submit")}{" "}
              </FormButton>
            </form>
          </div>
        </>
      )}

      <div className="bg-white dark:bg-gray-900/50 dark:backdrop-blur-sm flex flex-col gap-5 p-6 mb-8 rounded-xl border border-slate-900/10 dark: w-full ">
        <div className="flex items-center gap-12 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
              {t("all_users")}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t("create_edit_or_remove_users_each")}
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <CompanySelect
                companyData={companyData}
                company=""
                handleCompanyChange={handleCompanyFilter}
                onScrollEnd={onCompanyScrollEnd}
                isLoading={companyLoading}
                hasMore={companyHasMore}
                isFilter
                selectedCompanyId={selectedCompanyId}
                onClear={() => handleCompanyFilter("")}
              />
              {selectedCompanyId && (
                <span className="hidden md:block text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 px-2.5 py-1 rounded-full border border-cyan-200 dark:border-cyan-800 whitespace-nowrap">
                  {companyData.find(
                    (c) =>
                      c.id === selectedCompanyId ||
                      (c as any)._id === selectedCompanyId,
                  )?.companyName ?? "Filtered"}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-6">
          <select
            name="limit"
            id="limit"
            className="bg-slate-50 outline-none dark:bg-gray-500/30 px-3 py-2.5 rounded-lg border border-slate-900/10"
            onChange={(e) => handleLimit(e.target.value)}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="40">50</option>
          </select>
          <div className="bg-slate-50 dark:bg-gray-500/30 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
            <IoIosSearch className="text-xl" />
            <input
              type="text"
              placeholder={t("search_by_name")}
              onChange={(e) => {
                setCurrentPages(1)
                setSearch(e.target.value);
              }}
              className="border-none bg-transparent outline-none text-sm font-medium text-slate-900 dark:text-white w-full"
            />
          </div>
          <button
            onClick={() => setIsPopupShow(true)}
            disabled={!hasPermission(PERMISSIONS.createUser)}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-300 disabled:cursor-not-allowed
                        text-white px-5 py-2 rounded-md
                        flex items-center gap-2 cursor-pointer"
          >
            <FiUserPlus className="text-lg" /> {t("create_user")}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl">
      <table className="w-full rounded-xl overflow-hidden text-slate-500 ">
        <thead className="">
          <tr className="w-full border-b-2 border-zinc-300 bg-slate-200 dark:bg-gray-900">
            <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
              {t("s_no")}
            </th>
            <th className=" uppercase text-xs text-start text-slate-500  dark:text-slate-100">
              {" "}
              {t("user")}
            </th>
            <th className="md:px-0 px-3  uppercase text-xs text-start text-slate-500  dark:text-slate-100">
              {t("type")}
            </th>
            <th className=" uppercase text-xs text-start text-slate-500  dark:text-slate-100 whitespace-nowrap">
              {t("created_at")}
            </th>
            <th className="md:px-0 px-3 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
              {t("status")}
            </th>
            <th className=" uppercase text-xs text-start text-slate-500  dark:text-slate-100 whitespace-nowrap">
              {t("last_login")}
            </th>
            <th className="md:px-0 px-3 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
              {t("actions")}
            </th>
          </tr>
        </thead>
        <tbody className="">
          {!isLoading ? (
            userData && userData?.length > 0 ? (
              userData?.map((item, index) => {

                
                const rr = index % 2 == 0;

                const date = new Date(item.createdAt).toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  },
                );
                const lastLoginDate = item?.lastLogin
                  ? new Date(item?.lastLogin).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "Not found";
                return (
                  <tr
                    className={`${
                      rr
                        ? "bg-white dark:bg-transparent hover:bg-cyan-50 dark:hover:bg-gray-700/50"
                        : "bg-slate-100/50 dark:bg-slate-900/30 hover:bg-cyan-50 dark:hover:bg-gray-700/50"
                    } w-full group transition-colors `}
                    key={item.id}
                  >
                    <td className="p-4">{index + 1}</td>
                    <td>
                      <Link
                        href={`/users/${item.id}`}
                        className="cursor-pointer hover:text-cyan-500 capitalize whitespace-nowrap"
                      >
                        {item.firstName} {item.lastName}
                      </Link>
                    </td>
                    <td>
                      {item.userRole.map((item) => (
                        <span
                          key={item.id}
                          className="bg-green-500 dark:bg-green-600  px-3.5 py-1.5 rounded-lg text-white text-xs tracking-wide md:mx-0   mx-3 whitespace-nowrap "
                        >
                          {item.name ? item.name : "Company Admin"}
                        </span>
                      ))}
                    </td>
                    <td className="whitespace-nowrap ">{date}</td>
                    <td>
                      <span
                        className={`${
                          item.status === USER_STATUS.ACTIVE
                            ? "bg-green-100  text-green-500"
                            : item.status === USER_STATUS.INACTIVE
                              ? "bg-yellow-100 text-yellow-500"
                              : item.status === USER_STATUS.DELETED
                                ? "bg-red-100 text-red-500"
                                : item.status === USER_STATUS.SUSPENDED
                                  ? "bg-orange-100 text-orange-500"
                                  : "bg-gray-100 text-gray-500"
                        }  rounded-full text-sm font-medium py-1 px-3 flex items-center gap-1 w-fit mx-3 md:mx-0 capitalize`}
                      >
                        {" "}
                        <GoDotFill /> {item.status}
                      </span>
                    </td>
                    <td className='min-w-30'>{lastLoginDate}</td>
                    <td>
                      <div className="flex items-center gap-2 mx-3 md:mx-0">
                        <Link
                          href={`/users/${item.id}`}
                          className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-green-100/80 dark:bg-green-50 hover:bg-green-200/70 dark:hover:bg-green-100 text-green-500 hover:scale-104"
                        >
                          <FaRegEye className="text-xl" />
                        </Link>
                        {item.userRole.some(
                          (item) => item.code === SUPER_ADMIN_ROLE_CODE,
                        ) || !hasPermission(PERMISSIONS.updateUser) ? (
                          <span className="h-9 w-9 flex items-center justify-center rounded-md cursor-not-allowed bg-yellow-200/80 dark:bg-yellow-100 text-yellow-300">
                            <MdOutlineEdit className="text-xl" />
                          </span>
                        ) : (
                          <Link
                            href={`/users/update/${item.id}`}
                            className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-yellow-200/80 dark:bg-yellow-100 hover:bg-yellow-300/70 dark:hover:bg-yellow-200 text-yellow-500 hover:scale-104"
                          >
                            <MdOutlineEdit className="text-xl" />
                          </Link>
                        )}
                        {item.userRole.some(
                          (item) => item.code === SUPER_ADMIN_ROLE_CODE,
                        ) || !hasPermission(PERMISSIONS.deleteUser) ? (
                          <span className="h-9 w-9 flex items-center justify-center rounded-md cursor-not-allowed bg-red-100 text-red-400  opacity-80">
                            {" "}
                            <MdDeleteOutline className="text-xl" />{" "}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="h-9 w-9 flex items-center justify-center rounded-md cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 hover:scale-104"
                          >
                            {" "}
                            <MdDeleteOutline className="text-xl" />{" "}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className=" text-center ">
                <td colSpan={7} className="p-4">
                  {t("user_data_not_found")}
                </td>
              </tr>
            )
          ) : (
            Array.from({ length: 10 }).map((_, i) => (
              <tr className=" text-center animate-pulse" key={i}>
                <td className="p-4">
                  <Skeleton width={30} height={30} borderRadius={12} />
                </td>
                <td className="p-4">
                  <Skeleton width={140} height={30} borderRadius={12} />
                </td>
                <td className="p-4">
                  <Skeleton width={130} height={30} borderRadius={12} />
                </td>
                <td className="p-4">
                  <Skeleton width={120} height={30} borderRadius={12} />
                </td>
                <td className="p-4">
                  <Skeleton width={100} height={30} borderRadius={999} />
                </td>
                <td className="p-4">
                  <Skeleton width={140} height={30} borderRadius={12} />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Skeleton width={35} height={35} borderRadius={12} />
                    <Skeleton width={35} height={35} borderRadius={12} />
                    <Skeleton width={35} height={35} borderRadius={12} />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPage}
        onPageChange={(page) => setCurrentPages(page)}
      />
    </>
  );
};
