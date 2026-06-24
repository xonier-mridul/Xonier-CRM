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

export const UsersTable = ({
  currentPage,
  pageLimit,
  userData,
  handleDelete,
  isLoading,
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
}: UserTableComponentProps): JSX.Element => {
  const [selectedcountryCode, setCountryCode] = useState("+91");
  const { hasPermission } = usePermissions();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [search, setSearch] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [company, setCompany] = useState("");

  console.log("is Admin :", isAdmin);

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
      <div className="relative w-full max-w-xs" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm shadow-sm transition-all hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
            selectedCompany
              ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white"
          }`}
        >
          <span className="truncate text-sm">
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
                  placeholder="Search company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
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
                  All Companies
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
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold"
                          : "text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{item.companyName}</span>
                        {/* <span className="text-[10px] text-gray-400 font-normal truncate">{item.companyId}</span> */}
                      </div>
                      {isActive && (
                        <svg
                          className="w-4 h-4 text-blue-500 shrink-0 ml-2"
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
                  No company found
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
                  Loading more…
                </div>
              )}

              {!hasMore && companyData.length > 0 && (
                <div className="py-2 text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700">
                  All companies loaded
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isPopupShow && (
        <>
          <BlurryBackground onClick={() => setIsPopupShow(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2  bg-white dark:bg-gray-700 p-6 rounded-xl w-[650px] z-[200] flex flex-col gap-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">Create User</h2>
              <button
                className="text-2xl text-gray-500 hover:text-red-500 cursor-pointer hover:rotate-90 transition-all duration-300"
                onClick={() => setIsPopupShow(false)}
              >
                <FaXmark />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <Input
                label="firstName"
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
              />
              <Input
                label="lastName"
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
              />
              <Input
                label="email"
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
              />
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
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Phone
                </label>

                <div className="flex gap-2">
                  {/* Country Code */}
                  <select
                    value={selectedcountryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-300/30 bg-white dark:bg-gray-800 text-black dark:text-white"
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
                    placeholder="Phone Number"
                    value={`${phoneNumber}`}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-300/30 bg-white dark:bg-gray-800 text-black dark:text-white outline-none"
                  />
                </div>
              </div>
              <Input
                label="password"
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              <Input
                label="confirm password"
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {isAdmin && (
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Company
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
                  formData.userRole.length <= 0
                }
                className="col-span-2"
              >
                {" "}
                Submit{" "}
              </FormButton>
            </form>
          </div>
        </>
      )}

      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 mb-8 rounded-xl border border-slate-900/10 w-full ">
        <div className="flex items-center gap-12 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold  dark:text-white text-slate-900 capitalize">
              All users
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Create, edit or remove users. Each user can have multiple roles.
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
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 whitespace-nowrap">
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
            className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10"
            onChange={(e) => handleLimit(e.target.value)}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="40">50</option>
          </select>
          <div className="bg-slate-50 dark:bg-gray-600 px-3 py-2.5 rounded-lg border border-slate-900/10 flex items-center gap-2">
            <IoIosSearch className="text-xl" />
            <input
              type="text"
              placeholder="Search by name"
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
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed
                        text-white px-5 py-2 rounded-md
                        flex items-center gap-2 cursor-pointer"
          >
            <FiUserPlus /> Create User
          </button>
        </div>
      </div>
      <table className="w-full rounded-xl overflow-hidden">
        <thead>
          <tr className="w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800">
            <th className="p-4 uppercase text-xs text-start text-slate-500 dark:text-slate-100">
              S.No.
            </th>
            <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
              {" "}
              User
            </th>
            <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
              Type
            </th>
            <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
              Created At
            </th>
            <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
              Status
            </th>
            <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
              Last Login
            </th>
            <th className="p-4 uppercase text-xs text-start text-slate-500  dark:text-slate-100">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="">
          {!isLoading ? (
            userData && userData?.length > 0 ? (
              userData?.map((item, index) => {
                let rr = index % 2 == 0;

                let date = new Date(item.createdAt).toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  },
                );
                let lastLoginDate = item?.lastLogin
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
                        ? "bg-white dark:bg-transparent"
                        : "bg-blue-100/50 dark:bg-slate-500"
                    } w-full`}
                    key={item.id}
                  >
                    <td className="p-4">{index + 1}</td>
                    <td>
                      <Link
                        href={`/users/${item.id}`}
                        className="cursor-pointer hover:text-blue-500 capitalize"
                      >
                        {item.firstName} {item.lastName}
                      </Link>
                    </td>
                    <td>
                      {item.userRole.map((item) => (
                        <span
                          key={item.id}
                          className="bg-green-500 px-3.5 py-1.5 rounded-lg text-white text-xs tracking-wide"
                        >
                          {item.name}
                        </span>
                      ))}
                    </td>
                    <td>{date}</td>
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
                        }  rounded-full text-sm font-medium py-1 px-3 flex items-center gap-1 w-fit  capitalize`}
                      >
                        {" "}
                        <GoDotFill /> {item.status}
                      </span>
                    </td>
                    <td>{lastLoginDate}</td>
                    <td>
                      <div className="flex items-center gap-2">
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
                  User data not found
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
      <Pagination
        currentPage={currentPage}
        totalPages={totalPage}
        onPageChange={(page) => setCurrentPages(page)}
      />
    </>
  );
};
